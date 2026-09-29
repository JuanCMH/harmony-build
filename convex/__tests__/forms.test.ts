import { describe, expect, it, vi } from "vitest";
import { api } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import {
  field,
  oneSection,
  referenceField,
  rule,
  selectField,
  when,
} from "../lib/__tests__/form.fixtures";
import {
  formCategoriesErrors,
  formProblems,
  formsErrors,
} from "../lib/error_messages";
import type { FormSection } from "../lib/form_types";
import {
  grant,
  type Seed,
  seedForm,
  seedProject,
  setupTest,
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

/** «Horas hombre trabajadas»: el anexo diario del informe de gestión. */
const HOURS: FormSection[] = oneSection(
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
);

const logsOf = (t: TestConvex, s: Seed) =>
  t.run(async (ctx) =>
    (
      await ctx.db
        .query("logs")
        .withIndex("projectId", (q) => q.eq("projectId", s.projectId))
        .collect()
    ).map((log) => log.description),
  );

const versionsOf = (t: TestConvex, formId: Id<"forms">) =>
  t.run((ctx) =>
    ctx.db
      .query("formVersions")
      .withIndex("formId_number", (q) => q.eq("formId", formId))
      .collect(),
  );

async function createForm(
  t: TestConvex,
  s: Seed,
  extra: { name?: string; kind?: "record" | "catalog"; code?: string } = {},
) {
  return await t.mutation(api.forms.create, {
    projectId: s.projectId,
    kind: extra.kind ?? "record",
    name: extra.name ?? "Horas hombre trabajadas",
    code: extra.code,
  });
}

describe("forms.create", () => {
  it("nace en borrador, con una sección «General» vacía, y deja constancia", async () => {
    const t = setupTest();
    const s = await seedProject(t);

    authState.userId = s.adminId;
    const formId = await t.mutation(api.forms.create, {
      projectId: s.projectId,
      kind: "record",
      name: "  Horas   hombre trabajadas ",
      code: " SST-F-046 ",
      description: " Anexo 1 del informe de gestión ",
    });

    const form = await t.run((ctx) => ctx.db.get(formId));
    expect(form).toMatchObject({
      name: "Horas hombre trabajadas",
      code: "SST-F-046",
      description: "Anexo 1 del informe de gestión",
      kind: "record",
      status: "draft",
      audience: "all",
      audienceRoleIds: [],
      responseCount: 0,
      hasDraftChanges: true,
      nameSearch: "horas hombre trabajadas sst-f-046",
      createdBy: s.adminId,
    });
    expect(form?.publishedVersionId).toBeUndefined();

    const versions = await versionsOf(t, formId);
    expect(versions).toHaveLength(1);
    expect(versions[0]).toMatchObject({
      _id: form?.draftVersionId,
      number: 0,
      status: "draft",
      projectId: s.projectId,
      sections: [{ label: "General", order: 1, fields: [] }],
    });
    expect(await logsOf(t, s)).toEqual([
      "Formato creado: Horas hombre trabajadas",
    ]);
  });

  it("valida nombre, código y descripción en el servidor", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    authState.userId = s.adminId;

    const create = (extra: object) =>
      t.mutation(api.forms.create, {
        projectId: s.projectId,
        kind: "record",
        name: "Horas hombre",
        ...extra,
      });
    await expect(create({ name: " ab " })).rejects.toThrow(
      formsErrors.invalidName,
    );
    await expect(create({ name: "x".repeat(81) })).rejects.toThrow(
      formsErrors.invalidName,
    );
    await expect(create({ code: "x".repeat(21) })).rejects.toThrow(
      formsErrors.invalidCode,
    );
    await expect(create({ description: "x".repeat(301) })).rejects.toThrow(
      formsErrors.invalidDescription,
    );
  });

  it("la categoría tiene que ser de este proyecto", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const foreign = await t.run((ctx) =>
      ctx.db.insert("formCategories", {
        projectId: s.otherProjectId,
        name: "Ajena",
      }),
    );

    authState.userId = s.adminId;
    await expect(
      t.mutation(api.forms.create, {
        projectId: s.projectId,
        kind: "record",
        name: "Horas hombre",
        categoryId: foreign,
      }),
    ).rejects.toThrow(formsErrors.categoryNotFound);
  });
});

