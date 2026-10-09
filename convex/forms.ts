import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { type QueryCtx, mutation, query } from "./_generated/server";
import { formsErrors } from "./lib/error_messages";
import {
  type FormViewer,
  canFillForm,
  canSeeForm,
  findVisibleForm,
  formPermissions,
  loadViewer,
  requireForm,
  requireViewer,
} from "./lib/form_access";
import {
  copyName,
  insertForm,
  requireNotArchived,
  validateAudience,
  validateCategory,
  validateDetails,
} from "./lib/form_details";
import { flattenFields } from "./lib/form_evaluation";
import {
  MAX_FORMS_PER_PROJECT,
  formNameSearch,
  formsReferencing,
  loadDraft,
  loadPublished,
} from "./lib/form_store";
import { validateForm } from "./lib/form_validation";
import { formAudience, formKind } from "./lib/form_validators";
import { searchableText } from "./lib/text";

const KIND_NOUN = { record: "Formato", catalog: "Listado" } as const;

/** Cuántos formatos devuelve una búsqueda: lo que cabe en pantalla. */
const SEARCH_LIMIT = 50;

/* ────────────────────────────── Escrituras ──────────────────────────────── */

export const create = mutation({
  args: {
    projectId: v.id("projects"),
    kind: formKind,
    name: v.string(),
    code: v.optional(v.string()),
    description: v.optional(v.string()),
    categoryId: v.optional(v.id("formCategories")),
  },
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx, args.projectId, formsErrors);
    if (!viewer.access.can("createForms")) {
      throw new ConvexError(formsErrors.insufficientPermissions);
    }

    const details = validateDetails(args);
    await validateCategory(ctx, args.projectId, args.categoryId);

    const formId = await insertForm(
      ctx,
      {
        ...details,
        projectId: args.projectId,
        kind: args.kind,
        categoryId: args.categoryId,
        titleFieldId: undefined,
        audience: "all",
        audienceRoleIds: [],
        createdBy: viewer.userId,
      },
      [{ id: "general", label: "General", order: 1, fields: [] }],
    );

    await ctx.runMutation(internal.logs.create, {
      description: `${KIND_NOUN[args.kind]} creado: ${details.name}`,
      type: "create",
      projectId: args.projectId,
      affectedEntityType: "form",
      affectedEntityId: formId,
    });

    return formId;
  },
});

export const duplicate = mutation({
  args: { id: v.id("forms") },
  handler: async (ctx, args) => {
    const { viewer, form } = await requireForm(
      ctx,
      args.id,
      "createForms",
      formsErrors,
    );

    // Se copia lo último que alguien escribió: el borrador si tiene cambios
    // sin publicar; si no, lo publicado.
    const source = form.hasDraftChanges
      ? await loadDraft(ctx, form)
      : ((await loadPublished(ctx, form)) ?? (await loadDraft(ctx, form)));
    if (!source) throw new ConvexError(formsErrors.versionNotFound);

    // Los ids de campo se conservan: las reglas internas siguen valiendo, y
    // dentro de otro formato no chocan con nada. El código no se copia: es
    // el del documento original en el sistema de gestión.
    const name = copyName(form.name);
    const formId = await insertForm(
      ctx,
      {
        projectId: form.projectId,
        kind: form.kind,
        name,
        code: undefined,
        description: form.description,
        categoryId: form.categoryId,
        titleFieldId: form.titleFieldId,
        audience: form.audience,
        audienceRoleIds: form.audienceRoleIds,
        createdBy: viewer.userId,
      },
      source.sections,
    );

    await ctx.runMutation(internal.logs.create, {
      description: `${KIND_NOUN[form.kind]} duplicado: ${name}`,
      type: "create",
      projectId: form.projectId,
      affectedEntityType: "form",
      affectedEntityId: formId,
    });

    return formId;
  },
});

