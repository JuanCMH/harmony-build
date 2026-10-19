import { describe, expect, it, vi } from "vitest";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import {
  checklistField,
  field,
  oneSection,
  referenceField,
  selectField,
  signatureField,
} from "../lib/__tests__/form.fixtures";
import { formImportsErrors, valueProblems } from "../lib/error_messages";
import type { FormSection, FormValues } from "../lib/form_types";
import { IMPORT_LIMITS } from "../lib/import_types";
import { fromStoredValues } from "../lib/stored_values";
import {
  drainScheduled,
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
  field("foto", { type: "image", label: "Foto", required: true }),
);

/** La inspección diaria que la empresa llevaba en un formulario de hojas de
 *  cálculo: vehículo, kilometraje, lista de chequeo y firma. */
const inspection = (vehicles: string): FormSection[] =>
  oneSection(
    referenceField("vehiculo", vehicles, ["tipo", "soat"], {
      label: "Vehículo",
      required: true,
    }),
    field("km", { type: "number", label: "Kilometraje", required: true }),
    checklistField("revision", { label: "Revisión", required: true }),
    signatureField("firma", "author", { label: "Firma", required: true }),
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
  return { vehicles, form, sections };
}

type Fleet = Awaited<ReturnType<typeof seedFleet>>;

const begin = (
  t: TestConvex,
  formId: Id<"forms">,
  total: number,
  mode: "add" | "skip" | "update" = "add",
) =>
  t.mutation(api.formImports.start, {
    formId,
    fileName: "historia.xlsx",
    fingerprint: "abc123",
    mode,
    total,
  });

/** Importa un listado de vehículos como administrador y devuelve sus ids por
 *  placa. */
async function importVehicles(
  t: TestConvex,
  fleet: Fleet,
  rows: FormValues[],
  mode: "skip" | "update" = "skip",
) {
  const importId = await begin(t, fleet.vehicles.formId, rows.length, mode);
  const result = await t.mutation(api.formImports.writeBatch, {
    importId,
    rows: rows.map((values, index) => ({
      row: index + 2,
      values: stored(VEHICLES, values),
    })),
  });
  await t.mutation(api.formImports.finish, { importId });
  return { importId, result };
}

const entriesByTitle = async (t: TestConvex, formId: Id<"forms">) =>
  new Map(
    (await responsesOf(t, formId)).map((entry) => [entry.title ?? "", entry]),
  );

const responsesOf = (t: TestConvex, formId: Id<"forms">) =>
  t.run(async (ctx) =>
    ctx.db
      .query("formResponses")
      .withIndex("formId", (q) => q.eq("formId", formId))
      .collect(),
  );

const countOf = (t: TestConvex, formId: Id<"forms">) =>
  t.run(async (ctx) => (await ctx.db.get(formId))?.responseCount);

