import { beforeEach, describe, expect, it, vi } from "vitest";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import {
  checklistField,
  field,
  oneSection,
  selectField,
} from "../lib/__tests__/form.fixtures";
import type { FormSection, FormValues } from "../lib/form_types";
import { DIGEST_VERSION } from "../lib/response_digest";
import type { ResultConfig } from "../lib/result_types";
import {
  drainScheduled,
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
  return { ...actual, getAuthUserId: async () => authState.userId };
});

const SECTIONS: FormSection[] = oneSection(
  selectField("turno", ["Día", "Noche"], { label: "Turno" }),
  field("horas", { type: "number", label: "Horas" }),
  field("nota", { type: "textarea", label: "Nota" }),
  checklistField("revision", { label: "Revisión" }, { note: "optional" }),
);

/** Uno de cada clase de cálculo: lo que sale de los resúmenes tiene que ser
 *  lo mismo que sale de leer las respuestas. */
const RESULTS: ResultConfig[] = [
  { type: "indicator", measure: { operation: "sum", fieldId: "horas" } },
  { type: "indicator", measure: { operation: "average", fieldId: "horas" } },
  {
    type: "indicator",
    measure: { operation: "count" },
    filters: [{ fieldId: "turno", operator: "eq", values: ["Noche"] }],
  },
  {
    type: "distribution",
    byFieldId: "turno",
    measure: { operation: "sum", fieldId: "horas" },
  },
  { type: "compliance", checklistFieldId: "revision", interval: "month" },
  { type: "findings", checklistFieldId: "revision" },
  {
    type: "table",
    byFieldId: "turno",
    measures: [
      { operation: "count" },
      { operation: "max", fieldId: "horas" },
      { operation: "last", fieldId: "horas" },
    ],
  },
];

const RANGE = { from: "2025-01-01", to: "2025-12-31", today: "2026-01-15" };

let t: TestConvex;
let s: Seed;
let formId: Id<"forms">;

const answer = (index: number): FormValues => ({
  turno: index % 3 === 0 ? "Noche" : "Día",
  horas: 4 + (index % 5),
  nota: "Texto largo que ningún resultado mira",
  revision: [
    { itemId: "aceite", value: index % 4 === 0 ? "m" : "b" },
    { itemId: "altas", value: index % 7 === 0 ? "m" : "b" },
    { itemId: "medias", value: "na" },
  ],
});

/** Importa `count` respuestas repartidas por el año, en lotes. */
async function importYear(count: number) {
  const importId = await t.mutation(api.formImports.start, {
    formId,
    fileName: "historia.xlsx",
    fingerprint: "abc",
    mode: "add",
    total: count,
  });
  for (let from = 0; from < count; from += 50) {
    await t.mutation(api.formImports.writeBatch, {
      importId,
      rows: Array.from({ length: Math.min(50, count - from) }, (_, offset) => {
        const index = from + offset;
        const day = String(1 + (index % 28)).padStart(2, "0");
        const month = String(1 + (Math.floor(index / 28) % 12)).padStart(2, "0");
        return {
          row: index + 2,
          date: `2025-${month}-${day}`,
          values: stored(SECTIONS, answer(index)),
        };
      }),
    });
  }
  await t.mutation(api.formImports.finish, { importId });
  return importId;
}

const compute = () => t.query(api.formResults.compute, { formId, ...RANGE });

const digests = () =>
  t.run((ctx) =>
    ctx.db
      .query("formDayDigests")
      .withIndex("formId_date", (q) => q.eq("formId", formId))
      .collect(),
  );

const versionOf = () =>
  t.run(async (ctx) => (await ctx.db.get(formId))?.digestVersion);

beforeEach(async () => {
  t = setupTest();
  s = await seedProject(t);
  ({ formId } = await seedForm(t, {
    projectId: s.projectId,
    createdBy: s.ownerId,
    sections: SECTIONS,
  }));
  authState.userId = s.ownerId;
  for (const [index, config] of RESULTS.entries()) {
    await t.mutation(api.formResults.create, {
      formId,
      name: `Resultado ${index}`,
      config,
    });
  }
});

