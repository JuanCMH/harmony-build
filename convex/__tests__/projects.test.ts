import { describe, expect, it, vi } from "vitest";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import {
  field,
  oneSection,
  referenceField,
} from "../lib/__tests__/form.fixtures";
import { projectsErrors } from "../lib/error_messages";
import { JOIN_CODE_LENGTH } from "../lib/join_codes";
import {
  drainScheduled,
  grant,
  NO_PERMISSIONS,
  pick,
  seedForm,
  seedProject,
  setupTest,
  stored,
  storeFile,
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

const IDENTITY = {
  primaryColor: "blue",
  secondaryColor: "gray",
} as const;

const VEHICLES = oneSection(
  field("placa", { label: "Placa", required: true }),
  field("foto", { type: "image", label: "Foto" }),
);

const INSPECTION = (vehicles: string) =>
  oneSection(
    referenceField("vehiculo", vehicles, [], { label: "Vehículo" }),
    field("evidencia", { type: "image", label: "Evidencia" }),
  );

/** Lo mínimo de cada tabla del módulo de formatos en un proyecto: una
 *  categoría, un listado con un vehículo, y una inspección con dos respuestas
 *  que lo eligen. El vehículo y una respuesta llevan un archivo. */
async function seedFormsModule(
  t: ReturnType<typeof setupTest>,
  s: { projectId: Id<"projects">; ownerId: Id<"users"> },
) {
  const base = { projectId: s.projectId, createdBy: s.ownerId };
  await t.run((ctx) =>
    ctx.db.insert("formCategories", { projectId: s.projectId, name: "SST" }),
  );
  const vehicles = await seedForm(t, {
    ...base,
    sections: VEHICLES,
    kind: "catalog",
    name: "Vehículos",
    titleFieldId: "placa",
  });
  const sections = INSPECTION(vehicles.formId);
  const inspection = await seedForm(t, {
    ...base,
    sections,
    name: "Inspección de vehículos",
  });

  const photo = await storeFile(t, { contentType: "image/png" });
  const evidence = await storeFile(t, { contentType: "image/png" });

  authState.userId = s.ownerId;
  const truck = await t.mutation(api.formEntries.createEntry, {
    formId: vehicles.formId,
    values: stored(VEHICLES, {
      placa: "SLP-835",
      foto: { storageId: photo, name: "camion.png" },
    }),
  });
  await t.mutation(api.formResponses.submit, {
    formId: inspection.formId,
    values: stored(sections, {
      vehiculo: pick(truck),
      evidencia: { storageId: evidence, name: "evidencia.png" },
    }),
  });
  await t.mutation(api.formResponses.submit, {
    formId: inspection.formId,
    values: stored(sections, { vehiculo: pick(truck) }),
  });

  return {
    vehicles: vehicles.formId,
    inspection: inspection.formId,
    files: [photo, evidence],
  };
}

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
      forms: { count: 0, capped: false },
      responses: { count: 0, capped: false },
    });
  });

  it("el aviso cuenta también los formatos y sus respuestas", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const { inspection, vehicles } = await seedFormsModule(t, s);
    // Lo del vecino no cuenta.
    await seedForm(t, {
      projectId: s.otherProjectId,
      createdBy: s.outsiderId,
      sections: INSPECTION(vehicles),
    });

    authState.userId = s.ownerId;
    expect(
      await t.query(api.projects.getDeletionImpact, { id: s.projectId }),
    ).toMatchObject({
      forms: { count: 2, capped: false },
      // Dos inspecciones y un vehículo.
      responses: { count: 3, capped: false },
    });
    expect(inspection).toBeDefined();
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
    await drainScheduled(t);

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

  it("la purga drena las tablas de formatos y borra los archivos de las respuestas", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const mine = await seedFormsModule(t, s);

    // El vecino tiene lo mismo, y tiene que seguir teniéndolo.
    authState.userId = s.outsiderId;
    const theirs = await seedFormsModule(t, {
      ...s,
      projectId: s.otherProjectId,
      ownerId: s.outsiderId,
    });

    authState.userId = s.ownerId;
    await t.mutation(api.projects.remove, { id: s.projectId });
    await t.mutation(internal.projects.purgeProjectData, {
      projectId: s.projectId,
    });
    await drainScheduled(t);

    const left = await t.run(async (ctx) => {
      const count = async (
        table:
          | "formCategories"
          | "forms"
          | "formVersions"
          | "formResponses"
          | "formResponseLinks",
        projectId: Id<"projects">,
      ) =>
        (
          await ctx.db
            .query(table)
            .withIndex("projectId", (q) => q.eq("projectId", projectId))
            .collect()
        ).length;
      const tables = [
        "formCategories",
        "forms",
        "formVersions",
        "formResponses",
        "formResponseLinks",
      ] as const;
      return {
        mine: await Promise.all(tables.map((t) => count(t, s.projectId))),
        theirs: await Promise.all(
          tables.map((t) => count(t, s.otherProjectId)),
        ),
        myFiles: await Promise.all(
          mine.files.map((id) => ctx.db.system.get(id)),
        ),
        theirFiles: await Promise.all(
          theirs.files.map((id) => ctx.db.system.get(id)),
        ),
      };
    });

    expect(left.mine).toEqual([0, 0, 0, 0, 0]);
    // Una categoría, dos formatos con borrador y versión, tres respuestas y
    // dos relaciones.
    expect(left.theirs).toEqual([1, 2, 4, 3, 2]);
    expect(left.myFiles).toEqual([null, null]);
    expect(left.theirFiles.every((file) => file !== null)).toBe(true);
  });

  it("la purga es idempotente y aguanta una respuesta con muchos archivos", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    await seedFormsModule(t, s);
    // Una entrega con más archivos que documentos caben en una pasada.
    const heavy = await t.run(async (ctx) => {
      const form = await ctx.db
        .query("forms")
        .withIndex("projectId", (q) => q.eq("projectId", s.projectId))
        .first();
      const version = await ctx.db
        .query("formVersions")
        .withIndex("projectId", (q) => q.eq("projectId", s.projectId))
        .first();
      if (!form || !version) throw new Error("falta la siembra");
      const files = [];
      for (let index = 0; index < 210; index++) {
        files.push(await ctx.storage.store(new Blob([`foto ${index}`])));
      }
      await ctx.db.insert("formResponses", {
        formId: form._id,
        projectId: s.projectId,
        versionId: version._id,
        date: "2026-09-29",
        submittedBy: s.ownerId,
        status: "submitted",
        values: files.map((storageId, index) => ({
          fieldId: `foto-${index}`,
          value: { kind: "file" as const, storageId, name: `${index}.jpg` },
        })),
      });
      return files;
    });

    // Varias pasadas a mano: cada una hace lo que le cabe, y repetirla de más
    // no rompe nada.
    for (let pass = 0; pass < 6; pass++) {
      await t.mutation(internal.projects.purgeProjectData, {
        projectId: s.projectId,
      });
    }
    await drainScheduled(t);

    const left = await t.run(async (ctx) => ({
      responses: await ctx.db
        .query("formResponses")
        .withIndex("projectId", (q) => q.eq("projectId", s.projectId))
        .collect(),
      versions: await ctx.db
        .query("formVersions")
        .withIndex("projectId", (q) => q.eq("projectId", s.projectId))
        .collect(),
      files: await Promise.all(heavy.map((id) => ctx.db.system.get(id))),
    }));
    expect(left.responses).toEqual([]);
    expect(left.versions).toEqual([]);
    expect(left.files.every((file) => file === null)).toBe(true);
  });
});

