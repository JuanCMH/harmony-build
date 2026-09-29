import { describe, expect, it, vi } from "vitest";
import { api } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import * as formEntries from "../formEntries";
import {
  field,
  oneSection,
  referenceField,
  rule,
  selectField,
  tableField,
  when,
} from "../lib/__tests__/form.fixtures";
import { formResponsesErrors, formsErrors } from "../lib/error_messages";
import type { FormSection, FormValues } from "../lib/form_types";
import { fromStoredValues } from "../lib/stored_values";
import {
  FIRST_PAGE,
  grant,
  pick,
  type Seed,
  seedForm,
  seedProject,
  setupTest,
  stored,
  type TestConvex,
} from "./helpers";

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

const VEHICLES: FormSection[] = oneSection(
  field("placa", { label: "Placa", required: true }),
  selectField("tipo", ["furgon", "mezcladora"], { label: "Tipo" }),
  field("soat", { label: "SOAT" }),
  field("vence", { type: "date", label: "Vigencia del SOAT" }),
);

/** La inspección trae del vehículo lo que el Excel tenía en hojas ocultas. */
const inspection = (vehicles: string): FormSection[] =>
  oneSection(
    referenceField("vehiculo", vehicles, ["tipo", "soat", "vence"], {
      label: "Vehículo",
      required: true,
      showInTable: true,
    }),
    field("km", { type: "number", label: "Kilometraje" }),
  );

async function seedFleet(t: TestConvex, s: Seed) {
  const base = { projectId: s.projectId, createdBy: s.adminId };
  const vehicles = await seedForm(t, {
    ...base,
    sections: VEHICLES,
    kind: "catalog",
    name: "Vehículos",
    titleFieldId: "placa",
  });
  const sections = inspection(vehicles.formId);
  const form = await seedForm(t, {
    ...base,
    sections,
    name: "Inspección de vehículos",
  });

  authState.userId = s.adminId;
  const add = (values: FormValues) =>
    t.mutation(api.formEntries.createEntry, {
      formId: vehicles.formId,
      values: stored(VEHICLES, values),
    });
  const truck = await add({
    placa: "SLP-835",
    tipo: "furgon",
    soat: "12345",
    vence: "2026-12-15",
  });
  const mixer = await add({ placa: "ABC-123", tipo: "mezcladora" });

  return {
    vehicles: vehicles.formId,
    form: form.formId,
    sections,
    truck,
    mixer,
  };
}

type Fleet = Awaited<ReturnType<typeof seedFleet>>;

const inspect = (
  t: TestConvex,
  f: Fleet,
  vehicle: Id<"formResponses">,
  extra: FormValues = {},
) =>
  t.mutation(api.formResponses.submit, {
    formId: f.form,
    values: stored(f.sections, { vehiculo: pick(vehicle), ...extra }),
  });

const savedVehicle = async (t: TestConvex, id: Id<"formResponses">) =>
  fromStoredValues((await t.run((ctx) => ctx.db.get(id)))?.values ?? [])
    .vehiculo;

const linksOf = (t: TestConvex, responseId: Id<"formResponses">) =>
  t.run((ctx) =>
    ctx.db
      .query("formResponseLinks")
      .withIndex("responseId", (q) => q.eq("responseId", responseId))
      .collect(),
  );

