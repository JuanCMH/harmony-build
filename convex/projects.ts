import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { alphabet, generateRandomString } from "oslo/crypto";
import { internal } from "./_generated/api";
import { Doc } from "./_generated/dataModel";
import { internalMutation, mutation, query, QueryCtx } from "./_generated/server";
import { customColors } from "./colors";
import { projectsErrors } from "./lib/error_messages";
import { projectForms } from "./lib/form_store";
import { JOIN_CODE_LENGTH } from "./lib/join_codes";
import { storedFileIds } from "./lib/stored_values";
import { normalizeText } from "./lib/text";
import {
  checkPermission,
  isProjectOwner,
  populateMember,
} from "./roles";

const NAME_MIN = 4;
const NAME_MAX = 40;
const CODE_MAX = 20;

/** Da acceso de miembro sin rol: quien entra ve el proyecto, pero no puede
 *  tocar nada hasta que alguien le asigne un rol. */
const generateCode = () =>
  generateRandomString(JOIN_CODE_LENGTH, alphabet("a-z", "0-9"));

/** Valida los campos que el formulario ya comprobaba en el navegador. */
const validateProjectFields = (args: { name: string; code?: string }) => {
  const name = normalizeText(args.name);
  const code = args.code ? normalizeText(args.code) : "";

  if (name.length < NAME_MIN || name.length > NAME_MAX)
    throw new ConvexError(projectsErrors.invalidName);
  if (code.length > CODE_MAX) throw new ConvexError(projectsErrors.invalidCode);

  return { name, code: code || undefined };
};

const withLogo = async (ctx: QueryCtx, project: Doc<"projects">) => {
  const logoImage = project.logo
    ? ((await ctx.storage.getUrl(project.logo)) ?? undefined)
    : undefined;
  // `joinCode` nunca viaja en una lectura general: se pide aparte, con su
  // propia llave (`getJoinCode`).
  const { joinCode, ...rest } = project;
  return { ...rest, logoImage };
};

export const create = mutation({
  args: {
    name: v.string(),
    code: v.optional(v.string()),
    primaryColor: v.union(...customColors),
    secondaryColor: v.union(...customColors),
    logo: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null)
      throw new ConvexError(projectsErrors.userNotAuthenticated);

    const user = await ctx.db.get(userId);
    if (!user) throw new ConvexError(projectsErrors.userNotFound);

    const { name, code } = validateProjectFields(args);

    const projectId = await ctx.db.insert("projects", {
      name,
      code,
      userId,
      active: true,
      joinCode: generateCode(),
      primaryColor: args.primaryColor,
      secondaryColor: args.secondaryColor,
      logo: args.logo,
    });

    await ctx.db.insert("members", {
      userId,
      projectId,
      role: "owner",
    });

    await ctx.runMutation(internal.logs.create, {
      description: `Proyecto creado: ${name}`,
      type: "create",
      projectId,
      affectedEntityType: "project",
      affectedEntityId: projectId,
    });

    return projectId;
  },
});

export const update = mutation({
  args: {
    id: v.id("projects"),
    name: v.string(),
    code: v.optional(v.string()),
    active: v.boolean(),
    primaryColor: v.union(...customColors),
    secondaryColor: v.union(...customColors),
    logo: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null)
      throw new ConvexError(projectsErrors.userNotAuthenticated);

    const project = await ctx.db.get(args.id);
    if (!project) throw new ConvexError(projectsErrors.projectNotFound);

    const hasPermission = await checkPermission({
      ctx,
      userId,
      permission: "editProject",
      projectId: args.id,
    });
    if (!hasPermission) throw new ConvexError(projectsErrors.cannotEditProject);

    const { name, code } = validateProjectFields(args);

    if (args.logo !== project.logo && project.logo) {
      await ctx.storage.delete(project.logo);
    }

    await ctx.db.patch(args.id, {
      name,
      code,
      active: args.active,
      primaryColor: args.primaryColor,
      secondaryColor: args.secondaryColor,
      logo: args.logo,
    });

    const description =
      args.active === project.active
        ? `Proyecto actualizado: ${name}`
        : `Proyecto ${args.active ? "reactivado" : "archivado"}: ${name}`;

    await ctx.runMutation(internal.logs.create, {
      description,
      type: "update",
      projectId: args.id,
      affectedEntityType: "project",
      affectedEntityId: args.id,
    });

    return args.id;
  },
});

