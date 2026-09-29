import { describe, expect, it, vi } from "vitest";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { projectsErrors } from "../lib/error_messages";
import { JOIN_CODE_LENGTH } from "../lib/join_codes";
import { grant, NO_PERMISSIONS, seedProject, setupTest } from "./helpers";

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

const IDENTITY = {
  primaryColor: "blue",
  secondaryColor: "gray",
} as const;

describe("projects.create", () => {
  it("deja a quien crea como propietario, con código de unión y constancia", async () => {
    const t = setupTest();
    const s = await seedProject(t);

    authState.userId = s.plainId;
    const projectId = await t.mutation(api.projects.create, {
      name: "  Puente   Guayuriba ",
      code: " PG-01 ",
      ...IDENTITY,
    });

    const { project, members, logs } = await t.run(async (ctx) => ({
      project: await ctx.db.get(projectId),
      members: await ctx.db
        .query("members")
        .withIndex("projectId", (q) => q.eq("projectId", projectId))
        .collect(),
      logs: await ctx.db
        .query("logs")
        .withIndex("projectId", (q) => q.eq("projectId", projectId))
        .collect(),
    }));

    expect(project?.name).toBe("Puente Guayuriba");
    expect(project?.code).toBe("PG-01");
    expect(project?.active).toBe(true);
    expect(project?.userId).toBe(s.plainId);
    expect(project?.joinCode).toHaveLength(JOIN_CODE_LENGTH);
    expect(members).toHaveLength(1);
    expect(members[0]).toMatchObject({ userId: s.plainId, role: "owner" });
    expect(logs.map((log) => log.description)).toEqual([
      "Proyecto creado: Puente Guayuriba",
    ]);
  });

  it("valida nombre y código en el servidor", async () => {
    const t = setupTest();
    const s = await seedProject(t);

    authState.userId = s.plainId;
    await expect(
      t.mutation(api.projects.create, { name: "abc", ...IDENTITY }),
    ).rejects.toThrow(projectsErrors.invalidName);
    await expect(
      t.mutation(api.projects.create, {
        name: "Nombre válido",
        code: "x".repeat(21),
        ...IDENTITY,
      }),
    ).rejects.toThrow(projectsErrors.invalidCode);
  });

  it("sin sesión no crea nada", async () => {
    const t = setupTest();
    authState.userId = null;
    await expect(
      t.mutation(api.projects.create, { name: "Sin sesión", ...IDENTITY }),
    ).rejects.toThrow(projectsErrors.userNotAuthenticated);
  });
});

describe("lecturas de proyecto", () => {
  it("`get` devuelve sólo mis proyectos, con mi rol y sin código de unión", async () => {
    const t = setupTest();
    const s = await seedProject(t);

    authState.userId = s.adminId;
    const projects = await t.query(api.projects.get, {});

    expect(projects).toHaveLength(1);
    expect(projects?.[0]).toMatchObject({
      _id: s.projectId,
      role: "admin",
    });
    expect(projects?.[0]).not.toHaveProperty("joinCode");
  });

  it("`getById` devuelve null a quien no pertenece, y nunca el código", async () => {
    const t = setupTest();
    const s = await seedProject(t);

    authState.userId = s.outsiderId;
    expect(await t.query(api.projects.getById, { id: s.projectId })).toBeNull();

    authState.userId = s.ownerId;
    const project = await t.query(api.projects.getById, { id: s.projectId });
    expect(project?.name).toBe("Planta de concreto");
    expect(project).not.toHaveProperty("joinCode");
  });

  it("el código de unión sólo lo lee quien puede invitar", async () => {
    const t = setupTest();
    const s = await seedProject(t);

    authState.userId = s.roleHolderId;
    expect(
      await t.query(api.projects.getJoinCode, { id: s.projectId }),
    ).toBeNull();

    await grant(t, s.roleId, "inviteUsers");
    expect(await t.query(api.projects.getJoinCode, { id: s.projectId })).toBe(
      "abc123abc123",
    );

    authState.userId = s.outsiderId;
    expect(
      await t.query(api.projects.getJoinCode, { id: s.projectId }),
    ).toBeNull();
  });
});

describe("projects.update", () => {
  it("exige `editProject` y registra el archivado como tal", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const changes = {
      id: s.projectId,
      name: "Planta de concreto",
      active: false,
      ...IDENTITY,
    };

    authState.userId = s.roleHolderId;
    await expect(t.mutation(api.projects.update, changes)).rejects.toThrow(
      projectsErrors.cannotEditProject,
    );

    await grant(t, s.roleId, "editProject");
    await t.mutation(api.projects.update, changes);

    const { project, logs } = await t.run(async (ctx) => ({
      project: await ctx.db.get(s.projectId),
      logs: await ctx.db
        .query("logs")
        .withIndex("projectId", (q) => q.eq("projectId", s.projectId))
        .collect(),
    }));

    expect(project?.active).toBe(false);
    // Editar no toca ni el código de unión ni la propiedad.
    expect(project?.joinCode).toBe("abc123abc123");
    expect(project?.userId).toBe(s.ownerId);
    expect(logs.map((log) => log.description)).toEqual([
      "Proyecto archivado: Planta de concreto",
    ]);
  });
});