export const updateDetails = mutation({
  args: {
    id: v.id("forms"),
    name: v.string(),
    code: v.optional(v.string()),
    description: v.optional(v.string()),
    categoryId: v.optional(v.id("formCategories")),
    audience: formAudience,
    audienceRoleIds: v.array(v.id("roles")),
  },
  handler: async (ctx, args) => {
    const { form } = await requireForm(ctx, args.id, "editForms", formsErrors);

    requireNotArchived(form);
    const details = validateDetails(args);
    await validateCategory(ctx, form.projectId, args.categoryId);

    const audienceRoleIds = await validateAudience(
      ctx,
      form.projectId,
      args.audience,
      args.audienceRoleIds,
    );

    await ctx.db.patch(args.id, {
      ...details,
      categoryId: args.categoryId,
      audience: args.audience,
      audienceRoleIds,
      nameSearch: formNameSearch(details.name, details.code),
    });

    await ctx.runMutation(internal.logs.create, {
      description: `${KIND_NOUN[form.kind]} actualizado: ${details.name}`,
      type: "update",
      projectId: form.projectId,
      affectedEntityType: "form",
      affectedEntityId: args.id,
    });

    return args.id;
  },
});

export const setTitleField = mutation({
  args: { id: v.id("forms"), titleFieldId: v.string() },
  handler: async (ctx, args) => {
    const { form } = await requireForm(ctx, args.id, "editForms", formsErrors);

    requireNotArchived(form);
    if (form.kind !== "catalog") throw new ConvexError(formsErrors.notCatalog);

    // El título tiene que valer en las dos versiones: en el borrador, que es
    // lo que se va a publicar, y en la publicada, que es con la que se
    // guardan los elementos hoy. Un campo recién añadido se publica primero.
    const [draft, published] = await Promise.all([
      loadDraft(ctx, form),
      loadPublished(ctx, form),
    ]);
    for (const version of [draft, published]) {
      if (!version) continue;
      const problem = validateForm(version.sections, {
        kind: "catalog",
        titleFieldId: args.titleFieldId,
      }).find((candidate) => candidate.fieldId === args.titleFieldId);
      if (problem) throw new ConvexError(problem.message);
    }

    await ctx.db.patch(args.id, { titleFieldId: args.titleFieldId });

    // El título de cada elemento es un derivado de su campo de título: al
    // cambiar la regla, se reconstruye (`01 §7.3`).
    if (form.titleFieldId !== args.titleFieldId && form.responseCount > 0) {
      await ctx.scheduler.runAfter(0, internal.formEntries.rebuildTitles, {
        formId: args.id,
        cursor: null,
      });
    }

    await ctx.runMutation(internal.logs.create, {
      description: `Listado actualizado: ${form.name} (cambió el campo de título)`,
      type: "update",
      projectId: form.projectId,
      affectedEntityType: "form",
      affectedEntityId: args.id,
    });

    return args.id;
  },
});

export const archive = mutation({
  args: { id: v.id("forms") },
  handler: async (ctx, args) => {
    const { form } = await requireForm(
      ctx,
      args.id,
      "deleteForms",
      formsErrors,
    );

    if (form.status === "archived") {
      throw new ConvexError(formsErrors.alreadyArchived);
    }

    await ctx.db.patch(args.id, { status: "archived" });

    await ctx.runMutation(internal.logs.create, {
      description: `${KIND_NOUN[form.kind]} archivado: ${form.name}`,
      type: "update",
      projectId: form.projectId,
      affectedEntityType: "form",
      affectedEntityId: args.id,
    });

    return args.id;
  },
});

export const unarchive = mutation({
  args: { id: v.id("forms") },
  handler: async (ctx, args) => {
    const { form } = await requireForm(
      ctx,
      args.id,
      "deleteForms",
      formsErrors,
    );

    if (form.status !== "archived") {
      throw new ConvexError(formsErrors.notArchived);
    }

    // Vuelve a donde estaba: publicado si alguna vez se publicó.
    await ctx.db.patch(args.id, {
      status: form.publishedVersionId ? "published" : "draft",
    });

    await ctx.runMutation(internal.logs.create, {
      description: `${KIND_NOUN[form.kind]} reactivado: ${form.name}`,
      type: "update",
      projectId: form.projectId,
      affectedEntityType: "form",
      affectedEntityId: args.id,
    });

    return args.id;
  },
});

