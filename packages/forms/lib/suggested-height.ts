import { MIN_POINTS } from "@/convex/lib/date_buckets";
import type { ResultData, ResultType } from "@/convex/lib/result_types";
import type { WidgetHeight } from "@/convex/lib/result_validators";
import { DEFAULT_WIDGET, FLOORS, HEIGHTS_OF } from "@/convex/lib/widget_layout";

/** Un piso de la retícula y su separación (`widget-grid.ts`). */
const FLOOR = 136;
const GAP = 16;
/** Lo que la tarjeta se queda antes del contenido: el borde, los márgenes, el
 *  título en una línea y su separación (`WidgetCard`). */
const CHROME = 82;
const bodyOf = (height: WidgetHeight) =>
  FLOORS[height] * FLOOR + (FLOORS[height] - 1) * GAP - CHROME;

/** Lo que cada tipo pone antes de su lista, y lo que mide cada fila
 *  (`ResultView`). */
function listOf(
  data: ResultData,
): { rows: number; rowHeight: number; above: number } | null {
  const long = (labels: string[]) =>
    labels.some((label) => label.length > 28) ? 52 : 32;
  switch (data.type) {
    case "distribution":
      return {
        rows: data.rows.length + (data.others > 0 ? 1 : 0),
        rowHeight: long(data.rows.map((row) => row.label)),
        above: 0,
      };
    case "findings":
      return {
        rows: data.rows.length,
        rowHeight: long(data.rows.map((row) => row.label)),
        above: 30,
      };
    case "expirations":
      return { rows: data.rows.length, rowHeight: 48, above: 34 };
    case "table":
      // La tabla va a sangre: gana el margen de abajo de la tarjeta.
      return { rows: data.rows.length + 2, rowHeight: 36, above: -16 };
    case "heatmap":
      return { rows: data.rows.length, rowHeight: 26, above: 52 };
    case "composite":
      return { rows: data.parts.length, rowHeight: 44, above: 66 };
    case "tracking":
      return data.open === 0
        ? null
        : { rows: Math.min(data.open, 8), rowHeight: 48, above: 112 };
    case "coverage":
      return {
        rows: data.rows.length + data.others,
        rowHeight: 48,
        // Alto: la línea va encima de los elementos.
        above: data.points.length >= MIN_POINTS ? 272 : 100,
      };
    default:
      return null;
  }
}

/**
 * El alto en que mejor cabe hoy un resultado: el más bajo en que entran
 * todas sus filas. Lo que no es una lista —una cifra, una línea— se queda con
 * el de su tipo. Es una sugerencia del editor, no se impone
 * (`docs/plans/2026-10-14-tablero-a-la-medida-design.md` §6).
 */
export function suggestedHeight(
  type: ResultType,
  data: ResultData | undefined,
): WidgetHeight {
  const fallback = DEFAULT_WIDGET[type].height;
  const list = data ? listOf(data) : null;
  if (!list) {
    // Un seguimiento sin nada abierto no tiene lista que enseñar.
    return data?.type === "tracking" ? "short" : fallback;
  }
  const heights = HEIGHTS_OF[type];
  // Un programa con línea la quiere junto a sus elementos: va alto.
  if (data?.type === "coverage" && data.points.length >= MIN_POINTS) {
    return "tall";
  }
  const fits = heights.find(
    (height) => list.rows * list.rowHeight <= bodyOf(height) - list.above,
  );
  // Si ni en el más alto caben todas, el más alto: el resto se resume.
  return fits ?? heights[heights.length - 1];
}
