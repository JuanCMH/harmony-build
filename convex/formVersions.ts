import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { type QueryCtx, mutation, query } from "./_generated/server";
import { formsErrors } from "./lib/error_messages";
import {
  canSeeForm,
  findVisibleForm,
  loadViewer,
  requireForm,
} from "./lib/form_access";
import { requireNotArchived } from "./lib/form_details";
import { flattenFields } from "./lib/form_evaluation";
import {
  type FormNode,
  collectFormReferences,
  findReferenceCycle,
  referencedFormIds,
} from "./lib/form_references";
import {
  deriveReferencedForms,
  formsReferencing,
  isSameValue,
  loadDraft,
  loadPublished,
} from "./lib/form_store";
import type { FormSection } from "./lib/form_types";
import { validateForm } from "./lib/form_validation";
import { formSections } from "./lib/form_validators";

const KIND_NOUN = {
  record: "Formato",
  catalog: "Listado",
  tracking: "Seguimiento",
} as const;

/** El borrador de un formato. Existe siempre: nace con él. */
async function requireDraft(ctx: QueryCtx, form: Doc<"forms">) {
  const draft = await loadDraft(ctx, form);
  if (!draft) throw new ConvexError(formsErrors.versionNotFound);
  return draft;
}

/** Lanza con el primer problema de la definición, si lo hay. */
function requireValid(form: Doc<"forms">, sections: readonly FormSection[]) {
  const [problem] = validateForm(sections, {
    kind: form.kind,
    titleFieldId: form.titleFieldId,
  });
  if (problem) throw new ConvexError(problem.message);
}

/* ─────────────────── Integridad de un listado (diseño §5) ────────────────── */

/**
 * No se puede quitar de un listado un campo que otro formato trae por
 * autocompletar, ni su campo de título. Lanza nombrando el campo y el formato
 * que lo usa.
 *
 * Se mira el borrador y la versión publicada de cada formato que relaciona al
 * listado: los dos lo atan.
 */
async function requireFieldsInUse(
  ctx: QueryCtx,
  catalog: Doc<"forms">,
  before: readonly FormSection[],
  after: readonly FormSection[],
) {
  if (catalog.kind !== "catalog") return;

  const remaining = new Set(flattenFields(after).map((field) => field.id));
  const labelOf = new Map(
    flattenFields(before).map((field) => [field.id, field.label]),
  );
  const removed = (fieldId: string) =>
    labelOf.has(fieldId) && !remaining.has(fieldId);

  if (catalog.titleFieldId && removed(catalog.titleFieldId)) {
    throw new ConvexError(
      formsErrors.titleFieldInUse(labelOf.get(catalog.titleFieldId) ?? ""),
    );
  }

  for (const user of await formsReferencing(ctx, catalog)) {
    const versions = await Promise.all([
      loadDraft(ctx, user),
      loadPublished(ctx, user),
    ]);
    for (const version of versions) {
      for (const reference of collectFormReferences(version?.sections ?? [])) {
        if (reference.config.formId !== catalog._id) continue;
        const lost = reference.config.fill.find(removed);
        if (lost !== undefined) {
          throw new ConvexError(
            formsErrors.fieldInUse(labelOf.get(lost) ?? lost, user.name),
          );
        }
      }
    }
  }
}

/**
 * Lo que publicar exige de cada relación y sólo la base puede decir: que el
 * listado exista, sea de este proyecto, sea un listado y esté publicado, y que
 * los campos que se traen existan en su versión publicada.
 *
 * Devuelve los listados alcanzables desde el formato, con sus secciones
 * publicadas: es el grafo en el que se buscan los ciclos.
 */
