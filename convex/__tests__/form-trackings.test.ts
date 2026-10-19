import { beforeEach, describe, expect, it, vi } from "vitest";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { field, section, selectField } from "../lib/__tests__/form.fixtures";
import {
  formImportsErrors,
  formProblems,
  formResponsesErrors,
  formTrackingsErrors,
} from "../lib/error_messages";
import { addDays } from "../lib/date_buckets";
import { todayInColombia } from "../lib/dates";
import type { FormSection, FormValues } from "../lib/form_types";
import { RESULT_PROBLEMS } from "../lib/result_definition";
import { validateForm } from "../lib/form_validation";
import { fromStoredValues } from "../lib/stored_values";
import {
  drainScheduled,
  grant,
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
  return { ...actual, getAuthUserId: async () => authState.userId };
});

/** Una acción correctiva en tres etapas: quien reporta, quien planea y quien
 *  verifica. */
const STAGES: FormSection[] = [
  section("hallazgo", 1, [
    field("que", { label: "Qué se encontró", required: true }),
    selectField("origen", ["Inspección", "Auditoría"], { label: "Origen" }),
  ]),
  section("plan", 2, [
    field("accion", { label: "Acción", required: true }),
    field("compromiso", { type: "date", label: "Fecha de compromiso" }),
  ]),
  section("cierre", 3, [
    selectField("eficaz", ["Sí", "No"], { label: "¿Fue eficaz?", required: true }),
  ]),
];

let t: TestConvex;
let s: Seed;
let formId: Id<"forms">;

const open = (values: FormValues) =>
  t.mutation(api.formTrackings.open, { formId, values: stored(STAGES, values) });
const complete = (id: Id<"formResponses">, values: FormValues) =>
  t.mutation(api.formTrackings.completeStage, {
    id,
    values: stored(STAGES, values),
  });
const issueOf = (id: Id<"formResponses">) => t.run((ctx) => ctx.db.get(id));
const list = (state: "open" | "closed") =>
  t.query(api.formTrackings.list, { projectId: s.projectId, state });

beforeEach(async () => {
  t = setupTest();
  s = await seedProject(t);
  ({ formId } = await seedForm(t, {
    projectId: s.projectId,
    createdBy: s.ownerId,
    sections: STAGES,
    kind: "tracking",
    name: "Acciones correctivas",
    titleFieldId: "que",
  }));
  await t.run((ctx) =>
    ctx.db.patch(formId, { dueDateFieldId: "compromiso", numberPrefix: "AC" }),
  );
  authState.userId = s.ownerId;
});

describe("validateForm en un seguimiento", () => {
  it("cada etapa tiene campos, ninguna va condicionada y el título se escribe al abrir", () => {
    const codes = (sections: FormSection[], titleFieldId?: string) =>
      validateForm(sections, { kind: "tracking", titleFieldId }).map(
        (problem) => problem.message,
      );
    expect(codes(STAGES, "que")).toEqual([]);
    expect(codes(STAGES, "accion")).toEqual([
      formProblems.titleFieldNotFirstStage,
    ]);
    expect(codes([...STAGES, section("vacia", 4, [])], "que")).toEqual([
      formProblems.stageEmpty,
    ]);
    expect(
      codes(
        [
          STAGES[0],
          {
            ...STAGES[1],
            visibility: {
              match: "all",
              rules: [{ fieldId: "origen", operator: "eq", values: ["Auditoría"] }],
            },
          },
        ],
        "que",
      ),
    ).toEqual([formProblems.stageConditional]);
  });
});