describe("borrador", () => {
  it("guardar valida la definición y dice qué está mal", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    authState.userId = s.adminId;
    const formId = await createForm(t, s);

    await expect(
      t.mutation(api.formVersions.saveDraft, {
        id: formId,
        sections: oneSection(field("a"), field("a")),
      }),
    ).rejects.toThrow(formProblems.duplicateFieldId);
    await expect(
      t.mutation(api.formVersions.saveDraft, {
        id: formId,
        sections: oneSection(
          field("a", {
            config: { visibility: when(rule("fantasma", "eq", "1")) },
          }),
        ),
      }),
    ).rejects.toThrow(formProblems.unknownReference);

    await t.mutation(api.formVersions.saveDraft, {
      id: formId,
      sections: HOURS,
    });
    const draft = await t.query(api.formVersions.getDraft, { id: formId });
    expect(draft.sections).toEqual(HOURS);
    expect(draft.number).toBe(0);
    expect(draft.hasDraftChanges).toBe(true);
    // Un borrador es trabajo en curso: no deja entrada en la auditoría.
    expect(await logsOf(t, s)).toEqual([
      "Formato creado: Horas hombre trabajadas",
    ]);
  });

  it("no se guarda sobre un formato archivado", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    authState.userId = s.adminId;
    const { formId } = await seedForm(t, {
      projectId: s.projectId,
      createdBy: s.adminId,
      sections: HOURS,
      status: "archived",
    });

    await expect(
      t.mutation(api.formVersions.saveDraft, { id: formId, sections: HOURS }),
    ).rejects.toThrow(formsErrors.archived);
  });
});

