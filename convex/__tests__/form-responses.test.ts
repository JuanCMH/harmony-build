import { describe, expect, it, vi } from "vitest";
import { api } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import {
  field,
  oneSection,
  rule,
  section,
  selectField,
  when,
} from "../lib/__tests__/form.fixtures";
import { formResponsesErrors, valueProblems } from "../lib/error_messages";
import type { FormSection, FormValues } from "../lib/form_types";
import { fromStoredValues } from "../lib/stored_values";
import {
  FIRST_PAGE,
  grant,
  type Seed,
  seedForm,
  seedProject,
  setupTest,
  stored,
  type TestConvex,
} from "./helpers";

type StoredValue = Doc<"formResponses">["values"][number]["value"];

const authState = vi.hoisted(() => ({
  userId: null as Id<"users"> | null,
}));

vi.mock("@convex-dev/auth/server", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@convex-dev/auth/server")>();
  return {
    ...actual,
    getAuthUserId: async () => authState.userId,
  };
});

/** Un registro diario con todo lo que el motor portado sabe hacer: una
 *  sección condicional, un campo condicional, dos derivados y uno que cambia
 *  con el día. */
const DAILY: FormSection[] = [
  section("turno", 1, [
    selectField("tipo", ["diurno", "nocturno"], {
      label: "Turno",
      required: true,
      showInTable: true,
    }),
    field("personas", { type: "number", label: "Personas", required: true }),
    field("horas", { type: "number", label: "Horas por persona" }),
    field("total", {
      type: "number",
      label: "Horas hombre",
      showInTable: true,
      config: {
        computed: {
          kind: "arithmetic",
          operands: ["personas", "horas"],
          op: "*",
        },
      },
    }),
    field("recargo", {
      label: "Motivo del recargo",
      required: true,
      config: { visibility: when(rule("tipo", "eq", "nocturno")) },
    }),
    field("cierre", {
      type: "date",
      label: "Cierre",
      config: {
        computed: { kind: "dateAdd", of: "@fecha", amount: 7, unit: "days" },
      },
    }),
    field("faltan", {
      type: "number",
      label: "Días para el cierre",
      config: { computed: { kind: "daysUntil", of: "cierre" } },
    }),
  ]),
  section(
    "iluminacion",
    2,
    [field("lamparas", { type: "number", label: "Lámparas", required: true })],
    when(rule("tipo", "eq", "nocturno")),
  ),
];

async function seedDaily(t: TestConvex, s: Seed, sections = DAILY) {
  await grant(t, s.roleId, "fillForms");
  return await seedForm(t, {
    projectId: s.projectId,
    createdBy: s.adminId,
    sections,
    name: "Horas hombre trabajadas",
  });
}

const submit = (
  t: TestConvex,
  formId: Id<"forms">,
  sections: FormSection[],
  values: FormValues,
) =>
  t.mutation(api.formResponses.submit, {
    formId,
    values: stored(sections, values),
  });

const savedValues = async (t: TestConvex, id: Id<"formResponses">) =>
  fromStoredValues((await t.run((ctx) => ctx.db.get(id)))?.values ?? []);

