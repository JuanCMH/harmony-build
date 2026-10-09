/** Qué puede pedir un resultado de un formato, y si lo que pide existe.
 *
 *  Puro (`01 §2.2`): el editor lo usa para ofrecer sólo los campos que sirven
 *  a cada tipo de resultado, y el servidor para rechazar lo demás.
 */

import {
  type FormField,
  type FormKind,
  NEVER_CONTROLLERS,
  UNARY_ONLY_CONTROLLERS,
  UNARY_OPERATORS,
  type VisibilityRule,
} from "./form_types";
import {
  type CompositeTerm,
  type Measure,
  type MeasureTerm,
  RESULT_LIMITS,
  type ResultConfig,
  type ResultGoal,
  type ResultType,
} from "./result_types";
import { normalizeText } from "./text";

/** Los campos que se pueden sumar o promediar. */
export const numericFields = (fields: readonly FormField[]): FormField[] =>
  fields.filter(
    (field) => field.type === "number" || field.type === "currency",
  );

/** Los campos por los que se reparte: una lista o un listado relacionado. */
export const choiceFields = (fields: readonly FormField[]): FormField[] =>
  fields.filter(
    (field) => field.type === "select" || field.type === "reference",
  );

export const referenceFields = (fields: readonly FormField[]): FormField[] =>
  fields.filter((field) => field.type === "reference");

export const checklistFields = (fields: readonly FormField[]): FormField[] =>
  fields.filter((field) => field.type === "checklist");

export const dateFields = (fields: readonly FormField[]): FormField[] =>
  fields.filter((field) => field.type === "date");

/** Los tipos de resultado que caben en una clase de formato: los
 *  vencimientos son de un listado; todo lo demás, de las respuestas de un
 *  formato. */
export const resultTypesFor = (kind: FormKind): ResultType[] =>
  kind === "catalog"
    ? ["expirations"]
    : [
        "indicator",
        "trend",
        "distribution",
        "table",
        "compliance",
        "findings",
        "heatmap",
        "composite",
      ];

export const RESULT_PROBLEMS = {
  invalidName: `El nombre debe tener entre 2 y ${RESULT_LIMITS.maxNameLength} caracteres`,
  typeNotAllowed: "Ese tipo de resultado no cabe en esta clase de formato",
  measureField: "Elige el campo numérico que se mide",
  choiceField: "Elige la lista o el listado por el que se reparte",
  checklistField: "Elige la lista de chequeo",
  referenceField: "Elige el listado que da las filas",
  measures: `Una tabla lleva entre 1 y ${RESULT_LIMITS.maxMeasures} medidas`,
  dateFields: `Elige entre 1 y ${RESULT_LIMITS.maxDateFields} campos de fecha, sin repetir`,
  formula: "La fórmula está incompleta: alterna cifras y operadores",
  formulaTooLong: `Una fórmula lleva hasta ${(RESULT_LIMITS.maxTerms + 1) / 2} cifras`,
  measureFormat: `La unidad cabe en ${RESULT_LIMITS.maxUnitLength} caracteres y los decimales van de 0 a ${RESULT_LIMITS.maxDecimals}`,
  measureLabel: `El nombre de una medida cabe en ${RESULT_LIMITS.maxLabelLength} caracteres`,
  series: `Una tendencia lleva hasta ${RESULT_LIMITS.maxSeries + 1} series`,
  filters: `Un resultado lleva hasta ${RESULT_LIMITS.maxFilters} condiciones`,
  filterField: "Una condición apunta a un campo que el formato no tiene",
  filterValue: "Hay una condición sin valor con que comparar",
  goal: "La meta debe ser un número",
  compositeResults: `Elige entre 1 y ${RESULT_LIMITS.maxCompositeResults} indicadores`,
  compositeMissing:
    "Esta cifra usa un indicador que ya no existe. Edítala para elegir otro",
} as const;

const has = (fields: readonly FormField[], id: string | undefined) =>
  id !== undefined && fields.some((field) => field.id === id);

const aggregateIsValid = (
  measure: { operation: string; fieldId?: string },
  fields: readonly FormField[],
): boolean =>
  measure.operation === "count"
    ? measure.fieldId === undefined
    : has(numericFields(fields), measure.fieldId);

/** Operandos y operadores alternados, empezando y acabando en operando. */
export const termsAlternate = (terms: readonly { type: string }[]): boolean =>
  terms.length % 2 === 1 &&
  terms.every((term, index) => (term.type === "op") === (index % 2 === 1));

const constantIsValid = (term: MeasureTerm | CompositeTerm) =>
  term.type !== "const" || Number.isFinite(term.value);

const formatProblem = (format: {
  unit?: string;
  decimals?: number;
}): string | null =>
  (format.unit ?? "").length > RESULT_LIMITS.maxUnitLength ||
  (format.decimals !== undefined &&
    (!Number.isInteger(format.decimals) ||
      format.decimals < 0 ||
      format.decimals > RESULT_LIMITS.maxDecimals))
    ? RESULT_PROBLEMS.measureFormat
    : null;

/** Lo primero que no cuadra en una medida, o `null`. */
export function measureProblem(
  measure: Measure,
  fields: readonly FormField[],
): string | null {
  if ((measure.label ?? "").length > RESULT_LIMITS.maxLabelLength) {
    return RESULT_PROBLEMS.measureLabel;
  }
  const format = formatProblem(measure);
  if (format) return format;
  if (measure.operation !== "formula") {
    return aggregateIsValid(measure, fields)
      ? null
      : RESULT_PROBLEMS.measureField;
  }
  const terms = measure.terms ?? [];
  if (terms.length > RESULT_LIMITS.maxTerms) {
    return RESULT_PROBLEMS.formulaTooLong;
  }
  if (!termsAlternate(terms) || !terms.every(constantIsValid)) {
    return RESULT_PROBLEMS.formula;
  }
  return terms.every(
    (term) => term.type !== "agg" || aggregateIsValid(term, fields),
  )
    ? null
    : RESULT_PROBLEMS.measureField;
}