describe("formImports: quién puede", () => {
  it("exige la llave de importar: diligenciar no basta", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const fleet = await seedFleet(t, s);
    const formId = fleet.vehicles.formId;

    await grant(t, s.roleId, "fillForms", "viewResponses", "editCatalogs");
    for (const userId of [s.roleHolderId, s.plainId, s.outsiderId]) {
      authState.userId = userId;
      await expect(begin(t, formId, 1, "skip")).rejects.toThrow(
        formImportsErrors.insufficientPermissions,
      );
    }
    authState.userId = null;
    await expect(begin(t, formId, 1, "skip")).rejects.toThrow(
      formImportsErrors.userNotAuthenticated,
    );

    await grant(t, s.roleId, "importResponses");
    authState.userId = s.roleHolderId;
    await expect(begin(t, formId, 1, "skip")).resolves.toBeTruthy();
    authState.userId = s.ownerId;
    await expect(begin(t, formId, 1, "skip")).resolves.toBeTruthy();
  });

  it("alguien de otro proyecto no escribe, cierra, deshace ni lee", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const fleet = await seedFleet(t, s);
    authState.userId = s.adminId;
    const importId = await begin(t, fleet.vehicles.formId, 1, "skip");

    authState.userId = s.outsiderId;
    const denied = formImportsErrors.insufficientPermissions;
    await expect(
      t.mutation(api.formImports.writeBatch, { importId, rows: [] }),
    ).rejects.toThrow(denied);
    await expect(
      t.mutation(api.formImports.finish, { importId }),
    ).rejects.toThrow(denied);
    await expect(
      t.mutation(api.formImports.revert, { importId }),
    ).rejects.toThrow(denied);
    await expect(
      t.query(api.formImports.list, { formId: fleet.vehicles.formId }),
    ).rejects.toThrow(denied);
    await expect(
      t.query(api.formImports.entryTitles, {
        formId: fleet.vehicles.formId,
        paginationOpts: FIRST_PAGE,
      }),
    ).rejects.toThrow(denied);
  });

  it("sólo quien la empezó la continúa", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const fleet = await seedFleet(t, s);
    authState.userId = s.adminId;
    const importId = await begin(t, fleet.vehicles.formId, 1, "skip");

    authState.userId = s.ownerId;
    await expect(
      t.mutation(api.formImports.writeBatch, { importId, rows: [] }),
    ).rejects.toThrow(formImportsErrors.notOwnImport);
    await expect(
      t.mutation(api.formImports.finish, { importId }),
    ).rejects.toThrow(formImportsErrors.notOwnImport);
  });

  it("la lista la ve quien consulta las respuestas, sin poder deshacer", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const fleet = await seedFleet(t, s);
    authState.userId = s.adminId;
    await importVehicles(t, fleet, [{ placa: "SLP835" }]);

    await grant(t, s.roleId, "viewResponses");
    authState.userId = s.roleHolderId;
    const list = await t.query(api.formImports.list, {
      formId: fleet.vehicles.formId,
    });
    expect(list).toMatchObject([
      {
        fileName: "historia.xlsx",
        fingerprint: "abc123",
        status: "done",
        author: "Administrador",
        canRevert: false,
        counts: { total: 1, created: 1 },
      },
    ]);
  });
});

describe("formImports.start", () => {
  it("rechaza lo que no cuadra", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const fleet = await seedFleet(t, s);
    authState.userId = s.adminId;

    // Un formato añade; un listado omite o actualiza.
    await expect(begin(t, fleet.form.formId, 1, "skip")).rejects.toThrow(
      formImportsErrors.invalidMode,
    );
    await expect(begin(t, fleet.vehicles.formId, 1, "add")).rejects.toThrow(
      formImportsErrors.invalidMode,
    );
    for (const total of [0, 1.5, IMPORT_LIMITS.maxRows + 1]) {
      await expect(begin(t, fleet.form.formId, total)).rejects.toThrow(
        formImportsErrors.invalidTotal,
      );
    }
    await expect(
      t.mutation(api.formImports.start, {
        formId: fleet.form.formId,
        fileName: "   ",
        fingerprint: "abc",
        mode: "add",
        total: 1,
      }),
    ).rejects.toThrow(formImportsErrors.invalidFileName);

    const draft = await seedForm(t, {
      projectId: s.projectId,
      createdBy: s.adminId,
      sections: VEHICLES,
      status: "draft",
    });
    await expect(begin(t, draft.formId, 1)).rejects.toThrow(
      formImportsErrors.formNotPublished,
    );
  });

  it("deja constancia en la auditoría, sobre el formato", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const fleet = await seedFleet(t, s);
    authState.userId = s.adminId;
    await begin(t, fleet.form.formId, 320);

    const logs = await t.run(async (ctx) => ctx.db.query("logs").collect());
    expect(logs).toMatchObject([
      {
        description:
          "Importación en Inspección de vehículos: historia.xlsx (320 filas)",
        affectedEntityType: "form",
        affectedEntityId: fleet.form.formId,
        userId: s.adminId,
      },
    ]);
  });
});

