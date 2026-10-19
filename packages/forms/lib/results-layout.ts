import type { ResultType } from "@/convex/lib/result_types";
import type { WidgetHeight, WidgetSize } from "@/convex/lib/result_validators";
import { FLOORS, HEIGHTS_OF } from "@/convex/lib/widget_layout";

interface Item {
  type: ResultType;
  /** El alto en que mejor caben hoy sus datos (`suggestedHeight`). */
  height: WidgetHeight;
}

export interface Arranged {
  /** La posición del resultado en la lista que entró. */
  index: number;
  size: WidgetSize;
  height: WidgetHeight;
}

const isFigure = (type: ResultType) =>
  type === "indicator" || type === "composite";
const isWide = (type: ResultType) => type === "table" || type === "heatmap";

/** El más alto de los dos que el tipo admita. */
const tallest = (type: ResultType, a: WidgetHeight, b: WidgetHeight) => {
  const wanted = FLOORS[a] >= FLOORS[b] ? a : b;
  return HEIGHTS_OF[type].includes(wanted) ? wanted : a;
};

/**
 * El acomodo de los resultados en la página de un formato, donde nadie los
 * ordena a mano: las cifras de tres en tres, las gráficas y las listas de dos
 * en dos con el mismo alto, y lo que pide la fila, al final. Lo que queda
 * suelto se ensancha a la fila entera, para que ninguna fila deje un hueco
 * (`docs/plans/2026-10-14-tablero-a-la-medida-design.md` §1).
 */
export function arrangeResults(items: readonly Item[]): Arranged[] {
  const indexed = items.map((item, index) => ({ ...item, index }));
  const figures = indexed.filter((item) => isFigure(item.type));
  const wide = indexed.filter((item) => isWide(item.type));
  // Las más altas primero, para que cada pareja se parezca.
  const halves = indexed
    .filter((item) => !isFigure(item.type) && !isWide(item.type))
    .sort((a, b) => FLOORS[b.height] - FLOORS[a.height] || a.index - b.index);

  const out: Arranged[] = [];
  const loose = figures.length % 3;
  figures.forEach((item, at) => {
    const inLast = at >= figures.length - loose;
    out.push({
      index: item.index,
      // Una suelta va a la fila entera; dos sueltas, a media fila cada una.
      size: !inLast ? "third" : loose === 1 ? "full" : "half",
      height: "short",
    });
  });
  for (let at = 0; at < halves.length; at += 2) {
    const one = halves[at];
    const two = halves[at + 1];
    if (!two) {
      out.push({ index: one.index, size: "full", height: one.height });
      continue;
    }
    const height = tallest(one.type, one.height, two.height);
    out.push({ index: one.index, size: "half", height });
    out.push({
      index: two.index,
      size: "half",
      height: tallest(two.type, height, two.height),
    });
  }
  for (const item of wide) {
    out.push({ index: item.index, size: "full", height: item.height });
  }
  return out;
}
