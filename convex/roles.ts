import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import { Doc, Id } from "./_generated/dataModel";
import { mutation, query, QueryCtx } from "./_generated/server";
import { rolesErrors } from "./lib/error_messages";
import { projectForms } from "./lib/form_store";
import { normalizeText } from "./lib/text";
import { permissionsSchema } from "./permissions";

const NAME_MIN = 2;
const NAME_MAX = 40;

const populateCustomRole = (ctx: QueryCtx, id: Id<"roles">) => ctx.db.get(id);

export type PermissionKey = keyof typeof permissionsSchema;

type checkPermissionArgs = {
  ctx: QueryCtx;
  userId: Id<"users">;
  projectId: Id<"projects">;
  permission?: PermissionKey;
};

export const populateMember = (
  ctx: QueryCtx,
  userId: Id<"users">,
  projectId: Id<"projects">,
) =>
  ctx.db
    .query("members")
    .withIndex("projectId_userId", (q) =>
      q.eq("projectId", projectId).eq("userId", userId),
    )
    .unique();

/** El gate de lectura: pertenecer al proyecto. */
export const hasProjectAccess = async (
  ctx: QueryCtx,
  userId: Id<"users">,
  projectId: Id<"projects">,
): Promise<boolean> => {
  const member = await populateMember(ctx, userId, projectId);
  return !!member;
};

/** Los dos niveles altos de 01 §5.1: propietario o administrador. Lo que un
 *  rol personalizado no puede alcanzar por sí solo. */
export const isProjectAdmin = async (
  ctx: QueryCtx,
  userId: Id<"users">,
  projectId: Id<"projects">,
): Promise<boolean> => {
  const member = await populateMember(ctx, userId, projectId);
  return member?.role === "owner" || member?.role === "admin";
};

/** El nivel más alto: eliminar y transferir el proyecto son sólo suyos. */
export const isProjectOwner = async (
  ctx: QueryCtx,
  userId: Id<"users">,
  projectId: Id<"projects">,
): Promise<boolean> => {
  const member = await populateMember(ctx, userId, projectId);
  return member?.role === "owner";
};

/** Lo que una persona puede en un proyecto, leído una sola vez. */
export interface ProjectAccess {
  member: Doc<"members">;
  /** Propietario o administrador: los dos niveles altos de 01 §5.1. */
  isElevated: boolean;
  /** Si tiene la llave: siempre en los dos niveles altos; en un miembro, sólo
   *  si su rol la concede. Una llave ausente deniega. */
  can: (permission: PermissionKey) => boolean;
}

/**
 * La pertenencia y las llaves de una persona en un proyecto, o `null` si no
 * pertenece.
 *
 * Es la misma regla que `checkPermission`, que sale de aquí, para quien
 * necesita **varias llaves a la vez**: una lista de formatos decide con cuatro
 * qué enseña de cada fila, y preguntarlas una a una releería el miembro y su
 * rol por cada fila.
 */
export const loadProjectAccess = async (
  ctx: QueryCtx,
  userId: Id<"users">,
  projectId: Id<"projects">,
): Promise<ProjectAccess | null> => {
  const member = await populateMember(ctx, userId, projectId);
  if (!member) return null;

  const isElevated = member.role === "owner" || member.role === "admin";
  const customRole =
    !isElevated && member.customRoleId
      ? await populateCustomRole(ctx, member.customRoleId)
      : null;

  return {
    member,
    isElevated,
    can: (permission) => isElevated || customRole?.[permission] === true,
  };
};

/** El gate de escritura (01 §5.2). Propietario y administrador pasan siempre;
 *  el resto, sólo con la llave de su rol personalizado. Sin `permission`, sólo
 *  pasan los dos niveles altos. */
export const checkPermission = async ({
  ctx,
  userId,
  permission,
  projectId,
}: checkPermissionArgs): Promise<boolean> => {
  const access = await loadProjectAccess(ctx, userId, projectId);
  if (!access) return false;
  return permission ? access.can(permission) : access.isElevated;
};

const validateRoleName = (value: string) => {
  const name = normalizeText(value);
  if (name.length < NAME_MIN || name.length > NAME_MAX)
    throw new ConvexError(rolesErrors.invalidName);
  return name;
};

const countGranted = (permissions: Record<string, boolean>) =>
  Object.values(permissions).filter((value) => value === true).length;