describe("instantánea de una relación (diseño §5)", () => {
  it("la compone el servidor: lo que mande el navegador se ignora", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const f = await seedFleet(t, s);

    const id = await t.mutation(api.formResponses.submit, {
      formId: f.form,
      values: stored(f.sections, {
        vehiculo: {
          responseId: f.truck,
          label: "UN TÍTULO INVENTADO",
          snapshot: [
            { fieldId: "soat", label: "SOAT", text: "VIGENTE HASTA 2099" },
            { fieldId: "clave", label: "Clave", text: "colada" },
          ],
        },
      }),
    });

    expect(await savedVehicle(t, id)).toEqual({
      responseId: f.truck,
      label: "SLP-835",
      snapshot: [
        // Una lista se copia por su etiqueta, y una fecha como se lee.
        { fieldId: "tipo", label: "Tipo", text: "furgon" },
        { fieldId: "soat", label: "SOAT", text: "12345" },
        { fieldId: "vence", label: "Vigencia del SOAT", text: "15/12/2026" },
      ],
    });
  });

  it("un campo que el elemento no tiene sale con su nombre y sin valor", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const f = await seedFleet(t, s);

    expect(await savedVehicle(t, await inspect(t, f, f.mixer))).toEqual({
      responseId: f.mixer,
      label: "ABC-123",
      snapshot: [
        { fieldId: "tipo", label: "Tipo", text: "mezcladora" },
        { fieldId: "soat", label: "SOAT", text: "" },
        { fieldId: "vence", label: "Vigencia del SOAT", text: "" },
      ],
    });
  });

  it("el SOAT renovado no cambia la respuesta antigua", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const f = await seedFleet(t, s);

    const march = await inspect(t, f, f.truck);

    await t.mutation(api.formEntries.updateEntry, {
      id: f.truck,
      values: stored(VEHICLES, {
        placa: "SLP-835",
        tipo: "furgon",
        soat: "99999",
        vence: "2027-12-15",
      }),
    });
    const april = await inspect(t, f, f.truck);

    const soat = async (id: Id<"formResponses">) =>
      ((await savedVehicle(t, id)) as { snapshot: { text: string }[] })
        .snapshot[1].text;
    // La de marzo dice con qué SOAT circulaba en marzo.
    expect(await soat(march)).toBe("12345");
    expect(await soat(april)).toBe("99999");
    // Y las dos siguen apuntando al mismo vehículo.
    expect(await savedVehicle(t, march)).toMatchObject({ responseId: f.truck });
    expect(await savedVehicle(t, april)).toMatchObject({ responseId: f.truck });
  });

  it("renombrar el elemento tampoco reescribe el pasado", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const f = await seedFleet(t, s);
    const before = await inspect(t, f, f.truck);

    await t.mutation(api.formEntries.updateEntry, {
      id: f.truck,
      values: stored(VEHICLES, { placa: "SLP-835 (vendido)" }),
    });

    expect(await savedVehicle(t, before)).toMatchObject({ label: "SLP-835" });
    const { page } = await t.query(api.formResponses.list, {
      formId: f.form,
      paginationOpts: FIRST_PAGE,
    });
    expect(page[0].columns).toEqual([{ fieldId: "vehiculo", text: "SLP-835" }]);
  });

  it("la vista previa enseña lo mismo que se va a guardar", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const f = await seedFleet(t, s);

    const preview = await t.query(api.formEntries.getReferencePreview, {
      fieldFormId: f.form,
      fieldId: "vehiculo",
      responseId: f.truck,
    });
    const saved = await savedVehicle(t, await inspect(t, f, f.truck));
    expect(preview).toEqual({ ...(saved as object), active: true });

    // Un campo que no es una relación no tiene vista previa.
    expect(
      await t.query(api.formEntries.getReferencePreview, {
        fieldFormId: f.form,
        fieldId: "km",
        responseId: f.truck,
      }),
    ).toBeNull();
  });
});

