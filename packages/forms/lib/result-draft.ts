import type {
  FormField,
  FormKind,
  VisibilityRule,
} from "@/convex/lib/form_types";
import {
  checklistFields,
  choiceFields,
  dateFields,
  numericFields,
  referenceFields,
  resultTypesFor,
} from "@/convex/lib/result_definition";
import type {
  CompositeTerm,
  HeatValue,
  Measure,
  MeasureKind,
  MeasureOperation,
  MeasureTerm,
  ResultConfig,
  ResultGoal,
  ResultInterval,
  ResultType,
} from "@/convex/lib/result_types";

/**
 * Un resultado mientras se edita: todos los ajustes de todos los tipos a la
 * vez, para que cambiar de tipo no pierda lo ya elegido, y cómo se convierte
 * en la configuración que se guarda. El servidor vuelve a validarla.
 */

export interface DraftMeasure {
  operation: MeasureKind;
  fieldId: string | null;
  /** La fórmula, cuando la operación es `formula`. Se conserva al cambiar a
   *  otra operación, por si se vuelve. */
  terms: MeasureTerm[];
  label: string;
  unit: string;
  /** `null`: los que salgan, hasta uno. */
  decimals: number | null;
}

/** La meta mientras se edita: el valor es texto hasta que se guarda. */
export interface DraftGoal {
  enabled: boolean;
  value: string;
  direction: ResultGoal["direction"];
}

export interface ResultDraft {
  name: string;
  type: ResultType;
  measure: DraftMeasure;
  measures: DraftMeasure[];
  /** Las series de más de una tendencia. */
  series: DraftMeasure[];
  interval: ResultInterval;
  byFieldId: string | null;
  checklistFieldId: string | null;
  rowFieldId: string | null;
  heatValue: HeatValue;
  valueFieldId: string | null;
  dateFieldIds: string[];
  filters: VisibilityRule[];
  goal: DraftGoal;
  compare: boolean;
  compositeTerms: CompositeTerm[];
  compositeUnit: string;
  compositeDecimals: number | null;
}

export const emptyMeasure = (
  operation: MeasureKind = "count",
): DraftMeasure => ({
  operation,
  fieldId: null,
  terms: [],
  label: "",
  unit: "",
  decimals: null,
});

const first = (fields: readonly FormField[]): string | null =>
  fields[0]?.id ?? null;

/** Un resultado nuevo, con lo primero que el formato ofrece ya elegido. */
export const emptyResultDraft = (
  kind: FormKind,
  fields: readonly FormField[],
): ResultDraft => ({
  name: "",
  type: resultTypesFor(kind)[0],
  measure: emptyMeasure(),
  measures: [emptyMeasure()],
  series: [],
  interval: "week",
  byFieldId: first(choiceFields(fields)),
  checklistFieldId: first(checklistFields(fields)),
  rowFieldId: first(referenceFields(fields)),
  heatValue: checklistFields(fields).length > 0 ? "failures" : "count",
  valueFieldId: first(checklistFields(fields)),
  dateFieldIds: dateFields(fields).map((field) => field.id),
  filters: [],
  goal: { enabled: false, value: "", direction: "min" },
  compare: false,
  compositeTerms: [],
  compositeUnit: "",
  compositeDecimals: null,
});

const toDraftMeasure = (measure: Measure): DraftMeasure => ({
  operation: measure.operation,
  fieldId: measure.fieldId ?? null,
  terms: measure.terms ?? [],
  label: measure.label ?? "",
  unit: measure.unit ?? "",
  decimals: measure.decimals ?? null,
});

const toDraftGoal = (goal: ResultGoal | undefined): DraftGoal =>
  goal
    ? { enabled: true, value: String(goal.value), direction: goal.direction }
    : { enabled: false, value: "", direction: "min" };

/** Lo guardado, vuelto a abrir en el editor. */
export function draftFromResult(
  result: { name: string; config: ResultConfig },
  kind: FormKind,
  fields: readonly FormField[],
): ResultDraft {
  const draft = { ...emptyResultDraft(kind, fields), name: result.name };
  const { config } = result;
  draft.type = config.type;
  if (config.type !== "expirations" && config.type !== "composite") {
    draft.filters = config.filters ?? [];
  }
  switch (config.type) {
    case "indicator":
      draft.measure = toDraftMeasure(config.measure);
      draft.goal = toDraftGoal(config.goal);
      draft.compare = config.compare ?? false;
      break;
    case "trend":
      draft.measure = toDraftMeasure(config.measure);
      draft.series = (config.series ?? []).map(toDraftMeasure);
      draft.interval = config.interval;
      draft.goal = toDraftGoal(config.goal);
      break;
    case "composite":
      draft.compositeTerms = config.terms;
      draft.compositeUnit = config.unit ?? "";
      draft.compositeDecimals = config.decimals ?? null;
      draft.goal = toDraftGoal(config.goal);
      break;
    case "distribution":
      draft.byFieldId = config.byFieldId;
      draft.measure = toDraftMeasure(config.measure);
      break;
    case "table":
      draft.byFieldId = config.byFieldId;
      draft.measures = config.measures.map(toDraftMeasure);
      break;
    case "compliance":
      draft.checklistFieldId = config.checklistFieldId;
      draft.interval = config.interval;
      draft.goal = toDraftGoal(config.goal);
      break;
    case "findings":
      draft.checklistFieldId = config.checklistFieldId;
      break;
    case "heatmap":
      draft.rowFieldId = config.rowFieldId;
      draft.heatValue = config.value;
      draft.valueFieldId = config.valueFieldId ?? null;
      break;
    case "expirations":
      draft.dateFieldIds = [...config.dateFieldIds];
      break;
  }
  return draft;
}