describe("formImports.writeBatch en un formato", () => {
  async function ready(rows = 3) {
    const t = setupTest();
    const s = await seedProject(t);
    const fleet = await seedFleet(t, s);
    authState.userId = s.adminId;
    await importVehicles(t, fleet, [
      { placa: "SLP835", tipo: "furgon", soat: "111" },
      { placa: "TRK402", tipo: "mezcladora", soat: "222" },
    ]);
    const vehicles = await entriesByTitle(t, fleet.vehicles.formId);
    const importId = await begin(t, fleet.form.formId, rows);
    const values = (extra: FormValues) =>
      stored(fleet.sections, {
        vehiculo: pick(vehicles.get("SLP835")?._id ?? ""),
        km: 1200,
        ...extra,
      });
    return { t, s, fleet, vehicles, importId, values };
  }

  it("escribe respuestas con la fecha del hecho, marcadas y sin firma", async () => {
    const { t, s, fleet, vehicles, importId, values } = await ready(2);

    const result = await t.mutation(api.formImports.writeBatch, {
      importId,
      rows: [
        {
          row: 2,
          date: "2025-11-03",
          values: values({ revision: [{ itemId: "aceite", value: "m" }] }),
        },
        { row: 3, date: "2025-11-04", values: values({ km: 1260 }) },
      ],
    });
    expect(result).toEqual({
      counts: { total: 2, created: 2, updated: 0, skipped: 0, rejected: 0 },
      problems: [],
    });

    const responses = await responsesOf(t, fleet.form.formId);
    expect(responses.map((response) => response.date)).toEqual([
      "2025-11-03",
      "2025-11-04",
    ]);
    expect(responses[0]).toMatchObject({
      importId,
      submittedBy: s.adminId,
      status: "submitted",
      versionId: fleet.form.publishedVersionId,
    });
    // La relación la compuso el servidor, con su instantánea.
    expect(fromStoredValues(responses[0].values).vehiculo).toMatchObject({
      responseId: vehicles.get("SLP835")?._id,
      label: "SLP835",
      snapshot: [
        { fieldId: "tipo", text: "furgon" },
        { fieldId: "soat", text: "111" },
      ],
    });
    expect(await countOf(t, fleet.form.formId)).toBe(2);

    const links = await t.run(async (ctx) =>
      ctx.db
        .query("formResponseLinks")
        .withIndex("targetResponseId", (q) =>
          q.eq("targetResponseId", vehicles.get("SLP835")?._id as never),
        )
        .collect(),
    );
    expect(links.map((link) => link.date)).toEqual([
      "2025-11-03",
      "2025-11-04",
    ]);
  });

  it("una fila mala no tumba el lote: vuelve con su motivo", async () => {
    const { t, s, fleet, importId, values } = await ready(6);
    // Un elemento de otro proyecto: no es de esta relación ni de este ámbito.
    const foreign = await seedForm(t, {
      projectId: s.otherProjectId,
      createdBy: s.outsiderId,
      sections: VEHICLES,
      kind: "catalog",
      titleFieldId: "placa",
    });
    const foreignEntry = await t.run(async (ctx) =>
      ctx.db.insert("formResponses", {
        formId: foreign.formId,
        projectId: s.otherProjectId,
        versionId: foreign.publishedVersionId as Id<"formVersions">,
        date: "2025-01-01",
        submittedBy: s.outsiderId,
        status: "submitted",
        title: "AJENO1",
        titleSearch: "ajeno1",
        active: true,
        values: [],
      }),
    );

    const result = await t.mutation(api.formImports.writeBatch, {
      importId,
      rows: [
        { row: 2, date: "2025-11-03", values: values({}) },
        { row: 3, values: values({}) },
        { row: 4, date: "2025-02-30", values: values({}) },
        { row: 5, date: "2099-01-01", values: values({}) },
        { row: 6, date: "2025-11-05", values: values({ km: undefined }) },
        {
          row: 7,
          date: "2025-11-06",
          values: values({ vehiculo: pick(foreignEntry) }),
        },
      ],
    });

    expect(result.counts).toMatchObject({ created: 1, rejected: 5 });
    expect(result.problems.map((problem) => problem.row)).toEqual([
      3, 4, 5, 6, 7,
    ]);
    expect(result.problems[0].message).toBe(formImportsErrors.rowDateMissing);
    expect(result.problems[1].message).toBe(formImportsErrors.rowDateMissing);
    expect(result.problems[2].message).toBe(formImportsErrors.rowDateInFuture);
    expect(result.problems[3].message).toContain("Kilometraje");
    expect(result.problems[4].message).toContain("Vehículo");
    expect(await responsesOf(t, fleet.form.formId)).toHaveLength(1);
    expect(await countOf(t, fleet.form.formId)).toBe(1);
  });

  it("admite un elemento inactivo: lo importado pasó cuando estaba activo", async () => {
    const { t, fleet, vehicles, importId, values } = await ready(1);
    const retired = vehicles.get("TRK402")?._id ?? "";
    await t.run(async (ctx) => {
      await ctx.db.patch(retired as Id<"formResponses">, { active: false });
    });

    const result = await t.mutation(api.formImports.writeBatch, {
      importId,
      rows: [
        {
          row: 2,
          date: "2025-11-06",
          values: values({ vehiculo: pick(retired) }),
        },
      ],
    });
    expect(result.counts).toMatchObject({ created: 1, rejected: 0 });
    const [response] = await responsesOf(t, fleet.form.formId);
    expect(fromStoredValues(response.values).vehiculo).toMatchObject({
      label: "TRK402",
    });
  });

  it("valida lo demás como siempre: una opción que la escala no tiene", async () => {
    const { t, importId, values } = await ready(1);
    const result = await t.mutation(api.formImports.writeBatch, {
      importId,
      rows: [
        {
          row: 2,
          date: "2025-11-03",
          values: values({
            revision: [{ itemId: "aceite", value: "regular" }],
          }),
        },
      ],
    });
    expect(result.problems).toEqual([
      {
        row: 2,
        message: `«Revisión»: ${valueProblems.checklistOptionMissing}`,
      },
    ]);
  });

  it("no acepta más de un lote de filas ni más de las anunciadas", async () => {
    const { t, importId, values } = await ready(1);
    const row = { row: 2, date: "2025-11-03", values: values({}) };

    await expect(
      t.mutation(api.formImports.writeBatch, {
        importId,
        rows: Array.from({ length: IMPORT_LIMITS.batchSize + 1 }, () => row),
      }),
    ).rejects.toThrow(formImportsErrors.batchTooLarge);
    await expect(
      t.mutation(api.formImports.writeBatch, { importId, rows: [row, row] }),
    ).rejects.toThrow(formImportsErrors.overTotal);
  });

  it("una importación cerrada no admite más filas", async () => {
    const { t, importId, values } = await ready(2);
    await t.mutation(api.formImports.finish, { importId });
    await expect(
      t.mutation(api.formImports.writeBatch, {
        importId,
        rows: [{ row: 2, date: "2025-11-03", values: values({}) }],
      }),
    ).rejects.toThrow(formImportsErrors.notRunning);
    await expect(
      t.mutation(api.formImports.finish, { importId }),
    ).rejects.toThrow(formImportsErrors.notRunning);
  });

  it("la respuesta dice que es importada, y el listado ordena por fecha", async () => {
    const { t, fleet, importId, values } = await ready(2);
    // La más reciente llega primero en el archivo.
    await t.mutation(api.formImports.writeBatch, {
      importId,
      rows: [
        { row: 2, date: "2025-11-09", values: values({}) },
        { row: 3, date: "2025-11-03", values: values({}) },
      ],
    });

    const page = await t.query(api.formResponses.list, {
      formId: fleet.form.formId,
      paginationOpts: FIRST_PAGE,
    });
    expect(page.page.map((row) => [row.date, row.imported])).toEqual([
      ["2025-11-09", true],
      ["2025-11-03", true],
    ]);

    const response = await t.query(api.formResponses.getById, {
      id: page.page[0]._id,
    });
    expect(response?.imported).toMatchObject({
      fileName: "historia.xlsx",
      by: { name: "Administrador" },
    });
  });
});

