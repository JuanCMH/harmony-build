import { describe, expect, it, vi } from "vitest";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { field, oneSection, selectField } from "../lib/__tests__/form.fixtures";
import {
  formProblems,
  formResponsesErrors,
  formsErrors,
  valueProblems,
} from "../lib/error_messages";
import type { FormSection, FormValues } from "../lib/form_types";
import { fromStoredValues } from "../lib/stored_values";
import {
  drainScheduled,
  FIRST_PAGE,
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

/** El listado de vehículos que el papel tenía en hojas ocultas. */
const VEHICLES: FormSection[] = oneSection(
  field("placa", { label: "Placa", required: true, showInTable: true }),
  selectField("tipo", ["Furgón", "Mezcladora"], {
    label: "Tipo",
    showInTable: true,
  }),
  field("soat", { label: "SOAT" }),
  field("vence", {
    type: "date",
    label: "Vigencia del SOAT",
    showInTable: true,
  }),
);

async function seedVehicles(t: TestConvex, s: Seed) {
  authState.userId = s.adminId;
  return await seedForm(t, {
    projectId: s.projectId,
    createdBy: s.adminId,
    sections: VEHICLES,
    kind: "catalog",
    name: "Vehículos",
    titleFieldId: "placa",
  });
}

const add = (t: TestConvex, formId: Id<"forms">, values: FormValues) =>
  t.mutation(api.formEntries.createEntry, {
    formId,
    values: stored(VEHICLES, values),
  });

const titles = async (
  t: TestConvex,
  formId: Id<"forms">,
  extra: { search?: string; includeInactive?: boolean } = {},
) =>
  (
    await t.query(api.formEntries.listEntries, {
      formId,
      paginationOpts: FIRST_PAGE,
      ...extra,
    })
  ).page.map((row) => row.title);

const logsOf = (t: TestConvex) =>
  t.run(async (ctx) =>
    (await ctx.db.query("logs").collect()).map((log) => [
      log.description,
      log.affectedEntityType,
    ]),
  );

describe("formEntries.createEntry", () => {
  it("guarda el elemento activo, con su título, y deja constancia", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const { formId, publishedVersionId } = await seedVehicles(t, s);

    const id = await add(t, formId, {
      placa: "  slp   835 ",
      tipo: "Furgón",
      soat: "12345",
      vence: "2027-03-01",
    });

    const { entry, form } = await t.run(async (ctx) => ({
      entry: await ctx.db.get(id),
      form: await ctx.db.get(formId),
    }));
    expect(entry).toMatchObject({
      formId,
      projectId: s.projectId,
      versionId: publishedVersionId,
      submittedBy: s.adminId,
      status: "submitted",
      active: true,
      title: "slp 835",
      titleSearch: "slp 835",
    });
    expect(form?.responseCount).toBe(1);
    expect(await logsOf(t)).toEqual([
      ["Elemento añadido a Vehículos: slp 835", "formResponse"],
    ]);
  });

  it("pasa por la misma frontera que una respuesta", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const { formId } = await seedVehicles(t, s);

    // El título es obligatorio: sin él no hay elemento que elegir.
    await expect(add(t, formId, { soat: "12345" })).rejects.toThrow(
      `${formResponsesErrors.missingRequiredFields}: Placa`,
    );
    await expect(
      add(t, formId, { placa: "SLP-835", tipo: "Tractor" }),
    ).rejects.toThrow(`«Tipo»: ${valueProblems.optionMissing}`);
    await expect(
      add(t, formId, { placa: "SLP-835", vence: "2027-02-30" }),
    ).rejects.toThrow(`«Vigencia del SOAT»: ${valueProblems.invalidDate}`);
  });

  it("sólo en un listado publicado y sin archivar", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const { formId } = await seedVehicles(t, s);
    const record = await seedForm(t, {
      projectId: s.projectId,
      createdBy: s.adminId,
      sections: VEHICLES,
      name: "Un formato",
    });

    await expect(add(t, record.formId, { placa: "SLP-835" })).rejects.toThrow(
      formResponsesErrors.notCatalog,
    );

    await t.mutation(api.forms.archive, { id: formId });
    await expect(add(t, formId, { placa: "SLP-835" })).rejects.toThrow(
      formResponsesErrors.formNotFillable("catalog"),
    );
  });
});

