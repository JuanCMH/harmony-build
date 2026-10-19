import { describe, expect, it } from "vitest";
import { bucketsBetween, fitBucket } from "../date_buckets";
import { sparkInterval } from "../result_compute";
import type { ChecklistConfig, FormField, VisibilityRule } from "../form_types";
import {
  type ComputedResponse,
  applyOperation,
  computeResult,
  evaluateTerms,
} from "../result_compute";
import { RESULT_PROBLEMS, resultProblem } from "../result_definition";
import type { MeasureTerm, ResultConfig } from "../result_types";
import { field, referenceField, selectField } from "./form.fixtures";

/** La inspección de un vehículo: quién, cuánto marca y cómo está. */
const CHECKLIST: ChecklistConfig = {
  options: [
    { value: "b", label: "Bueno", short: "B", meaning: "ok" },
    { value: "m", label: "Malo", short: "M", meaning: "fail" },
    { value: "na", label: "No aplica", short: "N.A", meaning: "na" },
  ],
  blocks: [
    {
      id: "luces",
      label: "Luces",
      items: [
        { id: "altas", label: "Altas" },
        { id: "reversa", label: "De reversa" },
        { id: "stop", label: "Stop" },
      ],
    },
  ],
  note: "onFail",
};

const FIELDS: FormField[] = [
  referenceField("vehiculo", "vehiculos", [], { label: "Vehículo" }),
  selectField("turno", ["dia", "noche"], { label: "Turno" }),
  field("km", { type: "number", label: "Kilometraje" }),
  field("horas", { type: "number", label: "Horas" }),
  field("estado", {
    type: "checklist",
    label: "Estado",
    config: { checklist: CHECKLIST },
  }),
];

const vehicle = (id: string) => ({ responseId: id, label: id, snapshot: [] });
const answers = (altas: string, reversa: string, stop: string) => [
  { itemId: "altas", value: altas },
  { itemId: "reversa", value: reversa },
  { itemId: "stop", value: stop },
];

/** Una semana de inspecciones de dos vehículos, del lunes 28 de septiembre. */
const RESPONSES: ComputedResponse[] = [
  {
    date: "2026-09-28",
    values: {
      vehiculo: vehicle("SLP-835"),
      turno: "dia",
      km: 100,
      horas: 8,
      estado: answers("b", "b", "b"),
    },
  },
  {
    date: "2026-09-28",
    values: {
      vehiculo: vehicle("TRK-204"),
      turno: "noche",
      km: 40,
      horas: 6,
      estado: answers("b", "m", "na"),
    },
  },
  {
    date: "2026-09-29",
    values: {
      vehiculo: vehicle("SLP-835"),
      turno: "dia",
      km: 180,
      horas: 9,
      estado: answers("m", "m", "b"),
    },
  },
  {
    date: "2026-10-01",
    values: {
      vehiculo: vehicle("SLP-835"),
      turno: "dia",
      km: 250,
      estado: answers("b", "b", "b"),
    },
  },
];

const input = {
  fields: FIELDS,
  responses: RESPONSES,
  range: { from: "2026-09-28", to: "2026-10-04" },
  today: "2026-10-04",
};

describe("applyOperation", () => {
  it("sin valores sólo contar y sumar dan cero", () => {
    expect(applyOperation("count", [], 0)).toBe(0);
    expect(applyOperation("sum", [], 3)).toBe(0);
    for (const operation of ["average", "last", "min", "max"] as const) {
      expect(applyOperation(operation, [], 3)).toBeNull();
    }
  });

  it("el último es el del final, no el mayor", () => {
    expect(applyOperation("last", [250, 100], 2)).toBe(100);
    expect(applyOperation("average", [8, 6, 9], 3)).toBeCloseTo(7.667, 3);
  });
});

