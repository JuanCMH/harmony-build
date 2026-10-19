import { entryTitle } from "./lib/entry_title";
import { getAuthUserId } from "@convex-dev/auth/server";
import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import {
  type QueryCtx,
  internalMutation,
  mutation,
  query,
} from "./_generated/server";
import { todayInColombia } from "./lib/dates";
import { formResponsesErrors } from "./lib/error_messages";
import {
  type FormViewer,
  canEditEntries,
  canFillForm,
  canViewAll,
  loadViewer,
  requireUser,
} from "./lib/form_access";
import { collectFormReferences } from "./lib/form_references";
import { nameReader, rowReader } from "./lib/form_rows";
import { loadPublished } from "./lib/form_store";
import type { FormSection } from "./lib/form_types";
import {
  composeReference,
  releaseFiles,
  replaceLinks,
  resolveValues,
  writeLinks,
} from "./lib/form_values";
import { storedFieldValues } from "./lib/form_validators";
import { searchableText } from "./lib/text";

/** Cuántos elementos ofrece el selector de una relación. */
const SEARCH_LIMIT = 30;

/** Cuántos elementos reconstruye como mucho una pasada de `rebuildTitles`. */
const REBUILD_PAGE = 100;

/* ─────────────────────────────── Ayudantes ──────────────────────────────── */

/** Identidad, existencia y permiso para mantener los elementos de un listado,
 *  con el proyecto derivado del listado. */
async function requireCatalogEditor(ctx: QueryCtx, formId: Id<"forms">) {
  const userId = await requireUser(ctx, formResponsesErrors);

  const form = await ctx.db.get(formId);
  if (!form) throw new ConvexError(formResponsesErrors.formNotFound);

  const viewer = await loadViewer(ctx, userId, form.projectId);
  if (!viewer?.access.can("editCatalogs")) {
    throw new ConvexError(formResponsesErrors.insufficientPermissions);
  }
  if (form.kind !== "catalog") {
    throw new ConvexError(formResponsesErrors.notCatalog);
  }
  return { viewer, form };
}

/** La versión vigente de un listado: con la que se guardan sus elementos. */
async function requireCurrentVersion(ctx: QueryCtx, form: Doc<"forms">) {
  const version =
    form.status === "published" ? await loadPublished(ctx, form) : null;
  if (!version) {
    throw new ConvexError(formResponsesErrors.formNotFillable(form.kind));
  }
  return version;
}

/* ────────────────────────────── Escrituras ──────────────────────────────── */

export const createEntry = mutation({
  args: { formId: v.id("forms"), values: storedFieldValues },
  handler: async (ctx, args) => {
    const { viewer, form } = await requireCatalogEditor(ctx, args.formId);

    const version = await requireCurrentVersion(ctx, form);
    const date = todayInColombia(Date.now());
    const resolved = await resolveValues(ctx, {
      projectId: form.projectId,
      sections: version.sections,
      values: args.values,
      date,
      authorId: viewer.userId,
      // Un listado no admite firmas: no hay nombre con el que firmar.
      signerName: "",
    });
    const { title, titleSearch } = entryTitle(
      form,
      version.sections,
      resolved.values,
    );

    const entry = {
      formId: form._id,
      projectId: form.projectId,
      versionId: version._id,
      date,
      submittedBy: viewer.userId,
      status: "submitted" as const,
      title,
      titleSearch,
      active: true,
      values: resolved.values,
    };
    const entryId = await ctx.db.insert("formResponses", entry);
    await writeLinks(ctx, { ...entry, _id: entryId }, resolved.links);
    await ctx.db.patch(form._id, { responseCount: form.responseCount + 1 });

    await ctx.runMutation(internal.logs.create, {
      description: `Elemento añadido a ${form.name}: ${title}`,
      type: "create",
      projectId: form.projectId,
      affectedEntityType: "formResponse",
      affectedEntityId: entryId,
    });

    return entryId;
  },
});

/** Edita un elemento y lo pasa a la versión vigente del listado: se conservan
 *  los valores de los campos que siguen existiendo (diseño §2). */
export const updateEntry = mutation({
  args: { id: v.id("formResponses"), values: storedFieldValues },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx, formResponsesErrors);
    const entry = await ctx.db.get(args.id);
    if (!entry) throw new ConvexError(formResponsesErrors.entryNotFound);
    const { form } = await requireCatalogEditor(ctx, entry.formId);

    const version = await requireCurrentVersion(ctx, form);
    // La fecha y el autor del contexto son los del elemento: editarlo no lo
    // convierte en otro.
    const resolved = await resolveValues(ctx, {
      projectId: form.projectId,
      sections: version.sections,
      values: args.values,
      date: entry.date,
      authorId: entry.submittedBy,
      signerName: "",
      previous: entry.values,
    });
    const { title, titleSearch } = entryTitle(
      form,
      version.sections,
      resolved.values,
    );

    await ctx.db.patch(args.id, {
      versionId: version._id,
      values: resolved.values,
      title,
      titleSearch,
      updatedAt: Date.now(),
      updatedBy: userId,
    });
    await replaceLinks(ctx, entry, resolved.links);
    await releaseFiles(ctx, entry.values, resolved.values);

    await ctx.runMutation(internal.logs.create, {
      description: `Elemento de ${form.name} actualizado: ${title}`,
      type: "update",
      projectId: form.projectId,
      affectedEntityType: "formResponse",
      affectedEntityId: args.id,
    });

    return args.id;
  },
});