describe("el elemento elegido tiene que ser válido", () => {
  it("un elemento inactivo no se puede elegir", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const f = await seedFleet(t, s);

    await t.mutation(api.formEntries.setEntryActive, {
      id: f.truck,
      active: false,
    });
    await expect(inspect(t, f, f.truck)).rejects.toThrow(
      formResponsesErrors.referenceInvalid("Vehículo"),
    );

    await t.mutation(api.formEntries.setEntryActive, {
      id: f.truck,
      active: true,
    });
    await inspect(t, f, f.truck);
  });

  it("tiene que ser del listado configurado", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const f = await seedFleet(t, s);
    const people = oneSection(field("nombre", { required: true }));
    const staff = await seedForm(t, {
      projectId: s.projectId,
      createdBy: s.adminId,
      sections: people,
      kind: "catalog",
      name: "Personal",
      titleFieldId: "nombre",
    });
    const driver = await t.mutation(api.formEntries.createEntry, {
      formId: staff.formId,
      values: stored(people, { nombre: "Luis Pardo" }),
    });

    // Un conductor no es un vehículo, aunque sea un elemento del proyecto.
    await expect(inspect(t, f, driver)).rejects.toThrow(
      formResponsesErrors.referenceInvalid("Vehículo"),
    );
    // Ni una respuesta cualquiera.
    const response = await inspect(t, f, f.truck);
    await expect(inspect(t, f, response)).rejects.toThrow(
      formResponsesErrors.referenceInvalid("Vehículo"),
    );
  });

  it("una relación obligatoria sin elegir es un obligatorio que falta", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const f = await seedFleet(t, s);

    await expect(
      t.mutation(api.formResponses.submit, {
        formId: f.form,
        values: stored(f.sections, { km: 1200 }),
      }),
    ).rejects.toThrow(`${formResponsesErrors.missingRequiredFields}: Vehículo`);
  });

  it("una regla puede depender del elemento elegido", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const f = await seedFleet(t, s);
    const sections = oneSection(
      referenceField("vehiculo", f.vehicles, [], { label: "Vehículo" }),
      field("tambor", {
        label: "Estado del tambor",
        required: true,
        config: { visibility: when(rule("vehiculo", "eq", f.mixer)) },
      }),
    );
    const { formId } = await seedForm(t, {
      projectId: s.projectId,
      createdBy: s.adminId,
      sections,
      name: "Inspección con regla",
    });
    const submit = (values: FormValues) =>
      t.mutation(api.formResponses.submit, {
        formId,
        values: stored(sections, values),
      });

    // Con el furgón, el tambor ni se exige ni se guarda.
    const id = await submit({ vehiculo: pick(f.truck), tambor: "Bueno" });
    expect(
      fromStoredValues((await t.run((ctx) => ctx.db.get(id)))?.values ?? []),
    ).not.toHaveProperty("tambor");
    await expect(submit({ vehiculo: pick(f.mixer) })).rejects.toThrow(
      `${formResponsesErrors.missingRequiredFields}: Estado del tambor`,
    );
  });
});