describe("formResponses.submit", () => {
  it("guarda la respuesta contra la versión publicada, con autor y fecha del servidor", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const { formId, publishedVersionId } = await seedDaily(t, s);

    // Las 20:30 del 28 de septiembre en Bogotá ya son el 29 en UTC.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-09-29T01:30:00Z"));
    authState.userId = s.roleHolderId;
    const id = await submit(t, formId, DAILY, {
      tipo: "diurno",
      personas: 12,
      horas: 8,
    });
    vi.useRealTimers();

    const { response, form, logs } = await t.run(async (ctx) => ({
      response: await ctx.db.get(id),
      form: await ctx.db.get(formId),
      logs: await ctx.db.query("logs").collect(),
    }));
    expect(response).toMatchObject({
      formId,
      projectId: s.projectId,
      versionId: publishedVersionId,
      date: "2026-09-28",
      submittedBy: s.roleHolderId,
      status: "submitted",
    });
    // Un formato no tiene título ni estado de activo: eso es de los listados.
    expect(response).not.toHaveProperty("title");
    expect(response).not.toHaveProperty("active");
    expect(form?.responseCount).toBe(1);
    // Diligenciar no escribe auditoría: la respuesta ya es el registro.
    expect(logs).toEqual([]);
  });

  it("poda lo oculto: el campo y la sección que dejaron de aplicar", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const { formId } = await seedDaily(t, s);

    authState.userId = s.roleHolderId;
    // Alguien eligió «nocturno», llenó lo suyo y volvió a «diurno».
    const id = await submit(t, formId, DAILY, {
      tipo: "diurno",
      personas: 12,
      horas: 8,
      recargo: "Fundida de placa",
      lamparas: 4,
    });

    const values = await savedValues(t, id);
    expect(values).not.toHaveProperty("recargo");
    expect(values).not.toHaveProperty("lamparas");
    expect(Object.keys(values).sort()).toEqual([
      "cierre",
      "horas",
      "personas",
      "tipo",
      "total",
    ]);
  });

  it("recalcula los derivados: lo que diga el navegador no cuenta", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const { formId } = await seedDaily(t, s);

    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-09-29T15:00:00Z"));
    authState.userId = s.roleHolderId;
    const id = await submit(t, formId, DAILY, {
      tipo: "diurno",
      personas: 12,
      horas: 8,
      total: 9999,
      cierre: "2030-01-01",
      faltan: 3,
    });
    vi.useRealTimers();

    const values = await savedValues(t, id);
    expect(values.total).toBe(96);
    // `@fecha` es la fecha de negocio de la respuesta.
    expect(values.cierre).toBe("2026-10-06");
    // Lo que cambia con el día no se guarda nunca.
    expect(values).not.toHaveProperty("faltan");
  });

  it("un derivado sin resultado no se guarda", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const sections = oneSection(
      field("a", { type: "number" }),
      field("b", { type: "number" }),
      field("razon", {
        type: "number",
        config: {
          computed: { kind: "arithmetic", operands: ["a", "b"], op: "/" },
        },
      }),
    );
    const { formId } = await seedDaily(t, s, sections);

    authState.userId = s.roleHolderId;
    const id = await submit(t, formId, sections, { a: 5, b: 0, razon: 7 });
    expect(await savedValues(t, id)).toEqual({ a: 5, b: 0 });
  });

  it("exige los obligatorios que se ven, y los nombra", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const { formId } = await seedDaily(t, s);

    authState.userId = s.roleHolderId;
    await expect(
      submit(t, formId, DAILY, { tipo: "nocturno" }),
    ).rejects.toThrow(
      `${formResponsesErrors.missingRequiredFields}: Personas, Motivo del recargo, Lámparas`,
    );
    // En el turno diurno, ni el recargo ni las lámparas se exigen.
    await submit(t, formId, DAILY, { tipo: "diurno", personas: 3 });
  });

  it("ignora lo que no es de ningún campo, y los datos de contexto", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const sections = oneSection(
      field("nota"),
      field("solo-otro", {
        required: true,
        config: { visibility: when(rule("@autor", "eq", "otra-persona")) },
      }),
    );
    const { formId } = await seedDaily(t, s, sections);

    authState.userId = s.roleHolderId;
    const id = await t.mutation(api.formResponses.submit, {
      formId,
      values: [
        { fieldId: "nota", value: { kind: "text", value: "Sin novedad" } },
        { fieldId: "suelto", value: { kind: "text", value: "colado" } },
        // Hacerse pasar por otra persona no abre su campo.
        { fieldId: "@autor", value: { kind: "text", value: "otra-persona" } },
      ],
    });
    expect(await savedValues(t, id)).toEqual({ nota: "Sin novedad" });
  });

  it("un valor vacío no se guarda", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const sections = oneSection(field("nota"), field("otra"));
    const { formId } = await seedDaily(t, s, sections);

    authState.userId = s.roleHolderId;
    const id = await t.mutation(api.formResponses.submit, {
      formId,
      values: [
        { fieldId: "nota", value: { kind: "text", value: "   " } },
        { fieldId: "otra", value: { kind: "text", value: "Algo" } },
      ],
    });
    expect(await savedValues(t, id)).toEqual({ otra: "Algo" });
  });
});

