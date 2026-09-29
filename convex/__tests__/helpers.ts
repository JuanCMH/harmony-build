/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import type { Doc, Id } from "../_generated/dataModel";
import { referencedFormIds } from "../lib/form_references";
import type { FormSection, FormValues } from "../lib/form_types";
import { toStoredValues } from "../lib/stored_values";
import { searchableText } from "../lib/text";
import schema from "../schema";

/** El `vi.mock` de `getAuthUserId` no puede vivir aquí: Vitest lo iza dentro
 *  del archivo que lo declara, así que cada suite lo repite con su propio
 *  `authState`. Lo que sí se comparte es el montaje y la siembra. */
export function setupTest() {
  return convexTest(schema, import.meta.glob("../**/*.ts"));
}

export type TestConvex = ReturnType<typeof setupTest>;

export const NO_PERMISSIONS = {
  editProject: false,
  inviteUsers: false,
  expelUsers: false,
  createRoles: false,
  editRoles: false,
  deleteRoles: false,
  assignRoles: false,
  viewLogs: false,
  createForms: false,
  editForms: false,
  deleteForms: false,
  fillForms: false,
  viewResponses: false,
  voidResponses: false,
  editCatalogs: false,
};

export type PermissionKey = keyof typeof NO_PERMISSIONS;

/** Un proyecto con los tres niveles de identidad de `01 §5.1`, un miembro sin
 *  rol, y alguien de fuera que pertenece a **otro** proyecto. */
export async function seedProject(t: TestConvex) {
  return await t.run(async (ctx) => {
    const user = (name: string) =>
      ctx.db.insert("users", {
        name,
        email: `${name.toLowerCase()}@test.com`,
      });

    const ownerId = await user("Propietaria");
    const adminId = await user("Administrador");
    const roleHolderId = await user("Inspectora");
    const plainId = await user("Conductor");
    const outsiderId = await user("Ajeno");

    const projectId = await ctx.db.insert("projects", {
      name: "Planta de concreto",
      userId: ownerId,
      joinCode: "abc123abc123",
      active: true,
      primaryColor: "blue",
      secondaryColor: "gray",
    });
    const otherProjectId = await ctx.db.insert("projects", {
      name: "Vía al llano",
      userId: outsiderId,
      joinCode: "def456def456",
      active: true,
      primaryColor: "red",
      secondaryColor: "gray",
    });

    const roleId = await ctx.db.insert("roles", {
      name: "Inspección",
      projectId,
      ...NO_PERMISSIONS,
    });
    const otherRoleId = await ctx.db.insert("roles", {
      name: "Todo",
      projectId: otherProjectId,
      ...Object.fromEntries(
        Object.keys(NO_PERMISSIONS).map((key) => [key, true]),
      ) as typeof NO_PERMISSIONS,
    });

    const member = (
      userId: Id<"users">,
      role: "owner" | "admin" | "member",
      project: Id<"projects"> = projectId,
      customRoleId?: Id<"roles">,
    ) =>
      ctx.db.insert("members", {
        userId,
        projectId: project,
        role,
        customRoleId,
      });

    const ownerMemberId = await member(ownerId, "owner");
    const adminMemberId = await member(adminId, "admin");
    const roleHolderMemberId = await member(
      roleHolderId,
      "member",
      projectId,
      roleId,
    );
    const plainMemberId = await member(plainId, "member");
    const outsiderMemberId = await member(outsiderId, "owner", otherProjectId);

    return {
      ownerId,
      adminId,
      roleHolderId,
      plainId,
      outsiderId,
      projectId,
      otherProjectId,
      roleId,
      otherRoleId,
      ownerMemberId,
      adminMemberId,
      roleHolderMemberId,
      plainMemberId,
      outsiderMemberId,
    };
  });
}

export type Seed = Awaited<ReturnType<typeof seedProject>>;

/** Concede llaves al rol personalizado del proyecto sembrado. */
export async function grant(
  t: TestConvex,
  roleId: Id<"roles">,
  ...keys: PermissionKey[]
) {
  await t.run(async (ctx) => {
    await ctx.db.patch(
      roleId,
      Object.fromEntries(keys.map((key) => [key, true])),
    );
  });
}

/* ─────────────────────────── Módulo de formatos ─────────────────────────── */

type Sections = Doc<"formVersions">["sections"];
type StoredValues = Doc<"formResponses">["values"];

/** Siembra un formato ya publicado —o en borrador— **sin pasar por la API**:
 *  para cuando la prueba trata de otra cosa y sólo necesita que exista. Las
 *  pruebas de crear y publicar usan las mutations. */