describe("formResponseLinks", () => {
  it("cada relación respondida deja su fila", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const f = await seedFleet(t, s);

    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-09-29T15:00:00Z"));
    const id = await inspect(t, f, f.truck);
    vi.useRealTimers();

    const links = await linksOf(t, id);
    expect(links).toHaveLength(1);
    expect(links[0]).toMatchObject({
      projectId: s.projectId,
      formId: f.form,
      responseId: id,
      fieldId: "vehiculo",
      targetFormId: f.vehicles,
      targetResponseId: f.truck,
      date: "2026-09-29",
      submittedBy: s.adminId,
    });
  });

  it("una relación oculta no deja fila", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const f = await seedFleet(t, s);
    const sections = oneSection(
      field("hay", { type: "checkbox", label: "¿Hubo vehículo?" }),
      referenceField("vehiculo", f.vehicles, [], {
        label: "Vehículo",
        config: {
          reference: { formId: f.vehicles, fill: [] },
          visibility: when(rule("hay", "isChecked")),
        },
      }),
    );
    const { formId } = await seedForm(t, {
      projectId: s.projectId,
      createdBy: s.adminId,
      sections,
      name: "Registro diario",
    });

    const id = await t.mutation(api.formResponses.submit, {
      formId,
      values: stored(sections, { hay: false, vehiculo: pick(f.truck) }),
    });
    expect(await linksOf(t, id)).toEqual([]);
  });

  it("las relaciones de las filas de una tabla también, una por elemento distinto", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const f = await seedFleet(t, s);
    const sections = oneSection(
      referenceField("principal", f.vehicles, [], { label: "Vehículo" }),
      tableField(
        "recorridos",
        { label: "Recorridos" },
        {
          rowLabel: "Recorrido",
          columns: [
            {
              id: "cual",
              label: "Vehículo",
              type: "reference",
              required: true,
              reference: { formId: f.vehicles, fill: ["soat"] },
            },
            { id: "viajes", label: "Viajes", type: "number", required: false },
          ],
        },
      ),
    );
    const { formId } = await seedForm(t, {
      projectId: s.projectId,
      createdBy: s.adminId,
      sections,
      name: "Control de viajes",
    });

    const row = (rowId: string, vehicle: Id<"formResponses">) => ({
      rowId,
      cells: [
        { columnId: "cual", value: pick(vehicle) },
        { columnId: "viajes", value: 3 },
      ],
    });
    const id = await t.mutation(api.formResponses.submit, {
      formId,
      values: stored(sections, {
        principal: pick(f.truck),
        recorridos: [
          row("r1", f.truck),
          row("r2", f.mixer),
          row("r3", f.mixer),
        ],
      }),
    });

    // El furgón sale en el campo y en una fila; la mezcladora, en dos filas.
    const links = await linksOf(t, id);
    expect(
      links.map((link) => [link.fieldId, link.targetResponseId]).sort(),
    ).toEqual(
      [
        ["principal", f.truck],
        ["recorridos", f.mixer],
      ].sort(),
    );

    // Y la instantánea de cada celda la compuso el servidor.
    const saved = fromStoredValues(
      (await t.run((ctx) => ctx.db.get(id)))?.values ?? [],
    ) as { recorridos: { cells: { value: unknown }[] }[] };
    expect(saved.recorridos[0].cells[0].value).toEqual({
      responseId: f.truck,
      label: "SLP-835",
      snapshot: [{ fieldId: "soat", label: "SOAT", text: "12345" }],
    });
  });

  it("al editar un elemento se rehacen las suyas", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const f = await seedFleet(t, s);
    // Un listado que se relaciona con otro: equipo → vehículo que lo lleva.
    const sections = oneSection(
      field("nombre", { label: "Equipo", required: true }),
      referenceField("vehiculo", f.vehicles, ["soat"], { label: "Lo lleva" }),
    );
    const equipment = await seedForm(t, {
      projectId: s.projectId,
      createdBy: s.adminId,
      sections,
      kind: "catalog",
      name: "Equipos",
      titleFieldId: "nombre",
    });
    const id = await t.mutation(api.formEntries.createEntry, {
      formId: equipment.formId,
      values: stored(sections, {
        nombre: "Compresor",
        vehiculo: pick(f.truck),
      }),
    });
    expect((await linksOf(t, id)).map((l) => l.targetResponseId)).toEqual([
      f.truck,
    ]);

    await t.mutation(api.formEntries.updateEntry, {
      id,
      values: stored(sections, {
        nombre: "Compresor",
        vehiculo: pick(f.mixer),
      }),
    });
    expect((await linksOf(t, id)).map((l) => l.targetResponseId)).toEqual([
      f.mixer,
    ]);

    await t.mutation(api.formEntries.updateEntry, {
      id,
      values: stored(sections, { nombre: "Compresor" }),
    });
    expect(await linksOf(t, id)).toEqual([]);
  });

  it("editar un elemento conserva la relación con otro que se inactivó después", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const f = await seedFleet(t, s);
    const sections = oneSection(
      field("nombre", { label: "Equipo", required: true }),
      referenceField("vehiculo", f.vehicles, ["soat"], { label: "Lo lleva" }),
    );
    const equipment = await seedForm(t, {
      projectId: s.projectId,
      createdBy: s.adminId,
      sections,
      kind: "catalog",
      name: "Equipos",
      titleFieldId: "nombre",
    });
    const id = await t.mutation(api.formEntries.createEntry, {
      formId: equipment.formId,
      values: stored(sections, {
        nombre: "Compresor",
        vehiculo: pick(f.truck),
      }),
    });
    await t.mutation(api.formEntries.setEntryActive, {
      id: f.truck,
      active: false,
    });

    // Corregir el nombre no obliga a cambiar de vehículo…
    await t.mutation(api.formEntries.updateEntry, {
      id,
      values: stored(sections, {
        nombre: "Compresor de 185 CFM",
        vehiculo: pick(f.truck),
      }),
    });
    expect(await savedVehicle(t, id)).toMatchObject({
      responseId: f.truck,
      label: "SLP-835",
    });

    // …pero elegir uno inactivo que no tenía, sí se rechaza.
    const other = await t.mutation(api.formEntries.createEntry, {
      formId: equipment.formId,
      values: stored(sections, { nombre: "Planta eléctrica" }),
    });
    await expect(
      t.mutation(api.formEntries.updateEntry, {
        id: other,
        values: stored(sections, {
          nombre: "Planta eléctrica",
          vehiculo: pick(f.truck),
        }),
      }),
    ).rejects.toThrow(formResponsesErrors.referenceInvalid("Lo lleva"));
  });
});