describe("formVersions.publish", () => {
  it("crea una versión nueva e inmutable, y deja el borrador igual a ella", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    authState.userId = s.adminId;
    const formId = await createForm(t, s);
    await t.mutation(api.formVersions.saveDraft, {
      id: formId,
      sections: HOURS,
    });

    const first = await t.mutation(api.formVersions.publish, { id: formId });
    expect(first).toBe(1);

    const form = await t.run((ctx) => ctx.db.get(formId));
    expect(form).toMatchObject({
      status: "published",
      publishedVersionNumber: 1,
      hasDraftChanges: false,
    });
    const published = await t.query(api.formVersions.getPublished, {
      id: formId,
    });
    expect(published).toMatchObject({
      _id: form?.publishedVersionId,
      number: 1,
      status: "published",
      sections: HOURS,
    });
    expect(published?.publishedAt).toEqual(expect.any(Number));

    // Se sigue editando el borrador; la versión 1 no se mueve.
    const withoutTotal = oneSection(...HOURS[0].fields.slice(0, 2));
    await t.mutation(api.formVersions.saveDraft, {
      id: formId,
      sections: withoutTotal,
    });
    expect((await t.run((ctx) => ctx.db.get(formId)))?.hasDraftChanges).toBe(
      true,
    );
    expect(
      (await t.query(api.formVersions.getPublished, { id: formId }))?.sections,
    ).toEqual(HOURS);

    const second = await t.mutation(api.formVersions.publish, { id: formId });
    expect(second).toBe(2);

    const versions = await versionsOf(t, formId);
    expect(versions.map((v) => [v.number, v.status])).toEqual([
      [0, "draft"],
      [1, "published"],
      [2, "published"],
    ]);
    // La 1 conserva el cálculo que la 2 ya no tiene.
    expect(versions[1].sections).toEqual(HOURS);
    expect(versions[2].sections).toEqual(withoutTotal);
    expect(versions[0].sections).toEqual(withoutTotal);
    expect(
      await t.query(api.formVersions.getVersion, {
        versionId: versions[1]._id,
      }),
    ).toMatchObject({ number: 1, sections: HOURS });

    expect(await logsOf(t, s)).toEqual([
      "Formato creado: Horas hombre trabajadas",
      "Formato publicado: Horas hombre trabajadas (versión 1)",
      "Formato publicado: Horas hombre trabajadas (versión 2)",
    ]);
  });

  it("ninguna función pública escribe sobre una versión publicada", async () => {
    // `formVersions` sólo exporta tres escrituras, y las tres van al
    // borrador o insertan una versión nueva.
    const t = setupTest();
    const s = await seedProject(t);
    authState.userId = s.adminId;
    const { formId, publishedVersionId } = await seedForm(t, {
      projectId: s.projectId,
      createdBy: s.adminId,
      sections: HOURS,
    });
    const before = await t.run((ctx) => ctx.db.get(publishedVersionId!));

    const next = oneSection(field("otro"));
    await t.mutation(api.formVersions.saveDraft, {
      id: formId,
      sections: next,
    });
    await t.mutation(api.formVersions.discardDraft, { id: formId });
    await t.mutation(api.formVersions.saveDraft, {
      id: formId,
      sections: next,
    });
    await t.mutation(api.formVersions.publish, { id: formId });

    expect(await t.run((ctx) => ctx.db.get(publishedVersionId!))).toEqual(
      before,
    );
  });

  it("un formato sin campos no se publica", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    authState.userId = s.adminId;
    const formId = await createForm(t, s);

    await expect(
      t.mutation(api.formVersions.publish, { id: formId }),
    ).rejects.toThrow(formsErrors.emptyForm);
  });

  it("un listado exige su campo de título", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    authState.userId = s.adminId;
    const formId = await createForm(t, s, {
      kind: "catalog",
      name: "Vehículos",
    });
    await t.mutation(api.formVersions.saveDraft, {
      id: formId,
      sections: oneSection(
        field("placa", { required: true }),
        field("soat", { type: "number" }),
      ),
    });

    await expect(
      t.mutation(api.formVersions.publish, { id: formId }),
    ).rejects.toThrow(formsErrors.titleFieldRequired);

    // Un número no titula nada.
    await expect(
      t.mutation(api.forms.setTitleField, { id: formId, titleFieldId: "soat" }),
    ).rejects.toThrow(formProblems.titleFieldInvalid);
    await expect(
      t.mutation(api.forms.setTitleField, {
        id: formId,
        titleFieldId: "fantasma",
      }),
    ).rejects.toThrow(formProblems.titleFieldMissing);

    await t.mutation(api.forms.setTitleField, {
      id: formId,
      titleFieldId: "placa",
    });
    expect(await t.mutation(api.formVersions.publish, { id: formId })).toBe(1);
  });

  it("sólo un listado tiene campo de título", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    authState.userId = s.adminId;
    const { formId } = await seedForm(t, {
      projectId: s.projectId,
      createdBy: s.adminId,
      sections: oneSection(field("placa", { required: true })),
    });

    await expect(
      t.mutation(api.forms.setTitleField, {
        id: formId,
        titleFieldId: "placa",
      }),
    ).rejects.toThrow(formsErrors.notCatalog);
  });
});

describe("formVersions.discardDraft", () => {
  it("el borrador vuelve a lo publicado", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    authState.userId = s.adminId;
    const { formId } = await seedForm(t, {
      projectId: s.projectId,
      createdBy: s.adminId,
      sections: HOURS,
    });

    await t.mutation(api.formVersions.saveDraft, {
      id: formId,
      sections: oneSection(field("otro")),
    });
    await t.mutation(api.formVersions.discardDraft, { id: formId });

    const draft = await t.query(api.formVersions.getDraft, { id: formId });
    expect(draft.sections).toEqual(HOURS);
    expect(draft.hasDraftChanges).toBe(false);
  });

  it("guardar lo mismo que hay publicado no cuenta como cambio", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    authState.userId = s.adminId;
    const { formId } = await seedForm(t, {
      projectId: s.projectId,
      createdBy: s.adminId,
      sections: HOURS,
    });

    await t.mutation(api.formVersions.saveDraft, {
      id: formId,
      sections: HOURS,
    });
    expect((await t.run((ctx) => ctx.db.get(formId)))?.hasDraftChanges).toBe(
      false,
    );
  });

  it("sin nada publicado no hay a qué volver", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    authState.userId = s.adminId;
    const formId = await createForm(t, s);

    await expect(
      t.mutation(api.formVersions.discardDraft, { id: formId }),
    ).rejects.toThrow(formsErrors.nothingToDiscard);
  });
});