export const update = mutation({
  args: {
    id: v.id("roles"),
    name: v.string(),
    ...permissionsSchema,
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null)
      throw new ConvexError(rolesErrors.userNotAuthenticated);

    const role = await ctx.db.get(args.id);
    if (!role) throw new ConvexError(rolesErrors.roleNotFound);

    const hasPermission = await checkPermission({
      ctx,
      userId,
      permission: "editRoles",
      projectId: role.projectId,
    });
    if (!hasPermission) throw new ConvexError(rolesErrors.cannotEditRoles);

    const { id, name: rawName, ...permissions } = args;
    const name = validateRoleName(rawName);

    await ctx.db.patch(id, { name, ...permissions });

    await ctx.runMutation(internal.logs.create, {
      description: `Rol actualizado: ${name} (${countGranted(permissions)} permisos)`,
      type: "update",
      projectId: role.projectId,
      affectedEntityType: "role",
      affectedEntityId: id,
    });

    return id;
  },
});

export const remove = mutation({
  args: {
    id: v.id("roles"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null)
      throw new ConvexError(rolesErrors.userNotAuthenticated);

    const role = await ctx.db.get(args.id);
    if (!role) throw new ConvexError(rolesErrors.roleNotFound);

    const hasPermission = await checkPermission({
      ctx,
      userId,
      permission: "deleteRoles",
      projectId: role.projectId,
    });
    if (!hasPermission) throw new ConvexError(rolesErrors.cannotDeleteRoles);

    const membersWithRole = await ctx.db
      .query("members")
      .withIndex("customRoleId", (q) => q.eq("customRoleId", args.id))
      .collect();

    for (const member of membersWithRole) {
      await ctx.db.patch(member._id, {
        customRoleId: undefined,
      });
    }

    // El proyecto sobrevive a su rol por defecto, y un formato a los roles de
    // su audiencia: se retira el rol de los dos (`01 §6.1`). Un formato que
    // se queda sin ningún rol en la audiencia no pasa a diligenciarlo todo el
    // mundo: sólo propietario y administrador, hasta que alguien elija otros.
    const project = await ctx.db.get(role.projectId);
    if (project?.defaultRoleId === args.id) {
      await ctx.db.patch(project._id, { defaultRoleId: undefined });
    }
    for (const form of await projectForms(ctx, role.projectId)) {
      if (!form.audienceRoleIds.includes(args.id)) continue;
      await ctx.db.patch(form._id, {
        audienceRoleIds: form.audienceRoleIds.filter((id) => id !== args.id),
      });
    }

    await ctx.db.delete(args.id);

    await ctx.runMutation(internal.logs.create, {
      description: `Rol eliminado: ${role.name}`,
      type: "delete",
      projectId: role.projectId,
      affectedEntityType: "role",
      affectedEntityId: args.id,
    });

    return args.id;
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    projectId: v.id("projects"),
    ...permissionsSchema,
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null)
      throw new ConvexError(rolesErrors.userNotAuthenticated);

    const hasPermission = await checkPermission({
      ctx,
      userId,
      permission: "createRoles",
      projectId: args.projectId,
    });
    if (!hasPermission) throw new ConvexError(rolesErrors.cannotCreateRoles);

    const { name: rawName, projectId, ...permissions } = args;
    const name = validateRoleName(rawName);

    const role = await ctx.db.insert("roles", {
      name,
      projectId,
      ...permissions,
    });

    await ctx.runMutation(internal.logs.create, {
      description: `Rol creado: ${name} (${countGranted(permissions)} permisos)`,
      type: "create",
      projectId,
      affectedEntityType: "role",
      affectedEntityId: role,
    });

    return role;
  },
});

export const getById = query({
  args: {
    id: v.id("roles"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;

    const role = await ctx.db.get(args.id);
    if (!role) return null;

    const hasAccess = await hasProjectAccess(ctx, userId, role.projectId);
    if (!hasAccess) return null;

    return role;
  },
});

export const get = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;

    const hasAccess = await hasProjectAccess(ctx, userId, args.projectId);
    if (!hasAccess) return null;

    const roles = await ctx.db
      .query("roles")
      .withIndex("projectId", (q) => q.eq("projectId", args.projectId))
      .collect();

    return roles;
  },
});