describe("historial de un elemento", () => {
  async function seedHistory(t: TestConvex, s: Seed) {
    const f = await seedFleet(t, s);
    await grant(t, s.roleId, "fillForms");
    const ids: Id<"formResponses">[] = [];

    vi.useFakeTimers({ toFake: ["Date"] });
    for (const [day, user, vehicle] of [
      [1, s.roleHolderId, f.truck],
      [2, s.adminId, f.truck],
      [3, s.roleHolderId, f.mixer],
      [4, s.roleHolderId, f.truck],
    ] as const) {
      vi.setSystemTime(new Date(`2026-09-0${day}T15:00:00Z`));
      authState.userId = user;
      ids.push(await inspect(t, f, vehicle, { km: day * 100 }));
    }
    vi.useRealTimers();
    return { f, ids };
  }

  const history = async (t: TestConvex, entryId: Id<"formResponses">) =>
    (
      await t.query(api.formEntries.listEntryHistory, {
        entryId,
        paginationOpts: FIRST_PAGE,
      })
    ).page;

  it("da las respuestas que eligieron el elemento, lo más reciente primero", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const { f, ids } = await seedHistory(t, s);

    authState.userId = s.adminId;
    const rows = await history(t, f.truck);
    expect(rows.map((row) => row.responseId)).toEqual([ids[3], ids[1], ids[0]]);
    expect(rows[0]).toMatchObject({
      formId: f.form,
      formName: "Inspección de vehículos",
      date: "2026-09-04",
      status: "submitted",
      author: { _id: s.roleHolderId, name: "Inspectora" },
    });
    expect((await history(t, f.mixer)).map((row) => row.responseId)).toEqual([
      ids[2],
    ]);
  });

  it("una respuesta anulada sigue en el historial, como anulada", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const { f, ids } = await seedHistory(t, s);

    authState.userId = s.adminId;
    await t.mutation(api.formResponses.void, {
      id: ids[3],
      reason: "Era la mezcladora",
    });
    expect((await history(t, f.truck)).map((row) => row.status)).toEqual([
      "voided",
      "submitted",
      "submitted",
    ]);
  });

  it("un elemento inactivo conserva su historial", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const { f } = await seedHistory(t, s);

    authState.userId = s.adminId;
    await t.mutation(api.formEntries.setEntryActive, {
      id: f.truck,
      active: false,
    });
    expect(await history(t, f.truck)).toHaveLength(3);
  });

  it("sin `viewResponses`, sólo las propias", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const { f, ids } = await seedHistory(t, s);

    authState.userId = s.roleHolderId;
    expect((await history(t, f.truck)).map((row) => row.responseId)).toEqual([
      ids[3],
      ids[0],
    ]);

    authState.userId = s.plainId;
    await expect(history(t, f.truck)).rejects.toThrow(
      formResponsesErrors.insufficientPermissions,
    );
  });

  it("el listado de respuestas se filtra por el elemento elegido", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const { f, ids } = await seedHistory(t, s);
    const of = async (
      targetResponseId: Id<"formResponses">,
      extra: { from?: string; to?: string; mine?: boolean } = {},
    ) =>
      (
        await t.query(api.formResponses.list, {
          formId: f.form,
          paginationOpts: FIRST_PAGE,
          targetResponseId,
          ...extra,
        })
      ).page.map((row) => row._id);

    authState.userId = s.adminId;
    expect(await of(f.truck)).toEqual([ids[3], ids[1], ids[0]]);
    expect(await of(f.mixer)).toEqual([ids[2]]);
    expect(await of(f.truck, { from: "2026-09-02" })).toEqual([ids[3], ids[1]]);
    expect(await of(f.truck, { to: "2026-09-02" })).toEqual([ids[1], ids[0]]);
    expect(await of(f.truck, { mine: true })).toEqual([ids[1]]);

    // Sin la llave, por elemento también salen sólo las propias.
    authState.userId = s.roleHolderId;
    expect(await of(f.truck)).toEqual([ids[3], ids[0]]);
  });
});