describe("forms.updateDetails", () => {
  it("cambia nombre, código y audiencia, y rehace el texto de búsqueda", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    authState.userId = s.adminId;
    const formId = await createForm(t, s);

    await t.mutation(api.forms.updateDetails, {
      id: formId,
      name: "Inspección de camión",
      code: "SST-F-010",
      audience: "roles",
      audienceRoleIds: [s.roleId, s.roleId],
    });

    expect(await t.run((ctx) => ctx.db.get(formId))).toMatchObject({
      name: "Inspección de camión",
      code: "SST-F-010",
      audience: "roles",
      audienceRoleIds: [s.roleId],
      nameSearch: "inspeccion de camion sst-f-010",
    });
  });

  it("los roles de la audiencia tienen que ser del proyecto", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    authState.userId = s.adminId;
    const formId = await createForm(t, s);

    const update = (audienceRoleIds: Id<"roles">[]) =>
      t.mutation(api.forms.updateDetails, {
        id: formId,
        name: "Horas hombre trabajadas",
        audience: "roles",
        audienceRoleIds,
      });
    await expect(update([s.otherRoleId])).rejects.toThrow(
      formsErrors.audienceRoleNotFound,
    );
    await expect(update([])).rejects.toThrow(formsErrors.audienceWithoutRoles);
  });

  it("al volver a «todos», los roles elegidos no se guardan", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    authState.userId = s.adminId;
    const { formId } = await seedForm(t, {
      projectId: s.projectId,
      createdBy: s.adminId,
      sections: HOURS,
      audience: "roles",
      audienceRoleIds: [s.roleId],
    });

    await t.mutation(api.forms.updateDetails, {
      id: formId,
      name: "Horas hombre trabajadas",
      audience: "all",
      audienceRoleIds: [s.roleId],
    });
    expect((await t.run((ctx) => ctx.db.get(formId)))?.audienceRoleIds).toEqual(
      [],
    );
  });
});

describe("archivar y eliminar", () => {
  it("archivar lo saca de la lista y de «Para diligenciar»; reactivar lo devuelve", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    authState.userId = s.adminId;
    const { formId } = await seedForm(t, {
      projectId: s.projectId,
      createdBy: s.adminId,
      sections: HOURS,
      name: "Horas hombre trabajadas",
    });
    const list = (includeArchived?: boolean) =>
      t.query(api.forms.get, {
        projectId: s.projectId,
        kind: "record",
        includeArchived,
      });

    await t.mutation(api.forms.archive, { id: formId });
    await expect(t.mutation(api.forms.archive, { id: formId })).rejects.toThrow(
      formsErrors.alreadyArchived,
    );

    expect(await list()).toEqual([]);
    expect((await list(true))?.map((row) => row.status)).toEqual(["archived"]);
    expect(
      await t.query(api.forms.listFillable, { projectId: s.projectId }),
    ).toEqual([]);

    await t.mutation(api.forms.unarchive, { id: formId });
    await expect(
      t.mutation(api.forms.unarchive, { id: formId }),
    ).rejects.toThrow(formsErrors.notArchived);
    // Vuelve a donde estaba: publicado.
    expect((await list())?.map((row) => row.status)).toEqual(["published"]);

    expect(await logsOf(t, s)).toEqual([
      "Formato archivado: Horas hombre trabajadas",
      "Formato reactivado: Horas hombre trabajadas",
    ]);
  });

  it("un borrador archivado vuelve a borrador", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    authState.userId = s.adminId;
    const formId = await createForm(t, s);

    await t.mutation(api.forms.archive, { id: formId });
    await t.mutation(api.forms.unarchive, { id: formId });
    expect((await t.run((ctx) => ctx.db.get(formId)))?.status).toBe("draft");
  });

  it("eliminar borra el formato con todas sus versiones", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    authState.userId = s.adminId;
    const { formId } = await seedForm(t, {
      projectId: s.projectId,
      createdBy: s.adminId,
      sections: HOURS,
      name: "Horas hombre trabajadas",
    });
    const neighbour = await seedForm(t, {
      projectId: s.projectId,
      createdBy: s.adminId,
      sections: HOURS,
      name: "Otro formato",
    });

    await t.mutation(api.forms.remove, { id: formId });

    expect(await t.run((ctx) => ctx.db.get(formId))).toBeNull();
    expect(await versionsOf(t, formId)).toEqual([]);
    expect(await versionsOf(t, neighbour.formId)).toHaveLength(2);
    expect(await logsOf(t, s)).toEqual([
      "Formato eliminado: Horas hombre trabajadas",
    ]);
  });

  it("con respuestas no se elimina: se archiva", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    authState.userId = s.adminId;
    const { formId } = await seedForm(t, {
      projectId: s.projectId,
      createdBy: s.adminId,
      sections: HOURS,
    });
    await t.mutation(api.formResponses.submit, {
      formId,
      values: [{ fieldId: "personas", value: { kind: "number", value: 4 } }],
    });

    await expect(t.mutation(api.forms.remove, { id: formId })).rejects.toThrow(
      formsErrors.hasResponses,
    );
    expect(await t.run((ctx) => ctx.db.get(formId))).not.toBeNull();
  });
});

