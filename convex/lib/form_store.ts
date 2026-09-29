/** Lo que varias funciones del módulo leen de la base de la misma manera: los
 *  formatos de un proyecto, las versiones de un formato y quién usa un
 *  listado.
 *
 *  Con `ctx`. Las reglas que no necesitan la base están en los módulos puros
 *  (`form_validation.ts`, `form_references.ts`).
 */

import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { referencedFormIds } from "./form_references";
import type { FormSection } from "./form_types";
import { searchableText } from "./text";

/** Cuántos formatos admite un proyecto. Los formatos los crea una persona, no
 *  la operación: son cientos, no decenas de miles. El tope existe para que
 *  leerlos todos —que es lo que hace quien busca quién usa un listado— tenga
 *  un coste conocido (`01 §6`). */
export const MAX_FORMS_PER_PROJECT = 1000;

/** Todos los formatos y listados de un proyecto. Documentos ligeros: las
 *  secciones no viajan en ellos. */
export const projectForms = (ctx: QueryCtx, projectId: Id<"projects">) =>
  ctx.db
    .query("forms")
    .withIndex("projectId", (q) => q.eq("projectId", projectId))
    .take(MAX_FORMS_PER_PROJECT);

/** Nombre y código, como se buscan. */
export const formNameSearch = (name: string, code?: string) =>
  searchableText(`${name} ${code ?? ""}`);

export const loadDraft = async (ctx: QueryCtx, form: Doc<"forms">) =>
  form.draftVersionId ? await ctx.db.get(form.draftVersionId) : null;

export const loadPublished = async (ctx: QueryCtx, form: Doc<"forms">) =>
  form.publishedVersionId ? await ctx.db.get(form.publishedVersionId) : null;

/**
 * Los listados a los que apuntan el borrador y la versión publicada de un
 * formato: lo que se guarda en `forms.referencedFormIds`.
 *
 * Cuentan las dos versiones porque las dos atan al listado: la publicada,
 * porque se diligencia; el borrador, porque publicarlo después apuntaría a
 * algo que ya no existe (diseño §5). Un id que no es de la tabla —una relación
 * a medio configurar— no entra.
 */
export function deriveReferencedForms(
  ctx: QueryCtx,
  ...versions: (readonly FormSection[] | undefined)[]
): Id<"forms">[] {
  const ids = new Set<Id<"forms">>();
  for (const sections of versions) {
    for (const formId of referencedFormIds(sections ?? [])) {
      const id = ctx.db.normalizeId("forms", formId);
      if (id) ids.add(id);
    }
  }
  return [...ids];
}

/** Los formatos del proyecto que relacionan a este listado, en su borrador o
 *  en su versión publicada. Él mismo no cuenta. */
export async function formsReferencing(
  ctx: QueryCtx,
  catalog: Doc<"forms">,
): Promise<Doc<"forms">[]> {
  const forms = await projectForms(ctx, catalog.projectId);
  return forms.filter(
    (form) =>
      form._id !== catalog._id && form.referencedFormIds.includes(catalog._id),
  );
}

/** Igualdad estructural de dos valores de Convex: es lo que dice si el
 *  borrador difiere de lo publicado. El orden de las claves de un objeto no
 *  cuenta; el de los elementos de un arreglo, sí. */
export function isSameValue(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== "object" || typeof b !== "object" || !a || !b) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    return (
      a.length === b.length &&
      a.every((item, index) => isSameValue(item, b[index]))
    );
  }

  const left = Object.entries(a).filter(([, value]) => value !== undefined);
  const right = new Map(
    Object.entries(b).filter(([, value]) => value !== undefined),
  );
  return (
    left.length === right.size &&
    left.every(([key, value]) => isSameValue(value, right.get(key)))
  );
}
