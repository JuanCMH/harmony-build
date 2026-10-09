/** El cálculo de un resultado: de las respuestas de un rango, a lo que pinta
 *  una gráfica.
 *
 *  Puro: recibe los campos del formato y las respuestas ya leídas, y no sabe
 *  nada de la base. Así se prueba con casos dorados (`04 §6`) y el servidor
 *  sólo decide **qué** respuestas entran.
 */

import { answerableItems } from "./checklist_summary";
import {
  type Bucket,
  bucketStart,
  bucketsBetween,
  daysBetween,
  fitBucket,
} from "./date_buckets";
import { evaluateRule } from "./field_logic";
import type {
  ChecklistAnswer,
  ChecklistConfig,
  ComputedOperator,
  FormField,
  FormValues,
  VisibilityRule,
} from "./form_types";
import {
  type Measure,
  type MeasureOperation,
  RESULT_LIMITS,
  type ResultConfig,
  type ResultData,
} from "./result_types";
import { isReferenceValue } from "./stored_values";
import { isRealDate } from "./value_validation";

/** Una respuesta vigente, con su fecha de negocio. Llegan en el orden en que
 *  se registraron: «el último» es el del final. */
export interface ComputedResponse {
  date: string;
  values: FormValues;
}

/** Un elemento activo de un listado. */
export interface ComputedEntry {
  id: string;
  title: string;
  values: FormValues;
}

export interface ComputeInput {
  /** Los campos de la versión publicada, ya aplanados. */
  fields: readonly FormField[];
  responses: readonly ComputedResponse[];
  /** Sólo para `expirations`. */
  entries?: readonly ComputedEntry[];
  range: { from: string; to: string };
  /** El día de hoy en Colombia: lo pone quien llama, no el reloj. */
  today: string;
  /** Las respuestas del periodo anterior, de igual largo: para los
   *  indicadores que se comparan. `undefined` si no se leyeron enteras. */
  previous?: readonly ComputedResponse[];
  /** Lo que valió cada indicador que entra en una cifra compuesta: los lee
   *  quien llama, porque pueden ser de otros formatos. */
  indicators?: ReadonlyMap<
    string,
    { name: string; formName: string; value: number | null }
  >;
}

const sum = (values: readonly number[]): number =>
  values.reduce((total, value) => total + value, 0);

/** Una operación sobre los números de un grupo de respuestas. `null` sin
 *  valores: un promedio de nada no es cero. Sólo contar da cero. */
export function applyOperation(
  operation: MeasureOperation,
  numbers: readonly number[],
  responses: number,
): number | null {
  if (operation === "count") return responses;
  if (numbers.length === 0) return operation === "sum" ? 0 : null;
  switch (operation) {
    case "sum":
      return sum(numbers);
    case "average":
      return sum(numbers) / numbers.length;
    case "last":
      return numbers[numbers.length - 1];
    case "min":
      return Math.min(...numbers);
    case "max":
      return Math.max(...numbers);
  }
}

const numbersOf = (
  responses: readonly ComputedResponse[],
  fieldId: string | undefined,
): number[] =>
  fieldId === undefined
    ? []
    : responses
        .map((response) => response.values[fieldId])
        .filter((value) => typeof value === "number");

const precedence = (op: ComputedOperator): number =>
  op === "+" || op === "-" ? 1 : 2;

/**
 * Una cuenta entre cifras ya calculadas, con la precedencia de siempre —× y
 * ÷ antes de + y −—. `null` si falta alguna cifra o se divide por cero: una
 * tasa sobre nada no es cero.
 */
export function evaluateTerms(
  terms: readonly (
    | { type: "num"; value: number | null }
    | { type: "op"; op: ComputedOperator }
  )[],
): number | null {
  const output: (number | ComputedOperator)[] = [];
  const operators: ComputedOperator[] = [];
  for (const term of terms) {
    if (term.type === "num") {
      if (term.value === null || !Number.isFinite(term.value)) return null;
      output.push(term.value);
      continue;
    }
    while (
      operators.length > 0 &&
      precedence(operators[operators.length - 1]) >= precedence(term.op)
    ) {
      output.push(operators.pop() as ComputedOperator);
    }
    operators.push(term.op);
  }
  while (operators.length > 0) output.push(operators.pop() as ComputedOperator);

  const stack: number[] = [];
  for (const token of output) {
    if (typeof token === "number") {
      stack.push(token);
      continue;
    }
    const right = stack.pop();
    const left = stack.pop();
    if (left === undefined || right === undefined) return null;
    if (token === "+") stack.push(left + right);
    else if (token === "-") stack.push(left - right);
    else if (token === "*") stack.push(left * right);
    else {
      if (right === 0) return null;
      stack.push(left / right);
    }
  }
  return stack.length === 1 && Number.isFinite(stack[0]) ? stack[0] : null;
}