describe("resúmenes diarios", () => {
  it("calculan un año de 700 respuestas entero, sin tope", async () => {
    await importYear(700);
    expect(await versionOf()).toBe(DIGEST_VERSION);

    const computed = await compute();
    expect(computed?.capped).toBe(false);
    const [sum, , night] = computed?.results ?? [];
    expect(sum.data).toMatchObject({
      type: "indicator",
      responses: 700,
      value: Array.from({ length: 700 }, (_, i) => 4 + (i % 5)).reduce(
        (a, b) => a + b,
        0,
      ),
    });
    expect(night.data).toMatchObject({ responses: 234 });
  });

  it("dan lo mismo que leer las respuestas", async () => {
    await importYear(280);
    const fromDigests = await compute();

    // Sin la marca, el cálculo vuelve a leer las respuestas enteras.
    await t.run((ctx) => ctx.db.patch(formId, { digestVersion: undefined }));
    const fromResponses = await compute();

    expect(fromDigests?.capped).toBe(false);
    expect(fromDigests?.results.map((result) => result.data)).toEqual(
      fromResponses?.results.map((result) => result.data),
    );
  });

  it("no guardan lo que ningún resultado mira", async () => {
    await importYear(1);
    const [day] = await digests();
    expect(day.rows[0].values).toEqual([
      { fieldId: "turno", value: { kind: "text", value: "Noche" } },
      { fieldId: "horas", value: { kind: "number", value: 4 } },
      {
        fieldId: "revision",
        value: { kind: "tally", ok: 0, failed: ["aceite", "altas"] },
      },
    ]);
  });

  it("siguen a la respuesta: diligenciar suma y anular resta", async () => {
    const id = await t.mutation(api.formResponses.submit, {
      formId,
      values: stored(SECTIONS, answer(1)),
    });
    await t.mutation(api.formResponses.submit, {
      formId,
      values: stored(SECTIONS, answer(2)),
    });
    expect((await digests()).map((day) => day.rows.length)).toEqual([2]);
    expect(await versionOf()).toBe(DIGEST_VERSION);

    await t.mutation(api.formResponses.void, {
      id,
      reason: "Se diligenció dos veces",
    });
    const [day] = await digests();
    expect(day.rows.map((row) => row.responseId)).not.toContain(id);
    expect(day.rows).toHaveLength(1);
    await drainScheduled(t);
  });

  it("deshacer una importación retira sus filas y deja las demás", async () => {
    await importYear(30);
    const importId = await importYear(30);
    expect(
      (await digests()).reduce((total, day) => total + day.rows.length, 0),
    ).toBe(60);

    await t.mutation(api.formImports.revert, { importId });
    await t.mutation(internal.formImports.purge, { importId });
    await drainScheduled(t);
    expect(
      (await digests()).reduce((total, day) => total + day.rows.length, 0),
    ).toBe(30);
    const [count] = (await compute())?.results ?? [];
    expect(count.data).toMatchObject({ responses: 30 });
  });
});

describe("formDigests.rebuild", () => {
  it("un formato con respuestas anteriores se calcula con tope hasta reconstruirlo", async () => {
    // Respuestas escritas antes de que existieran los resúmenes.
    await t.run(async (ctx) => {
      const form = await ctx.db.get(formId);
      if (!form?.publishedVersionId) throw new Error("sin versión");
      for (let index = 0; index < 320; index++) {
        await ctx.db.insert("formResponses", {
          formId,
          projectId: s.projectId,
          versionId: form.publishedVersionId,
          date: `2025-03-${String(1 + (index % 28)).padStart(2, "0")}`,
          submittedBy: s.ownerId,
          status: index === 0 ? "voided" : "submitted",
          values: stored(SECTIONS, answer(index)) as never,
        });
      }
      await ctx.db.patch(formId, { responseCount: 320 });
    });
    expect((await compute())?.capped).toBe(true);

    await t.mutation(internal.formDigests.rebuild, { formId });
    await drainScheduled(t);

    expect(await versionOf()).toBe(DIGEST_VERSION);
    const rebuilt = await compute();
    expect(rebuilt?.capped).toBe(false);
    // La anulada no cuenta.
    expect(rebuilt?.results[0].data).toMatchObject({ responses: 319 });

    // Idempotente: una segunda vuelta deja lo mismo.
    const before = (await digests()).map((day) => [day.date, day.rows.length]);
    await t.mutation(internal.formDigests.rebuild, { formId });
    await drainScheduled(t);
    expect(
      (await digests()).map((day) => [day.date, day.rows.length]),
    ).toEqual(before);
    expect(await versionOf()).toBe(DIGEST_VERSION);
  });

  it("la purga del proyecto se lleva los resúmenes", async () => {
    await importYear(40);
    await t.mutation(internal.projects.purgeProjectData, {
      projectId: s.projectId,
    });
    await drainScheduled(t);
    expect(await t.run((ctx) => ctx.db.query("formDayDigests").collect())).toEqual(
      [],
    );
  });
});