describe("publicar un formato con relaciones", () => {
  async function draftWith(t: TestConvex, s: Seed, sections: FormSection[]) {
    authState.userId = s.adminId;
    const id = await t.mutation(api.forms.create, {
      projectId: s.projectId,
      kind: "record",
      name: "Inspección nueva",
    });
    await t.mutation(api.formVersions.saveDraft, { id, sections });
    return id;
  }
  const publish = (t: TestConvex, id: Id<"forms">) =>
    t.mutation(api.formVersions.publish, { id });
  const pointingTo = (formId: string, fill: string[] = []) =>
    oneSection(referenceField("vehiculo", formId, fill, { label: "Vehículo" }));

  it("el listado tiene que existir, ser del proyecto, ser un listado y estar publicado", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const f = await seedFleet(t, s);
    const base = { sections: VEHICLES, titleFieldId: "placa" };
    const foreign = await seedForm(t, {
      ...base,
      projectId: s.otherProjectId,
      createdBy: s.outsiderId,
      kind: "catalog",
      name: "Vehículos ajenos",
    });
    const unpublished = await seedForm(t, {
      ...base,
      projectId: s.projectId,
      createdBy: s.adminId,
      kind: "catalog",
      name: "Extintores",
      status: "draft",
    });
    const archived = await seedForm(t, {
      ...base,
      projectId: s.projectId,
      createdBy: s.adminId,
      kind: "catalog",
      name: "Botiquines",
      status: "archived",
    });

    const cases = [
      ["no-es-un-id", formsErrors.referenceNotFound("Vehículo")],
      [foreign.formId, formsErrors.referenceNotFound("Vehículo")],
      [
        f.form,
        formsErrors.referenceNotCatalog("Vehículo", "Inspección de vehículos"),
      ],
      [
        unpublished.formId,
        formsErrors.referenceNotPublished("Vehículo", "Extintores"),
      ],
      [
        archived.formId,
        formsErrors.referenceNotPublished("Vehículo", "Botiquines"),
      ],
    ] as const;
    for (const [target, message] of cases) {
      const id = await draftWith(t, s, pointingTo(target));
      await expect(publish(t, id), target).rejects.toThrow(message);
    }

    const good = await draftWith(t, s, pointingTo(f.vehicles, ["soat"]));
    expect(await publish(t, good)).toBe(1);
    expect((await t.run((ctx) => ctx.db.get(good)))?.referencedFormIds).toEqual(
      [f.vehicles],
    );
  });

  it("los campos que se traen tienen que existir en la versión publicada del listado", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const f = await seedFleet(t, s);

    const id = await draftWith(t, s, pointingTo(f.vehicles, ["soat", "color"]));
    await expect(publish(t, id)).rejects.toThrow(
      formsErrors.referenceFillMissing("Vehículo", "Vehículos"),
    );

    // Añadir el campo al borrador del listado no basta: hay que publicarlo.
    await t.mutation(api.formVersions.saveDraft, {
      id: f.vehicles,
      sections: oneSection(...VEHICLES[0].fields, field("color")),
    });
    await expect(publish(t, id)).rejects.toThrow(
      formsErrors.referenceFillMissing("Vehículo", "Vehículos"),
    );
    await publish(t, f.vehicles);
    expect(await publish(t, id)).toBe(1);
  });

  it("la relación de la columna de una tabla pasa por lo mismo", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const f = await seedFleet(t, s);

    const id = await draftWith(
      t,
      s,
      oneSection(
        tableField(
          "recorridos",
          { label: "Recorridos" },
          {
            rowLabel: "Recorrido",
            columns: [
              {
                id: "cual",
                label: "Vehículo",
                type: "reference",
                required: true,
                reference: { formId: f.form, fill: [] },
              },
            ],
          },
        ),
      ),
    );
    await expect(publish(t, id)).rejects.toThrow(
      formsErrors.referenceNotCatalog(
        "Recorridos › Vehículo",
        "Inspección de vehículos",
      ),
    );
  });
});

