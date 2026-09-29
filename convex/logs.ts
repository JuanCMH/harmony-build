import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";
import {
  internalMutation,
  MutationCtx,
  query,
  QueryCtx,
} from "./_generated/server";
import { logsErrors } from "./lib/error_messages";
import { checkPermission } from "./roles";
import { affectedEntityTypes } from "./schema";

/**
 * Escribe una entrada de auditoría.
 *
 * Es **interna**: la llaman las mutaciones de dominio, que ya han comprobado
 * quién eres y sobre qué actúas. Si fuera pública, cualquiera con sesión
 * podría dejar constancia inventada —el texto que quisiera, en el proyecto que
 * quisiera, sin pertenecer a ninguno—, que es exactamente lo que un registro
 * de auditoría no puede permitir.
 *
 * El nombre del autor se resuelve aquí y nunca llega por argumentos (`01 §5.5`).
 */
export const create = internalMutation({
  args: {
    description: v.string(),
    type: v.union(
      v.literal("create"),
      v.literal("update"),
      v.literal("delete"),
      v.literal("info"),
    ),
    projectId: v.optional(v.id("projects")),
    affectedEntityType: v.optional(affectedEntityTypes),
    affectedEntityId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const authUserId = await getAuthUserId(ctx);
    if (authUserId === null)
      throw new ConvexError(logsErrors.userNotAuthenticated);

    const author = await ctx.db.get(authUserId);

    const logId = await ctx.db.insert("logs", {
      description: args.description,
      userName: author?.name || "Usuario desconocido",
      userId: authUserId,
      type: args.type,
      projectId: args.projectId,
      affectedEntityType: args.affectedEntityType,
      affectedEntityId: args.affectedEntityId,
    });
    return logId;
  },
});

/** El autor de lo que la plataforma hace sola. */
export const SYSTEM_AUTHOR = "Harmony Build";

/**
 * Escribe una entrada que no firma ninguna persona: lo que la plataforma hace
 * sola, desde un cron o una tarea agendada.
 *
 * No es una función registrada. `create` exige sesión y un cron no la tiene;
 * esto lo llaman mutations internas que ya decidieron sobre qué actúan. Lleva
 * siempre `projectId`: sin él, la entrada no la vería nadie (`01 §5.5`).
 */
export async function writeSystemLog(
  ctx: MutationCtx,
  entry: {
    description: string;
    type: "create" | "update" | "delete" | "info";
    projectId: Id<"projects">;
    affectedEntityType: Doc<"logs">["affectedEntityType"];
    affectedEntityId: string;
  },
) {
  return await ctx.db.insert("logs", { ...entry, userName: SYSTEM_AUTHOR });
}

export const getByProject = query({
  args: {
    projectId: v.id("projects"),
    /** Inicio del intervalo, en ms. Lo calcula el cliente, que es quien conoce
     *  la zona horaria de quien mira. */
    from: v.number(),
    /** Fin del intervalo, exclusivo, en ms. */
    to: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new ConvexError(logsErrors.userNotAuthenticated);

    const canView = await checkPermission({
      ctx,
      userId,
      permission: "viewLogs",
      projectId: args.projectId,
    });
    if (!canView) throw new ConvexError(logsErrors.insufficientPermissions);

    // `_creationTime` cierra todos los índices de Convex, así que el intervalo
    // se resuelve dentro del índice: ninguna pantalla cuesta el histórico
    // entero (`01 §6`).
    return await ctx.db
      .query("logs")
      .withIndex("projectId", (q) =>
        q
          .eq("projectId", args.projectId)
          .gte("_creationTime", args.from)
          .lt("_creationTime", args.to),
      )
      .order("desc")
      .collect();
  },
});

const formSummary = async (ctx: QueryCtx, id: Id<"forms"> | null) => {
  const form = id ? await ctx.db.get(id) : null;
  if (!form) return null;
  return {
    _id: form._id,
    _creationTime: form._creationTime,
    kind: form.kind,
    name: form.name,
    code: form.code,
    status: form.status,
    publishedVersionNumber: form.publishedVersionNumber,
  };
};

const responseSummary = async (
  ctx: QueryCtx,
  id: Id<"formResponses"> | null,
) => {
  const response = id ? await ctx.db.get(id) : null;
  if (!response) return null;
  const form = await ctx.db.get(response.formId);
  return {
    _id: response._id,
    _creationTime: response._creationTime,
    formId: response.formId,
    formName: form?.name,
    formKind: form?.kind,
    date: response.date,
    status: response.status,
    title: response.title,
    active: response.active,
  };
};

export const getLogDetails = query({
  args: {
    logId: v.id("logs"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new ConvexError(logsErrors.userNotAuthenticated);

    const log = await ctx.db.get(args.logId);
    if (!log) throw new ConvexError(logsErrors.logNotFound);

    // El ámbito se deriva del log, nunca de un argumento: sin esto la query es
    // una lectura arbitraria de documentos que cruza proyectos (01 §10).
    const canView = log.projectId
      ? await checkPermission({
          ctx,
          userId,
          permission: "viewLogs",
          projectId: log.projectId,
        })
      : false;
    if (!canView) throw new ConvexError(logsErrors.insufficientPermissions);

    const project = log.projectId ? await ctx.db.get(log.projectId) : null;

    let relatedEntity = null;

    if (log.affectedEntityType && log.affectedEntityId) {
      switch (log.affectedEntityType) {
        case "project":
          relatedEntity = await ctx.db.get(
            log.affectedEntityId as Id<"projects">,
          );
          break;
        case "member":
          relatedEntity = await ctx.db.get(
            log.affectedEntityId as Id<"members">,
          );
          break;
        case "role":
          relatedEntity = await ctx.db.get(log.affectedEntityId as Id<"roles">);
          break;
        // De un formato y de una respuesta sale sólo lo que los identifica:
        // ver la auditoría no es ver las respuestas ni la definición, que
        // tienen sus propias llaves.
        case "form":
          relatedEntity = await formSummary(
            ctx,
            ctx.db.normalizeId("forms", log.affectedEntityId),
          );
          break;
        case "formResponse":
          relatedEntity = await responseSummary(
            ctx,
            ctx.db.normalizeId("formResponses", log.affectedEntityId),
          );
          break;
      }
    }

    // El código de unión viaja dentro del documento del proyecto, y ver la
    // auditoría no es poder invitar.
    const withoutJoinCode = <T extends { joinCode?: string }>(doc: T | null) => {
      if (!doc) return null;
      const { joinCode, ...rest } = doc;
      return rest;
    };

    return {
      log,
      relatedEntity:
        log.affectedEntityType === "project"
          ? withoutJoinCode(relatedEntity as Doc<"projects"> | null)
          : relatedEntity,
      contextData: { project: withoutJoinCode(project) },
    };
  },
});
