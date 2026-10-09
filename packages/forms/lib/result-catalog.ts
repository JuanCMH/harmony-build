import { toDate } from "@/packages/forms/lib/date-value";
import type {
  HeatValue,
  MeasureKind,
  ResultGoal,
  ResultInterval,
  ResultType,
} from "@/convex/lib/result_types";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  CalendarClock,
  ChartColumn,
  ChartLine,
  ClipboardCheck,
  Gauge,
  Grid3x3,
  Calculator,
  type LucideIcon,
  Table2,
  TriangleAlert,
} from "lucide-react";

/**
 * El catálogo de resultados, como se nombra en la interfaz: qué es cada tipo,
 * qué responde y con qué icono se reconoce (`03 §5`).
 */
export const RESULT_CATALOG: Record<
  ResultType,
  {
    label: string;
    question: string;
    /** Cómo se lee: lo que dice la ayuda de su tarjeta. */
    help: string;
    icon: LucideIcon;
  }
> = {
  indicator: {
    label: "Indicador",
    question: "¿Cuánto llevamos?",
    help: "La cifra de todo el periodo elegido.",
    icon: Gauge,
  },
  trend: {
    label: "Tendencia",
    question: "¿Sube o baja?",
    help: "La misma cifra, periodo a periodo. Un hueco en la línea es un periodo sin respuestas.",
    icon: ChartLine,
  },
  distribution: {
    label: "Distribución",
    question: "¿Cómo se reparte?",
    help: "Cómo se reparten las respuestas del periodo entre las opciones de un campo, de mayor a menor.",
    icon: ChartColumn,
  },
  table: {
    label: "Tabla",
    question: "¿Cuál es el detalle?",
    help: "El detalle del periodo: una fila por grupo y el total al pie.",
    icon: Table2,
  },
  compliance: {
    label: "Cumplimiento",
    question: "¿Qué tan bien salen las inspecciones?",
    help: "Ítems conformes sobre los ítems respondidos. Los que no aplican no cuentan.",
    icon: ClipboardCheck,
  },
  findings: {
    label: "Hallazgos frecuentes",
    question: "¿Qué falla más?",
    help: "Los ítems que más veces salieron no conformes en el periodo.",
    icon: TriangleAlert,
  },
  heatmap: {
    label: "Mapa de calor",
    question: "¿Dónde y cuándo?",
    help: "Cada celda es un elemento en un día o una semana: más oscuro, más cantidad. La punteada no tuvo respuesta.",
    icon: Grid3x3,
  },
  expirations: {
    label: "Vencimientos",
    question: "¿Qué se vence pronto?",
    help: "Las fechas de los elementos activos del listado, la más próxima primero. No depende del periodo.",
    icon: CalendarClock,
  },
  composite: {
    label: "Cifra compuesta",
    question: "¿Cuánto da una cuenta entre indicadores?",
    help: "Una cuenta entre indicadores de uno o varios formatos, todos del mismo periodo. Debajo va lo que valió cada uno.",
    icon: Calculator,
  },
};

export const OPERATION_LABEL: Record<MeasureKind, string> = {
  count: "Contar respuestas",
  sum: "Suma",
  average: "Promedio",
  last: "Último valor",
  min: "Mínimo",
  max: "Máximo",
  formula: "Fórmula entre cifras",
};

export const INTERVAL_LABEL: Record<ResultInterval, string> = {
  day: "Por día",
  week: "Por semana",
  month: "Por mes",
};

export const HEAT_VALUE_LABEL: Record<HeatValue, string> = {
  count: "Cuántas respuestas hubo",
  sum: "La suma de un campo numérico",
  failures: "Los ítems no conformes de una lista de chequeo",
};

/** «Respuestas», «Suma de Horas»: el nombre de una medida. El suyo propio
 *  manda; una fórmula sin nombre se llama «Fórmula». */
export const measureLabel = (
  measure: { operation: MeasureKind; label?: string },
  fieldLabel: string | null,
): string => {
  if (measure.label) return measure.label;
  if (measure.operation === "formula") return "Fórmula";
  return measure.operation === "count" || fieldLabel === null
    ? "Respuestas"
    : `${OPERATION_LABEL[measure.operation]} de ${fieldLabel}`;
};

export const formatNumber = (value: number, digits = 1): string =>
  new Intl.NumberFormat("es-CO", { maximumFractionDigits: digits }).format(
    value,
  );

/** Cómo se escribe una cifra: sus decimales y su unidad. */
export interface NumberFormat {
  unit?: string;
  decimals?: number;
}

/** Una cifra con su formato: «5,75 h», «0,5 %». Sin decimales fijados, hasta
 *  uno; con ellos, exactamente esos. */
export const formatWith = (
  value: number | null,
  format: NumberFormat = {},
): string => {
  if (value === null) return "—";
  const text =
    format.decimals === undefined
      ? formatNumber(value)
      : new Intl.NumberFormat("es-CO", {
          minimumFractionDigits: format.decimals,
          maximumFractionDigits: format.decimals,
        }).format(value);
  return format.unit ? `${text} ${format.unit}` : text;
};

/** Si una cifra cumple su meta. `null` sin cifra: no se juzga lo que no hay. */
export const meetsGoal = (
  value: number | null,
  goal: ResultGoal,
): boolean | null =>
  value === null
    ? null
    : goal.direction === "min"
      ? value >= goal.value
      : value <= goal.value;

/** «Meta: al menos 95 %». */
export const goalText = (goal: ResultGoal, format: NumberFormat = {}) =>
  `Meta: ${goal.direction === "min" ? "al menos" : "como máximo"} ${formatWith(goal.value, format)}`;

/** Cuánto cambió una cifra frente a la anterior, en porcentaje. `null` si no
 *  hay con qué comparar o la anterior era cero. */
export const changeFrom = (
  value: number | null,
  previous: number | null | undefined,
): number | null =>
  value === null || previous == null || previous === 0
    ? null
    : ((value - previous) / Math.abs(previous)) * 100;

/** Un valor que puede faltar: un promedio de nada no es cero. */
export const formatValue = (value: number | null): string =>
  value === null ? "—" : formatNumber(value);

/** El rótulo de un punto en el eje: «28 sep», «oct 2026». */
export function bucketLabel(interval: ResultInterval, key: string): string {
  const date = toDate(key);
  if (!date) return key;
  return interval === "month"
    ? format(date, "MMM yyyy", { locale: es })
    : format(date, "d MMM", { locale: es });
}

/** El rótulo de un punto, entero: «Semana del 28 de septiembre». */
export function bucketTitle(interval: ResultInterval, key: string): string {
  const date = toDate(key);
  if (!date) return key;
  if (interval === "month") {
    return format(date, "MMMM 'de' yyyy", { locale: es });
  }
  const day = format(date, "d 'de' MMMM", { locale: es });
  return interval === "week" ? `Semana del ${day}` : day;
}

/** El color de cada serie de una tendencia, en orden fijo: la primera lleva
 *  el de la marca. Una serie no cambia de color porque otra desaparezca. */
export const SERIES_COLORS = [
  "var(--color-h-indigo)",
  "var(--chart-2)",
  "var(--chart-1)",
  "var(--chart-4)",
] as const;