async function requireReferences(
  ctx: QueryCtx,
  form: Doc<"forms">,
  sections: readonly FormSection[],
): Promise<{ nodes: FormNode[]; names: Map<string, string> }> {
  const names = new Map<string, string>([[form._id, form.name]]);
  const nodes: FormNode[] = [{ formId: form._id, sections }];

  for (const reference of collectFormReferences(sections)) {
    const catalogId = ctx.db.normalizeId("forms", reference.config.formId);
    const catalog = catalogId ? await ctx.db.get(catalogId) : null;
    if (!catalog || catalog.projectId !== form.projectId) {
      throw new ConvexError(formsErrors.referenceNotFound(reference.label));
    }
    if (catalog.kind !== "catalog") {
      throw new ConvexError(
        formsErrors.referenceNotCatalog(reference.label, catalog.name),
      );
    }
    // Un listado que se relaciona consigo mismo no necesita estar publicado
    // para que se vea el ciclo, que es el error que importa.
    if (catalog._id === form._id) continue;

    const published =
      catalog.status === "published" ? await loadPublished(ctx, catalog) : null;
    if (!published) {
      throw new ConvexError(
        formsErrors.referenceNotPublished(reference.label, catalog.name),
      );
    }
    const fields = new Set(
      flattenFields(published.sections).map((field) => field.id),
    );
    if (reference.config.fill.some((fieldId) => !fields.has(fieldId))) {
      throw new ConvexError(
        formsErrors.referenceFillMissing(reference.label, catalog.name),
      );
    }
  }

  // El resto del grafo: lo que se alcanza siguiendo las relaciones de cada
  // listado. Son pocos —los listados de un proyecto—, y cada uno se lee una
  // vez.
  const pending = referencedFormIds(sections);
  while (pending.length > 0) {
    const formId = pending.pop();
    if (formId === undefined || names.has(formId)) continue;
    const id = ctx.db.normalizeId("forms", formId);
    const catalog = id ? await ctx.db.get(id) : null;
    if (!catalog) continue;
    const published = await loadPublished(ctx, catalog);
    names.set(formId, catalog.name);
    nodes.push({ formId, sections: published?.sections ?? [] });
    pending.push(...referencedFormIds(published?.sections ?? []));
  }

  return { nodes, names };
}

/* ────────────────────────────── Escrituras ──────────────────────────────── */

export const saveDraft = mutation({
  args: { id: v.id("forms"), sections: formSections },
  handler: async (ctx, args) => {
    const { form } = await requireForm(ctx, args.id, "editForms", formsErrors);

    requireNotArchived(form);
    const [draft, published] = await Promise.all([
      requireDraft(ctx, form),
      loadPublished(ctx, form),
    ]);
    // La integridad va antes que la forma: «no se puede quitar Placa, lo usa
    // la inspección de vehículos» dice más que «el campo de título ya no
    // existe».
    await requireFieldsInUse(
      ctx,
      form,
      [...draft.sections, ...(published?.sections ?? [])],
      args.sections,
    );
    requireValid(form, args.sections);

    await ctx.db.patch(draft._id, { sections: args.sections });
    await ctx.db.patch(args.id, {
      hasDraftChanges:
        !published || !isSameValue(published.sections, args.sections),
      referencedFormIds: deriveReferencedForms(
        ctx,
        args.sections,
        published?.sections,
      ),
    });

    // Sin entrada de auditoría: un borrador es trabajo en curso, y lo que
    // queda registrado es el acto de publicarlo (diseño, «Reglas de acceso»).
    return args.id;
  },
});