describe("ciclos entre listados", () => {
  /** Tres listados publicados, sin relaciones todavía. */
  async function seedCatalogs(t: TestConvex, s: Seed) {
    authState.userId = s.adminId;
    const ids: Record<string, Id<"forms">> = {};
    for (const name of ["Vehículos", "Conductores", "Contratistas"]) {
      ids[name] = (
        await seedForm(t, {
          projectId: s.projectId,
          createdBy: s.adminId,
          sections: oneSection(field("nombre", { required: true })),
          kind: "catalog",
          name,
          titleFieldId: "nombre",
        })
      ).formId;
    }
    return ids;
  }

  const relate = async (t: TestConvex, from: Id<"forms">, to: Id<"forms">) => {
    await t.mutation(api.formVersions.saveDraft, {
      id: from,
      sections: oneSection(
        field("nombre", { required: true }),
        referenceField("relacion", to, [], { label: "Relación" }),
      ),
    });
    return await t.mutation(api.formVersions.publish, { id: from });
  };

  it("un listado puede relacionarse con otro", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const c = await seedCatalogs(t, s);

    expect(await relate(t, c.Vehículos, c.Conductores)).toBe(2);
  });

  it("si A apunta a B, B no puede apuntar a A", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const c = await seedCatalogs(t, s);

    await relate(t, c.Vehículos, c.Conductores);
    await expect(relate(t, c.Conductores, c.Vehículos)).rejects.toThrow(
      formsErrors.referenceCycle(["Conductores", "Vehículos", "Conductores"]),
    );
    // El borrador se guardó; lo que no pasó fue publicarlo.
    expect(
      (await t.run((ctx) => ctx.db.get(c.Conductores)))?.publishedVersionNumber,
    ).toBe(1);
  });

  it("ni a través de un tercero", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const c = await seedCatalogs(t, s);

    await relate(t, c.Vehículos, c.Conductores);
    await relate(t, c.Conductores, c.Contratistas);
    await expect(relate(t, c.Contratistas, c.Vehículos)).rejects.toThrow(
      formsErrors.referenceCycle([
        "Contratistas",
        "Vehículos",
        "Conductores",
        "Contratistas",
      ]),
    );
  });

  it("ni a sí mismo", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const c = await seedCatalogs(t, s);

    await expect(relate(t, c.Vehículos, c.Vehículos)).rejects.toThrow(
      formsErrors.referenceCycle(["Vehículos", "Vehículos"]),
    );
  });
});