describe("intervalos", () => {
  it("la semana empieza en lunes y el mes en su día 1", () => {
    expect(bucketsBetween("week", "2026-09-30", "2026-10-12")).toEqual([
      "2026-09-28",
      "2026-10-05",
      "2026-10-12",
    ]);
    expect(bucketsBetween("month", "2026-09-30", "2026-11-02")).toEqual([
      "2026-09-01",
      "2026-10-01",
      "2026-11-01",
    ]);
  });

  it("un año por días se ensancha hasta que se lee", () => {
    expect(fitBucket("day", "2026-01-01", "2026-12-31", 62)).toBe("week");
    expect(fitBucket("day", "2026-10-01", "2026-10-31", 62)).toBe("day");
  });

  it("con menos de tres puntos se afina: treinta días no van por meses", () => {
    expect(fitBucket("month", "2026-09-15", "2026-10-14", 62)).toBe("week");
    expect(fitBucket("week", "2026-10-08", "2026-10-14", 62)).toBe("day");
    expect(fitBucket("month", "2026-01-01", "2026-06-30", 62)).toBe("month");
    // Un día no se afina más.
    expect(fitBucket("day", "2026-10-14", "2026-10-14", 62)).toBe("day");
  });

  it("las mini columnas de un formato semanal van por semanas", () => {
    const range = { from: "2026-09-15", to: "2026-10-14" };
    const on = (...dates: string[]) =>
      dates.map((date) => ({ date, values: {} }));
    // Un informe de horas cada lunes: cuatro días en cinco semanas.
    expect(
      sparkInterval(
        on("2026-09-21", "2026-09-28", "2026-10-05", "2026-10-12"),
        range,
      ),
    ).toBe("week");
    // Una inspección casi a diario.
    expect(
      sparkInterval(
        on(...bucketsBetween("day", "2026-09-15", "2026-09-25")),
        range,
      ),
    ).toBe("day");
    // Sin respuestas no hay ritmo que seguir.
    expect(sparkInterval([], range)).toBe("day");
  });
});