describe("validación por valor, en el servidor", () => {
  const EVERY_TYPE = oneSection(
    field("texto", { label: "Placa", config: { minLength: 6, maxLength: 7 } }),
    field("largo", { type: "textarea", size: "full", label: "Observaciones" }),
    field("correo", { type: "email", label: "Correo" }),
    field("telefono", { type: "phone", label: "Teléfono" }),
    field("enlace", { type: "url", label: "Enlace" }),
    field("numero", {
      type: "number",
      label: "Horas",
      config: { minValue: 0, maxValue: 24 },
    }),
    field("moneda", {
      type: "currency",
      label: "Valor",
      config: { minValue: 0 },
    }),
    field("fecha", { type: "date", label: "Fecha" }),
    field("hora", { type: "time", label: "Hora" }),
    selectField("lista", ["diurno", "nocturno"], { label: "Turno" }),
    field("varias", {
      type: "multiSelect",
      label: "Cursos",
      config: {
        options: [
          { label: "Alturas", value: "alturas" },
          { label: "Izaje", value: "izaje" },
        ],
      },
    }),
    field("casilla", { type: "checkbox", label: "¿Usa casco?" }),
  );

  const GOOD: FormValues = {
    texto: "SLP-835",
    largo: "Sin novedad en el turno",
    correo: "ana@obra.co",
    telefono: "310 555 1234",
    enlace: "https://obra.co/planos",
    numero: 8,
    moneda: 1250000,
    fecha: "2026-09-29",
    hora: "07:30",
    lista: "diurno",
    varias: ["alturas", "izaje"],
    casilla: false,
  };

  it("acepta un valor bueno de cada tipo y lo guarda tal cual", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const { formId } = await seedDaily(t, s, EVERY_TYPE);

    authState.userId = s.roleHolderId;
    const id = await submit(t, formId, EVERY_TYPE, GOOD);
    expect(await savedValues(t, id)).toEqual(GOOD);
  });

  it("rechaza un valor malo de cada tipo, nombrando el campo", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const { formId } = await seedDaily(t, s, EVERY_TYPE);

    const cases = [
      ["texto", "SLP", "Placa", "tooShort"],
      ["texto", "SLP-83555", "Placa", "tooLong"],
      ["largo", "x".repeat(5001), "Observaciones", "tooLong"],
      ["correo", "ana", "Correo", "invalidEmail"],
      ["telefono", "abc", "Teléfono", "invalidPhone"],
      ["enlace", "obra", "Enlace", "invalidUrl"],
      ["numero", 25, "Horas", "aboveMax"],
      ["moneda", -1, "Valor", "belowMin"],
      ["fecha", "2026-02-30", "Fecha", "invalidDate"],
      ["hora", "25:00", "Hora", "invalidTime"],
      ["lista", "mixto", "Turno", "optionMissing"],
      ["varias", ["alturas", "buceo"], "Cursos", "optionMissing"],
    ] as const;

    authState.userId = s.roleHolderId;
    for (const [fieldId, value, label, code] of cases) {
      await expect(
        submit(t, formId, EVERY_TYPE, { ...GOOD, [fieldId]: value }),
        `${fieldId} · ${code}`,
      ).rejects.toThrow(`«${label}»: ${valueProblems[code]}`);
    }
    expect((await t.run((ctx) => ctx.db.get(formId)))?.responseCount).toBe(0);
  });

  it("rechaza un valor con el `kind` de otro tipo", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const { formId } = await seedDaily(t, s, EVERY_TYPE);

    authState.userId = s.roleHolderId;
    const wrong: [string, StoredValue, string][] = [
      ["texto", { kind: "number", value: 5 }, "Placa"],
      ["numero", { kind: "text", value: "ocho" }, "Horas"],
      ["casilla", { kind: "text", value: "quizá" }, "¿Usa casco?"],
      ["varias", { kind: "text", value: "alturas" }, "Cursos"],
      ["lista", { kind: "list", value: ["diurno"] }, "Turno"],
    ];
    for (const [fieldId, value, label] of wrong) {
      await expect(
        t.mutation(api.formResponses.submit, {
          formId,
          values: [{ fieldId, value }],
        }),
        fieldId,
      ).rejects.toThrow(`«${label}»: ${valueProblems.wrongKind}`);
    }
  });
});