describe("formEntries.updateEntry", () => {
  it("cambia los valores y el título, y conserva autor y fecha", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const { formId } = await seedVehicles(t, s);

    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-03-03T15:00:00Z"));
    authState.userId = s.ownerId;
    const id = await add(t, formId, { placa: "SLP-835", soat: "12345" });

    vi.setSystemTime(new Date("2026-09-29T15:00:00Z"));
    authState.userId = s.adminId;
    await t.mutation(api.formEntries.updateEntry, {
      id,
      values: stored(VEHICLES, { placa: "SLP-836", soat: "67890" }),
    });
    vi.useRealTimers();

    const entry = await t.run((ctx) => ctx.db.get(id));
    expect(entry).toMatchObject({
      title: "SLP-836",
      titleSearch: "slp-836",
      date: "2026-03-03",
      submittedBy: s.ownerId,
      updatedBy: s.adminId,
      active: true,
    });
    expect(entry?.updatedAt).toEqual(expect.any(Number));
    expect(fromStoredValues(entry?.values ?? [])).toEqual({
      placa: "SLP-836",
      soat: "67890",
    });
    // Editar no crea otro elemento.
    expect((await t.run((ctx) => ctx.db.get(formId)))?.responseCount).toBe(1);
    expect((await logsOf(t)).at(-1)).toEqual([
      "Elemento de Vehículos actualizado: SLP-836",
      "formResponse",
    ]);
  });

  it("pasa el elemento a la versión vigente del listado", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const { formId, publishedVersionId } = await seedVehicles(t, s);
    const id = await add(t, formId, {
      placa: "SLP-835",
      tipo: "Furgón",
      soat: "12345",
    });

    // La versión 2 quita el tipo y añade el propietario.
    const v2 = oneSection(
      field("placa", { label: "Placa", required: true, showInTable: true }),
      field("soat", { label: "SOAT" }),
      field("propietario", { label: "Propietario", showInTable: true }),
    );
    await t.mutation(api.formVersions.saveDraft, { id: formId, sections: v2 });
    await t.mutation(api.formVersions.publish, { id: formId });

    // Hasta que alguien lo edite, sigue leyéndose con la suya.
    const before = await t.query(api.formResponses.getById, { id });
    expect(before?.version).toMatchObject({ number: 1 });
    expect(before?.sections).toEqual(VEHICLES);

    await t.mutation(api.formEntries.updateEntry, {
      id,
      // El formulario manda lo que tenía, con el campo que ya no existe.
      values: [
        ...stored(VEHICLES, {
          placa: "SLP-835",
          tipo: "Furgón",
          soat: "12345",
        }),
        {
          fieldId: "propietario",
          value: { kind: "text", value: "Transportes del Llano" },
        },
      ],
    });

    const after = await t.query(api.formResponses.getById, { id });
    expect(after?.version).toMatchObject({ number: 2 });
    expect(after?.version?._id).not.toBe(publishedVersionId);
    expect(after?.sections).toEqual(v2);
    // Se conservan los valores de los campos que siguen existiendo.
    expect(fromStoredValues(after?.values ?? [])).toEqual({
      placa: "SLP-835",
      soat: "12345",
      propietario: "Transportes del Llano",
    });
  });
});

describe("formEntries.setEntryActive", () => {
  it("inactiva y reactiva, sin borrar nunca, y deja constancia", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const { formId } = await seedVehicles(t, s);
    const id = await add(t, formId, { placa: "SLP-835" });
    await add(t, formId, { placa: "ABC-123" });

    await t.mutation(api.formEntries.setEntryActive, { id, active: false });
    expect(await titles(t, formId)).toEqual(["ABC-123"]);
    expect(await titles(t, formId, { includeInactive: true })).toEqual([
      "ABC-123",
      "SLP-835",
    ]);
    expect(
      (
        await t.query(api.formEntries.searchEntries, { formId, search: "" })
      ).map((entry) => entry.title),
    ).toEqual(["ABC-123"]);
    // Inactivar no es borrar: el elemento sigue ahí, con todo lo suyo.
    expect(await t.run((ctx) => ctx.db.get(id))).toMatchObject({
      active: false,
      title: "SLP-835",
      updatedBy: s.adminId,
    });
    expect((await t.run((ctx) => ctx.db.get(formId)))?.responseCount).toBe(2);

    await t.mutation(api.formEntries.setEntryActive, { id, active: true });
    // Repetir lo mismo no hace nada, ni escribe otra entrada.
    await t.mutation(api.formEntries.setEntryActive, { id, active: true });
    expect(await titles(t, formId)).toEqual(["ABC-123", "SLP-835"]);

    expect((await logsOf(t)).slice(2)).toEqual([
      ["Elemento de Vehículos inactivado: SLP-835", "formResponse"],
      ["Elemento de Vehículos reactivado: SLP-835", "formResponse"],
    ]);
  });

  it("un elemento no se anula: no es una respuesta", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const { formId } = await seedVehicles(t, s);
    const id = await add(t, formId, { placa: "SLP-835" });

    await expect(
      t.mutation(api.formResponses.void, {
        id,
        reason: "Se vendió el vehículo",
      }),
    ).rejects.toThrow(formResponsesErrors.cannotVoidEntry);
  });
});