/** Inactiva o reactiva un elemento. Un elemento **nunca se borra**: alguna
 *  respuesta puede haberlo elegido, y su historial tiene que seguir ahí
 *  (diseño §5). */
export const setEntryActive = mutation({
  args: { id: v.id("formResponses"), active: v.boolean() },
  handler: async (ctx, args) => {
    await requireUser(ctx, formResponsesErrors);
    const entry = await ctx.db.get(args.id);
    if (!entry) throw new ConvexError(formResponsesErrors.entryNotFound);
    const { viewer, form } = await requireCatalogEditor(ctx, entry.formId);

    if (entry.active === args.active) return args.id;

    await ctx.db.patch(args.id, {
      active: args.active,
      updatedAt: Date.now(),
      updatedBy: viewer.userId,
    });

    await ctx.runMutation(internal.logs.create, {
      description: `Elemento de ${form.name} ${args.active ? "reactivado" : "inactivado"}: ${entry.title ?? ""}`,
      type: "update",
      projectId: form.projectId,
      affectedEntityType: "formResponse",
      affectedEntityId: args.id,
    });

    return args.id;
  },
});

/** Reconstruye el título de los elementos de un listado cuando cambia su
 *  campo de título. Por páginas, re-agendándose; idempotente. Un elemento sin
 *  valor en el campo nuevo conserva el título que tenía: uno vacío no se
 *  podría elegir. */