describe("versión fijada (diseño §2)", () => {
  it("una respuesta de la versión 1 se lee con la 1 tras publicar la 2", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    await grant(t, s.roleId, "fillForms", "viewResponses");

    const v1 = oneSection(
      field("personas", {
        type: "number",
        label: "Personas",
        showInTable: true,
      }),
      field("horas", { type: "number", label: "Horas", showInTable: true }),
      field("total", {
        type: "number",
        label: "Horas hombre",
        showInTable: true,
        config: {
          computed: {
            kind: "arithmetic",
            operands: ["personas", "horas"],
            op: "*",
          },
        },
      }),
    );
    // La 2 quita el cálculo, renombra un campo y añade otro.
    const v2 = oneSection(
      field("personas", {
        type: "number",
        label: "Trabajadores",
        showInTable: true,
      }),
      field("horas", { type: "number", label: "Horas", showInTable: true }),
      field("frente", { label: "Frente de obra", showInTable: true }),
    );

    authState.userId = s.adminId;
    const formId = await t.mutation(api.forms.create, {
      projectId: s.projectId,
      kind: "record",
      name: "Horas hombre trabajadas",
    });
    await t.mutation(api.formVersions.saveDraft, { id: formId, sections: v1 });
    await t.mutation(api.formVersions.publish, { id: formId });

    authState.userId = s.roleHolderId;
    const first = await submit(t, formId, v1, { personas: 12, horas: 8 });

    authState.userId = s.adminId;
    await t.mutation(api.formVersions.saveDraft, { id: formId, sections: v2 });
    await t.mutation(api.formVersions.publish, { id: formId });

    authState.userId = s.roleHolderId;
    const second = await submit(t, formId, v2, {
      personas: 5,
      horas: 9,
      frente: "Torre 2",
    });

    // La respuesta antigua trae las secciones de SU versión, con el cálculo.
    const old = await t.query(api.formResponses.getById, { id: first });
    expect(old?.version).toMatchObject({ number: 1 });
    expect(old?.version?.publishedAt).toEqual(expect.any(Number));
    expect(old?.sections).toEqual(v1);
    expect(fromStoredValues(old?.values ?? [])).toEqual({
      personas: 12,
      horas: 8,
      total: 96,
    });

    const recent = await t.query(api.formResponses.getById, { id: second });
    expect(recent?.version).toMatchObject({ number: 2 });
    expect(recent?.sections).toEqual(v2);
    expect(fromStoredValues(recent?.values ?? [])).not.toHaveProperty("total");

    // El listado arma sus columnas con la última versión, y una respuesta de
    // otra versión rellena lo que tenga.
    const { page } = await t.query(api.formResponses.list, {
      formId,
      paginationOpts: FIRST_PAGE,
    });
    expect(
      page.map((row) => [row.versionNumber, row.columns.map((c) => c.text)]),
    ).toEqual([
      [2, ["5", "9", "Torre 2"]],
      [1, ["12", "8", ""]],
    ]);
    expect(page[0].columns.map((column) => column.fieldId)).toEqual([
      "personas",
      "horas",
      "frente",
    ]);
  });
});

