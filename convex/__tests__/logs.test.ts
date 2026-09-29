import { describe, expect, it, vi } from "vitest";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { todayInColombia } from "../lib/dates";
import { logsErrors } from "../lib/error_messages";
import { SYSTEM_AUTHOR, writeSystemLog } from "../logs";
import { field, oneSection } from "../lib/__tests__/form.fixtures";
import { grant, type Seed, seedProject, setupTest, stored } from "./helpers";

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

const EVERYTHING = { from: 0, to: Number.MAX_SAFE_INTEGER };

async function writeLog(
  t: ReturnType<typeof setupTest>,
  s: Seed,
  description: string,
  projectId: Id<"projects"> = s.projectId,
) {
  return await t.mutation(internal.logs.create, {
    description,
    type: "info",
    projectId,
    affectedEntityType: "project",
    affectedEntityId: projectId,
  });
}

describe("logs.create", () => {
  it("resuelve el autor desde la sesión", async () => {
    const t = setupTest();
    const s = await seedProject(t);

    authState.userId = s.adminId;
    const logId = await writeLog(t, s, "Algo pasó");

    const log = await t.run((ctx) => ctx.db.get(logId));
    expect(log?.userName).toBe("Administrador");
    expect(log?.userId).toBe(s.adminId);
  });

  it("sin sesión no escribe", async () => {
    const t = setupTest();
    const s = await seedProject(t);

    authState.userId = null;
    await expect(writeLog(t, s, "Anónimo")).rejects.toThrow(
      logsErrors.userNotAuthenticated,
    );
  });

  it("lo que hace la plataforma sola lo firma la plataforma", async () => {
    const t = setupTest();
    const s = await seedProject(t);

    const logId = await t.run((ctx) =>
      writeSystemLog(ctx, {
        description: "Tarea agendada",
        type: "info",
        projectId: s.projectId,
        affectedEntityType: "project",
        affectedEntityId: s.projectId,
      }),
    );

    const log = await t.run((ctx) => ctx.db.get(logId));
    expect(log?.userName).toBe(SYSTEM_AUTHOR);
    expect(log?.userId).toBeUndefined();
  });
});

describe("logs.getByProject", () => {
  it("exige `viewLogs`", async () => {
    const t = setupTest();
    const s = await seedProject(t);

    authState.userId = s.ownerId;
    await writeLog(t, s, "Del proyecto");

    for (const userId of [s.plainId, s.roleHolderId, s.outsiderId]) {
      authState.userId = userId;
      await expect(
        t.query(api.logs.getByProject, {
          projectId: s.projectId,
          ...EVERYTHING,
        }),
      ).rejects.toThrow(logsErrors.insufficientPermissions);
    }

    await grant(t, s.roleId, "viewLogs");
    authState.userId = s.roleHolderId;
    const logs = await t.query(api.logs.getByProject, {
      projectId: s.projectId,
      ...EVERYTHING,
    });
    expect(logs.map((log) => log.description)).toEqual(["Del proyecto"]);
  });

  it("devuelve sólo el intervalo pedido, lo más reciente primero", async () => {
    const t = setupTest();
    const s = await seedProject(t);

    authState.userId = s.ownerId;
    const first = await writeLog(t, s, "Primero");
    const second = await writeLog(t, s, "Segundo");
    await writeLog(t, s, "De otro proyecto", s.otherProjectId);

    const times = await t.run(async (ctx) => ({
      first: (await ctx.db.get(first))!._creationTime,
      second: (await ctx.db.get(second))!._creationTime,
    }));

    const all = await t.query(api.logs.getByProject, {
      projectId: s.projectId,
      ...EVERYTHING,
    });
    expect(all.map((log) => log.description)).toEqual(["Segundo", "Primero"]);

    // `to` es exclusivo: el intervalo que acaba donde empieza el segundo no
    // lo incluye.
    const onlyFirst = await t.query(api.logs.getByProject, {
      projectId: s.projectId,
      from: times.first,
      to: times.second,
    });
    expect(onlyFirst.map((log) => log.description)).toEqual(["Primero"]);
  });
});

