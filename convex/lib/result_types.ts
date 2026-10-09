/** Los resultados de un formato: lo que se calcula de sus respuestas para
 *  verlo en una gráfica, una tabla o un indicador.
 *
 *  Un resultado **no guarda datos**: es una definición —qué campo mide, cómo y
 *  por qué lo separa— que se aplica a las respuestas de un rango de fechas
 *  (`docs/plans/2026-10-09-resultados-y-tablero-design.md`). Los tipos son
 *  pocos y lo que los hace flexibles son sus piezas: una medida puede ser una
 *  fórmula entre agregados, cualquier resultado puede llevar condiciones, y
 *  una cifra puede tener meta, compararse con el periodo anterior o
 *  componerse de cifras de otros formatos (§«Modelo personalizable»).
 *
 *  Puro, y compartido con el cliente (`01 §2.2`): el editor ofrece los mismos
 *  tipos y las mismas operaciones que el servidor valida y calcula.
 */

import type { ComputedOperator, VisibilityRule } from "./form_types";

export const RESULT_TYPES = [
  "indicator",
  "trend",
  "distribution",
  "table",
  "compliance",
  "findings",
  "heatmap",
  "expirations",
  "composite",
] as const;
export type ResultType = (typeof RESULT_TYPES)[number];

/** Qué se saca de un campo numérico; `count` cuenta respuestas y no mira
 *  ningún campo. No hay operación por omisión: sumar un kilometraje no
 *  significa nada. */
export const MEASURE_OPERATIONS = [
  "count",
  "sum",
  "average",
  "last",
  "min",
  "max",
] as const;
export type MeasureOperation = (typeof MEASURE_OPERATIONS)[number];

/** Lo que es una medida: una de las operaciones, o una fórmula entre
 *  varias. */
export const MEASURE_KINDS = [...MEASURE_OPERATIONS, "formula"] as const;
export type MeasureKind = (typeof MEASURE_KINDS)[number];

/** Un término de la fórmula de una medida: un agregado, una constante o un
 *  operador. `suma(HHT) ÷ suma(personas)` son tres. */
export type MeasureTerm =
  | { type: "agg"; operation: MeasureOperation; fieldId?: string }
  | { type: "const"; value: number }
  | { type: "op"; op: ComputedOperator };

export interface Measure {
  operation: MeasureKind;
  /** El campo numérico. Falta en `count` y en `formula`. */
  fieldId?: string;
  /** Sólo en `formula`: operandos y operadores alternados, con la
   *  precedencia de siempre (× y ÷ antes de + y −). */
  terms?: MeasureTerm[];
  /** El nombre propio de la medida: el rótulo de su columna o de su serie.
   *  Sin él, se dice sola («Suma de Horas»). */
  label?: string;
  /** Lo que va tras la cifra: «%», «h», «kg». */
  unit?: string;
  /** Decimales con que se enseña, de 0 a 3. Por omisión, hasta uno. */
  decimals?: number;
}

/** La meta de una cifra: el valor y de qué lado se cumple. */
export interface ResultGoal {
  value: number;
  /** `min`: se cumple de ahí hacia arriba; `max`: de ahí hacia abajo. */
  direction: "min" | "max";
}

/** Un término de una cifra compuesta: el indicador de un formato del
 *  proyecto, una constante o un operador. */
export type CompositeTerm =
  | { type: "result"; resultId: string }
  | { type: "const"; value: number }
  | { type: "op"; op: ComputedOperator };

export const RESULT_INTERVALS = ["day", "week", "month"] as const;
export type ResultInterval = (typeof RESULT_INTERVALS)[number];

/** Lo que vale cada celda de un mapa de calor. `failures`: los ítems no
 *  conformes de una lista de chequeo. */
export const HEAT_VALUES = ["count", "sum", "failures"] as const;
export type HeatValue = (typeof HEAT_VALUES)[number];

/** Lo que cualquier resultado de respuestas puede llevar además de lo
 *  suyo: las condiciones que deciden qué respuestas entran. Se cumplen
 *  todas; es la misma regla campo–operador–valor de la visibilidad. */
interface Filtered {
  filters?: VisibilityRule[];
}