describe("formTrackings.open", () => {
  it("abre con la primera etapa, su consecutivo y su título", async () => {
    const id = await open({ que: "  Extintor   vencido ", accion: "No es de aquí" });
    const second = await open({ que: "Botiquín incompleto" });

    const issue = await issueOf(id);
    expect(issue).toMatchObject({
      status: "open",
      number: 1,
      title: "Extintor vencido",
      submittedBy: s.ownerId,
    });
    expect(issue?.stages).toMatchObject([
      { sectionId: "hallazgo", completedBy: s.ownerId },
    ]);
    // Lo de otra etapa no se guarda al abrir.
    expect(Object.keys(fromStoredValues(issue?.values ?? []))).toEqual(["que"]);
    expect((await issueOf(second))?.number).toBe(2);
    expect((await t.run((ctx) => ctx.db.get(formId)))?.responseCount).toBe(2);
  });

  it("exige lo obligatorio de la primera etapa, y sólo eso", async () => {
    await expect(open({ origen: "Auditoría" })).rejects.toThrow(
      "Qué se encontró",
    );
  });

  it("pide la llave de diligenciar, y no se diligencia ni se importa", async () => {
    authState.userId = s.plainId;
    await expect(open({ que: "Algo" })).rejects.toThrow(
      formTrackingsErrors.insufficientPermissions,
    );
    authState.userId = s.outsiderId;
    await expect(open({ que: "Algo" })).rejects.toThrow(
      formTrackingsErrors.insufficientPermissions,
    );

    authState.userId = s.ownerId;
    await expect(
      t.mutation(api.formResponses.submit, {
        formId,
        values: stored(STAGES, { que: "Algo" }),
      }),
    ).rejects.toThrow(formResponsesErrors.notRecord);
    await expect(
      t.mutation(api.formImports.start, {
        formId,
        fileName: "a.xlsx",
        fingerprint: "x",
        mode: "add",
        total: 1,
      }),
    ).rejects.toThrow(formImportsErrors.invalidMode);
  });
});

describe("formTrackings.completeStage", () => {
  it("avanza en orden, no toca lo ya completado y cierra con la última", async () => {
    const id = await open({ que: "Extintor vencido", origen: "Inspección" });

    // Quien completa la segunda intenta reescribir la primera: no puede.
    await complete(id, {
      que: "Otra cosa",
      accion: "Recargar",
      compromiso: "2030-01-15",
      eficaz: "Sí",
    });
    let issue = await issueOf(id);
    expect(fromStoredValues(issue?.values ?? [])).toEqual({
      que: "Extintor vencido",
      origen: "Inspección",
      accion: "Recargar",
      compromiso: "2030-01-15",
    });
    expect(issue).toMatchObject({ status: "open", dueDate: "2030-01-15" });
    expect(issue?.stages?.map((stage) => stage.sectionId)).toEqual([
      "hallazgo",
      "plan",
    ]);

    authState.userId = s.adminId;
    await complete(id, { eficaz: "Sí" });
    issue = await issueOf(id);
    expect(issue?.status).toBe("closed");
    expect(issue?.closedAt).toBeTypeOf("number");
    expect(issue?.stages?.[2]).toMatchObject({ completedBy: s.adminId });

    await expect(complete(id, { eficaz: "No" })).rejects.toThrow(
      formTrackingsErrors.notOpen,
    );
  });

  it("exige lo obligatorio de la etapa que toca", async () => {
    const id = await open({ que: "Extintor vencido" });
    await expect(complete(id, { compromiso: "2030-01-15" })).rejects.toThrow(
      "Acción",
    );
  });

  it("sigue con la versión con que se abrió", async () => {
    const id = await open({ que: "Extintor vencido" });
    // El formato publica una versión sin la etapa de plan.
    await t.run(async (ctx) => {
      const versionId = await ctx.db.insert("formVersions", {
        formId,
        projectId: s.projectId,
        number: 2,
        status: "published",
        sections: [STAGES[0], STAGES[2]] as never,
      });
      await ctx.db.patch(formId, { publishedVersionId: versionId });
    });
    await complete(id, { accion: "Recargar" });
    expect((await issueOf(id))?.stages).toHaveLength(2);
    expect((await issueOf(id))?.status).toBe("open");
  });

  it("alguien de otro proyecto no completa", async () => {
    const id = await open({ que: "Extintor vencido" });
    authState.userId = s.outsiderId;
    await expect(complete(id, { accion: "x" })).rejects.toThrow(
      formTrackingsErrors.insufficientPermissions,
    );
  });
});