export const transfer = mutation({
  args: {
    id: v.id("projects"),
    memberId: v.id("members"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null)
      throw new ConvexError(projectsErrors.userNotAuthenticated);

    const project = await ctx.db.get(args.id);
    if (!project) throw new ConvexError(projectsErrors.projectNotFound);

    const currentOwner = await populateMember(ctx, userId, args.id);
    if (currentOwner?.role !== "owner")
      throw new ConvexError(projectsErrors.cannotTransferProject);

    // La propiedad no puede salir del proyecto: si se pudiera transferir a
    // cualquiera, quedaría a nombre de alguien sin acceso a él.
    const newOwner = await ctx.db.get(args.memberId);
    if (!newOwner || newOwner.projectId !== args.id)
      throw new ConvexError(projectsErrors.newOwnerMustBeMember);
    if (newOwner._id === currentOwner._id)
      throw new ConvexError(projectsErrors.alreadyOwner);

    await ctx.db.patch(newOwner._id, { role: "owner" });
    await ctx.db.patch(currentOwner._id, { role: "admin" });
    await ctx.db.patch(args.id, { userId: newOwner.userId });

    const [from, to] = await Promise.all([
      ctx.db.get(userId),
      ctx.db.get(newOwner.userId),
    ]);

    await ctx.runMutation(internal.logs.create, {
      description: `Proyecto transferido: ${project.name}, de ${from?.name ?? "usuario"} a ${to?.name ?? "usuario"}`,
      type: "update",
      projectId: args.id,
      affectedEntityType: "project",
      affectedEntityId: args.id,
    });

    return newOwner._id;
  },
});

/** Tope de conteo para el aviso: a partir de aquí se dice «más de». */
const IMPACT_COUNT_CAP = 500;

/** Lo que se lleva por delante eliminar un proyecto (`01 §6.1`). */
export const getDeletionImpact = query({
  args: { id: v.id("projects") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new ConvexError(projectsErrors.unauthorized);

    const isOwner = await isProjectOwner(ctx, userId, args.id);
    if (!isOwner) throw new ConvexError(projectsErrors.insufficientPermissions);

    const countCapped = async (table: "members" | "roles") => {
      const rows = await ctx.db
        .query(table)
        .withIndex("projectId", (q) => q.eq("projectId", args.id))
        .take(IMPACT_COUNT_CAP + 1);
      return {
        count: Math.min(rows.length, IMPACT_COUNT_CAP),
        capped: rows.length > IMPACT_COUNT_CAP,
      };
    };

    // Las respuestas crecen con la operación: no se cuentan leyéndolas, sino
    // sumando el contador que cada formato mantiene (`01 §6`). Los formatos
    // son pocos y ligeros.
    const countForms = async () => {
      const forms = await projectForms(ctx, args.id);
      const responses = forms.reduce(
        (total, form) => total + form.responseCount,
        0,
      );
      return {
        forms: {
          count: Math.min(forms.length, IMPACT_COUNT_CAP),
          capped: forms.length > IMPACT_COUNT_CAP,
        },
        responses: { count: responses, capped: false },
      };
    };

    const [members, roles, { forms, responses }] = await Promise.all([
      countCapped("members"),
      countCapped("roles"),
      countForms(),
    ]);

    return { members, roles, forms, responses };
  },
});

export const remove = mutation({
  args: {
    id: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null)
      throw new ConvexError(projectsErrors.userNotAuthenticated);

    const project = await ctx.db.get(args.id);
    if (!project) throw new ConvexError(projectsErrors.projectNotFound);

    const isOwner = await isProjectOwner(ctx, userId, args.id);
    if (!isOwner) throw new ConvexError(projectsErrors.cannotDeleteProject);

    // Sin `projectId` a propósito: `logs.projectId` cascadea con el proyecto,
    // así que una entrada que colgara de él la borraría la propia purga que la
    // provocó. Esta constancia sobrevive y se lee desde el panel de Convex.
    await ctx.runMutation(internal.logs.create, {
      description: `Proyecto eliminado: ${project.name}`,
      type: "delete",
      affectedEntityType: "project",
      affectedEntityId: args.id,
    });

    if (project.logo) await ctx.storage.delete(project.logo);
    await ctx.db.delete(args.id);
    await ctx.scheduler.runAfter(0, internal.projects.purgeProjectData, {
      projectId: args.id,
    });

    return args.id;
  },
});