export type ResultConfig =
  /** Una cifra: cuánto llevamos. */
  | ({
      type: "indicator";
      measure: Measure;
      goal?: ResultGoal;
      /** Enseña cuánto cambió frente al periodo anterior, de igual largo. */
      compare?: boolean;
    } & Filtered)
  /** La misma cifra, periodo a periodo: sube o baja. Con `series`, varias
   *  medidas en la misma gráfica. */
  | ({
      type: "trend";
      measure: Measure;
      interval: ResultInterval;
      series?: Measure[];
      goal?: ResultGoal;
    } & Filtered)
  /** Cómo se reparte entre las opciones de una lista o los elementos de un
   *  listado. */
  | ({ type: "distribution"; byFieldId: string; measure: Measure } & Filtered)
  /** El detalle: una fila por opción o elemento, con varias medidas y su
   *  total. */
  | ({ type: "table"; byFieldId: string; measures: Measure[] } & Filtered)
  /** El porcentaje de ítems conformes de una lista de chequeo, en el tiempo. */
  | ({
      type: "compliance";
      checklistFieldId: string;
      interval: ResultInterval;
      goal?: ResultGoal;
    } & Filtered)
  /** Los ítems de una lista de chequeo que más salen no conformes. */
  | ({ type: "findings"; checklistFieldId: string } & Filtered)
  /** Elemento por día: la hoja semanal del papel. */
  | ({
      type: "heatmap";
      rowFieldId: string;
      value: HeatValue;
      /** El campo numérico (`sum`) o la lista de chequeo (`failures`). */
      valueFieldId?: string;
    } & Filtered)
  /** Sólo en listados: los elementos cuya fecha está por vencer. */
  | { type: "expirations"; dateFieldIds: string[] }
  /** Una cifra hecha de indicadores de varios formatos: ausentismo ÷ HHT. */
  | {
      type: "composite";
      terms: CompositeTerm[];
      unit?: string;
      decimals?: number;
      goal?: ResultGoal;
    };

export const RESULT_LIMITS = {
  /** Resultados por formato: los define una persona, no la operación. */
  maxPerForm: 20,
  /** El rango más largo que se calcula, en días. */
  maxRangeDays: 400,
  maxNameLength: 60,
  maxMeasures: 6,
  /** Medidas de más en una tendencia: con la primera, cuatro series. */
  maxSeries: 3,
  /** Términos de una fórmula, operadores incluidos: cinco operandos. */
  maxTerms: 9,
  /** Indicadores distintos en una cifra compuesta: cada uno lee las
   *  respuestas de su formato. */
  maxCompositeResults: 4,
  maxFilters: 5,
  maxLabelLength: 40,
  maxUnitLength: 8,
  maxDecimals: 3,
  maxDateFields: 6,
  /** Filas de una distribución, una tabla o un mapa de calor: el resto se
   *  suma en «Otros» o se deja fuera, y se dice. */
  maxRows: 12,
  maxFindings: 8,
  maxExpirations: 30,
  /** Puntos de una tendencia: por encima, el intervalo se ensancha. */
  maxPoints: 62,
  /** Días a partir de los cuales una fecha se da por «próxima a vencer». */
  expirationWarningDays: 30,
} as const;

/* ───────────────────────────── Lo que se calcula ────────────────────────── */

export interface TrendPoint {
  /** El primer día del intervalo, `YYYY-MM-DD`. */
  key: string;
  value: number | null;
}

export interface CompliancePoint {
  key: string;
  ok: number;
  fail: number;
  /** De 0 a 100; `null` sin ítems respondidos en el intervalo. */
  percent: number | null;
}

export interface ExpirationRow {
  entryId: string;
  title: string;
  fieldLabel: string;
  date: string;
  /** Negativo: ya venció. */
  daysLeft: number;
}

export type ResultData =
  | {
      type: "indicator";
      value: number | null;
      responses: number;
      /** La misma cifra repartida en el periodo: la línea que la acompaña. */
      interval: ResultInterval;
      points: TrendPoint[];
      /** La cifra del periodo anterior, si el resultado se compara y se pudo
       *  leer entero. */
      previous?: number | null;
    }
  | {
      type: "trend";
      interval: ResultInterval;
      points: TrendPoint[];
      total: number | null;
      /** Las demás series, en el orden en que se definieron. */
      extra?: { points: TrendPoint[]; total: number | null }[];
    }
  | {
      type: "distribution";
      rows: { key: string; label: string; value: number }[];
      /** Lo que no cupo en las filas. */
      others: number;
    }
  | {
      type: "table";
      /** El campo por el que se agrupa: el rótulo de la primera columna. */
      groupLabel: string;
      columns: {
        operation: MeasureKind;
        fieldLabel: string | null;
        /** El nombre propio de la medida, si lo tiene. */
        label?: string;
        unit?: string;
        decimals?: number;
      }[];
      rows: { key: string; label: string; values: (number | null)[] }[];
      totals: (number | null)[];
    }
  | {
      type: "compliance";
      interval: ResultInterval;
      points: CompliancePoint[];
      percent: number | null;
      responses: number;
    }
  | {
      type: "findings";
      rows: { itemId: string; label: string; count: number }[];
      total: number;
      responses: number;
    }
  | {
      type: "heatmap";
      interval: "day" | "week";
      columns: string[];
      rows: { key: string; label: string; cells: (number | null)[] }[];
      max: number;
    }
  | {
      type: "expirations";
      rows: ExpirationRow[];
      expired: number;
      soon: number;
    }
  | {
      type: "composite";
      value: number | null;
      /** Cada indicador que entra en la cuenta, con lo que valió. */
      parts: {
        resultId: string;
        name: string;
        formName: string;
        value: number | null;
      }[];
    };
