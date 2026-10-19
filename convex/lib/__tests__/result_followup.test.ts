import { describe, expect, it } from "vitest";
import { weekdayOf } from "../date_buckets";
import type { FormField } from "../form_types";
import { type ComputedResponse, computeResult } from "../result_compute";
import {
  RESULT_PROBLEMS,
  resultProblem,
  resultTypesFor,
} from "../result_definition";
import type { ComputedIssue } from "../result_tracking";
import type { ResultConfig } from "../result_types";
import { field, referenceField, selectField } from "./form.fixtures";

const FIELDS: FormField[] = [
  referenceField("vehiculo", "listado", [], { label: "Vehículo" }),
  selectField("prioridad", ["alta", "baja"]),
  field("km", { type: "number", label: "Kilometraje" }),
];

const vehicle = (id: string) => ({ responseId: id, label: id, snapshot: [] });
const inspection = (date: string, id: string): ComputedResponse => ({
  date,
  values: { vehiculo: vehicle(id) },
});

/** La semana del lunes 28 de septiembre: un vehículo se inspecciona tres
 *  días, otro uno, y el tercero del listado, ninguno. */
const RESPONSES = [
  inspection("2026-09-28", "SLP-835"),
  inspection("2026-09-28", "TRK-204"),
  inspection("2026-09-29", "SLP-835"),
  // Dos el mismo día son una sola vez hecha.
  inspection("2026-09-29", "SLP-835"),
  inspection("2026-10-01", "SLP-835"),
];
const ENTRIES = ["ABC-000", "SLP-835", "TRK-204"].map((id) => ({
  id,
  title: id,
  values: {},
}));

const input = {
  fields: FIELDS,
  responses: RESPONSES,
  subjects: new Map([["vehiculo", ENTRIES]]),
  range: { from: "2026-09-28", to: "2026-10-04" },
  today: "2026-10-10",
};

const DAILY: ResultConfig = {
  type: "coverage",
  byFieldId: "vehiculo",
  interval: "day",
  weekdays: [1, 2, 3, 4, 5, 6],
  scope: "catalog",
};

const coverage = (config: ResultConfig, over: Partial<typeof input> = {}) => {
  const data = computeResult(config, { ...input, ...over });
  if (data.type !== "coverage") throw new Error("tipo");
  return data;
};

describe("weekdayOf", () => {
  it("numera de lunes (1) a domingo (7)", () => {
    expect(weekdayOf("2026-09-28")).toBe(1);
    expect(weekdayOf("2026-10-03")).toBe(6);
    expect(weekdayOf("2026-10-04")).toBe(7);
  });
});

describe("programa", () => {
  it("cuenta las veces hechas sobre las que tocaban, sin el día que no cuenta", () => {
    const data = coverage(DAILY);
    // Tres vehículos por seis días, de lunes a sábado.
    expect(data.expected).toBe(18);
    expect(data.done).toBe(4);
    expect(data.percent).toBeCloseTo((4 / 18) * 100);
    expect(data.elements).toBe(3);
  });

  it("enseña primero al menos cubierto, y cuenta al que nunca se inspeccionó", () => {
    const data = coverage(DAILY);
    expect(data.missing).toBe(1);
    expect(data.rows).toEqual([
      { key: "ABC-000", label: "ABC-000", done: 0, expected: 6, last: null },
      {
        key: "TRK-204",
        label: "TRK-204",
        done: 1,
        expected: 6,
        last: "2026-09-28",
      },
      {
        key: "SLP-835",
        label: "SLP-835",
        done: 3,
        expected: 6,
        last: "2026-10-01",
      },
    ]);
  });

  it("con «sólo los que tienen respuesta» no espera al que no se usó", () => {
    const data = coverage({ ...DAILY, scope: "seen" });
    expect(data.elements).toBe(2);
    expect(data.expected).toBe(12);
    expect(data.missing).toBe(0);
  });

  it("lo que está en curso no cuenta como falta", () => {
    // El jueves 1 todavía no ha terminado: quien no se inspeccionó hoy no
    // falta todavía, y quien sí, suma.
    const data = coverage(DAILY, { today: "2026-10-01" });
    const row = (key: string) => data.rows.find((one) => one.key === key);
    expect(row("SLP-835")).toMatchObject({ done: 3, expected: 4 });
    expect(row("TRK-204")).toMatchObject({ done: 1, expected: 3 });
    expect(row("ABC-000")).toMatchObject({ done: 0, expected: 3 });
  });

  it("un periodo que el rango corta por la mitad sólo cuenta donde se hizo", () => {
    // El rango empieza el martes: la semana no cabe entera, así que al que
    // no se inspeccionó desde entonces no se le cuenta como falta.
    const data = coverage(
      { ...DAILY, interval: "week", weekdays: undefined },
      { range: { from: "2026-09-29", to: "2026-10-04" } },
    );
    expect(data.done).toBe(2);
    expect(data.expected).toBe(2);
    expect(data.missing).toBe(0);
  });

  it("la evolución de un programa diario va por semanas en un rango largo", () => {
    expect(coverage(DAILY).interval).toBe("day");
    expect(
      coverage(DAILY, { range: { from: "2026-09-01", to: "2026-10-04" } })
        .interval,
    ).toBe("week");
  });

  it("cada semana: con una respuesta en la semana, está hecha", () => {
    const data = coverage({ ...DAILY, interval: "week", weekdays: undefined });
    expect(data.every).toBe("week");
    expect(data.done).toBe(2);
    expect(data.expected).toBe(3);
    expect(data.points).toEqual([
      { key: "2026-09-28", done: 2, expected: 3, percent: (2 / 3) * 100 },
    ]);
  });

  it("sin nada que esperar no hay porcentaje", () => {
    const data = coverage(DAILY, { subjects: new Map() });
    expect(data.percent).toBeNull();
    expect(data.elements).toBe(0);
  });

  it("respeta las condiciones del resultado", () => {
    const data = coverage(
      {
        ...DAILY,
        scope: "seen",
        filters: [{ fieldId: "km", operator: "isNotEmpty", values: [] }],
      },
      {
        responses: [
          { date: "2026-09-28", values: { vehiculo: vehicle("A"), km: 10 } },
          { date: "2026-09-28", values: { vehiculo: vehicle("B") } },
        ],
      },
    );
    expect(data.rows.map((row) => row.key)).toEqual(["A"]);
  });
});