describe("formImports.writeBatch en un listado", () => {
  it("crea elementos sin exigir la foto, y exige el título", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const fleet = await seedFleet(t, s);
    authState.userId = s.adminId;

    const { importId, result } = await importVehicles(t, fleet, [
      { placa: "  slp   835 ", tipo: "furgon" },
      { tipo: "mezcladora" },
      { placa: "TRK402", tipo: "volqueta" },
    ]);
    expect(result.counts).toMatchObject({ created: 1, rejected: 2 });
    expect(result.problems.map((problem) => problem.message)).toEqual([
      formImportsErrors.rowTitleMissing,
      `«Tipo»: ${valueProblems.optionMissing}`,
    ]);

    const entries = await entriesByTitle(t, fleet.vehicles.formId);
    expect(entries.get("slp 835")).toMatchObject({
      importId,
      active: true,
      titleSearch: "slp 835",
    });
    expect(await countOf(t, fleet.vehicles.formId)).toBe(1);
  });

  it("omite el título que ya existe, sin distinguir mayúsculas ni tildes", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const fleet = await seedFleet(t, s);
    authState.userId = s.adminId;
    await importVehicles(t, fleet, [{ placa: "Camión 1", soat: "111" }]);

    const { result } = await importVehicles(t, fleet, [
      { placa: "CAMION 1", soat: "999" },
      { placa: "Camión 2", soat: "222" },
    ]);
    expect(result.counts).toMatchObject({ created: 1, skipped: 1 });

    const entries = await entriesByTitle(t, fleet.vehicles.formId);
    expect(fromStoredValues(entries.get("Camión 1")?.values ?? []).soat).toBe(
      "111",
    );
    expect(await countOf(t, fleet.vehicles.formId)).toBe(2);
  });

  it("actualiza lo que el archivo trae y conserva lo demás", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const fleet = await seedFleet(t, s);
    authState.userId = s.adminId;
    const first = await importVehicles(t, fleet, [
      { placa: "SLP835", tipo: "furgon", soat: "111" },
    ]);

    authState.userId = s.ownerId;
    const { importId, result } = await importVehicles(
      t,
      fleet,
      [{ placa: "slp835", soat: "999" }],
      "update",
    );
    expect(result.counts).toMatchObject({ created: 0, updated: 1 });

    const entry = (await entriesByTitle(t, fleet.vehicles.formId)).get(
      "slp835",
    );
    expect(fromStoredValues(entry?.values ?? [])).toMatchObject({
      placa: "slp835",
      tipo: "furgon",
      soat: "999",
    });
    // Sigue siendo de la importación que lo creó, y de quien lo creó.
    expect(entry).toMatchObject({
      importId: first.importId,
      submittedBy: s.adminId,
      updatedBy: s.ownerId,
    });
    expect(entry?.importId).not.toBe(importId);
    expect(await countOf(t, fleet.vehicles.formId)).toBe(1);
  });

  it("entrega los títulos a quien importa", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const fleet = await seedFleet(t, s);
    authState.userId = s.adminId;
    await importVehicles(t, fleet, [{ placa: "TRK402" }, { placa: "SLP835" }]);

    await grant(t, s.roleId, "importResponses");
    authState.userId = s.roleHolderId;
    const titles = await t.query(api.formImports.entryTitles, {
      formId: fleet.vehicles.formId,
      paginationOpts: FIRST_PAGE,
    });
    expect(titles.page.map((entry) => [entry.title, entry.active])).toEqual([
      ["SLP835", true],
      ["TRK402", true],
    ]);
    await expect(
      t.query(api.formImports.entryTitles, {
        formId: fleet.form.formId,
        paginationOpts: FIRST_PAGE,
      }),
    ).rejects.toThrow(formImportsErrors.notCatalog);
  });
});

