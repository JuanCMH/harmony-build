import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { type QueryCtx, mutation, query } from "./_generated/server";
import { dashboardsErrors } from "./lib/error_messages";
import { dashboardTabs } from "./lib/result_validators";
import { normalizeText } from "./lib/text";
import { HEIGHTS_OF, heightOf } from "./lib/widget_layout";
import { loadProjectAccess } from "./roles";

export const DASHBOARD_LIMITS = {
  // Las que no caben en la fila van en «Más»: el ancho ya no pone el tope.
  maxTabs: 20,
  maxWidgets: 12,
  maxLabelLength: 40,
} as const;

/** El tablero del proyecto: hay uno, o todavía ninguno. */
export const dashboardOf = (ctx: QueryCtx, projectId: Id<"projects">) =>
  ctx.db
    .query("dashboards")
    .withIndex("projectId", (q) => q.eq("projectId", projectId))
    .first();

/**
 * El tablero del proyecto, con lo que cada resultado es: su nombre, su tipo y
 * su formato. Los datos los calcula `formResults.compute`, formato por
 * formato.
 *
 * Lo ve quien puede ver las respuestas de todos (`viewResponses`): un tablero
 * son agregados de ellas. Lo arma quien edita el proyecto. `null` sin acceso.
 * Un resultado que ya no existe no sale: la pestaña apunta a él, no lo copia.
 */
export const get = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    const access = await loadProjectAccess(ctx, userId, args.projectId);
    if (!access?.can("viewResponses")) return null;

    const dashboard = await dashboardOf(ctx, args.projectId);
    const forms = new Map<Id<"forms">, Doc<"forms"> | null>();
    const formOf = async (id: Id<"forms">) => {
      if (!forms.has(id)) forms.set(id, await ctx.db.get(id));
      return forms.get(id) ?? null;
    };

    const tabs = await Promise.all(
      (dashboard?.tabs ?? []).map(async (tab) => ({
        id: tab.id,
        label: tab.label,
        widgets: (
          await Promise.all(
            tab.widgets.map(async (widget) => {
              const result = await ctx.db.get(widget.resultId);
              if (!result || result.projectId !== args.projectId) return null;
              const form = await formOf(result.formId);
              if (!form) return null;
              return {
                id: widget.id,
                size: widget.size,
                height: heightOf(result.config.type, widget.height),
                resultId: result._id,
                name: result.name,
                type: result.config.type,
                formId: form._id,
                formName: form.name,
              };
            }),
          )
        ).filter((widget) => widget !== null),
      })),
    );

    return { tabs, canEdit: access.can("editProject") };
  },
});

/**
 * Guarda el tablero entero: sus pestañas y los resultados de cada una. Se
 * manda completo porque reordenar es cambiarlo todo, y un tablero es pequeño.
 *
 * Cada resultado llega por id y tiene que demostrar que es de este proyecto
 * (`01 §10`, la regla de la lista de ids).
 */
export const save = mutation({
  args: { projectId: v.id("projects"), tabs: dashboardTabs },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new ConvexError(dashboardsErrors.userNotAuthenticated);
    }
    const access = await loadProjectAccess(ctx, userId, args.projectId);
    if (!access?.can("editProject")) {
      throw new ConvexError(dashboardsErrors.insufficientPermissions);
    }

    if (
      args.tabs.length === 0 ||
      args.tabs.length > DASHBOARD_LIMITS.maxTabs
    ) {
      throw new ConvexError(dashboardsErrors.invalidTabs);
    }
    const ids = args.tabs.flatMap((tab) => [
      tab.id,
      ...tab.widgets.map((widget) => widget.id),
    ]);
    if (new Set(ids).size !== ids.length) {
      throw new ConvexError(dashboardsErrors.duplicateId);
    }

    const tabs = [];
    for (const tab of args.tabs) {
      const label = normalizeText(tab.label);
      if (label === "" || label.length > DASHBOARD_LIMITS.maxLabelLength) {
        throw new ConvexError(dashboardsErrors.invalidTabs);
      }
      if (tab.widgets.length > DASHBOARD_LIMITS.maxWidgets) {
        throw new ConvexError(dashboardsErrors.invalidWidgets);
      }
      for (const widget of tab.widgets) {
        const result = await ctx.db.get(widget.resultId);
        if (!result || result.projectId !== args.projectId) {
          throw new ConvexError(dashboardsErrors.resultNotFound);
        }
        if (
          widget.height !== undefined &&
          !HEIGHTS_OF[result.config.type].includes(widget.height)
        ) {
          throw new ConvexError(dashboardsErrors.invalidHeight);
        }
      }
      tabs.push({ ...tab, label });
    }

    const existing = await dashboardOf(ctx, args.projectId);
    if (existing) await ctx.db.patch(existing._id, { tabs });
    else await ctx.db.insert("dashboards", { projectId: args.projectId, tabs });

    await ctx.runMutation(internal.logs.create, {
      description: `Tablero actualizado: ${tabs.length} ${tabs.length === 1 ? "pestaña" : "pestañas"}`,
      type: "update",
      projectId: args.projectId,
      affectedEntityType: "project",
      affectedEntityId: args.projectId,
    });
    return null;
  },
});