export const rebuildTitles = internalMutation({
  args: {
    formId: v.id("forms"),
    cursor: v.union(v.string(), v.null()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const form = await ctx.db.get(args.formId);
    if (!form) return null;

    const page = await ctx.db
      .query("formResponses")
      .withIndex("formId", (q) => q.eq("formId", args.formId))
      .paginate({ cursor: args.cursor, numItems: REBUILD_PAGE });

    const sections = new Map<Id<"formVersions">, FormSection[]>();
    for (const entry of page.page) {
      let own = sections.get(entry.versionId);
      if (!own) {
        own = (await ctx.db.get(entry.versionId))?.sections ?? [];
        sections.set(entry.versionId, own);
      }
      const { title, titleSearch } = entryTitle(form, own, entry.values);
      if (title !== "" && title !== entry.title) {
        await ctx.db.patch(entry._id, { title, titleSearch });
      }
    }

    if (!page.isDone) {
      await ctx.scheduler.runAfter(0, internal.formEntries.rebuildTitles, {
        formId: args.formId,
        cursor: page.continueCursor,
      });
    }
    return null;
  },
});

/* ─────────────────────────────── Lecturas ───────────────────────────────── */

/** Quien pregunta, si puede leer los elementos del listado; lanza si no. */
async function requireCatalogReader(
  ctx: QueryCtx,
  formId: Id<"forms">,
  allowed: (viewer: FormViewer, form: Doc<"forms">) => boolean,
) {
  const userId = await requireUser(ctx, formResponsesErrors);

  const form = await ctx.db.get(formId);
  if (!form) throw new ConvexError(formResponsesErrors.formNotFound);

  const viewer = await loadViewer(ctx, userId, form.projectId);
  if (!viewer || !allowed(viewer, form)) {
    throw new ConvexError(formResponsesErrors.insufficientPermissions);
  }
  if (form.kind !== "catalog") {
    throw new ConvexError(formResponsesErrors.notCatalog);
  }
  return { viewer, form };
}

/** Los elementos de un listado, por título. Los inactivos sólo salen si se
 *  piden. La ve quien consulta —`viewResponses`— o quien los mantiene
 *  —`editCatalogs`—. */
export const listEntries = query({
  args: {
    formId: v.id("forms"),
    paginationOpts: paginationOptsValidator,
    search: v.optional(v.string()),
    includeInactive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { form } = await requireCatalogReader(ctx, args.formId, canViewAll);

    const search = searchableText(args.search ?? "");
    const all = args.includeInactive === true;
    const entries =
      search !== ""
        ? ctx.db.query("formResponses").withSearchIndex("search_title", (q) => {
            const found = q
              .search("titleSearch", search)
              .eq("formId", form._id);
            return all ? found : found.eq("active", true);
          })
        : all
          ? ctx.db
              .query("formResponses")
              .withIndex("formId_titleSearch", (q) => q.eq("formId", form._id))
          : ctx.db
              .query("formResponses")
              .withIndex("formId_active_titleSearch", (q) =>
                q.eq("formId", form._id).eq("active", true),
              );

    const page = await entries.paginate(args.paginationOpts);
    const toRow = await rowReader(ctx, form);
    return { ...page, page: await Promise.all(page.page.map(toRow)) };
  },
});

/**
 * Hasta 30 elementos **activos** de un listado, por título: lo que ofrece el
 * selector de una relación.
 *
 * La regla de acceso, simplificada a propósito: la lee quien tiene alguna de
 * las llaves `fillForms`, `viewResponses` o `editCatalogs` en el proyecto. La
 * regla exacta —«quien puede diligenciar algún formato que relacione este
 * listado»— obligaría a recorrer los formatos del proyecto en cada pulsación
 * del buscador, para proteger lo que esta función entrega: el título de los
 * elementos activos. Lo que un elemento lleva dentro no sale de aquí: sale de
 * `getReferencePreview`, que sí exige poder diligenciar el formato concreto.
 */
export const searchEntries = query({
  args: { formId: v.id("forms"), search: v.string() },
  handler: async (ctx, args) => {
    const { form } = await requireCatalogReader(
      ctx,
      args.formId,
      (viewer, catalog) =>
        viewer.access.can("fillForms") || canViewAll(viewer, catalog),
    );
    // Un listado archivado o sin publicar no ofrece elementos.
    if (form.status !== "published") return [];

    const search = searchableText(args.search);
    const entries =
      search === ""
        ? await ctx.db
            .query("formResponses")
            .withIndex("formId_active_titleSearch", (q) =>
              q.eq("formId", form._id).eq("active", true),
            )
            .take(SEARCH_LIMIT)
        : await ctx.db
            .query("formResponses")
            .withSearchIndex("search_title", (q) =>
              q
                .search("titleSearch", search)
                .eq("formId", form._id)
                .eq("active", true),
            )
            .take(SEARCH_LIMIT);

    return entries.map((entry) => ({
      _id: entry._id,
      title: entry.title ?? "",
    }));
  },
});

/**
 * El título y la instantánea que el servidor compondría si se eligiera este
 * elemento en este campo: lo que el formulario enseña bajo el selector.
 *
 * `null` si el campo no es una relación, si el elemento no es de su listado o
 * si quien pregunta no puede diligenciar ese formato.
 */
export const getReferencePreview = query({
  args: {
    fieldFormId: v.id("forms"),
    fieldId: v.string(),
    /** Cuando la relación es la columna de una tabla. */
    columnId: v.optional(v.string()),
    responseId: v.id("formResponses"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;

    const form = await ctx.db.get(args.fieldFormId);
    if (!form) return null;

    const viewer = await loadViewer(ctx, userId, form.projectId);
    if (
      !viewer ||
      !(canFillForm(viewer, form) || canEditEntries(viewer, form))
    ) {
      return null;
    }

    const published = await loadPublished(ctx, form);
    const reference = collectFormReferences(published?.sections ?? []).find(
      (candidate) =>
        candidate.fieldId === args.fieldId &&
        candidate.columnId === args.columnId,
    );
    if (!reference) return null;

    const composed = await composeReference(ctx, {
      projectId: form.projectId,
      config: reference.config,
      responseId: args.responseId,
    });
    if (!composed) return null;

    return {
      responseId: composed.responseId,
      label: composed.label,
      snapshot: composed.snapshot,
      active: composed.active,
    };
  },
});

/**
 * Las respuestas de otros formatos que eligieron este elemento, lo más
 * reciente primero: «inspecciones de SLP-835».
 *
 * Como en el listado de respuestas, quien no tiene `viewResponses` ve sólo
 * las suyas.
 */
export const listEntryHistory = query({
  args: {
    entryId: v.id("formResponses"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx, formResponsesErrors);

    const entry = await ctx.db.get(args.entryId);
    if (!entry) throw new ConvexError(formResponsesErrors.entryNotFound);

    const viewer = await loadViewer(ctx, userId, entry.projectId);
    const seesAll = viewer?.access.can("viewResponses") === true;
    if (!viewer || !(seesAll || viewer.access.can("fillForms"))) {
      throw new ConvexError(formResponsesErrors.insufficientPermissions);
    }

    const links = ctx.db
      .query("formResponseLinks")
      .withIndex("targetResponseId", (q) =>
        q.eq("targetResponseId", args.entryId),
      )
      .order("desc");
    const page = await (seesAll
      ? links
      : links.filter((q) => q.eq(q.field("submittedBy"), userId))
    ).paginate(args.paginationOpts);

    const nameOf = nameReader(ctx);
    const forms = new Map<Id<"forms">, Doc<"forms"> | null>();
    const rows = [];
    for (const link of page.page) {
      if (!forms.has(link.formId)) {
        forms.set(link.formId, await ctx.db.get(link.formId));
      }
      const form = forms.get(link.formId);
      const response = await ctx.db.get(link.responseId);
      if (!form || !response) continue;
      rows.push({
        responseId: response._id,
        formId: form._id,
        formName: form.name,
        formCode: form.code,
        formKind: form.kind,
        date: response.date,
        status: response.status,
        title: response.title ?? null,
        author: {
          _id: response.submittedBy,
          name: await nameOf(response.submittedBy),
        },
      });
    }
    return { ...page, page: rows };
  },
});