describe("logs.getLogDetails", () => {
  it("deriva el ámbito del log y no filtra el código de unión", async () => {
    const t = setupTest();
    const s = await seedProject(t);

    authState.userId = s.ownerId;
    const logId = await writeLog(t, s, "Proyecto actualizado");

    const details = await t.query(api.logs.getLogDetails, { logId });
    expect(details.relatedEntity).toMatchObject({ name: "Planta de concreto" });
    expect(details.relatedEntity).not.toHaveProperty("joinCode");
    expect(details.contextData.project).not.toHaveProperty("joinCode");

    authState.userId = s.outsiderId;
    await expect(
      t.query(api.logs.getLogDetails, { logId }),
    ).rejects.toThrow(logsErrors.insufficientPermissions);
  });

  it("una entrada sin proyecto no la lee nadie desde la aplicación", async () => {
    const t = setupTest();
    const s = await seedProject(t);

    authState.userId = s.ownerId;
    const logId = await t.mutation(internal.logs.create, {
      description: "Proyecto eliminado: Otro",
      type: "delete",
    });

    await expect(
      t.query(api.logs.getLogDetails, { logId }),
    ).rejects.toThrow(logsErrors.insufficientPermissions);
  });
});

describe("todayInColombia", () => {
  it("las 22:57 del 14 en Colombia son del 14, aunque en UTC ya sea 15", () => {
    expect(todayInColombia(Date.parse("2026-09-15T03:57:00Z"))).toBe(
      "2026-09-14",
    );
    expect(todayInColombia(Date.parse("2026-09-15T05:00:00Z"))).toBe(
      "2026-09-15",
    );
  });
});

describe("detalle de un formato y de una respuesta", () => {
  it("devuelve sólo lo que los identifica: ni la definición ni los valores", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    await grant(t, s.roleId, "viewLogs");
    const sections = oneSection(
      field("placa", { label: "Placa", required: true }),
      field("clave", { label: "Clave del candado" }),
    );

    authState.userId = s.adminId;
    const formId = await t.mutation(api.forms.create, {
      projectId: s.projectId,
      kind: "catalog",
      name: "Vehículos",
      code: "LST-01",
    });
    await t.mutation(api.formVersions.saveDraft, { id: formId, sections });
    await t.mutation(api.forms.setTitleField, {
      id: formId,
      titleFieldId: "placa",
    });
    await t.mutation(api.formVersions.publish, { id: formId });
    const entryId = await t.mutation(api.formEntries.createEntry, {
      formId,
      values: stored(sections, { placa: "SLP-835", clave: "4821" }),
    });

    const logs = await t.run((ctx) => ctx.db.query("logs").collect());
    const ofForm = logs.find((log) => log.affectedEntityType === "form");
    const ofEntry = logs.find(
      (log) => log.affectedEntityType === "formResponse",
    );
    if (!ofForm || !ofEntry) throw new Error("faltan entradas de auditoría");

    // Quien ve la auditoría no tiene ninguna llave de formatos.
    authState.userId = s.roleHolderId;
    const form = await t.query(api.logs.getLogDetails, { logId: ofForm._id });
    expect(form.relatedEntity).toEqual({
      _id: formId,
      _creationTime: expect.any(Number),
      kind: "catalog",
      name: "Vehículos",
      code: "LST-01",
      status: "published",
      publishedVersionNumber: 1,
    });

    const entry = await t.query(api.logs.getLogDetails, { logId: ofEntry._id });
    expect(entry.relatedEntity).toEqual({
      _id: entryId,
      _creationTime: expect.any(Number),
      formId,
      formName: "Vehículos",
      formKind: "catalog",
      date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      status: "submitted",
      title: "SLP-835",
      active: true,
    });
    expect(JSON.stringify(entry)).not.toContain("4821");
    expect(JSON.stringify(form)).not.toContain("Clave del candado");
  });
});