describe("leer los elementos", () => {
  async function seedFleet(t: TestConvex, s: Seed) {
    const { formId } = await seedVehicles(t, s);
    for (const [placa, tipo, vence] of [
      ["Grúa 01", "Furgón", "2027-03-01"],
      ["camión SLP-835", "Mezcladora", "2026-12-15"],
      ["Camión ABC-123", "Furgón", "2027-01-20"],
    ]) {
      await add(t, formId, { placa, tipo, vence });
    }
    return formId;
  }

  it("salen por título, sin distinguir mayúsculas ni tildes", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const formId = await seedFleet(t, s);

    expect(await titles(t, formId)).toEqual([
      "Camión ABC-123",
      "camión SLP-835",
      "Grúa 01",
    ]);
  });

  it("cada fila trae las columnas del listado como texto", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const formId = await seedFleet(t, s);

    const { page } = await t.query(api.formEntries.listEntries, {
      formId,
      paginationOpts: { numItems: 1, cursor: null },
    });
    expect(page[0]).toMatchObject({
      title: "Camión ABC-123",
      active: true,
      versionNumber: 1,
      columns: [
        { fieldId: "placa", text: "Camión ABC-123" },
        { fieldId: "tipo", text: "Furgón" },
        { fieldId: "vence", text: "20/01/2027" },
      ],
    });
  });

  it("busca por título, sin tildes", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const formId = await seedFleet(t, s);

    expect((await titles(t, formId, { search: "CAMION" })).sort()).toEqual([
      "Camión ABC-123",
      "camión SLP-835",
    ]);
    expect(await titles(t, formId, { search: "grua" })).toEqual(["Grúa 01"]);
    expect(await titles(t, formId, { search: "volqueta" })).toEqual([]);
  });

  it("el selector busca sólo entre los activos", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const formId = await seedFleet(t, s);
    const crane = (
      await t.query(api.formEntries.searchEntries, { formId, search: "grua" })
    )[0];
    expect(crane.title).toBe("Grúa 01");

    await t.mutation(api.formEntries.setEntryActive, {
      id: crane._id,
      active: false,
    });
    expect(
      await t.query(api.formEntries.searchEntries, { formId, search: "grua" }),
    ).toEqual([]);
    expect(await titles(t, formId, { search: "grua" })).toEqual([]);
    expect(
      await titles(t, formId, { search: "grua", includeInactive: true }),
    ).toEqual(["Grúa 01"]);
  });

  it("el selector no ofrece más de 30 elementos", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const { formId } = await seedVehicles(t, s);
    for (let index = 0; index < 32; index++) {
      await add(t, formId, { placa: `Volqueta ${index}` });
    }

    expect(
      await t.query(api.formEntries.searchEntries, { formId, search: "" }),
    ).toHaveLength(30);
    expect(
      await t.query(api.formEntries.searchEntries, {
        formId,
        search: "volqueta",
      }),
    ).toHaveLength(30);
  });

  it("un listado archivado no ofrece elementos", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const formId = await seedFleet(t, s);

    await t.mutation(api.forms.archive, { id: formId });
    expect(
      await t.query(api.formEntries.searchEntries, { formId, search: "" }),
    ).toEqual([]);
  });
});

describe("campo de título", () => {
  it("al cambiarlo, los títulos de los elementos se reconstruyen", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const sections = oneSection(
      field("placa", { label: "Placa", required: true }),
      field("nombre", { label: "Nombre", required: true }),
    );
    authState.userId = s.adminId;
    const { formId } = await seedForm(t, {
      projectId: s.projectId,
      createdBy: s.adminId,
      sections,
      kind: "catalog",
      name: "Vehículos",
      titleFieldId: "placa",
    });
    const id = await t.mutation(api.formEntries.createEntry, {
      formId,
      values: stored(sections, { placa: "SLP-835", nombre: "Mezcladora 3" }),
    });

    await t.mutation(api.forms.setTitleField, {
      id: formId,
      titleFieldId: "nombre",
    });
    // La reconstrucción va agendada; aquí se invoca a mano (`04 §3`).
    await t.mutation(internal.formEntries.rebuildTitles, {
      formId,
      cursor: null,
    });
    await drainScheduled(t);

    expect(await t.run((ctx) => ctx.db.get(id))).toMatchObject({
      title: "Mezcladora 3",
      titleSearch: "mezcladora 3",
    });
  });

  it("no se puede quitar del listado", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const { formId } = await seedVehicles(t, s);

    await expect(
      t.mutation(api.formVersions.saveDraft, {
        id: formId,
        sections: oneSection(field("soat", { label: "SOAT" })),
      }),
    ).rejects.toThrow(formsErrors.titleFieldInUse("Placa"));
  });

  it("no puede dejar de ser un texto obligatorio", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const { formId } = await seedVehicles(t, s);

    await expect(
      t.mutation(api.formVersions.saveDraft, {
        id: formId,
        sections: oneSection(field("placa", { label: "Placa" })),
      }),
    ).rejects.toThrow(formProblems.titleFieldInvalid);
  });

  it("una firma no cabe en un listado", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const { formId } = await seedVehicles(t, s);

    await expect(
      t.mutation(api.formVersions.saveDraft, {
        id: formId,
        sections: oneSection(
          ...VEHICLES[0].fields,
          field("firma", {
            type: "signature",
            config: { signature: { signer: "author" } },
          }),
        ),
      }),
    ).rejects.toThrow(formProblems.typeNotAllowed);
  });
});
