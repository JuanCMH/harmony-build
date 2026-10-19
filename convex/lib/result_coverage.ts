/** El cálculo de un programa: si se inspeccionó todo lo que tocaba
 *  (`docs/plans/2026-10-12-programa-y-cierre-de-hallazgos-design.md §1`).
 *
 *  Puro, como `result_compute.ts`, que es quien lo llama: recibe las
 *  respuestas ya leídas y filtradas, y los elementos del listado.
 */

import {
  bucketEnd,
  bucketStart,
  bucketsBetween,
  coarsest,
  daysBetween,
  fitBucket,
  weekdayOf,
} from "./date_buckets";
import type { FormValues } from "./form_types";
import {
  RESULT_LIMITS,
  type ResultConfig,
  type ResultData,
} from "./result_types";
import { isReferenceValue } from "./stored_values";

type CoverageConfig = Extract<ResultConfig, { type: "coverage" }>;
type CoverageData = Extract<ResultData, { type: "coverage" }>;

interface CoverageInput {
  responses: readonly { date: string; values: FormValues }[];
  /** Los elementos activos del listado que la relación elige. */
  entries: readonly { id: string; title: string }[];
  range: { from: string; to: string };
  today: string;
}

/** Hasta cuántos días la evolución de un programa diario va día a día. */
const DAILY_POINTS = 14;

const percentOf = (done: number, expected: number): number | null =>
  expected === 0 ? null : (done / expected) * 100;

/**
 * Cuántas veces se inspeccionó cada elemento sobre cuántas tocaba.
 *
 * Una **vez** es un elemento en un periodo —un día, una semana o un mes—: con
 * una respuesta está hecha, y más no suman. Un periodo sólo se **debe** si
 * cabe entero en el rango y ya terminó: la semana en curso, el día de hoy o
 * el mes que el rango corta por la mitad sólo cuentan donde ya se hizo. No es
 * una falta lo que todavía puede hacerse, ni lo que pudo hacerse en días que
 * no se están mirando.
 */
export function computeCoverage(
  config: CoverageConfig,
  input: CoverageInput,
): CoverageData {
  const { range, today } = input;
  const every = config.interval;
  const days = config.weekdays;

  // Los periodos en que tocaba. Con «cada día», sólo los días que cuentan.
  const periods = bucketsBetween(every, range.from, range.to).filter(
    (key) =>
      key <= today &&
      (every !== "day" || !days || days.includes(weekdayOf(key))),
  );
  const periodSet = new Set(periods);
  const isOwed = (key: string) => {
    const end = bucketEnd(every, key);
    return key >= range.from && end <= range.to && end < today;
  };

  // Lo que se hizo: los periodos de cada elemento, y su última fecha.
  const done = new Map<string, { label: string; periods: Set<string> }>();
  const last = new Map<string, string>();
  for (const response of input.responses) {
    const value = response.values[config.byFieldId];
    if (!isReferenceValue(value) || value.responseId === "") continue;
    const period = bucketStart(every, response.date);
    if (!periodSet.has(period)) continue;
    const found = done.get(value.responseId);
    if (found) found.periods.add(period);
    else {
      done.set(value.responseId, {
        label: value.label || "Elemento sin título",
        periods: new Set([period]),
      });
    }
    const previous = last.get(value.responseId);
    if (!previous || response.date > previous) {
      last.set(value.responseId, response.date);
    }
  }

  // A quién se espera: a todo el listado, o sólo a lo que se inspeccionó.
  const elements =
    config.scope === "catalog"
      ? input.entries.map((entry) => ({
          key: entry.id,
          label: entry.title || "Elemento sin título",
        }))
      : [...done].map(([key, found]) => ({ key, label: found.label }));

  // La evolución de un programa diario se lee por semanas en cuanto el rango
  // pasa de dos: día a día, la línea sube y baja con cada sábado.
  // Nunca más fino que lo que toca: un programa mensual por semanas deja
  // semanas en que no tocaba nada. Con menos de tres meses no hay línea.
  const interval = coarsest(
    fitBucket(
      every === "day" && daysBetween(range.from, range.to) >= DAILY_POINTS
        ? "week"
        : every,
      range.from,
      range.to,
      RESULT_LIMITS.maxPoints,
    ),
    every,
  );
  const points = new Map(
    bucketsBetween(interval, range.from, range.to).map((key) => [
      key,
      { done: 0, expected: 0 },
    ]),
  );

  const rows = elements.map((element) => {
    const made = done.get(element.key)?.periods ?? new Set<string>();
    let expected = 0;
    for (const period of periods) {
      const hit = made.has(period);
      if (!hit && !isOwed(period)) continue;
      expected += 1;
      const point = points.get(bucketStart(interval, period));
      if (point) {
        point.expected += 1;
        if (hit) point.done += 1;
      }
    }
    return {
      key: element.key,
      label: element.label,
      done: made.size,
      expected,
      last: last.get(element.key) ?? null,
    };
  });

  const total = rows.reduce(
    (sum, row) => ({
      done: sum.done + row.done,
      expected: sum.expected + row.expected,
    }),
    { done: 0, expected: 0 },
  );
  // Los menos cubiertos primero: es a ellos a quienes se viene a buscar.
  const worstFirst = rows
    .filter((row) => row.expected > 0)
    .sort(
      (a, b) =>
        a.done / a.expected - b.done / b.expected ||
        a.label.localeCompare(b.label, "es"),
    );

  return {
    type: "coverage",
    every,
    interval,
    percent: percentOf(total.done, total.expected),
    done: total.done,
    expected: total.expected,
    elements: elements.length,
    missing: rows.filter((row) => row.done === 0 && row.expected > 0).length,
    points: [...points].map(([key, point]) => ({
      key,
      ...point,
      percent: percentOf(point.done, point.expected),
    })),
    rows: worstFirst.slice(0, RESULT_LIMITS.maxRows),
    others: Math.max(0, worstFirst.length - RESULT_LIMITS.maxRows),
  };
}
