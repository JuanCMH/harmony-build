import { isBlankCell } from "@/convex/lib/stored_values";
import { FORM_LIMITS, type TableConfig } from "@/convex/lib/form_types";

/**
 * Las filas de una tabla, sin pintar nada: cuántas nacen, cuándo se puede
 * añadir o quitar una, y cómo cambia una celda sin tocar las demás.
 *
 * En memoria una celda puede llevar lo que todavía no se guarda —una foto o
 * una firma sin subir—, así que aquí el valor de una celda es `unknown`: qué
 * forma tiene lo decide la columna, y lo valida `validateValues`.
 */

/** Una fila mientras se diligencia: sus celdas pueden llevar un archivo
 *  pendiente, que todavía no es un `CellValue`. */
export interface DraftRow {
  rowId: string;
  cells: { columnId: string; value: unknown }[];
}

const ROW_ID_PREFIX = "fila-";

export const isDraftRow = (value: unknown): value is DraftRow =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as DraftRow).rowId === "string" &&
  Array.isArray((value as DraftRow).cells);

/** Cuántas filas tiene que haber como mínimo a la vista: las que pide la
 *  tabla, y al menos una si es obligatoria —una tabla obligatoria sin ninguna
 *  fila no se puede llenar—. */
export const minimumRows = (config: TableConfig, required: boolean): number =>
  Math.max(config.minRows ?? 0, required ? 1 : 0);

/** El tope de filas: el de la tabla, sin pasar nunca del límite del formato. */
export const maximumRows = (config: TableConfig): number =>
  Math.min(
    config.maxRows ?? FORM_LIMITS.maxTableRows,
    FORM_LIMITS.maxTableRows,
  );

/**
 * El id de la fila siguiente: `fila-N`, con N uno más que el mayor que haya.
 *
 * Sale de las filas y no del reloj ni del azar: un id sólo tiene que ser único
 * dentro de su tabla, y así la función es pura y dos filas añadidas en el mismo
 * milisegundo no chocan. No se reutiliza el número de una fila quitada
 * mientras quede una posterior.
 */
export const nextRowId = (rows: readonly DraftRow[]): string => {
  const highest = rows.reduce((max, row) => {
    const match = /^fila-(\d+)$/.exec(row.rowId);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return `${ROW_ID_PREFIX}${highest + 1}`;
};

const emptyRow = (rows: readonly DraftRow[]): DraftRow => ({
  rowId: nextRowId(rows),
  cells: [],
});

/**
 * Las filas que se pintan: las que hay, completadas con filas vacías hasta el
 * mínimo. Una tabla nace con sus filas mínimas ya abiertas: pedir que se pulse
 * «Añadir» antes de poder escribir la primera es un toque de más.
 *
 * Lo que no tiene forma de fila —un valor corrupto de un borrador viejo— se
 * descarta.
 */
export function ensureRows(
  value: unknown,
  config: TableConfig,
  required: boolean,
): DraftRow[] {
  const rows: DraftRow[] = Array.isArray(value) ? value.filter(isDraftRow) : [];
  while (rows.length < minimumRows(config, required)) {
    rows.push(emptyRow(rows));
  }
  return rows;
}

export const canAddRow = (
  rows: readonly DraftRow[],
  config: TableConfig,
): boolean => rows.length < maximumRows(config);

export const canRemoveRow = (
  rows: readonly DraftRow[],
  config: TableConfig,
  required: boolean,
): boolean => rows.length > minimumRows(config, required);

/** Añade una fila vacía al final, si cabe. */
export const addRow = (
  rows: readonly DraftRow[],
  config: TableConfig,
): DraftRow[] =>
  canAddRow(rows, config) ? [...rows, emptyRow(rows)] : [...rows];

/** Quita una fila, si la tabla puede quedarse con una menos. */
export const removeRow = (
  rows: readonly DraftRow[],
  config: TableConfig,
  required: boolean,
  rowId: string,
): DraftRow[] =>
  canRemoveRow(rows, config, required)
    ? rows.filter((row) => row.rowId !== rowId)
    : [...rows];

export const cellValue = (row: DraftRow, columnId: string): unknown =>
  row.cells.find((cell) => cell.columnId === columnId)?.value;

/**
 * Cambia una celda y devuelve todas las filas. Una celda que queda vacía
 * **desaparece** de su fila: así una fila sin nada escrito es una fila sin
 * celdas, que es como el servidor reconoce la que nadie llenó.
 *
 * Las celdas quedan en el orden de las columnas de la tabla, se llenen en el
 * orden que se llenen.
 */
export function setCell(
  rows: readonly DraftRow[],
  config: TableConfig,
  rowId: string,
  columnId: string,
  value: unknown,
): DraftRow[] {
  return rows.map((row) => {
    if (row.rowId !== rowId) return row;
    const byColumn = new Map(
      row.cells.map((cell) => [cell.columnId, cell.value]),
    );
    if (isBlankCell(value)) byColumn.delete(columnId);
    else byColumn.set(columnId, value);

    return {
      rowId,
      cells: config.columns.flatMap((column) =>
        byColumn.has(column.id)
          ? [{ columnId: column.id, value: byColumn.get(column.id) }]
          : [],
      ),
    };
  });
}

/** Una fila en la que nadie ha escrito nada. */
export const isEmptyRow = (row: DraftRow): boolean =>
  row.cells.every((cell) => isBlankCell(cell.value));

/** Cuántas filas tienen algo escrito: las que se van a guardar. */
export const countFilledRows = (rows: readonly DraftRow[]): number =>
  rows.filter((row) => !isEmptyRow(row)).length;