describe("formImports.revert", () => {
  it("retira las respuestas de la importación, sus relaciones y su cuenta", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const fleet = await seedFleet(t, s);
    authState.userId = s.adminId;
    await importVehicles(t, fleet, [{ placa: "SLP835" }]);
    const vehicle = (await entriesByTitle(t, fleet.vehicles.formId)).get(
      "SLP835",
    );
    const values = stored(fleet.sections, {
      vehiculo: pick(vehicle?._id ?? ""),
      km: 10,
    });

    // Una respuesta de otra importación, que tiene que seguir ahí.
    const kept = await begin(t, fleet.form.formId, 1);
    await t.mutation(api.formImports.writeBatch, {
      importId: kept,
      rows: [{ row: 2, date: "2025-10-01", values }],
    });
    const importId = await begin(t, fleet.form.formId, 2);
    await t.mutation(api.formImports.writeBatch, {
      importId,
      rows: [
        { row: 2, date: "2025-11-03", values },
        { row: 3, date: "2025-11-04", values },
      ],
    });
    expect(await countOf(t, fleet.form.formId)).toBe(3);

    await t.mutation(api.formImports.revert, { importId });
    await t.mutation(internal.formImports.purge, { importId });
    await drainScheduled(t);

    const responses = await responsesOf(t, fleet.form.formId);
    expect(responses.map((response) => response.date)).toEqual(["2025-10-01"]);
    expect(await countOf(t, fleet.form.formId)).toBe(1);
    const links = await t.run(async (ctx) =>
      ctx.db.query("formResponseLinks").collect(),
    );
    expect(links.map((link) => link.date)).toEqual(["2025-10-01"]);

    const record = await t.run(async (ctx) => ctx.db.get(importId));
    expect(record).toMatchObject({ status: "reverted", revertedBy: s.adminId });
    await expect(
      t.mutation(api.formImports.revert, { importId }),
    ).rejects.toThrow(formImportsErrors.alreadyReverted);

    const logs = await t.run(async (ctx) => ctx.db.query("logs").collect());
    expect(logs.at(-1)).toMatchObject({
      description:
        "Importación deshecha en Inspección de vehículos: historia.xlsx (2 respuestas)",
      type: "delete",
      affectedEntityType: "form",
    });
  });

  it("no hace nada si la importación no se deshizo", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const fleet = await seedFleet(t, s);
    authState.userId = s.adminId;
    const { importId } = await importVehicles(t, fleet, [{ placa: "SLP835" }]);

    await t.mutation(internal.formImports.purge, { importId });
    expect(await countOf(t, fleet.vehicles.formId)).toBe(1);
  });

  it("en un listado conserva el elemento que una respuesta ya eligió", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const fleet = await seedFleet(t, s);
    authState.userId = s.adminId;
    const { importId } = await importVehicles(t, fleet, [
      { placa: "SLP835" },
      { placa: "TRK402" },
    ]);
    const used = (await entriesByTitle(t, fleet.vehicles.formId)).get("SLP835");

    const inspections = await begin(t, fleet.form.formId, 1);
    await t.mutation(api.formImports.writeBatch, {
      importId: inspections,
      rows: [
        {
          row: 2,
          date: "2025-11-03",
          values: stored(fleet.sections, {
            vehiculo: pick(used?._id ?? ""),
            km: 10,
          }),
        },
      ],
    });

    await t.mutation(api.formImports.revert, { importId });
    await t.mutation(internal.formImports.purge, { importId });
    // Idempotente: una segunda pasada no encuentra nada que hacer.
    await t.mutation(internal.formImports.purge, { importId });
    await drainScheduled(t);

    const entries = await entriesByTitle(t, fleet.vehicles.formId);
    expect([...entries.keys()]).toEqual(["SLP835"]);
    expect(entries.get("SLP835")?.importId).toBeUndefined();
    expect(await countOf(t, fleet.vehicles.formId)).toBe(1);
  });
});

