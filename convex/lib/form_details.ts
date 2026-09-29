/** Los datos con que se crea y se edita un formato: su nombre, su código, su
 *  categoría y su audiencia, validados como manda `01 §4.2`, y la escritura
 *  que lo hace nacer con su borrador.
 *
 *  Con `ctx`. Lo usan `forms.create`, `forms.duplicate` y
 *  `forms.updateDetails`.
 */

import { ConvexError } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { formsErrors } from "./error_messages";
import {
  MAX_FORMS_PER_PROJECT,
  deriveReferencedForms,
  formNameSearch,
  projectForms,
} from "./form_store";
import {
  FORM_CODE_MAX,
  FORM_DESCRIPTION_MAX,
  FORM_NAME_MAX,
  FORM_NAME_MIN,
  type FormAudience,
  type FormSection,
} from "./form_types";
import { normalizeText } from "./text";

/** Valida lo que el formulario ya comprobaba en el navegador. */
export function validateDetails(args: {
  name: string;
  code?: string;
  description?: string;
}) {
  const name = normalizeText(args.name);
  const code = normalizeText(args.code ?? "");
  const description = (args.description ?? "").trim();

  if (name.length < FORM_NAME_MIN || name.length > FORM_NAME_MAX) {
    throw new ConvexError(formsErrors.invalidName);
  }
  if (code.length > FORM_CODE_MAX) {
    throw new ConvexError(formsErrors.invalidCode);
  }
  if (description.length > FORM_DESCRIPTION_MAX) {
    throw new ConvexError(formsErrors.invalidDescription);
  }
  return {
    name,
    code: code || undefined,
    description: description || undefined,
  };
}

/** La categoría llega por argumentos: tiene que demostrar que es de este
 *  proyecto (`01 §4.3`). */
export async function validateCategory(
  ctx: QueryCtx,
  projectId: Id<"projects">,
  categoryId: Id<"formCategories"> | undefined,
) {
  if (!categoryId) return;
  const category = await ctx.db.get(categoryId);
  if (!category || category.projectId !== projectId) {
    throw new ConvexError(formsErrors.categoryNotFound);
  }
}

export const requireNotArchived = (form: Doc<"forms">) => {
  if (form.status === "archived") throw new ConvexError(formsErrors.archived);
};

/** El nombre de una copia, sin pasarse del largo que admite un nombre. */
export const copyName = (name: string) =>
  `Copia de ${name}`.slice(0, FORM_NAME_MAX);

/** Inserta un formato en borrador con su primera versión, que es su borrador.
 *  Las dos escrituras van juntas: un formato sin borrador no se puede abrir. */
export async function insertForm(
  ctx: MutationCtx,
  form: Pick<
    Doc<"forms">,
    | "projectId"
    | "kind"
    | "name"
    | "code"
    | "description"
    | "categoryId"
    | "titleFieldId"
    | "audience"
    | "audienceRoleIds"
    | "createdBy"
  >,
  sections: FormSection[],
) {
  const existing = await projectForms(ctx, form.projectId);
  if (existing.length >= MAX_FORMS_PER_PROJECT) {
    throw new ConvexError(formsErrors.tooManyForms);
  }

  const formId = await ctx.db.insert("forms", {
    ...form,
    status: "draft",
    // Nada publicado todavía: todo el borrador está por publicar.
    hasDraftChanges: true,
    responseCount: 0,
    nameSearch: formNameSearch(form.name, form.code),
    referencedFormIds: deriveReferencedForms(ctx, sections),
  });
  const draftVersionId = await ctx.db.insert("formVersions", {
    formId,
    projectId: form.projectId,
    number: 0,
    status: "draft",
    sections,
  });
  await ctx.db.patch(formId, { draftVersionId });
  return formId;
}

/** Los roles de la audiencia, sin repetir. Cada uno llega por argumentos y
 *  tiene que ser de este proyecto: uno ajeno abriría el formato a quien tenga
 *  ese rol en otra obra. Con «todos», los roles elegidos antes no significan
 *  nada y no se guardan. */
export async function validateAudience(
  ctx: QueryCtx,
  projectId: Id<"projects">,
  audience: FormAudience,
  roleIds: readonly Id<"roles">[],
): Promise<Id<"roles">[]> {
  const audienceRoleIds = [...new Set(roleIds)];
  for (const roleId of audienceRoleIds) {
    const role = await ctx.db.get(roleId);
    if (!role || role.projectId !== projectId) {
      throw new ConvexError(formsErrors.audienceRoleNotFound);
    }
  }
  if (audience !== "roles") return [];
  if (audienceRoleIds.length === 0) {
    throw new ConvexError(formsErrors.audienceWithoutRoles);
  }
  return audienceRoleIds;
}