const format = (source: { unit: string; decimals: number | null }) => ({
  ...(source.unit.trim() ? { unit: source.unit.trim() } : {}),
  ...(source.decimals !== null ? { decimals: source.decimals } : {}),
});

const toMeasure = (measure: DraftMeasure): Measure => ({
  operation: measure.operation,
  ...(measure.operation === "formula"
    ? { terms: measure.terms }
    : measure.operation !== "count" && measure.fieldId !== null
      ? { fieldId: measure.fieldId }
      : {}),
  ...(measure.label.trim() ? { label: measure.label.trim() } : {}),
  ...format(measure),
});

/** La meta que se guarda. Activada y sin número, va un `NaN` que
 *  `resultProblem` rechaza: se dice, no se descarta en silencio. */
const toGoal = (goal: DraftGoal): { goal?: ResultGoal } =>
  goal.enabled
    ? {
        goal: {
          value: goal.value.trim() === "" ? Number.NaN : Number(goal.value),
          direction: goal.direction,
        },
      }
    : {};

const toFilters = (draft: ResultDraft): { filters?: VisibilityRule[] } =>
  draft.filters.length > 0 ? { filters: draft.filters } : {};

/** La configuración que se guarda. Lo que falte por elegir va vacío, y lo
 *  dice `resultProblem` al validarla. */
export function draftConfig(draft: ResultDraft): ResultConfig {
  switch (draft.type) {
    case "indicator":
      return {
        type: "indicator",
        measure: toMeasure(draft.measure),
        ...toGoal(draft.goal),
        ...(draft.compare ? { compare: true } : {}),
        ...toFilters(draft),
      };
    case "trend":
      return {
        type: "trend",
        measure: toMeasure(draft.measure),
        interval: draft.interval,
        ...(draft.series.length > 0
          ? { series: draft.series.map(toMeasure) }
          : {}),
        ...toGoal(draft.goal),
        ...toFilters(draft),
      };
    case "composite":
      return {
        type: "composite",
        terms: draft.compositeTerms,
        ...format({
          unit: draft.compositeUnit,
          decimals: draft.compositeDecimals,
        }),
        ...toGoal(draft.goal),
      };
    case "distribution":
      return {
        type: "distribution",
        byFieldId: draft.byFieldId ?? "",
        measure: toMeasure(draft.measure),
        ...toFilters(draft),
      };
    case "table":
      return {
        type: "table",
        byFieldId: draft.byFieldId ?? "",
        measures: draft.measures.map(toMeasure),
        ...toFilters(draft),
      };
    case "compliance":
      return {
        type: "compliance",
        checklistFieldId: draft.checklistFieldId ?? "",
        interval: draft.interval,
        ...toGoal(draft.goal),
        ...toFilters(draft),
      };
    case "findings":
      return {
        type: "findings",
        checklistFieldId: draft.checklistFieldId ?? "",
        ...toFilters(draft),
      };
    case "heatmap":
      return {
        type: "heatmap",
        rowFieldId: draft.rowFieldId ?? "",
        value: draft.heatValue,
        ...(draft.heatValue !== "count" && draft.valueFieldId
          ? { valueFieldId: draft.valueFieldId }
          : {}),
        ...toFilters(draft),
      };
    case "expirations":
      return { type: "expirations", dateFieldIds: draft.dateFieldIds };
  }
}

/**
 * Al cambiar de operación: contar no mira ningún campo, y lo demás necesita
 * uno numérico —el primero que haya, si todavía no se eligió—. Una fórmula
 * nueva nace con lo que la medida ya decía, para partir de ahí.
 */
export const withOperation = (
  measure: DraftMeasure,
  operation: MeasureKind,
  fields: readonly FormField[],
): DraftMeasure => {
  if (operation === "formula") {
    return {
      ...measure,
      operation,
      terms:
        measure.terms.length > 0
          ? measure.terms
          : [aggTerm(measure.operation, measure.fieldId, fields)],
    };
  }
  return {
    ...measure,
    operation,
    fieldId:
      operation === "count"
        ? null
        : (measure.fieldId ?? first(numericFields(fields))),
  };
};

/** Un agregado para una fórmula. Sin campos numéricos, sólo se cuenta. */
export const aggTerm = (
  operation: MeasureKind,
  fieldId: string | null,
  fields: readonly FormField[],
): MeasureTerm => {
  const numeric = first(numericFields(fields));
  const op: MeasureOperation =
    operation === "formula" || (operation !== "count" && !numeric)
      ? numeric
        ? "sum"
        : "count"
      : operation;
  return op === "count"
    ? { type: "agg", operation: "count" }
    : { type: "agg", operation: op, fieldId: fieldId ?? numeric ?? "" };
};

/** Añade un operando a una fórmula, con su operador delante. */
export const appendTerm = <T extends { type: string }>(
  terms: readonly T[],
  operand: T,
  operator: T,
): T[] => (terms.length === 0 ? [operand] : [...terms, operator, operand]);

/** Quita el operando `index` (posición par) y el operador que lo une. */
export const removeTerm = <T>(terms: readonly T[], index: number): T[] =>
  index === 0
    ? terms.slice(2)
    : [...terms.slice(0, index - 1), ...terms.slice(index + 1)];

/** Al cambiar lo que vale una celda del mapa de calor, el campo del que sale
 *  cambia de clase: una suma mira un número; los hallazgos, una lista. */
export const withHeatValue = (
  draft: ResultDraft,
  heatValue: HeatValue,
  fields: readonly FormField[],
): ResultDraft => ({
  ...draft,
  heatValue,
  valueFieldId:
    heatValue === "sum"
      ? first(numericFields(fields))
      : heatValue === "failures"
        ? first(checklistFields(fields))
        : null,
});