describe("formImports: cascadas", () => {
  it("la purga del proyecto se lleva las importaciones y no las del vecino", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const fleet = await seedFleet(t, s);
    authState.userId = s.adminId;
    await importVehicles(t, fleet, [{ placa: "SLP835" }]);

    const neighbour = await seedForm(t, {
      projectId: s.otherProjectId,
      createdBy: s.outsiderId,
      sections: VEHICLES,
      kind: "catalog",
      name: "Vehículos",
      titleFieldId: "placa",
    });
    authState.userId = s.outsiderId;
    await begin(t, neighbour.formId, 1, "skip");

    await t.mutation(internal.projects.purgeProjectData, {
      projectId: s.projectId,
    });
    await drainScheduled(t);

    const left = await t.run(async (ctx) =>
      ctx.db.query("formImports").collect(),
    );
    expect(left.map((record) => record.projectId)).toEqual([s.otherProjectId]);
  });

  it("eliminar el formato se lleva el registro de sus importaciones", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const fleet = await seedFleet(t, s);
    authState.userId = s.adminId;
    // Sin filas escritas: el formato sigue sin respuestas y se puede eliminar.
    await begin(t, fleet.form.formId, 5);

    await t.mutation(api.forms.remove, { id: fleet.form.formId });
    const left = await t.run(async (ctx) =>
      ctx.db.query("formImports").collect(),
    );
    expect(left).toEqual([]);
  });
});