export const remove = mutation({
  args: { id: v.id("forms") },
  handler: async (ctx, args) => {
    const { form } = await requireForm(
      ctx,
      args.id,
      "deleteForms",
      formsErrors,
    );

    // Con respuestas no se elimina: se archiva (diseño §7). Se mira la tabla
    // y no sólo el contador, que es un derivado.
    const firstResponse = await ctx.db
      .query("formResponses")
      .withIndex("formId", (q) => q.eq("formId", args.id))
      .first();
    if (form.responseCount > 0 || firstResponse) {
      throw new ConvexError(formsErrors.hasResponses);
    }

    const users = await formsReferencing(ctx, form);
    if (users.length > 0) {
      throw new ConvexError(formsErrors.usedBy(users.map((user) => user.name)));
    }

    // Las versiones no existen sin su formato (`01 §6.1`). Son pocas: una
    // por cada vez que alguien publicó.
    const versions = await ctx.db
      .query("formVersions")
      .withIndex("formId_number", (q) => q.eq("formId", args.id))
      .collect();
    for (const version of versions) await ctx.db.delete(version._id);
    // Sus resultados tampoco existen sin él; el tablero deja de enseñarlos.
    const results = await ctx.db
      .query("formResults")
      .withIndex("formId", (q) => q.eq("formId", args.id))
      .collect();
    for (const result of results) await ctx.db.delete(result._id);
    await ctx.db.delete(args.id);

    await ctx.runMutation(internal.logs.create, {
      description: `${KIND_NOUN[form.kind]} eliminado: ${form.name}`,
      type: "delete",
      projectId: form.projectId,
      affectedEntityType: "form",
      affectedEntityId: args.id,
    });

    return args.id;
  },
});

/* ─────────────────────────────── Lecturas ───────────────────────────────── */

/** Una fila de la lista de formatos: lo que identifica y lo que se puede
 *  hacer, sin las secciones. */
const listRow = (
  viewer: FormViewer,
  form: Doc<"forms">,
  categories: Map<Id<"formCategories">, string>,
) => ({
  _id: form._id,
  _creationTime: form._creationTime,
  kind: form.kind,
  name: form.name,
  code: form.code,
  description: form.description,
  status: form.status,
  categoryId: form.categoryId,
  categoryName: form.categoryId
    ? (categories.get(form.categoryId) ?? null)
    : null,
  audience: form.audience,
  publishedVersionNumber: form.publishedVersionNumber ?? null,
  hasDraftChanges: form.hasDraftChanges,
  responseCount: form.responseCount,
  canFill: canFillForm(viewer, form),
  canEdit: viewer.access.can("editForms"),
});

const categoryNames = async (ctx: QueryCtx, projectId: Id<"projects">) =>
  new Map(
    (
      await ctx.db
        .query("formCategories")
        .withIndex("projectId", (q) => q.eq("projectId", projectId))
        .collect()
    ).map((category) => [category._id, category.name]),
  );

/** Los formatos —o los listados— del proyecto que quien pregunta puede ver.
 *  Un miembro sin ninguna llave recibe una lista vacía; quien no pertenece,
 *  `null`. */
export const get = query({
  args: {
    projectId: v.id("projects"),
    kind: formKind,
    search: v.optional(v.string()),
    categoryId: v.optional(v.id("formCategories")),
    includeArchived: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;

    const viewer = await loadViewer(ctx, userId, args.projectId);
    if (!viewer) return null;

    const search = searchableText(args.search ?? "");
    const forms =
      search === ""
        ? await ctx.db
            .query("forms")
            .withIndex("projectId_kind", (q) =>
              q.eq("projectId", args.projectId).eq("kind", args.kind),
            )
            .take(MAX_FORMS_PER_PROJECT)
        : await ctx.db
            .query("forms")
            .withSearchIndex("search_name", (q) =>
              q
                .search("nameSearch", search)
                .eq("projectId", args.projectId)
                .eq("kind", args.kind),
            )
            .take(SEARCH_LIMIT);

    const categories = await categoryNames(ctx, args.projectId);
    const rows = forms
      .filter(
        (form) =>
          canSeeForm(viewer, form) &&
          (args.includeArchived || form.status !== "archived") &&
          (!args.categoryId || form.categoryId === args.categoryId),
      )
      .map((form) => listRow(viewer, form, categories));

    // Una búsqueda llega por relevancia; la lista entera, por nombre.
    return search === ""
      ? rows.sort((a, b) => a.name.localeCompare(b.name, "es"))
      : rows;
  },
});

/** Los formatos que quien pregunta puede diligenciar, los que más usa
 *  primero: el bloque «Para diligenciar» del inicio. */
