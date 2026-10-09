import { RESULT_LIMITS } from "@/convex/lib/result_types";
import { addDays, bucketStart } from "@/convex/lib/date_buckets";
import { isRealDate } from "@/convex/lib/value_validation";

/**
 * El rango de fechas con que se miran los resultados. Vive en la dirección
 * (`02 §8`), y la dirección la escribe cualquiera: lo que no es una fecha, o
 * un rango al revés, cae en el rango por omisión.
 */

export interface ResultsRange {
  from: string;
  to: string;
}

/** Los últimos `days` días, hoy incluido. */
export const lastDays = (today: string, days: number): ResultsRange => ({
  from: addDays(today, -(days - 1)),
  to: today,
});

const monthStart = (date: string) => bucketStart("month", date);

/**
 * Los atajos del periodo, en el orden en que se ofrecen: primero los que se
 * mueven con el día, después los del calendario. Cada uno sabe su rango a
 * partir de hoy; la dirección guarda las fechas, no el atajo.
 */
export const RANGE_PRESETS = [
  {
    id: "7",
    label: "Últimos 7 días",
    range: (today: string) => lastDays(today, 7),
  },
  {
    id: "30",
    label: "Últimos 30 días",
    range: (today: string) => lastDays(today, 30),
  },
  {
    id: "90",
    label: "Últimos 90 días",
    range: (today: string) => lastDays(today, 90),
  },
  {
    id: "month",
    label: "Este mes",
    range: (today: string) => ({ from: monthStart(today), to: today }),
  },
  {
    id: "lastMonth",
    label: "Mes pasado",
    range: (today: string) => {
      const end = addDays(monthStart(today), -1);
      return { from: monthStart(end), to: end };
    },
  },
  {
    id: "year",
    label: "Este año",
    range: (today: string) => ({
      from: `${today.slice(0, 4)}-01-01`,
      to: today,
    }),
  },
] as const satisfies readonly {
  id: string;
  label: string;
  range: (today: string) => ResultsRange;
}[];

export const DEFAULT_RANGE_DAYS = 30;

/** El rango que pide la dirección, o los últimos treinta días. */
export function resolveRange(
  raw: { from: string | null; to: string | null },
  today: string,
): ResultsRange {
  const { from, to } = raw;
  if (from && to && isRealDate(from) && isRealDate(to) && from <= to) {
    // El servidor no calcula más de `maxRangeDays`: un rango más largo se
    // recorta por el principio en vez de quedarse sin datos.
    const earliest = addDays(to, -RESULT_LIMITS.maxRangeDays);
    return { from: from < earliest ? earliest : from, to };
  }
  return lastDays(today, DEFAULT_RANGE_DAYS);
}

/** El atajo que coincide con el rango, si alguno. Dos atajos pueden dar el
 *  mismo rango —el día 30, «Este mes» y «Últimos 30 días»—: gana el primero. */
export const presetOf = (range: ResultsRange, today: string) =>
  RANGE_PRESETS.find((preset) => {
    const expected = preset.range(today);
    return expected.from === range.from && expected.to === range.to;
  }) ?? null;
