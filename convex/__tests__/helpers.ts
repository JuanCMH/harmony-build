/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import type { Id } from "../_generated/dataModel";
import schema from "../schema";

/** El `vi.mock` de `getAuthUserId` no puede vivir aquí: Vitest lo iza dentro
 *  del archivo que lo declara, así que cada suite lo repite con su propio
 *  `authState`. Lo que sí se comparte es el montaje y la siembra. */
export function setupTest() {
  return convexTest(schema, import.meta.glob("../**/*.ts"));
}

export type TestConvex = ReturnType<typeof setupTest>;

export const NO_PERMISSIONS = {
  editProject: false,
  inviteUsers: false,
  expelUsers: false,
  createRoles: false,
  editRoles: false,
  deleteRoles: false,
  assignRoles: false,
  viewLogs: false,
};

export type PermissionKey = keyof typeof NO_PERMISSIONS;

/** Un proyecto con los tres niveles de identidad de `01 §5.1`, un miembro sin
 *  rol, y alguien de fuera que pertenece a **otro** proyecto. */
export async function seedProject(t: TestConvex) {
  return await t.run(async (ctx) => {
    const user = (name: string) =>
      ctx.db.insert("users", {
        name,
        email: `${name.toLowerCase()}@test.com`,
      });

    const ownerId = await user("Propietaria");
    const adminId = await user("Administrador");
    const roleHolderId = await user("Inspectora");
    const plainId = await user("Conductor");
    const outsiderId = await user("Ajeno");

    const projectId = await ctx.db.insert("projects", {
      name: "Planta de concreto",
      userId: ownerId,
      joinCode: "abc123abc123",
      active: true,
      primaryColor: "blue",
      secondaryColor: "gray",
    });
    const otherProjectId = await ctx.db.insert("projects", {
      name: "Vía al llano",
      userId: outsiderId,
      joinCode: "def456def456",
      active: true,
      primaryColor: "red",
      secondaryColor: "gray",
    });

    const roleId = await ctx.db.insert("roles", {
      name: "Inspección",
      projectId,
      ...NO_PERMISSIONS,
    });
    const otherRoleId = await ctx.db.insert("roles", {
      name: "Todo",
      projectId: otherProjectId,
      ...Object.fromEntries(
        Object.keys(NO_PERMISSIONS).map((key) => [key, true]),
      ) as typeof NO_PERMISSIONS,
    });

    const member = (
      userId: Id<"users">,
      role: "owner" | "admin" | "member",
      project: Id<"projects"> = projectId,
      customRoleId?: Id<"roles">,
    ) =>
      ctx.db.insert("members", {
        userId,
        projectId: project,
        role,
        customRoleId,
      });

    const ownerMemberId = await member(ownerId, "owner");
    const adminMemberId = await member(adminId, "admin");
    const roleHolderMemberId = await member(
      roleHolderId,
      "member",
      projectId,
      roleId,
    );
    const plainMemberId = await member(plainId, "member");
    const outsiderMemberId = await member(outsiderId, "owner", otherProjectId);

    return {
      ownerId,
      adminId,
      roleHolderId,
      plainId,
      outsiderId,
      projectId,
      otherProjectId,
      roleId,
      otherRoleId,
      ownerMemberId,
      adminMemberId,
      roleHolderMemberId,
      plainMemberId,
      outsiderMemberId,
    };
  });
}

export type Seed = Awaited<ReturnType<typeof seedProject>>;

/** Concede llaves al rol personalizado del proyecto sembrado. */
export async function grant(
  t: TestConvex,
  roleId: Id<"roles">,
  ...keys: PermissionKey[]
) {
  await t.run(async (ctx) => {
    await ctx.db.patch(
      roleId,
      Object.fromEntries(keys.map((key) => [key, true])),
    );
  });
}
