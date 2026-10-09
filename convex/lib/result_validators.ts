/** Los validadores de Convex de un resultado y del tablero. Aparte de
 *  `result_types.ts`, que es puro y viaja al navegador. */

import { v } from "convex/values";
import { COMPUTED_OPERATORS, VISIBILITY_OPERATORS } from "./form_types";
import {
  HEAT_VALUES,
  MEASURE_KINDS,
  MEASURE_OPERATIONS,
  RESULT_INTERVALS,
} from "./result_types";

const literals = <T extends string>(values: readonly T[]) =>
  v.union(...values.map((value) => v.literal(value)));

const operator = v.object({
  type: v.literal("op"),
  op: literals(COMPUTED_OPERATORS),
});
const constant = v.object({ type: v.literal("const"), value: v.number() });

export const resultMeasure = v.object({
  operation: literals(MEASURE_KINDS),
  fieldId: v.optional(v.string()),
  terms: v.optional(
    v.array(
      v.union(
        v.object({
          type: v.literal("agg"),
          operation: literals(MEASURE_OPERATIONS),
          fieldId: v.optional(v.string()),
        }),
        constant,
        operator,
      ),
    ),
  ),
  label: v.optional(v.string()),
  unit: v.optional(v.string()),
  decimals: v.optional(v.number()),
});

const interval = literals(RESULT_INTERVALS);

const filters = v.optional(
  v.array(
    v.object({
      fieldId: v.string(),
      operator: literals(VISIBILITY_OPERATORS),
      values: v.array(v.string()),
    }),
  ),
);

const goal = v.optional(
  v.object({
    value: v.number(),
    direction: v.union(v.literal("min"), v.literal("max")),
  }),
);

export const resultConfig = v.union(
  v.object({
    type: v.literal("indicator"),
    measure: resultMeasure,
    goal,
    compare: v.optional(v.boolean()),
    filters,
  }),
  v.object({
    type: v.literal("trend"),
    measure: resultMeasure,
    interval,
    series: v.optional(v.array(resultMeasure)),
    goal,
    filters,
  }),
  v.object({
    type: v.literal("distribution"),
    byFieldId: v.string(),
    measure: resultMeasure,
    filters,
  }),
  v.object({
    type: v.literal("table"),
    byFieldId: v.string(),
    measures: v.array(resultMeasure),
    filters,
  }),
  v.object({
    type: v.literal("compliance"),
    checklistFieldId: v.string(),
    interval,
    goal,
    filters,
  }),
  v.object({
    type: v.literal("findings"),
    checklistFieldId: v.string(),
    filters,
  }),
  v.object({
    type: v.literal("heatmap"),
    rowFieldId: v.string(),
    value: literals(HEAT_VALUES),
    valueFieldId: v.optional(v.string()),
    filters,
  }),
  v.object({
    type: v.literal("expirations"),
    dateFieldIds: v.array(v.string()),
  }),
  v.object({
    type: v.literal("composite"),
    terms: v.array(
      v.union(
        v.object({ type: v.literal("result"), resultId: v.string() }),
        constant,
        operator,
      ),
    ),
    unit: v.optional(v.string()),
    decimals: v.optional(v.number()),
    goal,
  }),
);

/** Cuánto ocupa un resultado en la retícula del tablero. */
export const WIDGET_SIZES = ["third", "half", "twoThirds", "full"] as const;
export type WidgetSize = (typeof WIDGET_SIZES)[number];

export const dashboardTabs = v.array(
  v.object({
    id: v.string(),
    label: v.string(),
    widgets: v.array(
      v.object({
        id: v.string(),
        resultId: v.id("formResults"),
        size: literals(WIDGET_SIZES),
      }),
    ),
  }),
);
