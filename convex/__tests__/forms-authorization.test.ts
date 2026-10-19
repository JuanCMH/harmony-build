import { describe, expect, it, vi } from "vitest";
import { api } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import {
  field,
  oneSection,
  referenceField,
} from "../lib/__tests__/form.fixtures";
import {
  formCategoriesErrors,
  formResponsesErrors,
  formsErrors,
  projectsErrors,
} from "../lib/error_messages";
import {
  canFillForm,
  canSeeForm,
  canViewResponse,
  loadViewer,
} from "../lib/form_access";
import {
  FIRST_PAGE,
  grant,
  type PermissionKey,
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

const VEHICLES = oneSection(
  field("placa", { label: "Placa", required: true, showInTable: true }),
  field("soat", { label: "SOAT" }),
);

const inspection = (catalogId: string) =>
  oneSection(
    referenceField("vehiculo", catalogId, ["soat"], { label: "Vehículo" }),
    field("nota", { label: "Observaciones", showInTable: true }),
  );

/** Una obra con su listado de vehículos, una inspección para todos, otra
 *  sólo para el rol «Inspección», un borrador y un archivado. Con una
 *  respuesta de la inspectora y otra del administrador. */
async function seedForms(t: TestConvex, s: Seed) {
  const base = { projectId: s.projectId, createdBy: s.ownerId };
  const vehicles = await seedForm(t, {
    ...base,
    sections: VEHICLES,
    kind: "catalog",
    name: "Vehículos",
    titleFieldId: "placa",
  });
  const sections = inspection(vehicles.formId);
  const open = await seedForm(t, { ...base, sections, name: "Para todos" });
  const restricted = await seedForm(t, {
    ...base,
    sections,
    name: "Sólo inspección",
    audience: "roles",
    audienceRoleIds: [s.roleId],
  });
  const draft = await seedForm(t, {
    ...base,
    sections,
    name: "En borrador",
    status: "draft",
  });
  const archived = await seedForm(t, {
    ...base,
    sections,
    name: "Archivado",
    status: "archived",
  });

  authState.userId = s.ownerId;
  const truck = await t.mutation(api.formEntries.createEntry, {
    formId: vehicles.formId,
    values: stored(VEHICLES, { placa: "SLP-835", soat: "12345" }),
  });
  const retired = await t.mutation(api.formEntries.createEntry, {
    formId: vehicles.formId,
    values: stored(VEHICLES, { placa: "XYZ-001" }),
  });
  await t.mutation(api.formEntries.setEntryActive, {
    id: retired,
    active: false,
  });

  const values = stored(sections, { vehiculo: pick(truck), nota: "Bien" });
  await grant(t, s.roleId, "fillForms");
  authState.userId = s.roleHolderId;
  const mine = await t.mutation(api.formResponses.submit, {
    formId: open.formId,
    values,
  });
  authState.userId = s.adminId;
  const theirs = await t.mutation(api.formResponses.submit, {
    formId: open.formId,
    values,
  });
  await t.run((ctx) => ctx.db.patch(s.roleId, { fillForms: false }));
  authState.userId = null;

  return {
    vehicles: vehicles.formId,
    open: open.formId,
    openVersion: open.publishedVersionId as Id<"formVersions">,
    restricted: restricted.formId,
    draft: draft.formId,
    draftVersion: draft.draftVersionId,
    archived: archived.formId,
    truck,
    retired,
    mine,
    theirs,
    values,
    sections,
  };
}

type Forms = Awaited<ReturnType<typeof seedForms>>;

const recordNames = async (t: TestConvex, s: Seed) =>
  (
    await t.query(api.forms.get, {
      projectId: s.projectId,
      kind: "record",
      includeArchived: true,
    })
  )?.map((row) => row.name);

const catalogNames = async (t: TestConvex, s: Seed) =>
  (
    await t.query(api.forms.get, {
      projectId: s.projectId,
      kind: "catalog",
      includeArchived: true,
    })
  )?.map((row) => row.name);

const responseIds = async (
  t: TestConvex,
  formId: Id<"forms">,
  mine?: boolean,
) =>
  (
    await t.query(api.formResponses.list, {
      formId,
      paginationOpts: FIRST_PAGE,
      mine,
    })
  ).page.map((row) => row._id);

describe("qué ve cada quien (diseño, «Reglas de acceso»)", () => {
  describe("lista de formatos", () => {
    it("sin rol: ninguno", async () => {
      const t = setupTest();
      const s = await seedProject(t);
      await seedForms(t, s);

      authState.userId = s.plainId;
      expect(await recordNames(t, s)).toEqual([]);
      expect(await catalogNames(t, s)).toEqual([]);
      expect(
        await t.query(api.forms.listFillable, { projectId: s.projectId }),
      ).toEqual([]);
    });

    it("un rol sin llaves de formatos: ninguno", async () => {
      const t = setupTest();
      const s = await seedProject(t);
      await seedForms(t, s);
      await grant(t, s.roleId, "viewLogs", "editProject", "assignRoles");

      authState.userId = s.roleHolderId;
      expect(await recordNames(t, s)).toEqual([]);
    });

    it("`fillForms`: los de su audiencia, publicados", async () => {
      const t = setupTest();
      const s = await seedProject(t);
      await seedForms(t, s);
      await grant(t, s.roleId, "fillForms");

      authState.userId = s.roleHolderId;
      expect(await recordNames(t, s)).toEqual([
        "Para todos",
        "Sólo inspección",
      ]);
      // Los listados no se diligencian: no le salen.
      expect(await catalogNames(t, s)).toEqual([]);
    });

    it("`fillForms` con otro rol: no ve el que es sólo para «Inspección»", async () => {
      const t = setupTest();
      const s = await seedProject(t);
      await seedForms(t, s);
      const driversRole = await t.run(async (ctx) => {
        const role = await ctx.db.get(s.roleId);
        if (!role) throw new Error("sin rol sembrado");
        const { _id, _creationTime, ...rest } = role;
        const id = await ctx.db.insert("roles", {
          ...rest,
          name: "Conductores",
          fillForms: true,
        });
        await ctx.db.patch(s.plainMemberId, { customRoleId: id });
        return id;
      });
      expect(driversRole).not.toBe(s.roleId);

      authState.userId = s.plainId;
      expect(await recordNames(t, s)).toEqual(["Para todos"]);
    });

    it("`viewResponses`: todos los publicados y archivados, sin los borradores", async () => {
      const t = setupTest();
      const s = await seedProject(t);
      await seedForms(t, s);
      await grant(t, s.roleId, "viewResponses");

      authState.userId = s.roleHolderId;
      expect(await recordNames(t, s)).toEqual([
        "Archivado",
        "Para todos",
        "Sólo inspección",
      ]);
      expect(await catalogNames(t, s)).toEqual(["Vehículos"]);
    });

    it("administrador y propietario: todos, también los borradores", async () => {
      const t = setupTest();
      const s = await seedProject(t);
      await seedForms(t, s);

      for (const userId of [s.adminId, s.ownerId]) {
        authState.userId = userId;
        expect(await recordNames(t, s)).toEqual([
          "Archivado",
          "En borrador",
          "Para todos",
          "Sólo inspección",
        ]);
      }
    });

    it("quien construye ve los borradores aunque no vea respuestas", async () => {
      const t = setupTest();
      const s = await seedProject(t);
      const f = await seedForms(t, s);

      for (const key of ["createForms", "editForms", "deleteForms"] as const) {
        await t.run((ctx) =>
          ctx.db.patch(s.roleId, {
            createForms: false,
            editForms: false,
            deleteForms: false,
          }),
        );
        await grant(t, s.roleId, key);
        authState.userId = s.roleHolderId;
        expect(await recordNames(t, s), key).toContain("En borrador");
        expect(
          await t.query(api.forms.getById, { id: f.draft }),
          key,
        ).not.toBeNull();
      }
    });

    it("`editCatalogs`: los listados, no los formatos", async () => {
      const t = setupTest();
      const s = await seedProject(t);
      await seedForms(t, s);
      await grant(t, s.roleId, "editCatalogs");

      authState.userId = s.roleHolderId;
      expect(await catalogNames(t, s)).toEqual(["Vehículos"]);
      expect(await recordNames(t, s)).toEqual([]);
    });
  });

  describe("diligenciar", () => {
    const submit = (t: TestConvex, f: Forms, formId: Id<"forms">) =>
      t.mutation(api.formResponses.submit, { formId, values: f.values });

    it("sin rol, o sin la llave, no se diligencia", async () => {
      const t = setupTest();
      const s = await seedProject(t);
      const f = await seedForms(t, s);

      authState.userId = s.plainId;
      await expect(submit(t, f, f.open)).rejects.toThrow(
        formResponsesErrors.insufficientPermissions,
      );
      // Ver respuestas no es poder diligenciar.
      await grant(t, s.roleId, "viewResponses");
      authState.userId = s.roleHolderId;
      await expect(submit(t, f, f.open)).rejects.toThrow(
        formResponsesErrors.insufficientPermissions,
      );
    });

    it("`fillForms` diligencia los de su audiencia, y sólo esos", async () => {
      const t = setupTest();
      const s = await seedProject(t);
      const f = await seedForms(t, s);
      await grant(t, s.roleId, "fillForms");

      authState.userId = s.roleHolderId;
      await submit(t, f, f.open);
      await submit(t, f, f.restricted);

      // Otro rol con la misma llave queda fuera de la audiencia.
      await t.run(async (ctx) => {
        const role = await ctx.db.get(s.roleId);
        if (!role) throw new Error("sin rol sembrado");
        const { _id, _creationTime, ...rest } = role;
        const id = await ctx.db.insert("roles", {
          ...rest,
          name: "Conductores",
        });
        await ctx.db.patch(s.plainMemberId, { customRoleId: id });
      });
      authState.userId = s.plainId;
      await submit(t, f, f.open);
      await expect(submit(t, f, f.restricted)).rejects.toThrow(
        formResponsesErrors.insufficientPermissions,
      );
      expect(await t.query(api.forms.getById, { id: f.restricted })).toBeNull();
    });

    it("administrador y propietario diligencian todos, sea cual sea la audiencia", async () => {
      const t = setupTest();
      const s = await seedProject(t);
      const f = await seedForms(t, s);

      for (const userId of [s.adminId, s.ownerId]) {
        authState.userId = userId;
        await submit(t, f, f.restricted);
      }
    });

    it("un borrador y un archivado no se diligencian, ni por el propietario", async () => {
      const t = setupTest();
      const s = await seedProject(t);
      const f = await seedForms(t, s);

      authState.userId = s.ownerId;
      for (const formId of [f.draft, f.archived]) {
        await expect(submit(t, f, formId)).rejects.toThrow(
          formResponsesErrors.formNotFillable("record"),
        );
      }
      await expect(submit(t, f, f.vehicles)).rejects.toThrow(
        formResponsesErrors.notRecord,
      );
    });

    it("`canFill` dice lo mismo que la mutation", async () => {
      const t = setupTest();
      const s = await seedProject(t);
      const f = await seedForms(t, s);
      await grant(t, s.roleId, "fillForms");

      authState.userId = s.roleHolderId;
      const byId = async (id: Id<"forms">) =>
        (await t.query(api.forms.getById, { id }))?.canFill;
      expect(await byId(f.open)).toBe(true);
      expect(await byId(f.restricted)).toBe(true);
      // Ni el borrador ni el archivado le salen siquiera.
      expect(await byId(f.draft)).toBeUndefined();
      expect(await byId(f.archived)).toBeUndefined();

      authState.userId = s.adminId;
      expect(await byId(f.archived)).toBe(false);
      expect(await byId(f.draft)).toBe(false);
      expect(await byId(f.vehicles)).toBe(false);
    });
  });

  describe("respuestas de un formato", () => {
    it("sin rol: ninguna, ni la lista ni una suelta", async () => {
      const t = setupTest();
      const s = await seedProject(t);
      const f = await seedForms(t, s);

      authState.userId = s.plainId;
      await expect(responseIds(t, f.open)).rejects.toThrow(
        formResponsesErrors.insufficientPermissions,
      );
      expect(
        await t.query(api.formResponses.getById, { id: f.mine }),
      ).toBeNull();
    });

    it("`fillForms`: sólo las suyas, pida lo que pida", async () => {
      const t = setupTest();
      const s = await seedProject(t);
      const f = await seedForms(t, s);
      await grant(t, s.roleId, "fillForms");

      authState.userId = s.roleHolderId;
      expect(await responseIds(t, f.open)).toEqual([f.mine]);
      expect(await responseIds(t, f.open, false)).toEqual([f.mine]);
      expect(await responseIds(t, f.open, true)).toEqual([f.mine]);

      expect(
        await t.query(api.formResponses.getById, { id: f.mine }),
      ).not.toBeNull();
      expect(
        await t.query(api.formResponses.getById, { id: f.theirs }),
      ).toBeNull();
    });

    it("quien pierde la llave deja de ver también lo que diligenció", async () => {
      const t = setupTest();
      const s = await seedProject(t);
      const f = await seedForms(t, s);

      authState.userId = s.roleHolderId;
      expect(
        await t.query(api.formResponses.getById, { id: f.mine }),
      ).toBeNull();
    });

    it("`viewResponses`: todas, también las de un formato que no es de su audiencia", async () => {
      const t = setupTest();
      const s = await seedProject(t);
      const f = await seedForms(t, s);
      await grant(t, s.roleId, "viewResponses");

      authState.userId = s.adminId;
      const restricted = await t.mutation(api.formResponses.submit, {
        formId: f.restricted,
        values: f.values,
      });
      await t.run(async (ctx) => {
        const form = await ctx.db.get(f.restricted);
        await ctx.db.patch(f.restricted, {
          audienceRoleIds: form?.audienceRoleIds.filter(() => false) ?? [],
        });
      });

      authState.userId = s.roleHolderId;
      expect(await responseIds(t, f.open)).toEqual([f.theirs, f.mine]);
      expect(await responseIds(t, f.open, true)).toEqual([f.mine]);
      // La audiencia restringe a quien diligencia, no a quien consulta.
      expect(await responseIds(t, f.restricted)).toEqual([restricted]);
      expect(
        await t.query(api.formResponses.getById, { id: f.theirs }),
      ).not.toBeNull();
    });

    it("administrador y propietario: todas", async () => {
      const t = setupTest();
      const s = await seedProject(t);
      const f = await seedForms(t, s);

      for (const userId of [s.adminId, s.ownerId]) {
        authState.userId = userId;
        expect(await responseIds(t, f.open)).toEqual([f.theirs, f.mine]);
      }
    });

    it("las funciones con `ctx` dicen lo mismo que las públicas", async () => {
      const t = setupTest();
      const s = await seedProject(t);
      const f = await seedForms(t, s);
      await grant(t, s.roleId, "fillForms");

      await t.run(async (ctx) => {
        const [open, restricted, draft, mine, theirs] = await Promise.all([
          ctx.db.get(f.open),
          ctx.db.get(f.restricted),
          ctx.db.get(f.draft),
          ctx.db.get(f.mine),
          ctx.db.get(f.theirs),
        ]);
        if (!open || !restricted || !draft || !mine || !theirs) {
          throw new Error("falta la siembra");
        }

        expect(await loadViewer(ctx, s.outsiderId, s.projectId)).toBeNull();

        const plain = await loadViewer(ctx, s.plainId, s.projectId);
        const holder = await loadViewer(ctx, s.roleHolderId, s.projectId);
        const admin = await loadViewer(ctx, s.adminId, s.projectId);
        if (!plain || !holder || !admin) throw new Error("falta un miembro");

        expect(canSeeForm(plain, open)).toBe(false);
        expect(canFillForm(plain, open)).toBe(false);
        expect(canViewResponse(plain, open, mine)).toBe(false);

        expect(canSeeForm(holder, open)).toBe(true);
        expect(canSeeForm(holder, draft)).toBe(false);
        expect(canFillForm(holder, restricted)).toBe(true);
        expect(canViewResponse(holder, open, mine)).toBe(true);
        expect(canViewResponse(holder, open, theirs)).toBe(false);

        expect(canSeeForm(admin, draft)).toBe(true);
        expect(canFillForm(admin, restricted)).toBe(true);
        expect(canFillForm(admin, draft)).toBe(false);
        expect(canViewResponse(admin, open, mine)).toBe(true);
      });
    });
  });

  describe("elementos de un listado", () => {
    const entryTitles = async (t: TestConvex, f: Forms, all?: boolean) =>
      (
        await t.query(api.formEntries.listEntries, {
          formId: f.vehicles,
          paginationOpts: FIRST_PAGE,
          includeInactive: all,
        })
      ).page.map((row) => row.title);
    const found = async (t: TestConvex, f: Forms) =>
      (
        await t.query(api.formEntries.searchEntries, {
          formId: f.vehicles,
          search: "",
        })
      ).map((entry) => entry.title);

    it("sin rol: ninguno", async () => {
      const t = setupTest();
      const s = await seedProject(t);
      const f = await seedForms(t, s);

      authState.userId = s.plainId;
      await expect(found(t, f)).rejects.toThrow(
        formResponsesErrors.insufficientPermissions,
      );
      await expect(entryTitles(t, f)).rejects.toThrow(
        formResponsesErrors.insufficientPermissions,
      );
      expect(
        await t.query(api.formResponses.getById, { id: f.truck }),
      ).toBeNull();
    });

    it("`fillForms`: los activos, para elegirlos, y nada más", async () => {
      const t = setupTest();
      const s = await seedProject(t);
      const f = await seedForms(t, s);
      await grant(t, s.roleId, "fillForms");

      authState.userId = s.roleHolderId;
      expect(await found(t, f)).toEqual(["SLP-835"]);
      expect(
        await t.query(api.formEntries.getReferencePreview, {
          fieldFormId: f.open,
          fieldId: "vehiculo",
          responseId: f.truck,
        }),
      ).toMatchObject({ label: "SLP-835" });
      // El listado entero, con sus inactivos, no es suyo.
      await expect(entryTitles(t, f, true)).rejects.toThrow(
        formResponsesErrors.insufficientPermissions,
      );
      expect(
        await t.query(api.formResponses.getById, { id: f.truck }),
      ).toBeNull();
    });

    it("`viewResponses` y `editCatalogs`: todos", async () => {
      const t = setupTest();
      const s = await seedProject(t);
      const f = await seedForms(t, s);

      for (const key of ["viewResponses", "editCatalogs"] as const) {
        await t.run((ctx) =>
          ctx.db.patch(s.roleId, { viewResponses: false, editCatalogs: false }),
        );
        await grant(t, s.roleId, key);
        authState.userId = s.roleHolderId;
        expect(await entryTitles(t, f), key).toEqual(["SLP-835"]);
        expect(await entryTitles(t, f, true), key).toEqual([
          "SLP-835",
          "XYZ-001",
        ]);
        expect(
          await t.query(api.formResponses.getById, { id: f.retired }),
          key,
        ).toMatchObject({ title: "XYZ-001", active: false });
      }
    });

    it("mantenerlos exige `editCatalogs`; ver respuestas no alcanza", async () => {
      const t = setupTest();
      const s = await seedProject(t);
      const f = await seedForms(t, s);
      await grant(t, s.roleId, "viewResponses", "fillForms", "editForms");
      const values = stored(VEHICLES, { placa: "ABC-123" });

      authState.userId = s.roleHolderId;
      const attempts = [
        () =>
          t.mutation(api.formEntries.createEntry, {
            formId: f.vehicles,
            values,
          }),
        () => t.mutation(api.formEntries.updateEntry, { id: f.truck, values }),
        () =>
          t.mutation(api.formEntries.setEntryActive, {
            id: f.truck,
            active: false,
          }),
      ];
      for (const attempt of attempts) {
        await expect(attempt()).rejects.toThrow(
          formResponsesErrors.insufficientPermissions,
        );
      }

      await grant(t, s.roleId, "editCatalogs");
      for (const attempt of attempts) await attempt();
    });
  });

  describe("constructor", () => {
    it("sin `editForms` no se abre, ni con todas las demás llaves", async () => {
      const t = setupTest();
      const s = await seedProject(t);
      const f = await seedForms(t, s);
      await grant(
        t,
        s.roleId,
        "fillForms",
        "viewResponses",
        "voidResponses",
        "editCatalogs",
        "createForms",
        "deleteForms",
      );

      authState.userId = s.roleHolderId;
      await expect(
        t.query(api.formVersions.getDraft, { id: f.open }),
      ).rejects.toThrow(formsErrors.insufficientPermissions);
      expect(
        await t.query(api.formVersions.getVersion, {
          versionId: f.draftVersion,
        }),
      ).toBeNull();
      expect((await t.query(api.forms.getById, { id: f.open }))?.canEdit).toBe(
        false,
      );
    });

    it("con `editForms`, o como administrador, sí", async () => {
      const t = setupTest();
      const s = await seedProject(t);
      const f = await seedForms(t, s);
      await grant(t, s.roleId, "editForms");

      for (const userId of [s.roleHolderId, s.adminId, s.ownerId]) {
        authState.userId = userId;
        expect(
          (await t.query(api.formVersions.getDraft, { id: f.draft })).sections,
        ).toEqual(f.sections);
        expect(
          await t.query(api.formVersions.getVersion, {
            versionId: f.draftVersion,
          }),
        ).not.toBeNull();
      }
    });
  });
});

describe("cada llave gobierna lo suyo", () => {
  /** Cada escritura con la llave que la abre. Se prueba que sin ella falle y
   *  que con ella —y sólo con ella— pase. */
  const writes = (t: TestConvex, s: Seed, f: Forms) =>
    [
      [
        "createForms",
        () =>
          t.mutation(api.forms.create, {
            projectId: s.projectId,
            kind: "record",
            name: "Formato nuevo",
          }),
      ],
      ["createForms", () => t.mutation(api.forms.duplicate, { id: f.open })],
      [
        "editForms",
        () =>
          t.mutation(api.forms.updateDetails, {
            id: f.open,
            name: "Para todos",
            audience: "all",
            audienceRoleIds: [],
          }),
      ],
      [
        "editForms",
        () =>
          t.mutation(api.forms.setTitleField, {
            id: f.vehicles,
            titleFieldId: "placa",
          }),
      ],
      [
        "editForms",
        () =>
          t.mutation(api.formVersions.saveDraft, {
            id: f.draft,
            sections: f.sections,
          }),
      ],
      [
        "editForms",
        () => t.mutation(api.formVersions.publish, { id: f.draft }),
      ],
      [
        "editForms",
        () => t.mutation(api.formVersions.discardDraft, { id: f.open }),
      ],
      [
        "editForms",
        () =>
          t.mutation(api.formCategories.create, {
            projectId: s.projectId,
            name: "Maquinaria",
          }),
      ],
      [
        "deleteForms",
        () => t.mutation(api.forms.archive, { id: f.restricted }),
      ],
      [
        "deleteForms",
        () => t.mutation(api.forms.unarchive, { id: f.archived }),
      ],
      ["deleteForms", () => t.mutation(api.forms.remove, { id: f.draft })],
      [
        "voidResponses",
        () =>
          t.mutation(api.formResponses.void, {
            id: f.theirs,
            reason: "Se diligenció sobre el vehículo equivocado",
          }),
      ],
      [
        "editCatalogs",
        () =>
          t.mutation(api.formEntries.createEntry, {
            formId: f.vehicles,
            values: stored(VEHICLES, { placa: "ABC-123" }),
          }),
      ],
      [
        "editForms",
        () => t.query(api.forms.listCatalogs, { projectId: s.projectId }),
      ],
      [
        "createForms",
        () => t.query(api.forms.listCatalogs, { projectId: s.projectId }),
      ],
    ] as const satisfies readonly (readonly [PermissionKey, () => unknown])[];

  const FORM_KEYS = [
    "createForms",
    "editForms",
    "deleteForms",
    "fillForms",
    "viewResponses",
    "voidResponses",
    "editCatalogs",
  ] as const;

  it("sin la llave, cada escritura se rechaza aunque tenga todas las demás", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const f = await seedForms(t, s);

    const cases = writes(t, s, f);
    for (const [index, [key]] of cases.entries()) {
      // `listCatalogs` la abren dos llaves: se quitan las dos.
      const opening =
        index >= cases.length - 2 ? ["createForms", "editForms"] : [key];
      await t.run((ctx) =>
        ctx.db.patch(
          s.roleId,
          Object.fromEntries(
            FORM_KEYS.map((name) => [name, !opening.includes(name)]),
          ),
        ),
      );
      authState.userId = s.roleHolderId;
      await expect(cases[index][1](), `${index} · ${key}`).rejects.toThrow(
        /No tienes los permisos necesarios/,
      );
    }
  });

  it("con la llave, y sólo con ella, pasa", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const f = await seedForms(t, s);

    const cases = writes(t, s, f);
    for (const [index, [key, write]] of cases.entries()) {
      await t.run((ctx) =>
        ctx.db.patch(
          s.roleId,
          Object.fromEntries(FORM_KEYS.map((name) => [name, name === key])),
        ),
      );
      authState.userId = s.roleHolderId;
      await expect(write(), `${index} · ${key}`).resolves.toBeDefined();
    }
  });

  it("el rol por defecto del proyecto lo fija quien asigna roles", async () => {
    const t = setupTest();
    const s = await seedProject(t);

    authState.userId = s.roleHolderId;
    await expect(
      t.mutation(api.projects.setDefaultRole, {
        id: s.projectId,
        roleId: s.roleId,
      }),
    ).rejects.toThrow(projectsErrors.insufficientPermissions);

    await grant(t, s.roleId, "assignRoles");
    await t.mutation(api.projects.setDefaultRole, {
      id: s.projectId,
      roleId: s.roleId,
    });
    expect((await t.run((ctx) => ctx.db.get(s.projectId)))?.defaultRoleId).toBe(
      s.roleId,
    );
  });
});