describe("computeResult", () => {
  it("indicador: cuenta respuestas o resume un campo", () => {
    expect(
      computeResult(
        { type: "indicator", measure: { operation: "count" } },
        input,
      ),
    ).toMatchObject({ type: "indicator", value: 4, responses: 4 });
    expect(
      computeResult(
        { type: "indicator", measure: { operation: "last", fieldId: "km" } },
        input,
      ),
    ).toMatchObject({ value: 250 });
  });

  it("indicador: lleva la misma cifra repartida por día del rango", () => {
    const data = computeResult(
      { type: "indicator", measure: { operation: "count" } },
      input,
    );
    if (data.type !== "indicator") throw new Error("tipo");
    expect(data.interval).toBe("day");
    expect(
      data.points.reduce((sum, point) => sum + (point.value ?? 0), 0),
    ).toBe(4);
  });

  it("tendencia: un punto por día del rango, también los vacíos", () => {
    const data = computeResult(
      {
        type: "trend",
        interval: "day",
        measure: { operation: "sum", fieldId: "horas" },
      },
      input,
    );
    if (data.type !== "trend") throw new Error("tipo");
    expect(data.points.map((point) => point.value)).toEqual([
      14, 9, 0, 0, 0, 0, 0,
    ]);
    expect(data.total).toBe(23);
  });

  it("distribución: por opción de una lista, con su etiqueta, de mayor a menor", () => {
    expect(
      computeResult(
        {
          type: "distribution",
          byFieldId: "turno",
          measure: { operation: "count" },
        },
        input,
      ),
    ).toEqual({
      type: "distribution",
      rows: [
        { key: "dia", label: "dia", value: 3 },
        { key: "noche", label: "noche", value: 1 },
      ],
      others: 0,
    });
  });

  it("tabla: una fila por elemento, varias medidas y su total", () => {
    const data = computeResult(
      {
        type: "table",
        byFieldId: "vehiculo",
        measures: [{ operation: "count" }, { operation: "max", fieldId: "km" }],
      },
      input,
    );
    expect(data).toEqual({
      type: "table",
      groupLabel: "Vehículo",
      columns: [
        { operation: "count", fieldLabel: null },
        { operation: "max", fieldLabel: "Kilometraje" },
      ],
      rows: [
        { key: "SLP-835", label: "SLP-835", values: [3, 250] },
        { key: "TRK-204", label: "TRK-204", values: [1, 40] },
      ],
      totals: [4, 250],
    });
  });

  it("cumplimiento: conformes sobre respondidos; «no aplica» no cuenta", () => {
    const data = computeResult(
      { type: "compliance", checklistFieldId: "estado", interval: "week" },
      // Tres semanas: con una sola, la línea se afinaría a días.
      { ...input, range: { from: "2026-09-14", to: "2026-10-04" } },
    );
    if (data.type !== "compliance") throw new Error("tipo");
    // 8 conformes y 3 no conformes; el «no aplica» queda fuera.
    expect(data.points).toEqual([
      { key: "2026-09-14", ok: 0, fail: 0, percent: null },
      { key: "2026-09-21", ok: 0, fail: 0, percent: null },
      { key: "2026-09-28", ok: 8, fail: 3, percent: (8 / 11) * 100 },
    ]);
    expect(data.responses).toBe(4);
  });

  it("hallazgos: los ítems que más fallan, con su nombre", () => {
    expect(
      computeResult({ type: "findings", checklistFieldId: "estado" }, input),
    ).toEqual({
      type: "findings",
      rows: [
        { itemId: "reversa", label: "De reversa", count: 2 },
        { itemId: "altas", label: "Altas", count: 1 },
      ],
      total: 3,
      responses: 4,
    });
  });

  it("mapa de calor: elemento por día, y vacío donde no hubo inspección", () => {
    const data = computeResult(
      {
        type: "heatmap",
        rowFieldId: "vehiculo",
        value: "failures",
        valueFieldId: "estado",
      },
      input,
    );
    if (data.type !== "heatmap") throw new Error("tipo");
    expect(data.interval).toBe("day");
    expect(data.columns).toHaveLength(7);
    expect(data.rows).toEqual([
      {
        key: "SLP-835",
        label: "SLP-835",
        cells: [0, 2, null, 0, null, null, null],
      },
      {
        key: "TRK-204",
        label: "TRK-204",
        cells: [1, null, null, null, null, null, null],
      },
    ]);
    expect(data.max).toBe(2);
  });

  it("vencimientos: lo más próximo primero, y lo vencido en negativo", () => {
    const data = computeResult(
      { type: "expirations", dateFieldIds: ["soat", "rtm"] },
      {
        ...input,
        fields: [
          field("soat", { type: "date", label: "Vigencia del SOAT" }),
          field("rtm", { type: "date", label: "Vigencia de la revisión" }),
        ],
        entries: [
          {
            id: "a",
            title: "SLP-835",
            values: { soat: "2026-10-09", rtm: "2027-03-01" },
          },
          {
            id: "b",
            title: "TRK-204",
            values: { soat: "2026-09-30", rtm: "" },
          },
        ],
      },
    );
    if (data.type !== "expirations") throw new Error("tipo");
    expect(
      data.rows.map((row) => [row.title, row.fieldLabel, row.daysLeft]),
    ).toEqual([
      ["TRK-204", "Vigencia del SOAT", -4],
      ["SLP-835", "Vigencia del SOAT", 5],
      ["SLP-835", "Vigencia de la revisión", 148],
    ]);
    expect(data).toMatchObject({ expired: 1, soon: 1 });
  });
  it("fórmula: una cuenta entre agregados, con la precedencia de siempre", () => {
    const formula = (terms: MeasureTerm[]) =>
      computeResult(
        { type: "indicator", measure: { operation: "formula", terms } },
        input,
      );
    // 23 horas entre 4 respuestas.
    expect(
      formula([
        { type: "agg", operation: "sum", fieldId: "horas" },
        { type: "op", op: "/" },
        { type: "agg", operation: "count" },
      ]),
    ).toMatchObject({ value: 5.75 });
    // 570 − 23 × 10: la multiplicación va antes.
    expect(
      formula([
        { type: "agg", operation: "sum", fieldId: "km" },
        { type: "op", op: "-" },
        { type: "agg", operation: "sum", fieldId: "horas" },
        { type: "op", op: "*" },
        { type: "const", value: 10 },
      ]),
    ).toMatchObject({ value: 340 });
  });

  it("fórmula: dividir por cero o por nada no es cero", () => {
    expect(
      computeResult(
        {
          type: "indicator",
          measure: {
            operation: "formula",
            terms: [
              { type: "agg", operation: "sum", fieldId: "horas" },
              { type: "op", op: "/" },
              { type: "agg", operation: "count" },
            ],
          },
        },
        { ...input, responses: [] },
      ),
    ).toMatchObject({ value: null });
  });

  it("condiciones: sólo entran las respuestas que las cumplen todas", () => {
    const counted = (filters: VisibilityRule[]) =>
      computeResult(
        { type: "indicator", measure: { operation: "count" }, filters },
        input,
      );
    expect(
      counted([{ fieldId: "turno", operator: "eq", values: ["noche"] }]),
    ).toMatchObject({ value: 1 });
    // Una relación se compara por el elemento elegido.
    expect(
      counted([{ fieldId: "vehiculo", operator: "eq", values: ["SLP-835"] }]),
    ).toMatchObject({ value: 3 });
    expect(
      counted([
        { fieldId: "vehiculo", operator: "eq", values: ["SLP-835"] },
        { fieldId: "km", operator: "gt", values: ["150"] },
      ]),
    ).toMatchObject({ value: 2 });
  });

  it("comparación: la cifra del periodo anterior, con las mismas condiciones", () => {
    const config = {
      type: "indicator",
      measure: { operation: "count" },
      compare: true,
      filters: [{ fieldId: "turno", operator: "eq", values: ["dia"] }],
    } as const satisfies ResultConfig;
    expect(
      computeResult(config, { ...input, previous: RESPONSES.slice(0, 2) }),
    ).toMatchObject({ value: 3, previous: 1 });
    // Sin el periodo anterior entero no se compara.
    expect(computeResult(config, input)).toMatchObject({ previous: null });
  });

  it("tendencia: las demás series, punto a punto", () => {
    const data = computeResult(
      {
        type: "trend",
        interval: "week",
        measure: { operation: "sum", fieldId: "horas" },
        series: [{ operation: "count" }],
      },
      { ...input, range: { from: "2026-09-14", to: "2026-10-04" } },
    );
    if (data.type !== "trend") throw new Error("tipo");
    expect(data.total).toBe(23);
    expect(data.extra).toEqual([
      {
        points: [
          { key: "2026-09-14", value: 0 },
          { key: "2026-09-21", value: 0 },
          { key: "2026-09-28", value: 4 },
        ],
        total: 4,
      },
    ]);
  });

  it("tendencia: una semana por semanas sería un punto, y se afina a días", () => {
    const data = computeResult(
      { type: "trend", interval: "week", measure: { operation: "count" } },
      input,
    );
    if (data.type !== "trend") throw new Error("tipo");
    expect(data.interval).toBe("day");
    expect(data.points).toHaveLength(7);
  });

  it("cifra compuesta: una cuenta entre indicadores ya calculados", () => {
    const config = {
      type: "composite",
      terms: [
        { type: "result", resultId: "ausencias" },
        { type: "op", op: "/" },
        { type: "result", resultId: "hht" },
        { type: "op", op: "*" },
        { type: "const", value: 100 },
      ],
    } as const satisfies ResultConfig;
    const indicators = new Map([
      [
        "ausencias",
        { name: "Días de ausencia", formName: "Ausentismo", value: 6 },
      ],
      ["hht", { name: "HHT", formName: "Horas", value: 1200 }],
    ]);
    const data = computeResult(config, { ...input, indicators });
    expect(data).toMatchObject({ type: "composite", value: 0.5 });
    // Un indicador que ya no está deja la cifra sin valor.
    expect(
      computeResult(config, {
        ...input,
        indicators: new Map([...indicators].slice(0, 1)),
      }),
    ).toMatchObject({ value: null });
  });
});

