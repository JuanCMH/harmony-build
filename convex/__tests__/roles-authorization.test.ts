import { describe, expect, it, vi } from "vitest";
import { api } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { rolesErrors } from "../lib/error_messages";
import { permissionsSchema } from "../permissions";
import {
  checkPermission,
  hasProjectAccess,
  isProjectAdmin,
  isProjectOwner,
} from "../roles";
import {
  grant,
  NO_PERMISSIONS,
  type PermissionKey,
  seedProject,
  setupTest,
} from "./helpers";

const authState = vi.hoisted(() => ({
  userId: null as Id<"users"> | null,
}));

vi.mock("@convex-dev/auth/server", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@convex-dev/auth/server")>();
  return {
    ...actual,
    getAuthUserId: async () => authState.userId,
  };
});

const ALL_KEYS = Object.keys(permissionsSchema) as PermissionKey[];

describe("los tres niveles de identidad (01 §5.1)", () => {
  it("propietario y administrador pasan todas las llaves, y también sin llave", async () => {
    const t = setupTest();
    const s = await seedProject(t);

    await t.run(async (ctx) => {
      for (const userId of [s.ownerId, s.adminId]) {
        for (const permission of ALL_KEYS) {
          expect(
            await checkPermission({
              ctx,
              userId,
              projectId: s.projectId,
              permission,
            }),
          ).toBe(true);
        }
        expect(
          await checkPermission({ ctx, userId, projectId: s.projectId }),
        ).toBe(true);
      }
    });
  });

  it("un rol personalizado pasa sólo las llaves que tiene", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    await grant(t, s.roleId, "viewLogs", "inviteUsers");

    await t.run(async (ctx) => {
      for (const permission of ALL_KEYS) {
        expect(
          await checkPermission({
            ctx,
            userId: s.roleHolderId,
            projectId: s.projectId,
            permission,
          }),
        ).toBe(permission === "viewLogs" || permission === "inviteUsers");
      }
    });
  });

  it("sin llave pedida, un rol personalizado no pasa aunque las tenga todas", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    await grant(t, s.roleId, ...ALL_KEYS);

    await t.run(async (ctx) => {
      expect(
        await checkPermission({
          ctx,
          userId: s.roleHolderId,
          projectId: s.projectId,
        }),
      ).toBe(false);
    });
  });

  it("un miembro sin rol lee el proyecto pero no pasa ninguna llave", async () => {
    const t = setupTest();
    const s = await seedProject(t);

    await t.run(async (ctx) => {
      expect(await hasProjectAccess(ctx, s.plainId, s.projectId)).toBe(true);
      for (const permission of ALL_KEYS) {
        expect(
          await checkPermission({
            ctx,
            userId: s.plainId,
            projectId: s.projectId,
            permission,
          }),
        ).toBe(false);
      }
    });
  });

  it("ser propietario de otro proyecto no concede nada en este", async () => {
    const t = setupTest();
    const s = await seedProject(t);

    await t.run(async (ctx) => {
      expect(await hasProjectAccess(ctx, s.outsiderId, s.projectId)).toBe(
        false,
      );
      expect(await isProjectAdmin(ctx, s.outsiderId, s.projectId)).toBe(false);
      expect(await isProjectOwner(ctx, s.outsiderId, s.projectId)).toBe(false);
      expect(
        await checkPermission({
          ctx,
          userId: s.outsiderId,
          projectId: s.projectId,
          permission: "viewLogs",
        }),
      ).toBe(false);
    });
  });

  it("administrador no es propietario", async () => {
    const t = setupTest();
    const s = await seedProject(t);

    await t.run(async (ctx) => {
      expect(await isProjectAdmin(ctx, s.adminId, s.projectId)).toBe(true);
      expect(await isProjectOwner(ctx, s.adminId, s.projectId)).toBe(false);
      expect(await isProjectOwner(ctx, s.ownerId, s.projectId)).toBe(true);
    });
  });
});

describe("roles", () => {
  it("crear exige `createRoles` y deja constancia", async () => {
    const t = setupTest();
    const s = await seedProject(t);

    authState.userId = s.roleHolderId;
    await expect(
      t.mutation(api.roles.create, {
        name: "Conductores",
        projectId: s.projectId,
        ...NO_PERMISSIONS,
      }),
    ).rejects.toThrow(rolesErrors.cannotCreateRoles);

    await grant(t, s.roleId, "createRoles");
    const roleId = await t.mutation(api.roles.create, {
      name: "  Conductores  ",
      projectId: s.projectId,
      ...NO_PERMISSIONS,
      viewLogs: true,
    });

    const { role, logs } = await t.run(async (ctx) => ({
      role: await ctx.db.get(roleId),
      logs: await ctx.db
        .query("logs")
        .withIndex("projectId", (q) => q.eq("projectId", s.projectId))
        .collect(),
    }));

    expect(role?.name).toBe("Conductores");
    expect(role?.viewLogs).toBe(true);
    expect(logs).toHaveLength(1);
    expect(logs[0].description).toBe("Rol creado: Conductores (1 permisos)");
    expect(logs[0].userName).toBe("Inspectora");
  });

  it("un nombre vacío no crea el rol", async () => {
    const t = setupTest();
    const s = await seedProject(t);

    authState.userId = s.ownerId;
    await expect(
      t.mutation(api.roles.create, {
        name: " ",
        projectId: s.projectId,
        ...NO_PERMISSIONS,
      }),
    ).rejects.toThrow(rolesErrors.invalidName);
  });

  it("el ámbito de editar sale del rol, no de quien llama", async () => {
    const t = setupTest();
    const s = await seedProject(t);

    // Propietario de su proyecto, ajeno al del rol.
    authState.userId = s.outsiderId;
    await expect(
      t.mutation(api.roles.update, {
        id: s.roleId,
        name: "Secuestrado",
        ...NO_PERMISSIONS,
        editProject: true,
      }),
    ).rejects.toThrow(rolesErrors.cannotEditRoles);
  });

  it("eliminar un rol lo retira de quien lo tenía", async () => {
    const t = setupTest();
    const s = await seedProject(t);

    authState.userId = s.adminId;
    await t.mutation(api.roles.remove, { id: s.roleId });

    const member = await t.run((ctx) => ctx.db.get(s.roleHolderMemberId));
    expect(member?.customRoleId).toBeUndefined();
    expect(member?.role).toBe("member");
  });

  it("los roles de un proyecto no se leen desde otro", async () => {
    const t = setupTest();
    const s = await seedProject(t);

    authState.userId = s.outsiderId;
    expect(await t.query(api.roles.get, { projectId: s.projectId })).toBeNull();
    expect(await t.query(api.roles.getById, { id: s.roleId })).toBeNull();

    authState.userId = s.plainId;
    const roles = await t.query(api.roles.get, { projectId: s.projectId });
    expect(roles?.map((role) => role.name)).toEqual(["Inspección"]);
  });
});