describe("formTrackings.list y la respuesta", () => {
  it("la bandeja separa abiertos y cerrados, con su código y su etapa", async () => {
    const late = await open({ que: "Sin fecha" });
    const soon = await open({ que: "Con fecha" });
    await complete(soon, { accion: "Recargar", compromiso: "2026-01-10" });
    const done = await open({ que: "Resuelto" });
    await complete(done, { accion: "Cambiar" });
    await complete(done, { eficaz: "Sí" });

    const opened = await list("open");
    expect(
      opened.rows.map((row) => [row.code, row.title, row.stage, row.dueDate]),
    ).toEqual([
      [`AC-${opened.rows[0].date.slice(0, 4)}-002`, "Con fecha", "cierre", "2026-01-10"],
      [`AC-${opened.rows[0].date.slice(0, 4)}-001`, "Sin fecha", "plan", null],
    ]);
    expect(opened.capped).toBe(false);
    expect((await list("closed")).rows.map((row) => row.title)).toEqual([
      "Resuelto",
    ]);
    void late;
  });

  it("quien no ve las respuestas de todos recibe sólo los que abrió", async () => {
    await open({ que: "Del propietario" });
    await grant(t, s.roleId, "fillForms");
    authState.userId = s.roleHolderId;
    await open({ que: "De la inspectora" });

    expect((await list("open")).rows.map((row) => row.title)).toEqual([
      "De la inspectora",
    ]);
    authState.userId = s.plainId;
    await expect(list("open")).rejects.toThrow(
      formTrackingsErrors.insufficientPermissions,
    );
    authState.userId = s.outsiderId;
    await expect(list("open")).rejects.toThrow(
      formTrackingsErrors.insufficientPermissions,
    );
  });

  it("abrir el asunto enseña sus etapas y si se puede completar", async () => {
    const id = await open({ que: "Extintor vencido" });
    const issue = await t.query(api.formResponses.getById, { id });
    expect(issue?.tracking).toMatchObject({
      canComplete: true,
      stages: [
        { sectionId: "hallazgo", completedBy: { name: "Propietaria" } },
        { sectionId: "plan", completedAt: null, completedBy: null },
        { sectionId: "cierre", completedAt: null },
      ],
    });
    expect(issue?.tracking?.code).toMatch(/^AC-\d{4}-001$/);
  });

  it("un asunto se anula con motivo, y deja de poder completarse", async () => {
    const id = await open({ que: "Duplicado" });
    await t.mutation(api.formResponses.void, {
      id,
      reason: "Se abrió dos veces",
    });
    await drainScheduled(t);
    expect((await issueOf(id))?.status).toBe("voided");
    expect((await list("open")).rows).toEqual([]);
    await expect(complete(id, { accion: "x" })).rejects.toThrow(
      formTrackingsErrors.notOpen,
    );
  });
});

describe("formTrackings.configure", () => {
  it("declara fecha, responsable y prefijo, comprobando el tipo de cada campo", async () => {
    await expect(
      t.mutation(api.formTrackings.configure, {
        formId,
        dueDateFieldId: "accion",
      }),
    ).rejects.toThrow(formTrackingsErrors.fieldNotDate);
    await expect(
      t.mutation(api.formTrackings.configure, {
        formId,
        responsibleFieldId: "compromiso",
      }),
    ).rejects.toThrow(formTrackingsErrors.fieldNotReference);
    await expect(
      t.mutation(api.formTrackings.configure, { formId, numberPrefix: "A C" }),
    ).rejects.toThrow(formTrackingsErrors.invalidPrefix);

    await t.mutation(api.formTrackings.configure, {
      formId,
      dueDateFieldId: "compromiso",
      numberPrefix: "pm",
    });
    await drainScheduled(t);
    expect(await t.run((ctx) => ctx.db.get(formId))).toMatchObject({
      dueDateFieldId: "compromiso",
      numberPrefix: "PM",
    });

    authState.userId = s.plainId;
    await expect(
      t.mutation(api.formTrackings.configure, { formId }),
    ).rejects.toThrow(formTrackingsErrors.insufficientPermissions);
  });
});