const aggregated = (
  measure: { operation: MeasureOperation; fieldId?: string },
  responses: readonly ComputedResponse[],
): number | null =>
  applyOperation(
    measure.operation,
    numbersOf(responses, measure.fieldId),
    responses.length,
  );

/** Lo que vale una medida sobre un grupo de respuestas: una operación, o una
 *  fórmula entre varias. */
const measured = (
  measure: Measure,
  responses: readonly ComputedResponse[],
): number | null =>
  measure.operation === "formula"
    ? evaluateTerms(
        (measure.terms ?? []).map((term) =>
          term.type === "op"
            ? term
            : {
                type: "num" as const,
                value:
                  term.type === "const"
                    ? term.value
                    : aggregated(term, responses),
              },
        ),
      )
    : aggregated(
        { operation: measure.operation, fieldId: measure.fieldId },
        responses,
      );

/** Las respuestas que cumplen **todas** las condiciones del resultado. */
const filtered = (
  responses: readonly ComputedResponse[],
  filters: readonly VisibilityRule[] | undefined,
): readonly ComputedResponse[] =>
  !filters || filters.length === 0
    ? responses
    : responses.filter((response) =>
        filters.every((rule) =>
          evaluateRule(rule, response.values[rule.fieldId]),
        ),
      );

/** Si una medida se puede sumar entre grupos: sólo contar y sumar. Lo demás
 *  —un promedio, una tasa— se vuelve a calcular sobre el conjunto. */
const isAdditive = (measure: Measure) =>
  measure.operation === "count" || measure.operation === "sum";

/** Las respuestas, repartidas por el intervalo de su fecha. */
function byBucket(
  responses: readonly ComputedResponse[],
  bucket: Bucket,
): Map<string, ComputedResponse[]> {
  const groups = new Map<string, ComputedResponse[]>();
  for (const response of responses) {
    const key = bucketStart(bucket, response.date);
    const group = groups.get(key);
    if (group) group.push(response);
    else groups.set(key, [response]);
  }
  return groups;
}

/**
 * Las respuestas repartidas por lo que eligieron en un campo: la opción de
 * una lista o el elemento de un listado. Lo que no eligió nada va en «Sin
 * dato».
 */
function byChoice(
  responses: readonly ComputedResponse[],
  field: FormField | undefined,
): { key: string; label: string; responses: ComputedResponse[] }[] {
  const groups = new Map<
    string,
    { key: string; label: string; responses: ComputedResponse[] }
  >();
  const options = new Map(
    (field?.config.options ?? []).map((option) => [option.value, option.label]),
  );
  for (const response of responses) {
    const value = field ? response.values[field.id] : undefined;
    let key = "";
    let label = "Sin dato";
    if (isReferenceValue(value) && value.responseId !== "") {
      key = value.responseId;
      label = value.label || "Elemento sin título";
    } else if (typeof value === "string" && value !== "") {
      key = value;
      label = options.get(value) ?? value;
    }
    const group = groups.get(key);
    if (group) group.responses.push(response);
    else groups.set(key, { key, label, responses: [response] });
  }
  return [...groups.values()];
}

const checklistOf = (
  fields: readonly FormField[],
  fieldId: string | undefined,
): ChecklistConfig | undefined =>
  fields.find((field) => field.id === fieldId)?.config.checklist;

/** Cuántos ítems de cada sentido tiene una respuesta, y cuáles fallaron. */
function tally(config: ChecklistConfig, answers: unknown) {
  const meaning = new Map(
    config.options.map((option) => [option.value, option.meaning]),
  );
  const answerable = new Set(answerableItems(config).map((item) => item.id));
  let ok = 0;
  const failed: string[] = [];
  for (const answer of Array.isArray(answers)
    ? (answers as ChecklistAnswer[])
    : []) {
    if (!answerable.has(answer.itemId) || answer.value === undefined) continue;
    const sense = meaning.get(answer.value);
    if (sense === "ok") ok += 1;
    if (sense === "fail") failed.push(answer.itemId);
  }
  return { ok, failed };
}

const percentOf = (ok: number, fail: number): number | null =>
  ok + fail === 0 ? null : (ok / (ok + fail)) * 100;