describe("rol por defecto (diseño §9)", () => {
  it("quien entra con el código recibe el rol por defecto del proyecto", async () => {
    const t = setupTest();
    const s = await seedProject(t);

    authState.userId = s.adminId;
    await t.mutation(api.projects.setDefaultRole, {
      id: s.projectId,
      roleId: s.roleId,
    });
    expect(
      (await t.query(api.projects.getById, { id: s.projectId }))?.defaultRoleId,
    ).toBe(s.roleId);

    authState.userId = s.outsiderId;
    await t.mutation(api.projects.join, { joinCode: "abc123abc123" });

    const member = await t.run((ctx) =>
      ctx.db
        .query("members")
        .withIndex("projectId_userId", (q) =>
          q.eq("projectId", s.projectId).eq("userId", s.outsiderId),
        )
        .unique(),
    );
    expect(member).toMatchObject({ role: "member", customRoleId: s.roleId });
  });

  it("quien ya era miembro no cambia de rol al volver a entrar", async () => {
    const t = setupTest();
    const s = await seedProject(t);

    authState.userId = s.adminId;
    await t.mutation(api.projects.setDefaultRole, {
      id: s.projectId,
      roleId: s.roleId,
    });
    authState.userId = s.plainId;
    await t.mutation(api.projects.join, { joinCode: "abc123abc123" });

    expect(
      (await t.run((ctx) => ctx.db.get(s.plainMemberId)))?.customRoleId,
    ).toBeUndefined();
  });

  it("sin rol por defecto, entrar deja un miembro sin rol, como siempre", async () => {
    const t = setupTest();
    const s = await seedProject(t);

    authState.userId = s.adminId;
    await t.mutation(api.projects.setDefaultRole, {
      id: s.projectId,
      roleId: s.roleId,
    });
    await t.mutation(api.projects.setDefaultRole, { id: s.projectId });
    expect(
      (await t.run((ctx) => ctx.db.get(s.projectId)))?.defaultRoleId,
    ).toBeUndefined();

    authState.userId = s.outsiderId;
    await t.mutation(api.projects.join, { joinCode: "abc123abc123" });
    const member = await t.run((ctx) =>
      ctx.db
        .query("members")
        .withIndex("projectId_userId", (q) =>
          q.eq("projectId", s.projectId).eq("userId", s.outsiderId),
        )
        .unique(),
    );
    expect(member?.customRoleId).toBeUndefined();
  });

  it("el rol tiene que ser del proyecto, y fijarlo exige `assignRoles`", async () => {
    const t = setupTest();
    const s = await seedProject(t);

    authState.userId = s.adminId;
    await expect(
      t.mutation(api.projects.setDefaultRole, {
        id: s.projectId,
        roleId: s.otherRoleId,
      }),
    ).rejects.toThrow(projectsErrors.defaultRoleNotFound);

    authState.userId = s.roleHolderId;
    await expect(
      t.mutation(api.projects.setDefaultRole, {
        id: s.projectId,
        roleId: s.roleId,
      }),
    ).rejects.toThrow(projectsErrors.insufficientPermissions);
  });

  it("si el rol por defecto ya no existe, entrar no lo asigna", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    // Un rol borrado por fuera de `roles.remove`: el proyecto quedó
    // apuntando a nada.
    await t.run(async (ctx) => {
      await ctx.db.patch(s.projectId, { defaultRoleId: s.roleId });
      await ctx.db.patch(s.roleHolderMemberId, { customRoleId: undefined });
      await ctx.db.delete(s.roleId);
    });

    authState.userId = s.outsiderId;
    await t.mutation(api.projects.join, { joinCode: "abc123abc123" });
    const member = await t.run((ctx) =>
      ctx.db
        .query("members")
        .withIndex("projectId_userId", (q) =>
          q.eq("projectId", s.projectId).eq("userId", s.outsiderId),
        )
        .unique(),
    );
    expect(member?.customRoleId).toBeUndefined();
  });

  it("eliminar el rol lo retira del proyecto y de las audiencias que lo nombran", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const other = await t.run((ctx) =>
      ctx.db.insert("roles", {
        name: "Conductores",
        projectId: s.projectId,
        ...NO_PERMISSIONS,
      }),
    );
    const { formId } = await seedForm(t, {
      projectId: s.projectId,
      createdBy: s.adminId,
      sections: INSPECTION("sin-listado"),
      audience: "roles",
      audienceRoleIds: [s.roleId, other],
    });

    authState.userId = s.adminId;
    await t.mutation(api.projects.setDefaultRole, {
      id: s.projectId,
      roleId: s.roleId,
    });
    await t.mutation(api.roles.remove, { id: s.roleId });

    const { project, form } = await t.run(async (ctx) => ({
      project: await ctx.db.get(s.projectId),
      form: await ctx.db.get(formId),
    }));
    expect(project?.defaultRoleId).toBeUndefined();
    // El formato sobrevive a un rol de su audiencia, y conserva los demás.
    expect(form).toMatchObject({ audience: "roles", audienceRoleIds: [other] });
  });
});