describe("forms.duplicate", () => {
  it("crea otro en borrador con los mismos campos y los mismos ids", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    authState.userId = s.adminId;
    const { formId } = await seedForm(t, {
      projectId: s.projectId,
      createdBy: s.ownerId,
      sections: HOURS,
      name: "Inspección de compresor",
      code: "SST-F-083",
      audience: "roles",
      audienceRoleIds: [s.roleId],
    });

    const copyId = await t.mutation(api.forms.duplicate, { id: formId });

    const copy = await t.run((ctx) => ctx.db.get(copyId));
    expect(copy).toMatchObject({
      name: "Copia de Inspección de compresor",
      status: "draft",
      kind: "record",
      audience: "roles",
      audienceRoleIds: [s.roleId],
      createdBy: s.adminId,
      responseCount: 0,
      hasDraftChanges: true,
    });
    // El código es el del documento original: no se copia.
    expect(copy?.code).toBeUndefined();
    expect(copy?.publishedVersionId).toBeUndefined();
    // Las reglas internas siguen valiendo porque los ids no cambian.
    expect(
      (await t.query(api.formVersions.getDraft, { id: copyId })).sections,
    ).toEqual(HOURS);
    expect(await logsOf(t, s)).toEqual([
      "Formato duplicado: Copia de Inspección de compresor",
    ]);
  });

  it("copia el borrador si tiene cambios sin publicar", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    authState.userId = s.adminId;
    const { formId } = await seedForm(t, {
      projectId: s.projectId,
      createdBy: s.adminId,
      sections: HOURS,
    });
    const edited = oneSection(...HOURS[0].fields, field("observaciones"));
    await t.mutation(api.formVersions.saveDraft, {
      id: formId,
      sections: edited,
    });

    const copyId = await t.mutation(api.forms.duplicate, { id: formId });
    expect(
      (await t.query(api.formVersions.getDraft, { id: copyId })).sections,
    ).toEqual(edited);
  });

  it("el nombre de la copia no se pasa del largo que admite un nombre", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    authState.userId = s.adminId;
    const { formId } = await seedForm(t, {
      projectId: s.projectId,
      createdBy: s.adminId,
      sections: HOURS,
      name: "x".repeat(80),
    });

    const copyId = await t.mutation(api.forms.duplicate, { id: formId });
    expect((await t.run((ctx) => ctx.db.get(copyId)))?.name).toHaveLength(80);
  });
});