/** Lo que pinta un resultado, a partir de las respuestas de un rango. */
export function computeResult(
  config: ResultConfig,
  input: ComputeInput,
): ResultData {
  const { fields, range } = input;
  const filters =
    config.type === "expirations" || config.type === "composite"
      ? undefined
      : config.filters;
  const responses = filtered(input.responses, filters);
  const fieldOf = (id: string) => fields.find((field) => field.id === id);

  switch (config.type) {
    case "indicator": {
      // Un mes cabe por días; más, por semanas.
      const interval = fitBucket(
        daysBetween(range.from, range.to) < 31 ? "day" : "week",
        range.from,
        range.to,
        RESULT_LIMITS.maxPoints,
      );
      const groups = byBucket(responses, interval);
      return {
        type: "indicator",
        value: measured(config.measure, responses),
        responses: responses.length,
        interval,
        points: bucketsBetween(interval, range.from, range.to).map((key) => ({
          key,
          value: measured(config.measure, groups.get(key) ?? []),
        })),
        ...(config.compare
          ? {
              previous: input.previous
                ? measured(config.measure, filtered(input.previous, filters))
                : null,
            }
          : {}),
      };
    }

    case "composite": {
      const parts = [
        ...new Set(
          config.terms.flatMap((term) =>
            term.type === "result" ? [term.resultId] : [],
          ),
        ),
      ].map((resultId) => {
        const found = input.indicators?.get(resultId);
        return {
          resultId,
          name: found?.name ?? "Indicador eliminado",
          formName: found?.formName ?? "",
          value: found?.value ?? null,
        };
      });
      const values = new Map(parts.map((part) => [part.resultId, part.value]));
      return {
        type: "composite",
        value: evaluateTerms(
          config.terms.map((term) =>
            term.type === "op"
              ? term
              : {
                  type: "num" as const,
                  value:
                    term.type === "const"
                      ? term.value
                      : (values.get(term.resultId) ?? null),
                },
          ),
        ),
        parts,
      };
    }

    case "trend": {
      const interval = fitBucket(
        config.interval,
        range.from,
        range.to,
        RESULT_LIMITS.maxPoints,
      );
      const groups = byBucket(responses, interval);
      const keys = bucketsBetween(interval, range.from, range.to);
      const seriesOf = (measure: Measure) => ({
        points: keys.map((key) => ({
          key,
          value: measured(measure, groups.get(key) ?? []),
        })),
        total: measured(measure, responses),
      });
      return {
        type: "trend",
        interval,
        ...seriesOf(config.measure),
        ...(config.series?.length
          ? { extra: config.series.map(seriesOf) }
          : {}),
      };
    }

    case "distribution": {
      const rows = byChoice(responses, fieldOf(config.byFieldId))
        .map((group) => ({
          key: group.key,
          label: group.label,
          value: measured(config.measure, group.responses) ?? 0,
          responses: group.responses,
        }))
        .sort((a, b) => b.value - a.value);
      const rest = rows.slice(RESULT_LIMITS.maxRows);
      return {
        type: "distribution",
        rows: rows
          .slice(0, RESULT_LIMITS.maxRows)
          .map(({ key, label, value }) => ({ key, label, value })),
        // Lo que no cupo. Un promedio o una tasa no se suman: se vuelven a
        // calcular sobre las respuestas de todos los grupos que quedaron
        // fuera.
        others: isAdditive(config.measure)
          ? sum(rest.map((row) => row.value))
          : (measured(
              config.measure,
              rest.flatMap((row) => row.responses),
            ) ?? 0),
      };
    }

    case "table": {
      const rows = byChoice(responses, fieldOf(config.byFieldId))
        .map((group) => ({
          key: group.key,
          label: group.label,
          values: config.measures.map((measure) =>
            measured(measure, group.responses),
          ),
        }))
        .sort((a, b) => a.label.localeCompare(b.label, "es"));
      return {
        type: "table",
        groupLabel: fieldOf(config.byFieldId)?.label ?? "",
        columns: config.measures.map((measure) => ({
          operation: measure.operation,
          fieldLabel: measure.fieldId
            ? (fieldOf(measure.fieldId)?.label ?? measure.fieldId)
            : null,
          ...(measure.label ? { label: measure.label } : {}),
          ...(measure.unit ? { unit: measure.unit } : {}),
          ...(measure.decimals !== undefined
            ? { decimals: measure.decimals }
            : {}),
        })),
        rows,
        totals: config.measures.map((measure) => measured(measure, responses)),
      };
    }

    case "compliance": {
      const checklist = checklistOf(fields, config.checklistFieldId);
      const interval = fitBucket(
        config.interval,
        range.from,
        range.to,
        RESULT_LIMITS.maxPoints,
      );
      const groups = byBucket(responses, interval);
      const count = (group: readonly ComputedResponse[]) => {
        let ok = 0;
        let fail = 0;
        for (const response of group) {
          if (!checklist) continue;
          const counted = tally(
            checklist,
            response.values[config.checklistFieldId],
          );
          ok += counted.ok;
          fail += counted.failed.length;
        }
        return { ok, fail, percent: percentOf(ok, fail) };
      };
      return {
        type: "compliance",
        interval,
        points: bucketsBetween(interval, range.from, range.to).map((key) => ({
          key,
          ...count(groups.get(key) ?? []),
        })),
        percent: count(responses).percent,
        responses: responses.length,
      };
    }

    case "findings": {
      const checklist = checklistOf(fields, config.checklistFieldId);
      const counts = new Map<string, number>();
      for (const response of responses) {
        if (!checklist) continue;
        const { failed } = tally(
          checklist,
          response.values[config.checklistFieldId],
        );
        for (const itemId of failed) {
          counts.set(itemId, (counts.get(itemId) ?? 0) + 1);
        }
      }
      // Un subítem se lee con la fila que lo agrupa: «Medias» solo no dice
      // que son luces.
      const labels = new Map<string, string>();
      for (const block of checklist?.blocks ?? []) {
        let heading = "";
        for (const item of block.items) {
          if (item.heading) heading = item.label;
          else if (!item.indented) heading = "";
          if (item.heading) continue;
          labels.set(
            item.id,
            item.indented && heading ? `${heading}: ${item.label}` : item.label,
          );
        }
      }
      const rows = [...counts]
        .map(([itemId, count]) => ({
          itemId,
          label: labels.get(itemId) ?? itemId,
          count,
        }))
        .sort((a, b) => b.count - a.count);
      return {
        type: "findings",
        rows: rows.slice(0, RESULT_LIMITS.maxFindings),
        total: sum(rows.map((row) => row.count)),
        responses: responses.length,
      };
    }

    case "heatmap": {
      // Un mes cabe por días; más, por semanas.
      const interval: "day" | "week" =
        daysBetween(range.from, range.to) < 31 ? "day" : "week";
      const columns = bucketsBetween(interval, range.from, range.to);
      const checklist = checklistOf(fields, config.valueFieldId);
      const cell = (group: readonly ComputedResponse[]): number | null => {
        if (group.length === 0) return null;
        if (config.value === "count") return group.length;
        if (config.value === "sum") {
          return sum(numbersOf(group, config.valueFieldId));
        }
        return sum(
          group.map((response) =>
            checklist && config.valueFieldId
              ? tally(checklist, response.values[config.valueFieldId]).failed
                  .length
              : 0,
          ),
        );
      };
      const rows = byChoice(responses, fieldOf(config.rowFieldId))
        .filter((group) => group.key !== "")
        // Los que más respuestas tienen, y entre ellos por nombre.
        .sort((a, b) => b.responses.length - a.responses.length)
        .slice(0, RESULT_LIMITS.maxRows)
        .sort((a, b) => a.label.localeCompare(b.label, "es"))
        .map((group) => {
          const buckets = byBucket(group.responses, interval);
          return {
            key: group.key,
            label: group.label,
            cells: columns.map((key) => cell(buckets.get(key) ?? [])),
          };
        });
      return {
        type: "heatmap",
        interval,
        columns,
        rows,
        max: Math.max(
          0,
          ...rows.flatMap((row) => row.cells.map((value) => value ?? 0)),
        ),
      };
    }

    case "expirations": {
      const rows = (input.entries ?? [])
        .flatMap((entry) =>
          config.dateFieldIds.flatMap((fieldId) => {
            const date = entry.values[fieldId];
            if (typeof date !== "string" || !isRealDate(date)) return [];
            return [
              {
                entryId: entry.id,
                title: entry.title,
                fieldLabel: fieldOf(fieldId)?.label ?? fieldId,
                date,
                daysLeft: daysBetween(input.today, date),
              },
            ];
          }),
        )
        .sort((a, b) => a.daysLeft - b.daysLeft);
      return {
        type: "expirations",
        rows: rows.slice(0, RESULT_LIMITS.maxExpirations),
        expired: rows.filter((row) => row.daysLeft < 0).length,
        soon: rows.filter(
          (row) =>
            row.daysLeft >= 0 &&
            row.daysLeft <= RESULT_LIMITS.expirationWarningDays,
        ).length,
      };
    }
  }
}
