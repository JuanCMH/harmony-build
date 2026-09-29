import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { QueryCtx, mutation, query } from "./_generated/server";
import { membersErrors } from "./lib/error_messages";
import {
  checkPermission,
  hasProjectAccess,
  isProjectAdmin,
  populateMember,
} from "./roles";

const populateUser = (ctx: QueryCtx, id: Id<"users">) => ctx.db.get(id);
const populateCustomRole = (ctx: QueryCtx, id: Id<"roles">) => ctx.db.get(id);

/** Lo que de una persona ve el resto del proyecto. Nunca el documento entero:
 *  `users` es una tabla de autenticación. */
export const publicUser = async (ctx: QueryCtx, id: Id<"users">) => {
  const user = await populateUser(ctx, id);
  if (!user) return null;

  const userImage = user.mainImage
    ? await ctx.storage.getUrl(user.mainImage)
    : null;

  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    userImage: userImage || user.image,
  };
};

export const getById = query({
  args: { id: v.id("members") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null)
      throw new ConvexError(membersErrors.userNotAuthenticated);

    const member = await ctx.db.get(args.id);
    if (!member) throw new ConvexError(membersErrors.memberNotFound);

    const hasAccess = await hasProjectAccess(ctx, userId, member.projectId);
    if (!hasAccess) throw new ConvexError(membersErrors.noProjectAccess);

    const user = await publicUser(ctx, member.userId);
    if (!user) throw new ConvexError(membersErrors.userNotFound);

    const customRole = member.customRoleId
      ? await populateCustomRole(ctx, member.customRoleId)
      : null;

    return { ...member, user, customRole };
  },
});

export const get = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;

    const hasAccess = await hasProjectAccess(ctx, userId, args.projectId);
    if (!hasAccess) return null;

    const data = await ctx.db
      .query("members")
      .withIndex("projectId", (q) => q.eq("projectId", args.projectId))
      .collect();

    const members = [];

    for (const member of data) {
      const user = await publicUser(ctx, member.userId);
      const customRole = member.customRoleId
        ? await populateCustomRole(ctx, member.customRoleId)
        : null;
      if (user) members.push({ ...member, user, customRole });
    }

    return members;
  },
});

export const current = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;

    const member = await populateMember(ctx, userId, args.projectId);
    if (!member) return null;

    const user = await publicUser(ctx, userId);
    const customRole = member.customRoleId
      ? await populateCustomRole(ctx, member.customRoleId)
      : null;

    return { ...member, customRole, user };
  },
});

const ROLE_LABELS = {
  owner: "propietario",
  admin: "administrador",
  member: "miembro",
} as const;

export const update = mutation({
  args: {
    id: v.id("members"),
    customRoleId: v.optional(v.id("roles")),
    role: v.union(v.literal("admin"), v.literal("member")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new ConvexError(membersErrors.unauthorized);

    const member = await ctx.db.get(args.id);
    if (!member) throw new ConvexError(membersErrors.memberNotFound);

    const hasPermission = await checkPermission({
      ctx,
      userId,
      permission: "assignRoles",
      projectId: member.projectId,
    });
    if (!hasPermission)
      throw new ConvexError(membersErrors.insufficientPermissions);

    // El propietario no se toca desde aquí: cambia con `projects.transfer`,
    // que mueve a la vez la fila y `projects.userId`.
    if (member.role === "owner")
      throw new ConvexError(membersErrors.cannotChangeOwner);

    // `assignRoles` reparte roles personalizados. Mover a alguien dentro de la
    // jerarquía de 01 §5.1 —admin concede todos los permisos— exige estar ya
    // en ella: sin esto, la llave más baja escala hasta la intermedia.
    if (args.role !== member.role) {
      const isElevated = await isProjectAdmin(ctx, userId, member.projectId);
      if (!isElevated)
        throw new ConvexError(membersErrors.cannotAssignAdminRole);
    }

    // El rol personalizado tiene que ser de este proyecto: el id llega por
    // argumentos y un rol ajeno traería las llaves de otro proyecto.
    if (args.customRoleId) {
      const customRole = await populateCustomRole(ctx, args.customRoleId);
      if (!customRole || customRole.projectId !== member.projectId)
        throw new ConvexError(membersErrors.insufficientPermissions);
    }

    await ctx.db.patch(args.id, {
      role: args.role,
      customRoleId: args.customRoleId,
    });

    const affected = await populateUser(ctx, member.userId);
    await ctx.runMutation(internal.logs.create, {
      description: `Rol de ${affected?.name ?? "miembro"} actualizado: ${ROLE_LABELS[args.role]}`,
      type: "update",
      projectId: member.projectId,
      affectedEntityType: "member",
      affectedEntityId: args.id,
    });

    return args.id;
  },
});

export const remove = mutation({
  args: {
    id: v.id("members"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new ConvexError(membersErrors.unauthorized);

    const member = await ctx.db.get(args.id);
    if (!member) throw new ConvexError(membersErrors.memberNotFound);

    const currentMember = await populateMember(ctx, userId, member.projectId);
    if (!currentMember) throw new ConvexError(membersErrors.unauthorized);

    const isSelf = currentMember._id === args.id;

    // Salir por cuenta propia no pide llave; echar a otro, sí.
    if (!isSelf) {
      const hasPermission = await checkPermission({
        ctx,
        userId,
        permission: "expelUsers",
        projectId: member.projectId,
      });
      if (!hasPermission)
        throw new ConvexError(membersErrors.insufficientPermissions);
    }

    // Un proyecto sin propietario no lo puede eliminar ni transferir nadie.
    if (member.role === "owner")
      throw new ConvexError(
        isSelf
          ? membersErrors.cannotRemoveYourself
          : membersErrors.cannotChangeOwner,
      );

    // Expulsar a un administrador es moverlo en la jerarquía: exige estar en
    // ella, igual que `update`.
    if (!isSelf && member.role === "admin") {
      const isElevated = await isProjectAdmin(ctx, userId, member.projectId);
      if (!isElevated)
        throw new ConvexError(membersErrors.cannotAssignAdminRole);
    }

    await ctx.db.delete(args.id);

    const affected = await populateUser(ctx, member.userId);
    await ctx.runMutation(internal.logs.create, {
      description: isSelf
        ? `${affected?.name ?? "Miembro"} salió del proyecto`
        : `Miembro eliminado del proyecto: ${affected?.name ?? "sin nombre"}`,
      type: "delete",
      projectId: member.projectId,
      affectedEntityType: "member",
      affectedEntityId: args.id,
    });

    return args.id;
  },
});
