import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";
import { digestRebuildDay } from "./lib/form_digests";
import { projectForms } from "./lib/form_store";
import { DIGEST_VERSION } from "./lib/response_digest";

/** Cuántas respuestas lee como mucho una pasada de `rebuild`. */
const REBUILD_BUDGET = 150;

/**
 * Reconstruye los resúmenes diarios de un formato, día a día, re-agendándose
 * (`01 §7.3`: una copia derivada se reconstruye cuando cambia su regla, y la
 * primera vez para lo que ya existía).
 *
 * Cada día se rehace entero a partir de sus respuestas, así que es
 * idempotente y convive con las escrituras: la que llega antes entra en la
 * lectura del día; la que llega después se suma al resumen ya hecho. Al
 * terminar deja el formato al día, y desde entonces sus resultados salen de
 * los resúmenes.
 *
 * Interna: la ejecuta quien administra el deployment
 * (`bunx convex run formDigests:rebuild '{"formId":"…"}'`).
 */
export const rebuild = internalMutation({
  args: {
    formId: v.id("forms"),
    /** El último día ya rehecho. */
    after: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const form = await ctx.db.get(args.formId);
    if (!form || form.kind !== "record") return null;

    // Al empezar, los resúmenes dejan de darse por buenos y se retiran los
    // de días que ya no tienen respuestas.
    if (args.after === undefined) {
      if (form.digestVersion !== undefined) {
        await ctx.db.patch(form._id, { digestVersion: undefined });
      }
      const stale = await ctx.db
        .query("formDayDigests")
        .withIndex("formId_date", (q) => q.eq("formId", form._id))
        .take(REBUILD_BUDGET);
      for (const digest of stale) await ctx.db.delete(digest._id);
      if (stale.length === REBUILD_BUDGET) {
        await ctx.scheduler.runAfter(0, internal.formDigests.rebuild, {
          formId: form._id,
        });
        return null;
      }
    }

    let after = args.after ?? "";
    let budget = REBUILD_BUDGET;
    while (budget > 0) {
      const next = await ctx.db
        .query("formResponses")
        .withIndex("formId_date", (q) =>
          q.eq("formId", form._id).gt("date", after),
        )
        .first();
      if (!next) {
        await ctx.db.patch(form._id, { digestVersion: DIGEST_VERSION });
        return null;
      }
      budget -= Math.max(1, await digestRebuildDay(ctx, form, next.date));
      after = next.date;
    }

    await ctx.scheduler.runAfter(0, internal.formDigests.rebuild, {
      formId: form._id,
      after,
    });
    return null;
  },
});

/** Reconstruye los resúmenes de todos los formatos de un proyecto. */
export const rebuildProject = internalMutation({
  args: { projectId: v.id("projects") },
  returns: v.number(),
  handler: async (ctx, args) => {
    const forms = (await projectForms(ctx, args.projectId)).filter(
      (form) => form.kind === "record",
    );
    for (const form of forms) {
      await ctx.scheduler.runAfter(0, internal.formDigests.rebuild, {
        formId: form._id,
      });
    }
    return forms.length;
  },
});
