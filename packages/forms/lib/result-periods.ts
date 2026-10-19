import { type Bucket, bucketEnd } from "@/convex/lib/date_buckets";

/**
 * Qué periodos de una gráfica corta el rango que se mira: el primero, si el
 * rango empieza a mitad de su semana o su mes, y el último, si termina antes
 * —la semana en curso—. Un periodo cortado suma menos porque tiene menos
 * días, y dibujado como los demás se lee como una caída
 * (`docs/plans/2026-10-14-tablero-a-la-medida-design.md` §4).
 *
 * `keys` son los primeros días de cada periodo, en orden.
 */
export function cutPeriods(
  interval: Bucket,
  keys: readonly string[],
  range: { from: string; to: string },
): { first: boolean; last: boolean } {
  if (interval === "day" || keys.length === 0) {
    return { first: false, last: false };
  }
  const last = keys[keys.length - 1];
  return {
    first: keys[0] < range.from,
    last: bucketEnd(interval, last) > range.to,
  };
}

/** Si el punto `index` de `count` es un periodo cortado. */
export const isCut = (
  cut: { first: boolean; last: boolean },
  index: number,
  count: number,
) => (cut.first && index === 0) || (cut.last && index === count - 1);