describe("formResponses.void", () => {
  async function seedResponse(t: TestConvex, s: Seed) {
    const sections = oneSection(field("nota", { showInTable: true }));
    const { formId } = await seedDaily(t, s, sections);
    authState.userId = s.roleHolderId;
    const id = await submit(t, formId, sections, { nota: "Bien" });
    return { formId, id };
  }

  it("anula con motivo; la respuesta sigue existiendo y queda constancia", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const { formId, id } = await seedResponse(t, s);
    await t.run((ctx) => ctx.db.patch(id, { date: "2026-09-29" }));

    authState.userId = s.adminId;
    await t.mutation(api.formResponses.void, {
      id,
      reason: "  Se diligenció   sobre el equipo equivocado ",
    });

    const { response, form, logs } = await t.run(async (ctx) => ({
      response: await ctx.db.get(id),
      form: await ctx.db.get(formId),
      logs: await ctx.db.query("logs").collect(),
    }));
    expect(response).toMatchObject({
      status: "voided",
      voidedBy: s.adminId,
      voidReason: "Se diligenció sobre el equipo equivocado",
    });
    expect(response?.voidedAt).toEqual(expect.any(Number));
    expect(fromStoredValues(response?.values ?? [])).toEqual({ nota: "Bien" });
    // Sigue contando: anular no es borrar.
    expect(form?.responseCount).toBe(1);
    expect(
      logs.map((log) => [log.description, log.affectedEntityType]),
    ).toEqual([
      [
        "Respuesta anulada: Horas hombre trabajadas del 29/09/2026",
        "formResponse",
      ],
    ]);

    // Y sigue en el listado, con quién la anuló y por qué.
    const { page } = await t.query(api.formResponses.list, {
      formId,
      paginationOpts: FIRST_PAGE,
    });
    expect(page).toHaveLength(1);
    expect(page[0]).toMatchObject({
      status: "voided",
      voided: {
        by: "Administrador",
        reason: "Se diligenció sobre el equipo equivocado",
      },
    });
    const read = await t.query(api.formResponses.getById, { id });
    expect(read?.voided?.by?.name).toBe("Administrador");
    expect(read?.canVoid).toBe(false);
  });

  it("el motivo tiene entre 5 y 300 caracteres", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const { id } = await seedResponse(t, s);

    authState.userId = s.adminId;
    for (const reason of ["  no  ", "x".repeat(301)]) {
      await expect(
        t.mutation(api.formResponses.void, { id, reason }),
      ).rejects.toThrow(formResponsesErrors.invalidVoidReason);
    }
  });

  it("no se anula dos veces", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const { id } = await seedResponse(t, s);

    authState.userId = s.adminId;
    await t.mutation(api.formResponses.void, { id, reason: "Equivocada" });
    await expect(
      t.mutation(api.formResponses.void, { id, reason: "Otra vez" }),
    ).rejects.toThrow(formResponsesErrors.alreadyVoided);
  });

  it("quien diligenció no anula lo suyo sin la llave", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const { id } = await seedResponse(t, s);

    authState.userId = s.roleHolderId;
    await expect(
      t.mutation(api.formResponses.void, { id, reason: "Me equivoqué" }),
    ).rejects.toThrow(formResponsesErrors.insufficientPermissions);
  });
});