describe("aislamiento entre proyectos (01 §10)", () => {
  /** Todas las funciones públicas del módulo, llamadas contra lo que hay en
   *  el proyecto sembrado. Quien llama es propietario de **otro** proyecto. */
  const surface = (t: TestConvex, s: Seed, f: Forms) => {
    const vehicle = stored(VEHICLES, { placa: "ROBADO" });
    return {
      /** Lecturas que sostienen una página: `null`, nunca un dato. */
      nulls: {
        "formCategories.get": () =>
          t.query(api.formCategories.get, { projectId: s.projectId }),
        "forms.get": () =>
          t.query(api.forms.get, { projectId: s.projectId, kind: "record" }),
        "forms.listFillable": () =>
          t.query(api.forms.listFillable, { projectId: s.projectId }),
        "forms.getById": () => t.query(api.forms.getById, { id: f.open }),
        "forms.getUsage": () => t.query(api.forms.getUsage, { id: f.vehicles }),
        "formVersions.getPublished": () =>
          t.query(api.formVersions.getPublished, { id: f.open }),
        "formVersions.getVersion": () =>
          t.query(api.formVersions.getVersion, { versionId: f.openVersion }),
        "formResponses.getById": () =>
          t.query(api.formResponses.getById, { id: f.mine }),
        "formResponses.getById (elemento)": () =>
          t.query(api.formResponses.getById, { id: f.truck }),
        "formEntries.getReferencePreview": () =>
          t.query(api.formEntries.getReferencePreview, {
            fieldFormId: f.open,
            fieldId: "vehiculo",
            responseId: f.truck,
          }),
      },
      /** Todo lo demás: lanza. */
      throws: {
        "formCategories.create": () =>
          t.mutation(api.formCategories.create, {
            projectId: s.projectId,
            name: "Intrusa",
          }),
        "forms.create": () =>
          t.mutation(api.forms.create, {
            projectId: s.projectId,
            kind: "record",
            name: "Formato intruso",
          }),
        "forms.duplicate": () =>
          t.mutation(api.forms.duplicate, { id: f.open }),
        "forms.updateDetails": () =>
          t.mutation(api.forms.updateDetails, {
            id: f.open,
            name: "Secuestrado",
            audience: "all",
            audienceRoleIds: [],
          }),
        "forms.setTitleField": () =>
          t.mutation(api.forms.setTitleField, {
            id: f.vehicles,
            titleFieldId: "soat",
          }),
        "forms.archive": () => t.mutation(api.forms.archive, { id: f.open }),
        "forms.unarchive": () =>
          t.mutation(api.forms.unarchive, { id: f.archived }),
        "forms.remove": () => t.mutation(api.forms.remove, { id: f.draft }),
        "forms.listCatalogs": () =>
          t.query(api.forms.listCatalogs, { projectId: s.projectId }),
        "formVersions.saveDraft": () =>
          t.mutation(api.formVersions.saveDraft, {
            id: f.open,
            sections: oneSection(field("intruso")),
          }),
        "formVersions.publish": () =>
          t.mutation(api.formVersions.publish, { id: f.draft }),
        "formVersions.discardDraft": () =>
          t.mutation(api.formVersions.discardDraft, { id: f.open }),
        "formVersions.getDraft": () =>
          t.query(api.formVersions.getDraft, { id: f.open }),
        "formFiles.generateUploadUrl": () =>
          t.mutation(api.formFiles.generateUploadUrl, { formId: f.open }),
        "formResponses.submit": () =>
          t.mutation(api.formResponses.submit, {
            formId: f.open,
            values: f.values,
          }),
        "formResponses.void": () =>
          t.mutation(api.formResponses.void, {
            id: f.mine,
            reason: "Anulada desde otro proyecto",
          }),
        "formResponses.list": () =>
          t.query(api.formResponses.list, {
            formId: f.open,
            paginationOpts: FIRST_PAGE,
          }),
        "formResponses.listMine": () =>
          t.query(api.formResponses.listMine, {
            projectId: s.projectId,
            paginationOpts: FIRST_PAGE,
          }),
        "formEntries.createEntry": () =>
          t.mutation(api.formEntries.createEntry, {
            formId: f.vehicles,
            values: vehicle,
          }),
        "formEntries.updateEntry": () =>
          t.mutation(api.formEntries.updateEntry, {
            id: f.truck,
            values: vehicle,
          }),
        "formEntries.setEntryActive": () =>
          t.mutation(api.formEntries.setEntryActive, {
            id: f.truck,
            active: false,
          }),
        "formEntries.listEntries": () =>
          t.query(api.formEntries.listEntries, {
            formId: f.vehicles,
            paginationOpts: FIRST_PAGE,
          }),
        "formEntries.searchEntries": () =>
          t.query(api.formEntries.searchEntries, {
            formId: f.vehicles,
            search: "",
          }),
        "formEntries.listEntryHistory": () =>
          t.query(api.formEntries.listEntryHistory, {
            entryId: f.truck,
            paginationOpts: FIRST_PAGE,
          }),
        "projects.setDefaultRole": () =>
          t.mutation(api.projects.setDefaultRole, {
            id: s.projectId,
            roleId: s.roleId,
          }),
      },
    };
  };

  /** Lo que hay en las tablas del módulo, para comprobar que nadie escribió. */
  const snapshot = (t: TestConvex) =>
    t.run(async (ctx) => ({
      categories: await ctx.db.query("formCategories").collect(),
      forms: await ctx.db.query("forms").collect(),
      versions: await ctx.db.query("formVersions").collect(),
      responses: await ctx.db.query("formResponses").collect(),
      links: await ctx.db.query("formResponseLinks").collect(),
    }));

  it("el propietario de otro proyecto no lee ni escribe nada de éste", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const f = await seedForms(t, s);
    const before = await snapshot(t);

    authState.userId = s.outsiderId;
    const { nulls, throws } = surface(t, s, f);
    for (const [name, call] of Object.entries(nulls)) {
      expect(await call(), name).toBeNull();
    }
    for (const [name, call] of Object.entries(throws)) {
      await expect(call(), name).rejects.toThrow(
        /No tienes los permisos necesarios/,
      );
    }

    expect(await snapshot(t)).toEqual(before);
  });

  it("sin sesión, tampoco", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const f = await seedForms(t, s);
    const before = await snapshot(t);

    authState.userId = null;
    const { nulls, throws } = surface(t, s, f);
    for (const [name, call] of Object.entries(nulls)) {
      expect(await call(), name).toBeNull();
    }
    for (const [name, call] of Object.entries(throws)) {
      await expect(call(), name).rejects.toThrow(/no autenticado/i);
    }

    expect(await snapshot(t)).toEqual(before);
  });

  it("un id de otro proyecto no entra por los argumentos de una llamada propia", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const f = await seedForms(t, s);

    // El ajeno tiene su propio listado y su propio formato, en su proyecto.
    const own = { projectId: s.otherProjectId, createdBy: s.outsiderId };
    const ownCatalog = await seedForm(t, {
      ...own,
      sections: VEHICLES,
      kind: "catalog",
      name: "Mis vehículos",
      titleFieldId: "placa",
    });
    // Su formato apunta al listado del vecino…
    const ownForm = await seedForm(t, {
      ...own,
      sections: inspection(f.vehicles),
      name: "Mi inspección",
    });
    // …y otro, bien configurado, con el que intenta elegir un elemento ajeno.
    const honest = await seedForm(t, {
      ...own,
      sections: inspection(ownCatalog.formId),
      name: "Mi otra inspección",
    });

    authState.userId = s.outsiderId;
    // Elegir el vehículo del vecino, por las dos vías.
    await expect(
      t.mutation(api.formResponses.submit, {
        formId: ownForm.formId,
        values: f.values,
      }),
    ).rejects.toThrow(formResponsesErrors.referenceInvalid("Vehículo"));
    await expect(
      t.mutation(api.formResponses.submit, {
        formId: honest.formId,
        values: f.values,
      }),
    ).rejects.toThrow(formResponsesErrors.referenceInvalid("Vehículo"));
    expect(
      await t.query(api.formEntries.getReferencePreview, {
        fieldFormId: ownForm.formId,
        fieldId: "vehiculo",
        responseId: f.truck,
      }),
    ).toBeNull();

    // Publicar apuntando al listado del vecino.
    await t.mutation(api.formVersions.saveDraft, {
      id: ownForm.formId,
      sections: [...inspection(f.vehicles)].map((section) => ({
        ...section,
        label: "Cambiada",
      })),
    });
    await expect(
      t.mutation(api.formVersions.publish, { id: ownForm.formId }),
    ).rejects.toThrow(formsErrors.referenceNotFound("Vehículo"));

    // Filtrar sus respuestas por un elemento ajeno no trae nada.
    expect(
      (
        await t.query(api.formResponses.list, {
          formId: honest.formId,
          paginationOpts: FIRST_PAGE,
          targetResponseId: f.truck,
        })
      ).page,
    ).toEqual([]);

    // Una categoría y un rol de este proyecto, en un formato del suyo.
    const category = await t.run((ctx) =>
      ctx.db.insert("formCategories", { projectId: s.projectId, name: "SST" }),
    );
    await expect(
      t.mutation(api.forms.updateDetails, {
        id: honest.formId,
        name: "Mi otra inspección",
        categoryId: category,
        audience: "all",
        audienceRoleIds: [],
      }),
    ).rejects.toThrow(formsErrors.categoryNotFound);
    await expect(
      t.mutation(api.forms.updateDetails, {
        id: honest.formId,
        name: "Mi otra inspección",
        audience: "roles",
        audienceRoleIds: [s.roleId],
      }),
    ).rejects.toThrow(formsErrors.audienceRoleNotFound);
    await expect(
      t.mutation(api.projects.setDefaultRole, {
        id: s.otherProjectId,
        roleId: s.roleId,
      }),
    ).rejects.toThrow(projectsErrors.defaultRoleNotFound);

    // Y las categorías ajenas, por su id.
    await expect(
      t.mutation(api.formCategories.update, { id: category, name: "Mía" }),
    ).rejects.toThrow(formCategoriesErrors.insufficientPermissions);
    await expect(
      t.mutation(api.formCategories.remove, { id: category }),
    ).rejects.toThrow(formCategoriesErrors.insufficientPermissions);
  });
});