const issue = (
  id: string,
  over: Partial<ComputedIssue> = {},
): ComputedIssue => ({
  id,
  code: `H-2026-00${id}`,
  title: `Hallazgo ${id}`,
  status: "open",
  date: "2026-09-29",
  values: { prioridad: "alta" },
  ...over,
});

const asResponses = (issues: ComputedIssue[]): ComputedResponse[] =>
  issues.map((one) => ({ date: one.date, values: one.values, issue: one }));

describe("seguimiento", () => {
  const closed = issue("1", {
    status: "closed",
    date: "2026-09-28",
    closedDate: "2026-10-02",
  });
  const late = issue("2", { dueDate: "2026-10-05" });
  const onTime = issue("3", { dueDate: "2026-10-20", responsible: "Laura" });
  // Abierto hace meses: no es del periodo, pero sigue abierto.
  const old = issue("4", { date: "2026-03-02", dueDate: "2026-03-10" });

  const tracking = (config: ResultConfig = { type: "tracking" }) => {
    const data = computeResult(config, {
      ...input,
      responses: asResponses([closed, late, onTime]),
      openIssues: [late, onTime, old],
    });
    if (data.type !== "tracking") throw new Error("tipo");
    return data;
  };

  it("los abiertos y los vencidos son de hoy, sin mirar el periodo", () => {
    const data = tracking();
    expect(data.open).toBe(3);
    expect(data.overdue).toBe(2);
  });

  it("el porcentaje es, de lo abierto en el periodo, cuánto está cerrado", () => {
    const data = tracking();
    expect(data.opened).toBe(3);
    expect(data.closed).toBe(1);
    expect(data.percent).toBeCloseTo((1 / 3) * 100);
    expect(data.averageDays).toBe(4);
  });

  it("los que más urgen van con el compromiso más viejo primero", () => {
    expect(tracking().pending.map((one) => one.id)).toEqual(["4", "2", "3"]);
    expect(tracking().pending[2]).toMatchObject({
      code: "H-2026-003",
      dueDate: "2026-10-20",
      responsible: "Laura",
    });
  });

  it("sin asuntos en el periodo no hay porcentaje ni promedio", () => {
    const data = computeResult(
      { type: "tracking" },
      { ...input, responses: [], openIssues: [] },
    );
    expect(data).toMatchObject({
      open: 0,
      opened: 0,
      percent: null,
      averageDays: null,
      pending: [],
    });
  });

  it("las condiciones valen para los abiertos y para los del periodo", () => {
    const data = computeResult(
      {
        type: "tracking",
        filters: [{ fieldId: "prioridad", operator: "eq", values: ["baja"] }],
      },
      {
        ...input,
        responses: asResponses([closed, late]),
        openIssues: [late, issue("5", { values: { prioridad: "baja" } })],
      },
    );
    expect(data).toMatchObject({ open: 1, opened: 0 });
  });

  it("los demás tipos calculan sobre los asuntos del periodo", () => {
    const data = computeResult(
      {
        type: "distribution",
        byFieldId: "prioridad",
        measure: { operation: "count" },
      },
      { ...input, responses: asResponses([closed, late, onTime]) },
    );
    expect(data).toMatchObject({
      rows: [{ key: "alta", value: 3 }],
    });
  });
});

describe("qué cabe en cada clase de formato", () => {
  it("el programa es de un formato, y el seguimiento de un seguimiento", () => {
    expect(resultTypesFor("record")).toContain("coverage");
    expect(resultTypesFor("record")).not.toContain("tracking");
    expect(resultTypesFor("tracking")).toContain("tracking");
    expect(resultTypesFor("tracking")).not.toContain("coverage");
    expect(resultTypesFor("catalog")).toEqual(["expirations"]);
  });

  it("un programa pide una relación y días que existan", () => {
    expect(resultProblem(DAILY, "record", FIELDS)).toBeNull();
    expect(
      resultProblem({ ...DAILY, byFieldId: "km" }, "record", FIELDS),
    ).toBe(RESULT_PROBLEMS.referenceField);
    for (const weekdays of [[], [1, 1], [0], [8]]) {
      expect(resultProblem({ ...DAILY, weekdays }, "record", FIELDS)).toBe(
        RESULT_PROBLEMS.weekdays,
      );
    }
    expect(resultProblem(DAILY, "tracking", FIELDS)).toBe(
      RESULT_PROBLEMS.typeNotAllowed,
    );
  });
});
