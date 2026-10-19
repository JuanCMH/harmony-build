/** Los tamaños de un resultado en el tablero: el ancho en columnas de una
 *  retícula de doce y el alto en pisos
 *  (`docs/plans/2026-10-14-tablero-a-la-medida-design.md` §1 y §2).
 *
 *  Vive aquí y no en el paquete del tablero porque el servidor también lo
 *  necesita: guardar rechaza un alto que el tipo no admite.
 */

import type { ResultType } from "./result_types";
import type { WidgetHeight, WidgetSize } from "./result_validators";

/** Los altos que tiene sentido darle a cada tipo, de menor a mayor. Una cifra
 *  no se estira a cuatro pisos, y una tabla en dos no enseña nada. */
export const HEIGHTS_OF: Record<ResultType, readonly WidgetHeight[]> = {
  indicator: ["short", "medium"],
  composite: ["short", "medium"],
  trend: ["short", "medium", "tall"],
  compliance: ["short", "medium", "tall"],
  distribution: ["short", "medium", "tall"],
  findings: ["short", "medium", "tall"],
  expirations: ["short", "medium", "tall"],
  coverage: ["short", "medium", "tall"],
  tracking: ["short", "medium", "tall"],
  table: ["short", "medium", "tall"],
  heatmap: ["short", "medium", "tall"],
};

/** Con qué tamaño nace un resultado en el tablero. */
export const DEFAULT_WIDGET: Record<
  ResultType,
  { size: WidgetSize; height: WidgetHeight }
> = {
  indicator: { size: "third", height: "short" },
  composite: { size: "third", height: "short" },
  trend: { size: "half", height: "medium" },
  compliance: { size: "half", height: "medium" },
  distribution: { size: "half", height: "short" },
  findings: { size: "half", height: "medium" },
  expirations: { size: "half", height: "medium" },
  coverage: { size: "half", height: "tall" },
  tracking: { size: "half", height: "tall" },
  table: { size: "full", height: "medium" },
  heatmap: { size: "full", height: "medium" },
};

/** El alto con que se pinta: el guardado si el tipo lo admite, o el suyo por
 *  omisión. */
export const heightOf = (
  type: ResultType,
  height: WidgetHeight | undefined,
): WidgetHeight =>
  height && HEIGHTS_OF[type].includes(height)
    ? height
    : DEFAULT_WIDGET[type].height;

/** Cuántos pisos ocupa cada alto. Un alto es dos bajos apilados. */
export const FLOORS: Record<WidgetHeight, number> = {
  short: 2,
  medium: 3,
  tall: 4,
};

/** Cuántas columnas de doce ocupa cada ancho. */
export const COLUMNS: Record<WidgetSize, number> = {
  third: 4,
  half: 6,
  twoThirds: 8,
  full: 12,
};

const GRID_COLUMNS = 12;

export interface Placed {
  /** Fila y columna donde empieza, contando desde cero. */
  row: number;
  column: number;
  columns: number;
  floors: number;
}

/** Un espacio de la retícula que nada ocupa, dentro del alto del tablero. */
export interface Hole {
  row: number;
  column: number;
  columns: number;
  floors: number;
}

/**
 * Dónde cae cada resultado, como lo coloca CSS Grid sin `dense`: cada uno en
 * el primer sitio libre a partir del anterior, sin volver atrás. Y los huecos
 * que eso deja, para que el editor los enseñe.
 */
export function placeWidgets(
  widgets: readonly { size: WidgetSize; height: WidgetHeight }[],
): { placed: Placed[]; holes: Hole[]; floors: number } {
  const taken: boolean[][] = [];
  const isFree = (row: number, column: number) => !taken[row]?.[column];
  const fits = (
    row: number,
    column: number,
    columns: number,
    floors: number,
  ) => {
    for (let r = row; r < row + floors; r += 1) {
      for (let c = column; c < column + columns; c += 1) {
        if (!isFree(r, c)) return false;
      }
    }
    return true;
  };

  let cursor = { row: 0, column: 0 };
  const placed = widgets.map((widget) => {
    const columns = COLUMNS[widget.size];
    const floors = FLOORS[widget.height];
    let { row, column } = cursor;
    while (
      column + columns > GRID_COLUMNS ||
      !fits(row, column, columns, floors)
    ) {
      column += 1;
      if (column + columns > GRID_COLUMNS) {
        row += 1;
        column = 0;
      }
    }
    for (let r = row; r < row + floors; r += 1) {
      taken[r] ??= [];
      for (let c = column; c < column + columns; c += 1) taken[r][c] = true;
    }
    cursor = { row, column: column + columns };
    return { row, column, columns, floors };
  });

  const floors = Math.max(0, ...placed.map((one) => one.row + one.floors));
  // Los tramos libres de cada fila, y los que se repiten igual en la fila de
  // abajo se juntan en uno más alto.
  const holes: Hole[] = [];
  for (let row = 0; row < floors; row += 1) {
    let column = 0;
    while (column < GRID_COLUMNS) {
      if (!isFree(row, column)) {
        column += 1;
        continue;
      }
      const start = column;
      while (column < GRID_COLUMNS && isFree(row, column)) column += 1;
      const above = holes.find(
        (hole) =>
          hole.column === start &&
          hole.columns === column - start &&
          hole.row + hole.floors === row,
      );
      if (above) above.floors += 1;
      else
        holes.push({ row, column: start, columns: column - start, floors: 1 });
    }
  }
  return { placed, holes, floors };
}

const SIZE_OF_COLUMNS = new Map<number, WidgetSize>(
  Object.entries(COLUMNS).map(([size, columns]) => [
    columns,
    size as WidgetSize,
  ]),
);

/**
 * Qué resultado puede ensancharse para cerrar un hueco: el que lo tiene justo
 * a su izquierda, con el mismo alto, si su ancho más el del hueco es uno de
 * los cuatro anchos. `null` si ninguno.
 */
export function widenInto(
  placed: readonly Placed[],
  hole: Hole,
): { index: number; size: WidgetSize } | null {
  const index = placed.findIndex(
    (one) =>
      one.row === hole.row &&
      one.floors === hole.floors &&
      one.column + one.columns === hole.column,
  );
  if (index === -1) return null;
  const size = SIZE_OF_COLUMNS.get(placed[index].columns + hole.columns);
  return size ? { index, size } : null;
}