describe("Mis respuestas", () => {
  const mineIds = async (t: TestConvex, s: Seed) =>
    (
      await t.query(api.formResponses.listMine, {
        projectId: s.projectId,
        paginationOpts: FIRST_PAGE,
      })
    ).page.map((row) => row._id);

  it("`fillForms`: sólo las suyas, de todos los formatos", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const f = await seedForms(t, s);
    await grant(t, s.roleId, "fillForms");

    authState.userId = s.roleHolderId;
    expect(await mineIds(t, s)).toEqual([f.mine]);
  });

  it("los elementos de un listado no son respuestas", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    await seedForms(t, s);

    // El propietario creó los vehículos y no ha diligenciado nada.
    authState.userId = s.ownerId;
    expect(await mineIds(t, s)).toEqual([]);
  });

  it("ni con `viewResponses` salen las de otros", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const f = await seedForms(t, s);
    await grant(t, s.roleId, "fillForms", "viewResponses");

    authState.userId = s.roleHolderId;
    expect(await mineIds(t, s)).toEqual([f.mine]);
  });

  it("sin la llave de diligenciar: lanza", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    await seedForms(t, s);

    authState.userId = s.roleHolderId;
    await expect(mineIds(t, s)).rejects.toThrow(
      formResponsesErrors.insufficientPermissions,
    );
  });
});
