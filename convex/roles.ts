import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { mutation, query, QueryCtx } from "./_generated/server";
import { rolesErrors } from "./lib/error_messages";
import { normalizeText } from "./lib/text";
import { permissionsSchema } from "./permissions";

const NAME_MIN = 2;
const NAME_MAX = 40;

const populateCustomRole = (ctx: QueryCtx, id: Id<"roles">) => ctx.db.get(id);

type checkPermissionArgs = {
  ctx: QueryCtx;
  userId: Id<"users">;
  projectId: Id<"projects">;
  permission?: keyof typeof permissionsSchema;
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

/** El gate de escritura (01 §5.2). Propietario y administrador pasan siempre;
 *  el resto, sólo con la llave de su rol personalizado. Sin `permission`, sólo
 *  pasan los dos niveles altos. */
export const checkPermission = async ({
  ctx,
  userId,
  permission,
  projectId,
}: checkPermissionArgs): Promise<boolean> => {
  const member = await populateMember(ctx, userId, projectId);
  if (!member) return false;
  if (member.role === "owner" || member.role === "admin") return true;
  if (!permission || !member.customRoleId) return false;

  const customRole = await populateCustomRole(ctx, member.customRoleId);
  return customRole?.[permission] === true;
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