/** Los campos por los que se puede condicionar un resultado: los que
 *  admiten una regla con valor. */
export const filterFields = (fields: readonly FormField[]): FormField[] =>
  fields.filter(
    (field) =>
      !NEVER_CONTROLLERS.includes(field.type) &&
      !UNARY_ONLY_CONTROLLERS.includes(field.type),
  );

function filtersProblem(
  filters: readonly VisibilityRule[] | undefined,
  fields: readonly FormField[],
): string | null {
  if (!filters) return null;
  if (filters.length > RESULT_LIMITS.maxFilters) return RESULT_PROBLEMS.filters;
  for (const rule of filters) {
    if (!has(filterFields(fields), rule.fieldId)) {
      return RESULT_PROBLEMS.filterField;
    }
    if (
      !UNARY_OPERATORS.includes(rule.operator) &&
      !rule.values.some((value) => value !== "")
    ) {
      return RESULT_PROBLEMS.filterValue;
    }
  }
  return null;
}

const goalProblem = (goal: ResultGoal | undefined): string | null =>
  goal && !Number.isFinite(goal.value) ? RESULT_PROBLEMS.goal : null;

/** Los indicadores que entran en una cifra compuesta, sin repetir. */
export const compositeResultIds = (
  terms: readonly CompositeTerm[],
): string[] => [
  ...new Set(
    terms.flatMap((term) => (term.type === "result" ? [term.resultId] : [])),
  ),
];

/** El nombre limpio, o `null` si no cabe. */
export function resultName(raw: string): string | null {
  const name = normalizeText(raw);
  return name.length >= 2 && name.length <= RESULT_LIMITS.maxNameLength
    ? name
    : null;
}

/** Lo primero que no cuadra entre un resultado y los campos del formato, o
 *  `null` si todo cuadra. */
export function resultProblem(
  config: ResultConfig,
  kind: FormKind,
  fields: readonly FormField[],
): string | null {
  if (!resultTypesFor(kind).includes(config.type)) {
    return RESULT_PROBLEMS.typeNotAllowed;
  }
  if (config.type !== "expirations" && config.type !== "composite") {
    const filters = filtersProblem(config.filters, fields);
    if (filters) return filters;
  }
  switch (config.type) {
    case "indicator":
      return goalProblem(config.goal) ?? measureProblem(config.measure, fields);
    case "trend": {
      const series = config.series ?? [];
      if (series.length > RESULT_LIMITS.maxSeries)
        return RESULT_PROBLEMS.series;
      return (
        goalProblem(config.goal) ??
        [config.measure, ...series]
          .map((measure) => measureProblem(measure, fields))
          .find((problem) => problem !== null) ??
        null
      );
    }
    case "distribution":
      if (!has(choiceFields(fields), config.byFieldId)) {
        return RESULT_PROBLEMS.choiceField;
      }
      return measureProblem(config.measure, fields);
    case "table":
      if (!has(choiceFields(fields), config.byFieldId)) {
        return RESULT_PROBLEMS.choiceField;
      }
      if (
        config.measures.length === 0 ||
        config.measures.length > RESULT_LIMITS.maxMeasures
      ) {
        return RESULT_PROBLEMS.measures;
      }
      return (
        config.measures
          .map((measure) => measureProblem(measure, fields))
          .find((problem) => problem !== null) ?? null
      );
    case "composite": {
      const ids = compositeResultIds(config.terms);
      if (ids.length === 0 || ids.length > RESULT_LIMITS.maxCompositeResults) {
        return RESULT_PROBLEMS.compositeResults;
      }
      if (config.terms.length > RESULT_LIMITS.maxTerms) {
        return RESULT_PROBLEMS.formulaTooLong;
      }
      if (
        !termsAlternate(config.terms) ||
        !config.terms.every(constantIsValid)
      ) {
        return RESULT_PROBLEMS.formula;
      }
      return goalProblem(config.goal) ?? formatProblem(config);
    }
    case "compliance":
      if (!has(checklistFields(fields), config.checklistFieldId)) {
        return RESULT_PROBLEMS.checklistField;
      }
      return goalProblem(config.goal);
    case "findings":
      return has(checklistFields(fields), config.checklistFieldId)
        ? null
        : RESULT_PROBLEMS.checklistField;
    case "heatmap":
      if (!has(referenceFields(fields), config.rowFieldId)) {
        return RESULT_PROBLEMS.referenceField;
      }
      if (config.value === "count") return null;
      if (config.value === "sum") {
        return has(numericFields(fields), config.valueFieldId)
          ? null
          : RESULT_PROBLEMS.measureField;
      }
      return has(checklistFields(fields), config.valueFieldId)
        ? null
        : RESULT_PROBLEMS.checklistField;
    case "expirations": {
      const ids = config.dateFieldIds;
      const valid =
        ids.length > 0 &&
        ids.length <= RESULT_LIMITS.maxDateFields &&
        new Set(ids).size === ids.length &&
        ids.every((id) => has(dateFields(fields), id));
      return valid ? null : RESULT_PROBLEMS.dateFields;
    }
  }
}
