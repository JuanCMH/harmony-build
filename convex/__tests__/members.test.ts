import { describe, expect, it, vi } from "vitest";
import { api } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { membersErrors } from "../lib/error_messages";
import { grant, seedProject, setupTest } from "./helpers";

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

describe("members.update", () => {
  it("`assignRoles` reparte roles, pero no asciende a administrador", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    await grant(t, s.roleId, "assignRoles");

    authState.userId = s.roleHolderId;

    await t.mutation(api.members.update, {
      id: s.plainMemberId,
      role: "member",
      customRoleId: s.roleId,
    });
    expect(
      (await t.run((ctx) => ctx.db.get(s.plainMemberId)))?.customRoleId,
    ).toBe(s.roleId);

    await expect(
      t.mutation(api.members.update, { id: s.plainMemberId, role: "admin" }),
    ).rejects.toThrow(membersErrors.cannotAssignAdminRole);

    // Tampoco se asciende a sí misma.
    await expect(
      t.mutation(api.members.update, {
        id: s.roleHolderMemberId,
        role: "admin",
      }),
    ).rejects.toThrow(membersErrors.cannotAssignAdminRole);
  });

  it("al propietario no se le cambia el rol desde aquí", async () => {
    const t = setupTest();
    const s = await seedProject(t);

    authState.userId = s.adminId;
    await expect(
      t.mutation(api.members.update, { id: s.ownerMemberId, role: "member" }),
    ).rejects.toThrow(membersErrors.cannotChangeOwner);
  });

  it("no acepta el rol personalizado de otro proyecto", async () => {
    const t = setupTest();
    const s = await seedProject(t);

    authState.userId = s.ownerId;
    await expect(
      t.mutation(api.members.update, {
        id: s.plainMemberId,
        role: "member",
        customRoleId: s.otherRoleId,
      }),
    ).rejects.toThrow(membersErrors.insufficientPermissions);
  });

  it("sin la llave no se asigna nada", async () => {
    const t = setupTest();
    const s = await seedProject(t);

    authState.userId = s.plainId;
    await expect(
      t.mutation(api.members.update, {
        id: s.roleHolderMemberId,
        role: "member",
      }),
    ).rejects.toThrow(membersErrors.insufficientPermissions);
  });
});

describe("members.remove", () => {
  it("salir por cuenta propia no pide llave", async () => {
    const t = setupTest();
    const s = await seedProject(t);

    authState.userId = s.plainId;
    await t.mutation(api.members.remove, { id: s.plainMemberId });

    expect(await t.run((ctx) => ctx.db.get(s.plainMemberId))).toBeNull();
  });

  it("expulsar a otro exige `expelUsers`", async () => {
    const t = setupTest();
    const s = await seedProject(t);

    authState.userId = s.roleHolderId;
    await expect(
      t.mutation(api.members.remove, { id: s.plainMemberId }),
    ).rejects.toThrow(membersErrors.insufficientPermissions);

    await grant(t, s.roleId, "expelUsers");
    await t.mutation(api.members.remove, { id: s.plainMemberId });
    expect(await t.run((ctx) => ctx.db.get(s.plainMemberId))).toBeNull();
  });

  it("`expelUsers` no alcanza para expulsar a un administrador", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    await grant(t, s.roleId, "expelUsers");

    authState.userId = s.roleHolderId;
    await expect(
      t.mutation(api.members.remove, { id: s.adminMemberId }),
    ).rejects.toThrow(membersErrors.cannotAssignAdminRole);
  });

  it("el propietario ni sale ni es expulsado", async () => {
    const t = setupTest();
    const s = await seedProject(t);

    authState.userId = s.ownerId;
    await expect(
      t.mutation(api.members.remove, { id: s.ownerMemberId }),
    ).rejects.toThrow(membersErrors.cannotRemoveYourself);

    authState.userId = s.adminId;
    await expect(
      t.mutation(api.members.remove, { id: s.ownerMemberId }),
    ).rejects.toThrow(membersErrors.cannotChangeOwner);
  });

  it("alguien de fuera no expulsa a nadie", async () => {
    const t = setupTest();
    const s = await seedProject(t);

    authState.userId = s.outsiderId;
    await expect(
      t.mutation(api.members.remove, { id: s.plainMemberId }),
    ).rejects.toThrow(membersErrors.unauthorized);
  });
});

describe("lecturas de miembros", () => {
  it("no cruzan proyectos ni devuelven el documento de `users` entero", async () => {
    const t = setupTest();
    const s = await seedProject(t);

    authState.userId = s.outsiderId;
    expect(
      await t.query(api.members.get, { projectId: s.projectId }),
    ).toBeNull();
    expect(
      await t.query(api.members.current, { projectId: s.projectId }),
    ).toBeNull();
    await expect(
      t.query(api.members.getById, { id: s.plainMemberId }),
    ).rejects.toThrow(membersErrors.noProjectAccess);

    authState.userId = s.plainId;
    const members = await t.query(api.members.get, { projectId: s.projectId });
    expect(members).toHaveLength(4);
    const allowed = ["_id", "email", "name", "phone", "userImage"];
    for (const member of members ?? []) {
      expect(
        Object.keys(member.user).filter((key) => !allowed.includes(key)),
      ).toEqual([]);
    }

    const current = await t.query(api.members.current, {
      projectId: s.projectId,
    });
    expect(current?.role).toBe("member");
    expect(current?.customRole).toBeNull();
  });
});