describe("formResponses.list", () => {
  const NOTE = oneSection(field("nota", { label: "Nota", showInTable: true }));

  /** Siete respuestas, una por día, alternando dos personas. */
  async function seedWeek(t: TestConvex, s: Seed) {
    const { formId } = await seedDaily(t, s, NOTE);
    const ids: Id<"formResponses">[] = [];
    vi.useFakeTimers({ toFake: ["Date"] });
    for (let day = 1; day <= 7; day++) {
      vi.setSystemTime(new Date(`2026-09-0${day}T15:00:00Z`));
      authState.userId = day % 2 === 0 ? s.adminId : s.roleHolderId;
      ids.push(await submit(t, formId, NOTE, { nota: `Día ${day}` }));
    }
    vi.useRealTimers();
    return { formId, ids };
  }

  const notes = (page: { columns: { text: string }[] }[]) =>
    page.map((row) => row.columns[0].text);

  it("pagina, lo más reciente primero", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const { formId } = await seedWeek(t, s);

    authState.userId = s.adminId;
    const first = await t.query(api.formResponses.list, {
      formId,
      paginationOpts: { numItems: 3, cursor: null },
    });
    expect(notes(first.page)).toEqual(["Día 7", "Día 6", "Día 5"]);
    expect(first.isDone).toBe(false);

    const second = await t.query(api.formResponses.list, {
      formId,
      paginationOpts: { numItems: 3, cursor: first.continueCursor },
    });
    expect(notes(second.page)).toEqual(["Día 4", "Día 3", "Día 2"]);

    const third = await t.query(api.formResponses.list, {
      formId,
      paginationOpts: { numItems: 3, cursor: second.continueCursor },
    });
    expect(notes(third.page)).toEqual(["Día 1"]);
    expect(third.isDone).toBe(true);
  });

  it("cada fila trae fecha, autor, estado, versión y columnas como texto", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const { formId, ids } = await seedWeek(t, s);

    authState.userId = s.adminId;
    const { page } = await t.query(api.formResponses.list, {
      formId,
      paginationOpts: { numItems: 1, cursor: null },
    });
    expect(page[0]).toMatchObject({
      _id: ids[6],
      date: "2026-09-07",
      status: "submitted",
      author: { _id: s.roleHolderId, name: "Inspectora" },
      voided: null,
      versionNumber: 1,
      columns: [{ fieldId: "nota", text: "Día 7" }],
    });
    // Los valores enteros no viajan en la lista.
    expect(page[0]).not.toHaveProperty("values");
  });

  it("filtra por fechas de negocio, las dos incluidas", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const { formId } = await seedWeek(t, s);

    authState.userId = s.adminId;
    const between = async (from?: string, to?: string, mine?: boolean) =>
      notes(
        (
          await t.query(api.formResponses.list, {
            formId,
            paginationOpts: FIRST_PAGE,
            from,
            to,
            mine,
          })
        ).page,
      );

    expect(await between("2026-09-03", "2026-09-05")).toEqual([
      "Día 5",
      "Día 4",
      "Día 3",
    ]);
    expect(await between("2026-09-06")).toEqual(["Día 7", "Día 6"]);
    expect(await between(undefined, "2026-09-02")).toEqual(["Día 2", "Día 1"]);
    // Con «las mías», el rango sigue valiendo.
    expect(await between("2026-09-03", "2026-09-06", true)).toEqual([
      "Día 6",
      "Día 4",
    ]);
  });

  it("sin `viewResponses` devuelve sólo las propias, también con rango", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const { formId } = await seedWeek(t, s);

    authState.userId = s.roleHolderId;
    const own = await t.query(api.formResponses.list, {
      formId,
      paginationOpts: FIRST_PAGE,
      mine: false,
    });
    expect(notes(own.page)).toEqual(["Día 7", "Día 5", "Día 3", "Día 1"]);
    expect(
      notes(
        (
          await t.query(api.formResponses.list, {
            formId,
            paginationOpts: FIRST_PAGE,
            from: "2026-09-02",
            to: "2026-09-05",
          })
        ).page,
      ),
    ).toEqual(["Día 5", "Día 3"]);

    await grant(t, s.roleId, "viewResponses");
    expect(
      (
        await t.query(api.formResponses.list, {
          formId,
          paginationOpts: FIRST_PAGE,
        })
      ).page,
    ).toHaveLength(7);
  });

  it("un listado no se lista como respuestas", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const { formId } = await seedForm(t, {
      projectId: s.projectId,
      createdBy: s.adminId,
      sections: oneSection(field("placa", { required: true })),
      kind: "catalog",
      titleFieldId: "placa",
    });

    authState.userId = s.adminId;
    await expect(
      t.query(api.formResponses.list, { formId, paginationOpts: FIRST_PAGE }),
    ).rejects.toThrow(formResponsesErrors.notRecord);
  });
});