describe("formResults sobre un seguimiento", () => {
  // `open` pone la fecha de hoy: el periodo se mide desde ella.
  const today = todayInColombia(Date.now());
  const range = { from: addDays(today, -7), to: today, today };
  const compute = () => t.query(api.formResults.compute, { formId, ...range });
  const closeIt = async (id: Id<"formResponses">) => {
    await complete(id, { accion: "Recargar", compromiso: "2020-01-15" });
    await complete(id, { eficaz: "Sí" });
  };

  beforeEach(async () => {
    await t.mutation(api.formResults.create, {
      formId,
      name: "Cierre",
      config: { type: "tracking" },
    });
    await t.mutation(api.formResults.create, {
      formId,
      name: "Por origen",
      config: {
        type: "distribution",
        byFieldId: "origen",
        measure: { operation: "count" },
      },
    });
  });

  it("dice cuánto se abrió, cuánto se cerró y qué sigue abierto y vencido", async () => {
    const closed = await open({ que: "Extintor sin presión", origen: "Auditoría" });
    await closeIt(closed);
    const late = await open({ que: "Botiquín incompleto", origen: "Inspección" });
    // La segunda etapa trae el compromiso, ya pasado: queda abierto y vencido.
    await complete(late, { accion: "Reponer", compromiso: "2020-01-15" });
    await open({ que: "Camilla sin correas", origen: "Inspección" });

    const [tracking, byOrigin] = (await compute())?.results ?? [];
    expect(tracking.data).toMatchObject({
      type: "tracking",
      open: 2,
      overdue: 1,
      opened: 3,
      closed: 1,
      averageDays: 0,
    });
    if (tracking.data.type !== "tracking") throw new Error("tipo");
    expect(tracking.data.pending.map((one) => one.title)).toEqual([
      "Botiquín incompleto",
      "Camilla sin correas",
    ]);
    expect(tracking.data.pending[0]).toMatchObject({
      code: `AC-${today.slice(0, 4)}-002`,
      dueDate: "2020-01-15",
    });
    // Los demás tipos calculan sobre los asuntos del periodo.
    expect(byOrigin.data).toMatchObject({
      rows: [
        { key: "Inspección", value: 2 },
        { key: "Auditoría", value: 1 },
      ],
    });
  });

  it("un asunto anulado no cuenta", async () => {
    const id = await open({ que: "Duplicado", origen: "Inspección" });
    await t.mutation(api.formResponses.void, { id, reason: "Estaba repetido" });
    const [tracking] = (await compute())?.results ?? [];
    expect(tracking.data).toMatchObject({ open: 0, opened: 0, percent: null });
    await drainScheduled(t);
  });

  it("es de quien ve las respuestas de todos, y no de otro proyecto", async () => {
    await open({ que: "Extintor sin presión", origen: "Auditoría" });
    authState.userId = s.outsiderId;
    expect(await compute()).toBeNull();
    authState.userId = s.roleHolderId;
    expect(await compute()).toBeNull();
    await grant(t, s.roleId, "viewResponses");
    expect((await compute())?.results).toHaveLength(2);
  });

  it("no admite los resultados que son de una inspección", async () => {
    await expect(
      t.mutation(api.formResults.create, {
        formId,
        name: "Programa",
        config: {
          type: "coverage",
          byFieldId: "origen",
          interval: "day",
          scope: "seen",
        },
      }),
    ).rejects.toThrow(RESULT_PROBLEMS.typeNotAllowed);
  });

  it("la siembra de demostración abre asuntos con su fecha y cierra una parte", async () => {
    const seeded = await t.mutation(internal.demoData.seedIssues, {
      projectId: s.projectId,
      formId,
      date: "2020-03-02",
      count: 6,
      closeRate: 1,
      closeWithin: 5,
      hints: { que: { texts: ["Extintor sin presión"] } },
    });
    expect(seeded).toEqual({ opened: 6, closed: 6 });

    const computed = await t.query(api.formResults.compute, {
      formId,
      from: "2020-03-01",
      to: "2020-03-31",
      today: "2020-04-01",
    });
    const [tracking] = computed?.results ?? [];
    expect(tracking.data).toMatchObject({
      open: 0,
      opened: 6,
      closed: 6,
      percent: 100,
    });
    if (tracking.data.type !== "tracking") throw new Error("tipo");
    expect(tracking.data.averageDays).toBeGreaterThanOrEqual(1);
    expect(tracking.data.averageDays).toBeLessThanOrEqual(5);

    // El consecutivo sigue desde donde lo dejó la siembra.
    const form = await t.run((ctx) => ctx.db.get(formId));
    expect(form?.lastNumber).toEqual({ year: 2020, value: 6 });
    expect(form?.responseCount).toBe(6);
  });
});
