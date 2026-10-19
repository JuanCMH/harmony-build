/** Leer el archivo de una importación, en el navegador.
 *
 *  El `.xlsx` lo lee `exceljs`, que se carga **sólo aquí**, al abrir uno
 *  (`02 §1`): pesa, y quien diligencia en el teléfono no lo necesita. El
 *  `.csv` lo lee `parseCsv`. Al servidor no viaja el archivo: viajan filas ya
 *  interpretadas.
 */

import { IMPORT_LIMITS } from "@/convex/lib/import_types";

import type { ImportCell } from "./import-cells";
import { parseCsv } from "./import-csv";
import {
  type ImportSheet,
  normalizeExcelValue,
  sheetFromMatrix,
} from "./import-sheet";

export const IMPORT_ACCEPT = ".xlsx,.csv";

const extensionOf = (name: string) =>
  name.slice(name.lastIndexOf(".") + 1).toLowerCase();

const thousands = (value: number) => value.toLocaleString("es-CO");

/** Por qué no se puede leer este archivo, antes de abrirlo. `null` si se
 *  puede. */
export function fileProblem(file: { name: string; size: number }):
  | string
  | null {
  const extension = extensionOf(file.name);
  if (extension === "xls") {
    return "El formato .xls antiguo no se puede leer: guárdalo como .xlsx desde Excel";
  }
  if (extension !== "xlsx" && extension !== "csv") {
    return "Elige un archivo .xlsx o .csv";
  }
  if (file.size > IMPORT_LIMITS.maxFileMb * 1024 * 1024) {
    return `El archivo pesa más de ${IMPORT_LIMITS.maxFileMb} MB: pártelo en varios`;
  }
  return null;
}

/** Por qué no se puede importar esta hoja, ya leída. `null` si se puede. */
export function sheetProblem(sheet: ImportSheet): string | null {
  if (sheet.headers.length === 0) return "El archivo está vacío";
  if (sheet.rows.length === 0) {
    return "El archivo sólo trae la fila de encabezados";
  }
  if (sheet.rows.length > IMPORT_LIMITS.maxRows) {
    return `El archivo trae ${thousands(sheet.rows.length)} filas y se admiten ${thousands(IMPORT_LIMITS.maxRows)}: pártelo en varios`;
  }
  return null;
}

/** El texto de un `.csv`: UTF-8, y si no lo es, el Latin-1 con que lo guarda
 *  un Excel antiguo. */
function decodeText(buffer: ArrayBuffer): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    return new TextDecoder("windows-1252").decode(buffer);
  }
}

async function readXlsx(buffer: ArrayBuffer): Promise<ImportCell[][]> {
  const { Workbook } = await import("exceljs");
  const workbook = new Workbook();
  await workbook.xlsx.load(buffer);

  // La primera hoja con algo escrito: un libro suele traer una sola.
  const sheet =
    workbook.worksheets.find((candidate) => candidate.actualRowCount > 0) ??
    workbook.worksheets[0];
  if (!sheet) return [];

  const matrix: ImportCell[][] = [];
  sheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
    const cells: ImportCell[] = [];
    row.eachCell({ includeEmpty: true }, (cell, columnNumber) => {
      cells[columnNumber - 1] = normalizeExcelValue(cell.value);
    });
    matrix[rowNumber - 1] = Array.from(cells, (cell) => cell ?? null);
  });
  return Array.from(matrix, (row) => row ?? []);
}

/** La hoja de un archivo. Lanza si el archivo no se puede abrir. */
export async function readImportFile(file: File): Promise<ImportSheet> {
  const buffer = await file.arrayBuffer();
  const matrix =
    extensionOf(file.name) === "csv"
      ? parseCsv(decodeText(buffer))
      : await readXlsx(buffer);
  return sheetFromMatrix(matrix);
}

/** La huella del contenido de un archivo: con ella se avisa de una segunda
 *  subida del mismo. */
export async function fingerprintOf(file: File): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    await file.arrayBuffer(),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}