export async function seedForm(
  t: TestConvex,
  options: {
    projectId: Id<"projects">;
    createdBy: Id<"users">;
    sections: FormSection[];
    kind?: "record" | "catalog";
    name?: string;
    code?: string;
    titleFieldId?: string;
    /** Por omisión, publicado en su versión 1. */
    status?: "draft" | "published" | "archived";
    audience?: "all" | "roles";
    audienceRoleIds?: Id<"roles">[];
  },
) {
  return await t.run(async (ctx) => {
    const sections = options.sections as Sections;
    const status = options.status ?? "published";
    const name = options.name ?? "Inspección preoperacional";
    const references = [
      ...new Set(
        referencedFormIds(options.sections)
          .map((id) => ctx.db.normalizeId("forms", id))
          .filter((id) => id !== null),
      ),
    ];

    const formId = await ctx.db.insert("forms", {
      projectId: options.projectId,
      kind: options.kind ?? "record",
      name,
      code: options.code,
      status,
      titleFieldId: options.titleFieldId,
      audience: options.audience ?? "all",
      audienceRoleIds: options.audienceRoleIds ?? [],
      createdBy: options.createdBy,
      hasDraftChanges: status === "draft",
      responseCount: 0,
      nameSearch: searchableText(`${name} ${options.code ?? ""}`),
      referencedFormIds: references,
    });
    const draftVersionId = await ctx.db.insert("formVersions", {
      formId,
      projectId: options.projectId,
      number: 0,
      status: "draft",
      sections,
    });
    const publishedVersionId =
      status === "draft"
        ? undefined
        : await ctx.db.insert("formVersions", {
            formId,
            projectId: options.projectId,
            number: 1,
            status: "published",
            sections,
            publishedAt: Date.now(),
            publishedBy: options.createdBy,
          });
    await ctx.db.patch(formId, {
      draftVersionId,
      publishedVersionId,
      publishedVersionNumber: publishedVersionId ? 1 : undefined,
    });

    return { formId, draftVersionId, publishedVersionId };
  });
}

/** Un archivo en el almacenamiento, como si se acabara de subir.
 *
 *  El mock guarda el tamaño y el hash del blob pero **descarta su tipo**, y el
 *  servidor lo exige (`resolveValues`). Se escribe a mano en el documento de
 *  sistema: el tipado no lo permite porque en el backend real `_storage` es de
 *  sólo lectura, y por eso el acceso va por una forma mínima y no por `any`. */
export async function storeFile(
  t: TestConvex,
  options: { contentType: string; sizeMb?: number } = {
    contentType: "image/png",
  },
) {
  return await t.run(async (ctx) => {
    const storageId = await ctx.storage.store(new Blob(["contenido"]));
    const system = ctx.db as unknown as {
      patch: (id: Id<"_storage">, value: object) => Promise<void>;
    };
    await system.patch(storageId, {
      contentType: options.contentType,
      ...(options.sizeMb ? { size: options.sizeMb * 1024 * 1024 } : {}),
    });
    return storageId;
  });
}

/** Los valores de un formato, como los manda el navegador. */
export const stored = (
  sections: FormSection[],
  values: FormValues,
): StoredValues => toStoredValues(sections, values) as StoredValues;

/** Una relación como la manda el navegador: sólo el id del elemento. El
 *  título y la instantánea los compone el servidor. */
export const pick = (responseId: string) => ({
  responseId,
  label: "",
  snapshot: [],
});

/** La primera página, con sitio de sobra. */
export const FIRST_PAGE = { numItems: 50, cursor: null };

/**
 * Deja terminar, dentro de la prueba que las agendó, las funciones que
 * quedaron agendadas.
 *
 * El mock las lanza con un `setTimeout`, y su estado es global: una que
 * dispara cuando la prueba ya terminó escribe sobre la base de la siguiente y
 * revienta con `Write outside of transaction … _scheduled_functions`
 * (`04 §3`). Esto es higiene de cierre, **no** una forma de afirmar nada: lo
 * que se afirma se invoca a mano.
 */
export async function drainScheduled(t: TestConvex) {
  for (let round = 0; round < 50; round++) {
    await new Promise((resolve) => setTimeout(resolve, 0));
    await t.finishInProgressScheduledFunctions();
    const waiting = await t.run(async (ctx) =>
      (await ctx.db.system.query("_scheduled_functions").collect()).filter(
        (job) =>
          job.state.kind === "pending" || job.state.kind === "inProgress",
      ),
    );
    if (waiting.length === 0) return;
  }
}
