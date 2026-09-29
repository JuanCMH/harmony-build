import { ConvexError, v } from "convex/values";
import { mutation } from "./_generated/server";
import { formResponsesErrors } from "./lib/error_messages";
import {
  canEditEntries,
  canFillForm,
  loadViewer,
  requireUser,
} from "./lib/form_access";

/**
 * Una URL para subir el archivo, la foto o la firma de un campo.
 *
 * Exige lo mismo que guardar la respuesta: poder diligenciar el formato o, en
 * un listado, poder mantener sus elementos. Sin eso, esto sería escritura
 * libre en el almacenamiento del proyecto.
 *
 * Subir no liga nada: el archivo queda en la respuesta cuando se guarda, y
 * `resolveValues` comprueba que sea recién subido y del tipo y tamaño que el
 * campo admite.
 */
export const generateUploadUrl = mutation({
  args: { formId: v.id("forms") },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx, formResponsesErrors);

    const form = await ctx.db.get(args.formId);
    if (!form) throw new ConvexError(formResponsesErrors.formNotFound);

    const viewer = await loadViewer(ctx, userId, form.projectId);
    if (
      !viewer ||
      !(canFillForm(viewer, form) || canEditEntries(viewer, form))
    ) {
      throw new ConvexError(formResponsesErrors.insufficientPermissions);
    }

    return await ctx.storage.generateUploadUrl();
  },
});