describe("forms.get", () => {
  async function seedList(t: TestConvex, s: Seed) {
    const category = await t.run((ctx) =>
      ctx.db.insert("formCategories", { projectId: s.projectId, name: "SST" }),
    );
    const names = [
      ["Inspección de camión", "SST-F-010"],
      ["Inspección de compresor", "SST-F-083"],
      ["Entrega de dotación", "SST-F-007"],
    ];
    const ids: Id<"forms">[] = [];
    for (const [name, code] of names) {
      const { formId } = await seedForm(t, {
        projectId: s.projectId,
        createdBy: s.adminId,
        sections: HOURS,
        name,
        code,
      });
      ids.push(formId);
    }
    await t.run((ctx) => ctx.db.patch(ids[0], { categoryId: category }));
    await seedForm(t, {
      projectId: s.projectId,
      createdBy: s.adminId,
      sections: oneSection(field("placa", { required: true })),
      kind: "catalog",
      name: "Vehículos",
      titleFieldId: "placa",
    });
    return { category, ids };
  }

  it("devuelve filas ligeras, por nombre, con lo que se puede hacer", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const { ids } = await seedList(t, s);

    authState.userId = s.adminId;
    const rows = await t.query(api.forms.get, {
      projectId: s.projectId,
      kind: "record",
    });

    expect(rows?.map((row) => row.name)).toEqual([
      "Entrega de dotación",
      "Inspección de camión",
      "Inspección de compresor",
    ]);
    expect(rows?.[1]).toMatchObject({
      _id: ids[0],
      code: "SST-F-010",
      status: "published",
      categoryName: "SST",
      publishedVersionNumber: 1,
      responseCount: 0,
      canFill: true,
      canEdit: true,
    });
    // Las secciones no viajan en la lista.
    expect(rows?.[0]).not.toHaveProperty("sections");
    expect(rows?.[0]).not.toHaveProperty("draftVersionId");
  });

  it("separa formatos de listados", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    await seedList(t, s);

    authState.userId = s.adminId;
    const catalogs = await t.query(api.forms.get, {
      projectId: s.projectId,
      kind: "catalog",
    });
    expect(catalogs?.map((row) => row.name)).toEqual(["Vehículos"]);
  });

  it("busca por nombre y por código, sin tildes ni mayúsculas", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    await seedList(t, s);

    authState.userId = s.adminId;
    const search = async (text: string) =>
      (
        await t.query(api.forms.get, {
          projectId: s.projectId,
          kind: "record",
          search: text,
        })
      )
        ?.map((row) => row.name)
        .sort();

    expect(await search("CAMION")).toEqual(["Inspección de camión"]);
    expect(await search("inspección")).toEqual([
      "Inspección de camión",
      "Inspección de compresor",
    ]);
    expect(await search("dotacion")).toEqual(["Entrega de dotación"]);
    expect(await search("grúa")).toEqual([]);
  });

  it("filtra por categoría", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const { category } = await seedList(t, s);

    authState.userId = s.adminId;
    const rows = await t.query(api.forms.get, {
      projectId: s.projectId,
      kind: "record",
      categoryId: category,
    });
    expect(rows?.map((row) => row.name)).toEqual(["Inspección de camión"]);
  });
});

describe("forms.listFillable", () => {
  it("ordena por uso reciente, con la fecha de mi última respuesta", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    await grant(t, s.roleId, "fillForms");
    const forms: Record<string, Id<"forms">> = {};
    for (const name of ["Alfa", "Beta", "Gama"]) {
      forms[name] = (
        await seedForm(t, {
          projectId: s.projectId,
          createdBy: s.adminId,
          sections: oneSection(field("nota")),
          name,
        })
      ).formId;
    }
    const submit = (formId: Id<"forms">) =>
      t.mutation(api.formResponses.submit, {
        formId,
        values: [{ fieldId: "nota", value: { kind: "text", value: "ok" } }],
      });

    // La respuesta de otra persona no cuenta como uso mío.
    authState.userId = s.adminId;
    await submit(forms.Alfa);
    authState.userId = s.roleHolderId;
    await submit(forms.Beta);
    await submit(forms.Gama);

    const rows = await t.query(api.forms.listFillable, {
      projectId: s.projectId,
    });
    expect(rows?.map((row) => row.name)).toEqual(["Gama", "Beta", "Alfa"]);
    expect(rows?.[0].lastResponseDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(rows?.[2].lastResponseDate).toBeNull();
  });
});

describe("forms.listCatalogs", () => {
  it("da los listados publicados con los campos de su versión publicada", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    await seedForm(t, {
      projectId: s.projectId,
      createdBy: s.adminId,
      sections: oneSection(
        field("placa", { label: "Placa", required: true }),
        selectField("tipo", ["Furgón"], { label: "Tipo" }),
      ),
      kind: "catalog",
      name: "Vehículos",
      titleFieldId: "placa",
    });
    await seedForm(t, {
      projectId: s.projectId,
      createdBy: s.adminId,
      sections: oneSection(field("nombre", { required: true })),
      kind: "catalog",
      name: "Extintores",
      status: "draft",
    });

    authState.userId = s.adminId;
    expect(
      await t.query(api.forms.listCatalogs, { projectId: s.projectId }),
    ).toEqual([
      {
        _id: expect.any(String),
        name: "Vehículos",
        code: undefined,
        titleFieldId: "placa",
        fields: [
          { id: "placa", label: "Placa", type: "text" },
          { id: "tipo", label: "Tipo", type: "select" },
        ],
      },
    ]);
  });
});