export const publish = mutation({
  args: { id: v.id("forms") },
  handler: async (ctx, args) => {
    const { viewer, form } = await requireForm(
      ctx,
      args.id,
      "editForms",
      formsErrors,
    );

    requireNotArchived(form);
    const draft = await requireDraft(ctx, form);
    const { sections } = draft;

    if (flattenFields(sections).length === 0) {
      throw new ConvexError(formsErrors.emptyForm);
    }
    if (form.kind !== "record" && !form.titleFieldId) {
      throw new ConvexError(formsErrors.titleFieldRequired);
    }
    requireValid(form, sections);
    // Otro formato pudo empezar a traer un campo después de que este
    // borrador lo quitara: se vuelve a mirar contra lo publicado.
    const current = await loadPublished(ctx, form);
    await requireFieldsInUse(ctx, form, current?.sections ?? [], sections);

    const { nodes, names } = await requireReferences(ctx, form, sections);
    const cycle = findReferenceCycle(nodes, form._id);
    if (cycle) {
      throw new ConvexError(
        formsErrors.referenceCycle(cycle.map((id) => names.get(id) ?? id)),
      );
    }

    // Una versión nueva cada vez, que ya no se toca: las respuestas de la
    // anterior se siguen leyendo con la anterior (diseño §2).
    const number = (form.publishedVersionNumber ?? 0) + 1;
    const publishedVersionId = await ctx.db.insert("formVersions", {
      formId: args.id,
      projectId: form.projectId,
      number,
      status: "published",
      sections,
      publishedAt: Date.now(),
      publishedBy: viewer.userId,
    });
    await ctx.db.patch(args.id, {
      status: "published",
      publishedVersionId,
      publishedVersionNumber: number,
      hasDraftChanges: false,
      referencedFormIds: deriveReferencedForms(ctx, sections),
    });

    await ctx.runMutation(internal.logs.create, {
      description: `${KIND_NOUN[form.kind]} publicado: ${form.name} (versión ${number})`,
      type: "update",
      projectId: form.projectId,
      affectedEntityType: "form",
      affectedEntityId: args.id,
    });

    return number;
  },
});

export const discardDraft = mutation({
  args: { id: v.id("forms") },
  handler: async (ctx, args) => {
    const { form } = await requireForm(ctx, args.id, "editForms", formsErrors);

    requireNotArchived(form);
    const [draft, published] = await Promise.all([
      requireDraft(ctx, form),
      loadPublished(ctx, form),
    ]);
    if (!published) throw new ConvexError(formsErrors.nothingToDiscard);

    await ctx.db.patch(draft._id, { sections: published.sections });
    await ctx.db.patch(args.id, {
      hasDraftChanges: false,
      referencedFormIds: deriveReferencedForms(ctx, published.sections),
    });

    return args.id;
  },
});

/* ─────────────────────────────── Lecturas ───────────────────────────────── */

const versionView = (version: Doc<"formVersions">) => ({
  _id: version._id,
  formId: version.formId,
  number: version.number,
  status: version.status,
  publishedAt: version.publishedAt ?? null,
  sections: version.sections,
});

/** El borrador, para el constructor. Lo gobierna una llave, así que lanza. */
export const getDraft = query({
  args: { id: v.id("forms") },
  handler: async (ctx, args) => {
    const { form } = await requireForm(ctx, args.id, "editForms", formsErrors);
    const draft = await requireDraft(ctx, form);
    return {
      ...versionView(draft),
      hasDraftChanges: form.hasDraftChanges,
      publishedVersionNumber: form.publishedVersionNumber ?? null,
    };
  },
});

/** Las secciones de la última versión publicada: lo que se diligencia.
 *  `null` si no hay acceso o si el formato nunca se publicó. */
export const getPublished = query({
  args: { id: v.id("forms") },
  handler: async (ctx, args) => {
    const found = await findVisibleForm(ctx, args.id);
    if (!found) return null;

    const published = await loadPublished(ctx, found.form);
    return published ? versionView(published) : null;
  },
});

/** Una versión concreta: con la que se lee una respuesta antigua. */
export const getVersion = query({
  args: { versionId: v.id("formVersions") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;

    const version = await ctx.db.get(args.versionId);
    if (!version) return null;

    // El proyecto sale del formato de la versión, nunca de un argumento.
    const form: Doc<"forms"> | null = await ctx.db.get(version.formId);
    if (!form) return null;

    const viewer = await loadViewer(ctx, userId, form.projectId);
    if (!viewer || !canSeeForm(viewer, form)) return null;
    // El borrador es del constructor.
    if (version.status === "draft" && !viewer.access.can("editForms")) {
      return null;
    }

    return versionView(version);
  },
});