/** Cuántos documentos toca como mucho una pasada de `purgeProjectData`. */
const PURGE_BATCH = 200;

/** Cuántos documentos **grandes** lee como mucho una pasada. Una versión lleva
 *  la definición entera de un formato y una respuesta todos sus valores: leer
 *  doscientos de golpe se acercaría al límite de lectura de la transacción. */
const PURGE_HEAVY_BATCH = 25;

/** Las tablas de documentos pequeños que cuelgan de `projectId`. */
const LIGHT_TABLES = [
  "members",
  "roles",
  "logs",
  "formCategories",
  "formResponseLinks",
  "forms",
] as const;

/** Drena un proyecto ya borrado, por lotes, re-agendándose hasta agotarlo.
 *  Idempotente. Cada tabla que cuelgue de `projectId` entra en esta lista en
 *  el mismo cambio que la crea (`01 §6.1`). */
export const purgeProjectData = internalMutation({
  args: { projectId: v.id("projects") },
  returns: v.null(),
  handler: async (ctx, args) => {
    let budget = PURGE_BATCH;
    // Si alguna lectura llenó su lote, puede quedar más: hay otra pasada.
    let mayHaveMore = false;

    // Las respuestas primero, con sus archivos: cada archivo cuenta contra el
    // presupuesto, porque una entrega de dotación con firma por fila trae
    // decenas.
    const responses = await ctx.db
      .query("formResponses")
      .withIndex("projectId", (q) => q.eq("projectId", args.projectId))
      .take(PURGE_HEAVY_BATCH);
    mayHaveMore ||= responses.length === PURGE_HEAVY_BATCH;
    for (const response of responses) {
      const fileIds = storedFileIds(response.values);
      if (budget < PURGE_BATCH && budget < fileIds.length + 1) {
        mayHaveMore = true;
        break;
      }
      for (const fileId of fileIds) {
        const id = ctx.db.system.normalizeId("_storage", fileId);
        // Una pasada anterior que falló a medias pudo borrarlo ya.
        if (id && (await ctx.db.system.get(id))) await ctx.storage.delete(id);
      }
      await ctx.db.delete(response._id);
      budget -= fileIds.length + 1;
    }

    if (budget > 0) {
      const limit = Math.min(budget, PURGE_HEAVY_BATCH);
      const versions = await ctx.db
        .query("formVersions")
        .withIndex("projectId", (q) => q.eq("projectId", args.projectId))
        .take(limit);
      mayHaveMore ||= versions.length === limit;
      for (const version of versions) await ctx.db.delete(version._id);
      budget -= versions.length;
    }

    for (const table of LIGHT_TABLES) {
      if (budget <= 0) break;
      const rows = await ctx.db
        .query(table)
        .withIndex("projectId", (q) => q.eq("projectId", args.projectId))
        .take(budget);
      for (const row of rows) await ctx.db.delete(row._id);
      budget -= rows.length;
    }

    if (budget <= 0 || mayHaveMore) {
      await ctx.scheduler.runAfter(0, internal.projects.purgeProjectData, {
        projectId: args.projectId,
      });
    }

    return null;
  },
});

/** Los proyectos a los que pertenece quien pregunta, con su rol en cada uno. */
export const get = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;

    const members = await ctx.db
      .query("members")
      .withIndex("userId", (q) => q.eq("userId", userId))
      .collect();

    const projects = [];
    for (const member of members) {
      const project = await ctx.db.get(member.projectId);
      if (!project) continue;
      projects.push({
        ...(await withLogo(ctx, project)),
        role: member.role,
      });
    }

    return projects.sort((a, b) => a.name.localeCompare(b.name, "es"));
  },
});