describe("forms.getUsage", () => {
  it("dice qué formatos relacionan a un listado", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const vehicles = await seedForm(t, {
      projectId: s.projectId,
      createdBy: s.adminId,
      sections: oneSection(field("placa", { required: true })),
      kind: "catalog",
      name: "Vehículos",
      titleFieldId: "placa",
    });
    await seedForm(t, {
      projectId: s.projectId,
      createdBy: s.adminId,
      sections: oneSection(referenceField("vehiculo", vehicles.formId)),
      name: "Inspección de camión",
    });
    await seedForm(t, {
      projectId: s.projectId,
      createdBy: s.adminId,
      sections: oneSection(field("nota")),
      name: "Horas hombre",
    });

    authState.userId = s.adminId;
    expect(
      (await t.query(api.forms.getUsage, { id: vehicles.formId }))?.map(
        (form) => form.name,
      ),
    ).toEqual(["Inspección de camión"]);
  });
});

describe("formCategories", () => {
  it("crea, renombra y elimina, y deja constancia", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    authState.userId = s.adminId;

    const id = await t.mutation(api.formCategories.create, {
      projectId: s.projectId,
      name: "  Seguridad   y salud ",
    });
    await t.mutation(api.formCategories.create, {
      projectId: s.projectId,
      name: "Ambiental",
    });
    await t.mutation(api.formCategories.update, { id, name: "SST" });

    expect(
      (await t.query(api.formCategories.get, { projectId: s.projectId }))?.map(
        (category) => category.name,
      ),
    ).toEqual(["Ambiental", "SST"]);

    await t.mutation(api.formCategories.remove, { id });
    expect(
      (await t.query(api.formCategories.get, { projectId: s.projectId }))?.map(
        (category) => category.name,
      ),
    ).toEqual(["Ambiental"]);
    expect(await logsOf(t, s)).toEqual([
      "Categoría de formatos creada: Seguridad y salud",
      "Categoría de formatos creada: Ambiental",
      "Categoría de formatos renombrada: Seguridad y salud → SST",
      "Categoría de formatos eliminada: SST",
    ]);
  });

  it("el nombre es único sin distinguir mayúsculas ni tildes", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    authState.userId = s.adminId;
    const id = await t.mutation(api.formCategories.create, {
      projectId: s.projectId,
      name: "Inspección",
    });
    const other = await t.mutation(api.formCategories.create, {
      projectId: s.projectId,
      name: "Calidad",
    });

    await expect(
      t.mutation(api.formCategories.create, {
        projectId: s.projectId,
        name: "INSPECCION",
      }),
    ).rejects.toThrow(formCategoriesErrors.duplicateName);
    await expect(
      t.mutation(api.formCategories.update, { id: other, name: "inspeccion" }),
    ).rejects.toThrow(formCategoriesErrors.duplicateName);
    // Renombrarse a sí misma no choca consigo misma.
    await t.mutation(api.formCategories.update, { id, name: "Inspección" });
    await expect(
      t.mutation(api.formCategories.create, {
        projectId: s.projectId,
        name: "x",
      }),
    ).rejects.toThrow(formCategoriesErrors.invalidName);
  });

  it("no se elimina si algún formato la usa, y dice cuántos", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    authState.userId = s.adminId;
    const id = await t.mutation(api.formCategories.create, {
      projectId: s.projectId,
      name: "SST",
    });
    for (const name of ["Inspección de camión", "Inspección de compresor"]) {
      await t.mutation(api.forms.create, {
        projectId: s.projectId,
        kind: "record",
        name,
        categoryId: id,
      });
    }

    await expect(t.mutation(api.formCategories.remove, { id })).rejects.toThrow(
      formCategoriesErrors.inUse(2),
    );
    expect(await t.run((ctx) => ctx.db.get(id))).not.toBeNull();
  });
});