describe("evaluateTerms", () => {
  it("no calcula con una cifra que falta", () => {
    expect(
      evaluateTerms([
        { type: "num", value: 4 },
        { type: "op", op: "+" },
        { type: "num", value: null },
      ]),
    ).toBeNull();
  });
});

describe("resultProblem", () => {
  const measure = (terms: MeasureTerm[]) =>
    resultProblem(
      { type: "indicator", measure: { operation: "formula", terms } },
      "record",
      FIELDS,
    );

  it("una fórmula alterna cifras y operadores", () => {
    expect(
      measure([
        { type: "agg", operation: "sum", fieldId: "horas" },
        { type: "op", op: "/" },
      ]),
    ).toBe(RESULT_PROBLEMS.formula);
    expect(measure([{ type: "agg", operation: "sum", fieldId: "turno" }])).toBe(
      RESULT_PROBLEMS.measureField,
    );
    expect(
      measure([
        { type: "agg", operation: "sum", fieldId: "horas" },
        { type: "op", op: "/" },
        { type: "agg", operation: "count" },
      ]),
    ).toBeNull();
  });

  it("una condición pide un campo del formato y un valor", () => {
    const filtered = (filters: VisibilityRule[]) =>
      resultProblem(
        { type: "indicator", measure: { operation: "count" }, filters },
        "record",
        FIELDS,
      );
    expect(
      filtered([{ fieldId: "ya-no", operator: "eq", values: ["x"] }]),
    ).toBe(RESULT_PROBLEMS.filterField);
    expect(filtered([{ fieldId: "turno", operator: "eq", values: [] }])).toBe(
      RESULT_PROBLEMS.filterValue,
    );
    expect(
      filtered([{ fieldId: "turno", operator: "isNotEmpty", values: [] }]),
    ).toBeNull();
  });

  it("una cifra compuesta pide al menos un indicador", () => {
    expect(
      resultProblem(
        { type: "composite", terms: [{ type: "const", value: 1 }] },
        "record",
        FIELDS,
      ),
    ).toBe(RESULT_PROBLEMS.compositeResults);
    // Y no cabe en un listado.
    expect(
      resultProblem(
        { type: "composite", terms: [{ type: "result", resultId: "a" }] },
        "catalog",
        FIELDS,
      ),
    ).toBe(RESULT_PROBLEMS.typeNotAllowed);
  });
});