export const getById = query({
  args: {
    id: v.optional(v.id("projects")),
  },
  handler: async (ctx, args) => {
    if (!args.id) return null;

    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;

    // Que el proyecto no exista, o que no sea de quien pregunta, es un estado
    // y no un fallo: pasa mientras se navega fuera de uno recién eliminado.
    // Lanzar aquí tumbaría la página entera.
    const member = await populateMember(ctx, userId, args.id);
    if (!member) return null;

    const project = await ctx.db.get(args.id);
    if (!project) return null;

    return await withLogo(ctx, project);
  },
});

/** El código de unión, sólo para quien puede invitar (`01 §5.8`). */
export const getJoinCode = query({
  args: { id: v.id("projects") },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;

    const canInvite = await checkPermission({
      ctx,
      userId,
      permission: "inviteUsers",
      projectId: args.id,
    });
    if (!canInvite) return null;

    const project = await ctx.db.get(args.id);
    return project?.joinCode ?? null;
  },
});

export const join = mutation({
  args: {
    joinCode: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null)
      throw new ConvexError(projectsErrors.userNotAuthenticated);

    const project = await ctx.db
      .query("projects")
      .withIndex("joinCode", (q) => q.eq("joinCode", args.joinCode))
      .unique();
    if (!project) throw new ConvexError(projectsErrors.joinError);

    const member = await populateMember(ctx, userId, project._id);
    if (member) return project._id;

    // Quien entra recibe el rol por defecto del proyecto, si lo hay y sigue
    // existiendo (diseño §9). Sin él, queda como miembro sin rol, que sólo
    // lee.
    const defaultRole = project.defaultRoleId
      ? await ctx.db.get(project.defaultRoleId)
      : null;

    await ctx.db.insert("members", {
      userId,
      projectId: project._id,
      role: "member",
      customRoleId:
        defaultRole?.projectId === project._id ? defaultRole._id : undefined,
    });

    await ctx.runMutation(internal.logs.create, {
      description: `Nuevo miembro por código de unión: ${project.name}`,
      type: "info",
      projectId: project._id,
      affectedEntityType: "project",
      affectedEntityId: project._id,
    });

    return project._id;
  },
});

export const newJoinCode = mutation({
  args: {
    id: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null)
      throw new ConvexError(projectsErrors.userNotAuthenticated);

    const hasPermission = await checkPermission({
      ctx,
      userId,
      permission: "inviteUsers",
      projectId: args.id,
    });
    if (!hasPermission)
      throw new ConvexError(projectsErrors.cannotCreateNewCode);

    const project = await ctx.db.get(args.id);
    if (!project) throw new ConvexError(projectsErrors.projectNotFound);

    await ctx.db.patch(args.id, { joinCode: generateCode() });

    await ctx.runMutation(internal.logs.create, {
      description: "Código de unión renovado",
      type: "update",
      projectId: args.id,
      affectedEntityType: "project",
      affectedEntityId: args.id,
    });

    return args.id;
  },
});

/** Fija —o quita— el rol que recibe quien entra con el código de unión.
 *
 *  Lo gobierna `assignRoles`: elegir el rol por defecto es asignar un rol, por
 *  adelantado, a todo el que entre. */
export const setDefaultRole = mutation({
  args: {
    id: v.id("projects"),
    roleId: v.optional(v.id("roles")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null)
      throw new ConvexError(projectsErrors.userNotAuthenticated);

    const project = await ctx.db.get(args.id);
    if (!project) throw new ConvexError(projectsErrors.projectNotFound);

    const hasPermission = await checkPermission({
      ctx,
      userId,
      permission: "assignRoles",
      projectId: args.id,
    });
    if (!hasPermission)
      throw new ConvexError(projectsErrors.insufficientPermissions);

    // El rol llega por argumentos y tiene que ser de este proyecto: uno ajeno
    // traería las llaves de otra obra.
    const role = args.roleId ? await ctx.db.get(args.roleId) : null;
    if (args.roleId && role?.projectId !== args.id)
      throw new ConvexError(projectsErrors.defaultRoleNotFound);

    await ctx.db.patch(args.id, { defaultRoleId: role?._id });

    await ctx.runMutation(internal.logs.create, {
      description: role
        ? `Rol por defecto del proyecto: ${role.name}`
        : "Rol por defecto del proyecto retirado",
      type: "update",
      projectId: args.id,
      affectedEntityType: "project",
      affectedEntityId: args.id,
    });

    return args.id;
  },
});