export const listFillable = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;

    const viewer = await loadViewer(ctx, userId, args.projectId);
    if (!viewer) return null;

    const forms = await ctx.db
      .query("forms")
      .withIndex("projectId_kind", (q) =>
        q.eq("projectId", args.projectId).eq("kind", "record"),
      )
      .take(MAX_FORMS_PER_PROJECT);
    const fillable = forms.filter((form) => canFillForm(viewer, form));

    const categories = await categoryNames(ctx, args.projectId);
    const rows = await Promise.all(
      fillable.map(async (form) => {
        const last = await ctx.db
          .query("formResponses")
          .withIndex("formId_submittedBy_date", (q) =>
            q.eq("formId", form._id).eq("submittedBy", userId),
          )
          .order("desc")
          .first();
        return {
          _id: form._id,
          name: form.name,
          code: form.code,
          description: form.description,
          categoryName: form.categoryId
            ? (categories.get(form.categoryId) ?? null)
            : null,
          publishedVersionNumber: form.publishedVersionNumber ?? null,
          lastResponseDate: last?.date ?? null,
          lastResponseAt: last?._creationTime ?? null,
        };
      }),
    );

    // Lo usado hace menos, arriba; lo que nunca se ha usado, al final y por
    // nombre.
    return rows.sort(
      (a, b) =>
        (b.lastResponseAt ?? 0) - (a.lastResponseAt ?? 0) ||
        a.name.localeCompare(b.name, "es"),
    );
  },
});

export const getById = query({
  args: { id: v.id("forms") },
  handler: async (ctx, args) => {
    const found = await findVisibleForm(ctx, args.id);
    if (!found) return null;
    const { viewer, form } = found;

    const category = form.categoryId ? await ctx.db.get(form.categoryId) : null;

    return {
      _id: form._id,
      _creationTime: form._creationTime,
      projectId: form.projectId,
      kind: form.kind,
      name: form.name,
      code: form.code,
      description: form.description,
      status: form.status,
      categoryId: form.categoryId,
      categoryName: category?.name ?? null,
      titleFieldId: form.titleFieldId,
      audience: form.audience,
      audienceRoleIds: form.audienceRoleIds,
      publishedVersionId: form.publishedVersionId ?? null,
      publishedVersionNumber: form.publishedVersionNumber ?? null,
      hasDraftChanges: form.hasDraftChanges,
      responseCount: form.responseCount,
      ...formPermissions(viewer, form),
    };
  },
});

/** Los listados publicados del proyecto con los campos de su versión
 *  publicada: lo que el constructor necesita para configurar una relación. */
export const listCatalogs = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx, args.projectId, formsErrors);
    if (!viewer.access.can("editForms") && !viewer.access.can("createForms")) {
      throw new ConvexError(formsErrors.insufficientPermissions);
    }

    const catalogs = await ctx.db
      .query("forms")
      .withIndex("projectId_kind", (q) =>
        q.eq("projectId", args.projectId).eq("kind", "catalog"),
      )
      .take(MAX_FORMS_PER_PROJECT);

    const rows = await Promise.all(
      catalogs
        .filter((catalog) => catalog.status === "published")
        .map(async (catalog) => {
          const version = await loadPublished(ctx, catalog);
          return {
            _id: catalog._id,
            name: catalog.name,
            code: catalog.code,
            titleFieldId: catalog.titleFieldId,
            fields: flattenFields(version?.sections ?? []).map((field) => ({
              id: field.id,
              label: field.label,
              type: field.type,
            })),
          };
        }),
    );
    return rows.sort((a, b) => a.name.localeCompare(b.name, "es"));
  },
});

/** Qué formatos relacionan a este listado, para avisar antes de tocarlo. */
export const getUsage = query({
  args: { id: v.id("forms") },
  handler: async (ctx, args) => {
    const found = await findVisibleForm(ctx, args.id);
    if (!found) return null;

    // Salen todos, también los que quien pregunta no abriría: el aviso
    // «lo usan tres formatos» tiene que decir los tres.
    const users = await formsReferencing(ctx, found.form);
    return users
      .map((form) => ({
        _id: form._id,
        name: form.name,
        code: form.code,
        kind: form.kind,
        status: form.status,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, "es"));
  },
});