describe("código de unión", () => {
  it("unirse concede `member` sin rol, una sola vez", async () => {
    const t = setupTest();
    const s = await seedProject(t);

    authState.userId = s.outsiderId;
    await expect(
      t.mutation(api.projects.join, { joinCode: "nope" }),
    ).rejects.toThrow(projectsErrors.joinError);

    const joined = await t.mutation(api.projects.join, {
      joinCode: "abc123abc123",
    });
    await t.mutation(api.projects.join, { joinCode: "abc123abc123" });

    const rows = await t.run((ctx) =>
      ctx.db
        .query("members")
        .withIndex("projectId_userId", (q) =>
          q.eq("projectId", s.projectId).eq("userId", s.outsiderId),
        )
        .collect(),
    );

    expect(joined).toBe(s.projectId);
    expect(rows).toHaveLength(1);
    expect(rows[0].role).toBe("member");
    expect(rows[0].customRoleId).toBeUndefined();
  });

  it("renovarlo exige `inviteUsers` e invalida el anterior", async () => {
    const t = setupTest();
    const s = await seedProject(t);

    authState.userId = s.plainId;
    await expect(
      t.mutation(api.projects.newJoinCode, { id: s.projectId }),
    ).rejects.toThrow(projectsErrors.cannotCreateNewCode);

    authState.userId = s.adminId;
    await t.mutation(api.projects.newJoinCode, { id: s.projectId });

    const project = await t.run((ctx) => ctx.db.get(s.projectId));
    expect(project?.joinCode).not.toBe("abc123abc123");
    expect(project?.joinCode).toHaveLength(JOIN_CODE_LENGTH);

    authState.userId = s.outsiderId;
    await expect(
      t.mutation(api.projects.join, { joinCode: "abc123abc123" }),
    ).rejects.toThrow(projectsErrors.joinError);
  });
});

describe("projects.transfer", () => {
  it("sólo el propietario transfiere, y sólo a un miembro del proyecto", async () => {
    const t = setupTest();
    const s = await seedProject(t);

    authState.userId = s.adminId;
    await expect(
      t.mutation(api.projects.transfer, {
        id: s.projectId,
        memberId: s.adminMemberId,
      }),
    ).rejects.toThrow(projectsErrors.cannotTransferProject);

    authState.userId = s.ownerId;
    await expect(
      t.mutation(api.projects.transfer, {
        id: s.projectId,
        memberId: s.outsiderMemberId,
      }),
    ).rejects.toThrow(projectsErrors.newOwnerMustBeMember);
    await expect(
      t.mutation(api.projects.transfer, {
        id: s.projectId,
        memberId: s.ownerMemberId,
      }),
    ).rejects.toThrow(projectsErrors.alreadyOwner);
  });

  it("mueve la fila de propietario y `projects.userId` a la vez", async () => {
    const t = setupTest();
    const s = await seedProject(t);

    authState.userId = s.ownerId;
    await t.mutation(api.projects.transfer, {
      id: s.projectId,
      memberId: s.plainMemberId,
    });

    const state = await t.run(async (ctx) => ({
      project: await ctx.db.get(s.projectId),
      before: await ctx.db.get(s.ownerMemberId),
      after: await ctx.db.get(s.plainMemberId),
      owners: (
        await ctx.db
          .query("members")
          .withIndex("projectId", (q) => q.eq("projectId", s.projectId))
          .collect()
      ).filter((member) => member.role === "owner"),
    }));

    expect(state.project?.userId).toBe(s.plainId);
    expect(state.before?.role).toBe("admin");
    expect(state.after?.role).toBe("owner");
    expect(state.owners).toHaveLength(1);
  });
});

describe("projects.remove", () => {
  it("sólo el propietario elimina", async () => {
    const t = setupTest();
    const s = await seedProject(t);

    authState.userId = s.adminId;
    await expect(
      t.mutation(api.projects.remove, { id: s.projectId }),
    ).rejects.toThrow(projectsErrors.cannotDeleteProject);
    await expect(
      t.query(api.projects.getDeletionImpact, { id: s.projectId }),
    ).rejects.toThrow(projectsErrors.insufficientPermissions);

    authState.userId = s.ownerId;
    expect(
      await t.query(api.projects.getDeletionImpact, { id: s.projectId }),
    ).toEqual({
      members: { count: 4, capped: false },
      roles: { count: 1, capped: false },
    });
  });

  it("la purga drena lo que cuelga del proyecto y no toca el vecino", async () => {
    const t = setupTest();
    const s = await seedProject(t);

    authState.userId = s.ownerId;
    await t.mutation(api.roles.create, {
      name: "Temporal",
      projectId: s.projectId,
      ...NO_PERMISSIONS,
    });
    await t.mutation(api.projects.remove, { id: s.projectId });
    await t.mutation(internal.projects.purgeProjectData, {
      projectId: s.projectId,
    });
    await t.finishInProgressScheduledFunctions();

    const left = await t.run(async (ctx) => ({
      project: await ctx.db.get(s.projectId),
      members: await ctx.db
        .query("members")
        .withIndex("projectId", (q) => q.eq("projectId", s.projectId))
        .collect(),
      roles: await ctx.db
        .query("roles")
        .withIndex("projectId", (q) => q.eq("projectId", s.projectId))
        .collect(),
      logs: await ctx.db.query("logs").collect(),
      neighbour: await ctx.db.get(s.otherProjectId),
      neighbourMember: await ctx.db.get(s.outsiderMemberId),
      neighbourRole: await ctx.db.get(s.otherRoleId),
    }));

    expect(left.project).toBeNull();
    expect(left.members).toHaveLength(0);
    expect(left.roles).toHaveLength(0);
    // Sobrevive sólo la constancia del borrado, que no cuelga del proyecto.
    expect(left.logs.map((log) => log.description)).toEqual([
      "Proyecto eliminado: Planta de concreto",
    ]);
    expect(left.logs[0].projectId).toBeUndefined();
    expect(left.neighbour).not.toBeNull();
    expect(left.neighbourMember).not.toBeNull();
    expect(left.neighbourRole).not.toBeNull();
  });
});