describe("integridad de un listado (diseño §5)", () => {
  const without = (...removed: string[]) =>
    oneSection(...VEHICLES[0].fields.filter((f) => !removed.includes(f.id)));

  it("no se quita un campo que otro formato trae por autocompletar", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const f = await seedFleet(t, s);

    await expect(
      t.mutation(api.formVersions.saveDraft, {
        id: f.vehicles,
        sections: without("soat"),
      }),
    ).rejects.toThrow(
      formsErrors.fieldInUse("SOAT", "Inspección de vehículos"),
    );

    // Uno que nadie trae, sí.
    await t.mutation(api.formVersions.saveDraft, {
      id: f.vehicles,
      sections: oneSection(...VEHICLES[0].fields, field("color")),
    });
    await t.mutation(api.formVersions.saveDraft, {
      id: f.vehicles,
      sections: VEHICLES,
    });
  });

  it("cuenta también lo que trae el borrador de otro formato", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const f = await seedFleet(t, s);

    // La inspección deja de traer el SOAT… en su borrador.
    await t.mutation(api.formVersions.saveDraft, {
      id: f.form,
      sections: oneSection(
        referenceField("vehiculo", f.vehicles, ["tipo"], { label: "Vehículo" }),
      ),
    });
    // La versión publicada lo sigue trayendo.
    await expect(
      t.mutation(api.formVersions.saveDraft, {
        id: f.vehicles,
        sections: without("soat"),
      }),
    ).rejects.toThrow(
      formsErrors.fieldInUse("SOAT", "Inspección de vehículos"),
    );

    await t.mutation(api.formVersions.publish, { id: f.form });
    await t.mutation(api.formVersions.saveDraft, {
      id: f.vehicles,
      sections: without("soat", "vence"),
    });
  });

  it("tampoco al publicar, si otro formato empezó a traerlo entretanto", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    authState.userId = s.adminId;
    const vehicles = await seedForm(t, {
      projectId: s.projectId,
      createdBy: s.adminId,
      sections: VEHICLES,
      kind: "catalog",
      name: "Vehículos",
      titleFieldId: "placa",
    });

    // Nadie usa el SOAT todavía: se puede quitar del borrador.
    await t.mutation(api.formVersions.saveDraft, {
      id: vehicles.formId,
      sections: without("soat"),
    });
    // Mientras, una inspección nueva empieza a traerlo, y se publica.
    const form = await t.mutation(api.forms.create, {
      projectId: s.projectId,
      kind: "record",
      name: "Inspección de vehículos",
    });
    await t.mutation(api.formVersions.saveDraft, {
      id: form,
      sections: inspection(vehicles.formId),
    });
    await t.mutation(api.formVersions.publish, { id: form });

    await expect(
      t.mutation(api.formVersions.publish, { id: vehicles.formId }),
    ).rejects.toThrow(
      formsErrors.fieldInUse("SOAT", "Inspección de vehículos"),
    );
  });

  it("un listado que otro formato usa no se elimina, y dice cuáles", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    authState.userId = s.adminId;
    const vehicles = await seedForm(t, {
      projectId: s.projectId,
      createdBy: s.adminId,
      sections: VEHICLES,
      kind: "catalog",
      name: "Vehículos",
      titleFieldId: "placa",
    });
    const published = await seedForm(t, {
      projectId: s.projectId,
      createdBy: s.adminId,
      sections: inspection(vehicles.formId),
      name: "Inspección de vehículos",
    });
    // Otro lo usa sólo en su borrador: también cuenta.
    const draft = await t.mutation(api.forms.create, {
      projectId: s.projectId,
      kind: "record",
      name: "Control de combustible",
    });
    await t.mutation(api.formVersions.saveDraft, {
      id: draft,
      sections: inspection(vehicles.formId),
    });

    await expect(
      t.mutation(api.forms.remove, { id: vehicles.formId }),
    ).rejects.toThrow(
      formsErrors.usedBy(["Inspección de vehículos", "Control de combustible"]),
    );

    await t.mutation(api.forms.remove, { id: published.formId });
    await expect(
      t.mutation(api.forms.remove, { id: vehicles.formId }),
    ).rejects.toThrow(formsErrors.usedBy(["Control de combustible"]));

    await t.mutation(api.forms.remove, { id: draft });
    await t.mutation(api.forms.remove, { id: vehicles.formId });
    expect(await t.run((ctx) => ctx.db.get(vehicles.formId))).toBeNull();
  });

  it("un elemento que alguna respuesta eligió no se puede borrar: no hay cómo", async () => {
    // No existe ninguna mutation pública que borre un elemento. Lo único que
    // se puede hacer con él es inactivarlo, y eso lo conserva.
    expect(Object.keys(formEntries).sort()).toEqual([
      "createEntry",
      "getReferencePreview",
      "listEntries",
      "listEntryHistory",
      "rebuildTitles",
      "searchEntries",
      "setEntryActive",
      "updateEntry",
    ]);
  });
});
