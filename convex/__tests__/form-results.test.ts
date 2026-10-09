import { beforeEach, describe, expect, it, vi } from "vitest";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { field, oneSection, selectField } from "../lib/__tests__/form.fixtures";
import { dashboardsErrors, formResultsErrors } from "../lib/error_messages";
import { RESULT_PROBLEMS } from "../lib/result_definition";
import { RESULT_LIMITS } from "../lib/result_types";
import { SST_DASHBOARD, SST_RESULTS } from "../sst_library/results";
import {
  drainScheduled,
  grant,
  type Seed,
  seedForm,
  seedProject,
  setupTest,
  stored,
  type TestConvex,
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

const SECTIONS = oneSection(
  field("horas", { type: "number", label: "Horas", required: true }),
  selectField("turno", ["Día", "Noche"], { label: "Turno" }),
);

const SUM = {
  type: "indicator",
  measure: { operation: "sum", fieldId: "horas" },
} as const;
const COUNT = { type: "indicator", measure: { operation: "count" } } as const;
const RANGE = { from: "2020-01-01", to: "2020-12-31", today: "2020-06-01" };

let t: TestConvex;
let s: Seed;
let formId: Id<"forms">;

/** Una respuesta con la fecha que se quiera: `submit` pone la de hoy. */
const respond = (horas: number, date: string, status = "submitted" as const) =>
  t.run(async (ctx) => {
    const form = await ctx.db.get(formId);
    if (!form?.publishedVersionId) throw new Error("sin versión");
    return await ctx.db.insert("formResponses", {
      formId,
      projectId: s.projectId,
      versionId: form.publishedVersionId,
      date,
      submittedBy: s.ownerId,
      status,
      values: stored(SECTIONS, { horas }),
    });
  });

beforeEach(async () => {
  t = setupTest();
  s = await seedProject(t);
  ({ formId } = await seedForm(t, {
    projectId: s.projectId,
    createdBy: s.ownerId,
    sections: SECTIONS,
  }));
  authState.userId = s.ownerId;
});

describe("formResults: definir", () => {
  it("crea, cambia y borra un resultado, y lo deja en la auditoría", async () => {
    const id = await t.mutation(api.formResults.create, {
      formId,
      name: "  Horas   del mes ",
      config: SUM,
    });
    expect(await t.query(api.formResults.get, { formId })).toEqual([
      { _id: id, name: "Horas del mes", config: SUM },
    ]);

    await t.mutation(api.formResults.update, {
      id,
      name: "Registros",
      config: COUNT,
    });
    expect(await t.query(api.formResults.get, { formId })).toEqual([
      { _id: id, name: "Registros", config: COUNT },
    ]);

    await t.mutation(api.formResults.remove, { id });
    expect(await t.query(api.formResults.get, { formId })).toEqual([]);

    await drainScheduled(t);
    const logs = await t.run((ctx) => ctx.db.query("logs").collect());
    expect(logs.map((log) => log.type)).toEqual(["create", "update", "delete"]);
  });

  it("exige `editForms` para crear, cambiar y borrar", async () => {
    const id = await t.mutation(api.formResults.create, {
      formId,
      name: "Horas",
      config: SUM,
    });

    authState.userId = s.roleHolderId;
    await grant(t, s.roleId, "viewResponses");
    const denied = formResultsErrors.insufficientPermissions;
    await expect(
      t.mutation(api.formResults.create, {
        formId,
        name: "Otro",
        config: COUNT,
      }),
    ).rejects.toThrow(denied);
    await expect(
      t.mutation(api.formResults.update, { id, name: "Otro", config: COUNT }),
    ).rejects.toThrow(denied);
    await expect(t.mutation(api.formResults.remove, { id })).rejects.toThrow(
      denied,
    );

    await grant(t, s.roleId, "editForms");
    await t.mutation(api.formResults.update, {
      id,
      name: "Otro",
      config: COUNT,
    });
  });

  it("no deja a alguien de otro proyecto tocar un resultado", async () => {
    const id = await t.mutation(api.formResults.create, {
      formId,
      name: "Horas",
      config: SUM,
    });
    authState.userId = s.outsiderId;
    await expect(t.mutation(api.formResults.remove, { id })).rejects.toThrow();
    expect(await t.query(api.formResults.get, { formId })).toBeNull();
    expect(
      await t.query(api.formResults.compute, { formId, ...RANGE }),
    ).toBeNull();
  });

  it("rechaza sin sesión", async () => {
    authState.userId = null;
    await expect(
      t.mutation(api.formResults.create, {
        formId,
        name: "Horas",
        config: SUM,
      }),
    ).rejects.toThrow(formResultsErrors.userNotAuthenticated);
  });

  it("rechaza lo que no cuadra con los campos del formato", async () => {
    await expect(
      t.mutation(api.formResults.create, {
        formId,
        name: "Suma de un texto",
        config: {
          type: "indicator",
          measure: { operation: "sum", fieldId: "turno" },
        },
      }),
    ).rejects.toThrow(RESULT_PROBLEMS.measureField);
    await expect(
      t.mutation(api.formResults.create, {
        formId,
        name: "Vencimientos",
        config: { type: "expirations", dateFieldIds: ["horas"] },
      }),
    ).rejects.toThrow(RESULT_PROBLEMS.typeNotAllowed);
    await expect(
      t.mutation(api.formResults.create, { formId, name: "x", config: SUM }),
    ).rejects.toThrow();
  });

  it("tiene un tope de resultados por formato", async () => {
    for (let index = 0; index < RESULT_LIMITS.maxPerForm; index++) {
      await t.mutation(api.formResults.create, {
        formId,
        name: `Resultado ${index}`,
        config: COUNT,
      });
    }
    await expect(
      t.mutation(api.formResults.create, {
        formId,
        name: "Uno más",
        config: COUNT,
      }),
    ).rejects.toThrow(formResultsErrors.tooManyResults);
  });
});

describe("formResults.compute", () => {
  it("calcula sobre las respuestas del rango, sin las anuladas", async () => {
    await t.mutation(api.formResults.create, {
      formId,
      name: "Horas",
      config: SUM,
    });
    await respond(8, "2020-03-01");
    await respond(6, "2020-03-02");
    await respond(100, "2020-03-03", "voided" as never);
    await respond(50, "2021-01-01");

    const computed = await t.query(api.formResults.compute, {
      formId,
      ...RANGE,
    });
    expect(computed?.capped).toBe(false);
    expect(computed?.results).toHaveLength(1);
    expect(computed?.results[0].problem).toBeNull();
    expect(computed?.results[0].data).toMatchObject({
      type: "indicator",
      value: 14,
    });
  });

  it("es de quien ve las respuestas de todos", async () => {
    await t.mutation(api.formResults.create, {
      formId,
      name: "Horas",
      config: SUM,
    });
    authState.userId = s.roleHolderId;
    await grant(t, s.roleId, "fillForms");
    expect(
      await t.query(api.formResults.compute, { formId, ...RANGE }),
    ).toBeNull();
    await grant(t, s.roleId, "viewResponses");
    expect(
      await t.query(api.formResults.compute, { formId, ...RANGE }),
    ).not.toBeNull();
  });

  it("devuelve `null` con un rango que no es un rango", async () => {
    const bad = (range: Partial<typeof RANGE>) =>
      t.query(api.formResults.compute, { formId, ...RANGE, ...range });
    expect(await bad({ from: "ayer" })).toBeNull();
    expect(await bad({ from: "2020-12-31", to: "2020-01-01" })).toBeNull();
    expect(await bad({ from: "2015-01-01" })).toBeNull();
  });

  it("dice que un resultado quedó sin su campo, en vez de dar un cero", async () => {
    await t.mutation(api.formResults.create, {
      formId,
      name: "Horas",
      config: SUM,
    });
    await t.run(async (ctx) => {
      const form = await ctx.db.get(formId);
      if (!form?.publishedVersionId) throw new Error("sin versión");
      await ctx.db.patch(form.publishedVersionId, {
        sections: oneSection(
          selectField("turno", ["Día", "Noche"], { label: "Turno" }),
        ) as never,
      });
    });
    const computed = await t.query(api.formResults.compute, {
      formId,
      ...RANGE,
    });
    expect(computed?.results[0].problem).toBe(RESULT_PROBLEMS.measureField);
  });
  it("compara con el periodo anterior, de igual largo", async () => {
    await respond(8, "2020-03-10");
    await respond(6, "2020-03-12");
    // La semana de antes.
    await respond(4, "2020-03-03");
    await t.mutation(api.formResults.create, {
      formId,
      name: "Horas",
      config: { ...SUM, compare: true },
    });
    const computed = await t.query(api.formResults.compute, {
      formId,
      from: "2020-03-09",
      to: "2020-03-15",
      today: "2020-03-15",
    });
    expect(computed?.results[0].data).toMatchObject({ value: 14, previous: 4 });
  });

  it("arma una cifra con indicadores de dos formatos", async () => {
    const other = await seedForm(t, {
      projectId: s.projectId,
      createdBy: s.ownerId,
      sections: SECTIONS,
      name: "Control de ausentismo",
    });
    await respond(100, "2020-03-10");
    await t.run(async (ctx) => {
      const form = await ctx.db.get(other.formId);
      if (!form?.publishedVersionId) throw new Error("sin versión");
      await ctx.db.insert("formResponses", {
        formId: other.formId,
        projectId: s.projectId,
        versionId: form.publishedVersionId,
        date: "2020-03-11",
        submittedBy: s.ownerId,
        status: "submitted",
        values: stored(SECTIONS, { horas: 5 }),
      });
    });
    const hht = await t.mutation(api.formResults.create, {
      formId,
      name: "HHT",
      config: SUM,
    });
    const absences = await t.mutation(api.formResults.create, {
      formId: other.formId,
      name: "Ausencias",
      config: SUM,
    });
    const rate = await t.mutation(api.formResults.create, {
      formId,
      name: "Tasa",
      config: {
        type: "composite",
        terms: [
          { type: "result", resultId: absences },
          { type: "op", op: "/" },
          { type: "result", resultId: hht },
          { type: "op", op: "*" },
          { type: "const", value: 100 },
        ],
      },
    });

    const computed = await t.query(api.formResults.compute, {
      formId,
      ...RANGE,
    });
    const composite = computed?.results.find((one) => one._id === rate);
    expect(composite?.problem).toBeNull();
    expect(composite?.data).toMatchObject({
      type: "composite",
      value: 5,
      parts: [
        { name: "Ausencias", formName: "Control de ausentismo", value: 5 },
        { name: "HHT", value: 100 },
      ],
    });

    // Borrado uno de sus indicadores, lo dice en vez de dar una cifra.
    await t.mutation(api.formResults.remove, { id: absences });
    const after = await t.query(api.formResults.compute, { formId, ...RANGE });
    const broken = after?.results.find((one) => one._id === rate);
    expect(broken?.problem).toBe(RESULT_PROBLEMS.compositeMissing);
    expect(broken?.data).toMatchObject({ value: null });
  });

  it("una cifra compuesta no acepta lo que no es un indicador del proyecto", async () => {
    const trend = await t.mutation(api.formResults.create, {
      formId,
      name: "Por semana",
      config: { type: "trend", measure: SUM.measure, interval: "week" },
    });
    for (const resultId of [trend, "no-es-un-id"]) {
      await expect(
        t.mutation(api.formResults.create, {
          formId,
          name: "Tasa",
          config: { type: "composite", terms: [{ type: "result", resultId }] },
        }),
      ).rejects.toThrow(RESULT_PROBLEMS.compositeMissing);
    }
  });

  it("ofrece los indicadores del proyecto a quien ve las respuestas", async () => {
    await t.mutation(api.formResults.create, {
      formId,
      name: "Horas",
      config: SUM,
    });
    expect(await t.query(api.formResults.indicators, { formId })).toMatchObject(
      [{ name: "Horas", formName: "Inspección preoperacional" }],
    );
    authState.userId = s.plainId;
    expect(await t.query(api.formResults.indicators, { formId })).toBeNull();
  });
});

describe("dashboards", () => {
  const tabsWith = (resultId: Id<"formResults">) => [
    {
      id: "general",
      label: "  General ",
      widgets: [{ id: "w1", resultId, size: "half" as const }],
    },
  ];

  it("guarda el tablero y lo devuelve con lo que cada resultado es", async () => {
    const resultId = await t.mutation(api.formResults.create, {
      formId,
      name: "Horas",
      config: SUM,
    });
    expect(
      await t.query(api.dashboards.get, { projectId: s.projectId }),
    ).toEqual({ tabs: [], canEdit: true });

    await t.mutation(api.dashboards.save, {
      projectId: s.projectId,
      tabs: tabsWith(resultId),
    });
    // Guardar otra vez lo reemplaza: hay un tablero por proyecto.
    await t.mutation(api.dashboards.save, {
      projectId: s.projectId,
      tabs: tabsWith(resultId),
    });
    expect(
      await t.run((ctx) => ctx.db.query("dashboards").collect()),
    ).toHaveLength(1);

    const dashboard = await t.query(api.dashboards.get, {
      projectId: s.projectId,
    });
    expect(dashboard?.tabs).toEqual([
      {
        id: "general",
        label: "General",
        widgets: [
          {
            id: "w1",
            size: "half",
            resultId,
            name: "Horas",
            type: "indicator",
            formId,
            formName: "Inspección preoperacional",
          },
        ],
      },
    ]);
  });

  it("lo ve quien ve las respuestas y lo arma quien edita el proyecto", async () => {
    const resultId = await t.mutation(api.formResults.create, {
      formId,
      name: "Horas",
      config: SUM,
    });
    const save = () =>
      t.mutation(api.dashboards.save, {
        projectId: s.projectId,
        tabs: tabsWith(resultId),
      });

    authState.userId = s.plainId;
    expect(
      await t.query(api.dashboards.get, { projectId: s.projectId }),
    ).toBeNull();

    authState.userId = s.roleHolderId;
    await grant(t, s.roleId, "viewResponses");
    expect(
      await t.query(api.dashboards.get, { projectId: s.projectId }),
    ).toEqual({ tabs: [], canEdit: false });
    await expect(save()).rejects.toThrow(
      dashboardsErrors.insufficientPermissions,
    );

    await grant(t, s.roleId, "viewResponses", "editProject");
    await save();

    authState.userId = null;
    await expect(save()).rejects.toThrow(dashboardsErrors.userNotAuthenticated);
  });

  it("no acepta un resultado de otro proyecto, ni ids repetidos", async () => {
    const resultId = await t.mutation(api.formResults.create, {
      formId,
      name: "Horas",
      config: SUM,
    });
    const foreign = await seedForm(t, {
      projectId: s.otherProjectId,
      createdBy: s.outsiderId,
      sections: SECTIONS,
    });
    const foreignResultId = await t.run((ctx) =>
      ctx.db.insert("formResults", {
        projectId: s.otherProjectId,
        formId: foreign.formId,
        name: "Ajeno",
        config: COUNT,
        createdBy: s.outsiderId,
      }),
    );

    await expect(
      t.mutation(api.dashboards.save, {
        projectId: s.projectId,
        tabs: tabsWith(foreignResultId),
      }),
    ).rejects.toThrow(dashboardsErrors.resultNotFound);
    await expect(
      t.mutation(api.dashboards.save, {
        projectId: s.projectId,
        tabs: [...tabsWith(resultId), ...tabsWith(resultId)],
      }),
    ).rejects.toThrow(dashboardsErrors.duplicateId);
    await expect(
      t.mutation(api.dashboards.save, { projectId: s.projectId, tabs: [] }),
    ).rejects.toThrow(dashboardsErrors.invalidTabs);
  });

  it("deja de mostrar un resultado que se borró", async () => {
    const resultId = await t.mutation(api.formResults.create, {
      formId,
      name: "Horas",
      config: SUM,
    });
    await t.mutation(api.dashboards.save, {
      projectId: s.projectId,
      tabs: tabsWith(resultId),
    });
    await t.mutation(api.formResults.remove, { id: resultId });
    const dashboard = await t.query(api.dashboards.get, {
      projectId: s.projectId,
    });
    expect(dashboard?.tabs[0].widgets).toEqual([]);
  });
});

describe("resultados y tablero: lo que se borra con lo demás", () => {
  it("borrar el formato se lleva sus resultados", async () => {
    await t.mutation(api.formResults.create, {
      formId,
      name: "Horas",
      config: SUM,
    });
    await t.mutation(api.forms.remove, { id: formId });
    await drainScheduled(t);
    expect(await t.run((ctx) => ctx.db.query("formResults").collect())).toEqual(
      [],
    );
  });

  it("purgar el proyecto se lleva resultados y tablero", async () => {
    const resultId = await t.mutation(api.formResults.create, {
      formId,
      name: "Horas",
      config: SUM,
    });
    await t.mutation(api.dashboards.save, {
      projectId: s.projectId,
      tabs: [
        { id: "a", label: "A", widgets: [{ id: "w", resultId, size: "full" }] },
      ],
    });
    await t.mutation(internal.projects.purgeProjectData, {
      projectId: s.projectId,
    });
    await drainScheduled(t);
    const left = await t.run(async (ctx) => ({
      results: await ctx.db.query("formResults").collect(),
      dashboards: await ctx.db.query("dashboards").collect(),
    }));
    expect(left).toEqual({ results: [], dashboards: [] });
  });
});

describe("formLibrary.installSst: resultados y tablero", () => {
  it("instala los resultados y el tablero, y no los repite", async () => {
    const first = await t.mutation(internal.formLibrary.installSst, {
      projectId: s.projectId,
    });
    expect(first.results).toEqual({
      created: SST_RESULTS.length,
      dashboard: true,
    });

    const dashboard = await t.query(api.dashboards.get, {
      projectId: s.projectId,
    });
    expect(dashboard?.tabs.map((tab) => tab.label)).toEqual(
      SST_DASHBOARD.map((tab) => tab.label),
    );
    expect(dashboard?.tabs.map((tab) => tab.widgets.length)).toEqual(
      SST_DASHBOARD.map((tab) => tab.widgets.length),
    );

    const again = await t.mutation(internal.formLibrary.installSst, {
      projectId: s.projectId,
    });
    expect(again.results).toEqual({ created: 0, dashboard: false });
  });
});
