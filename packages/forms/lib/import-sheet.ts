/** La hoja de un archivo, lista para asignar sus columnas.
 *
 *  Puro: recibe la matriz de celdas que entregó el lector —`exceljs` o
 *  `parseCsv`— y devuelve los encabezados y las filas con datos, cada una con
 *  la línea que ocupa en el archivo, que es como se le nombra a quien importa.
 */

import { type ImportCell, isBlankCell } from "./import-cells";

export interface ImportRow {
  /** La línea en el archivo, contando desde 1. */
  line: number;
  cells: ImportCell[];
}

export interface ImportSheet {
  headers: string[];
  rows: ImportRow[];
}

/**
 * El valor de una celda de `exceljs`, como celda de importación.
 *
 * Una fórmula entrega su resultado; un texto con formato, su texto; un
 * enlace, lo que se lee. Un error de fórmula es una celda vacía.
 */
export function normalizeExcelValue(value: unknown): ImportCell {
  if (value === null || value === undefined) return null;
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  if (value instanceof Date) return value;
  if (typeof value !== "object") return null;

  const cell = value as {
    richText?: { text?: unknown }[];
    text?: unknown;
    result?: unknown;
    error?: unknown;
  };
  if (Array.isArray(cell.richText)) {
    return cell.richText
      .map((part) => (typeof part.text === "string" ? part.text : ""))
      .join("");
  }
  if (cell.error !== undefined) return null;
  if ("result" in cell) return normalizeExcelValue(cell.result);
  if (cell.text !== undefined) return normalizeExcelValue(cell.text);
  return null;
}

const headerText = (cell: ImportCell, index: number) => {
  const text =
    cell instanceof Date
      ? ""
      : String(cell ?? "")
          .replace(/\s+/g, " ")
          .trim();
  return text === "" ? `Columna ${index + 1}` : text;
};

/**
 * De la matriz de un archivo a su hoja: la primera fila con datos son los
 * encabezados; las filas vacías se descartan, conservando la línea de las
 * demás; las columnas vacías del final, también.
 */
export function sheetFromMatrix(matrix: readonly ImportCell[][]): ImportSheet {
  const filled = matrix
    .map((cells, index) => ({ line: index + 1, cells }))
    .filter((row) => row.cells.some((cell) => !isBlankCell(cell)));
  if (filled.length === 0) return { headers: [], rows: [] };

  const [head, ...body] = filled;
  let width = 0;
  for (const row of filled) {
    for (let index = row.cells.length - 1; index >= width; index--) {
      if (!isBlankCell(row.cells[index] ?? null)) {
        width = index + 1;
        break;
      }
    }
  }

  const pad = (cells: ImportCell[]) =>
    Array.from({ length: width }, (_, index) => cells[index] ?? null);

  return {
    headers: pad(head.cells).map(headerText),
    rows: body.map((row) => ({ line: row.line, cells: pad(row.cells) })),
  };
}
