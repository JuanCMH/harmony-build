import { flattenFields } from "@/convex/lib/form_evaluation";
import type { FieldType, FormSection } from "@/convex/lib/form_types";

/**
 * Las columnas del listado de respuestas, y cómo se lee cada celda.
 *
 * El servidor entrega de cada fila el texto de sus columnas, en el orden de
 * los campos `showInTable` de la versión publicada. Aquí se les pone
 * encabezado y se decide qué celda lleva color. Sin pedir nada más al
 * servidor: todo sale de lo que ya viene en la fila.
 */

export interface ResponseColumn {
  fieldId: string;
  label: string;
  type: FieldType;
}

/** Las cifras van a la derecha, con el ancho de sus dígitos igualado. */
const NUMERIC_TYPES: readonly FieldType[] = ["number", "currency"];

export const isNumericColumn = (column: ResponseColumn): boolean =>
  NUMERIC_TYPES.includes(column.type);

/** Los encabezados: los campos `showInTable` de la versión publicada, en el
 *  orden del formato. Es el mismo orden en que el servidor manda `columns`. */
export const responseColumns = (
  sections: readonly FormSection[],
): ResponseColumn[] =>
  flattenFields(sections)
    .filter((field) => field.showInTable)
    .map((field) => ({
      fieldId: field.id,
      label: field.label,
      type: field.type,
    }));

/**
 * Los encabezados de un listado de elementos. El campo de título ya es la
 * primera columna de la tabla: repetirlo entre las demás sería el mismo dato
 * dos veces en cada fila.
 */
export const entryColumns = (
  sections: readonly FormSection[],
  titleFieldId: string | undefined,
): ResponseColumn[] =>
  responseColumns(sections).filter((column) => column.fieldId !== titleFieldId);

export interface ChecklistCounts {
  ok: number;
  fail: number;
  na: number;
  unanswered: number;
}

const COUNT_PATTERNS: ReadonlyArray<[keyof ChecklistCounts, RegExp]> = [
  // El orden importa: «no conformes» contiene «conformes».
  ["fail", /^(\d+) no conformes?$/],
  ["ok", /^(\d+) conformes?$/],
  ["na", /^(\d+) no aplican?$/],
  ["unanswered", /^(\d+) sin responder$/],
];

/**
 * Las cifras de un resumen de lista de chequeo, leídas de su texto.
 *
 * El servidor escribe siempre las tres —«63 conformes · 0 no conformes · 0 no
 * aplica»—, así que buscar «no conforme» en el texto no distingue nada: lo que
 * distingue es que su cifra no sea cero. `null` si el texto no es un resumen.
 */
export function parseChecklistSummary(text: string): ChecklistCounts | null {
  const counts: ChecklistCounts = { ok: 0, fail: 0, na: 0, unanswered: 0 };
  let matched = false;

  for (const part of text.split(" · ")) {
    const found = COUNT_PATTERNS.find(([, pattern]) => pattern.test(part));
    if (!found) return null;
    const [key, pattern] = found;
    counts[key] = Number(pattern.exec(part)?.[1] ?? 0);
    matched = true;
  }
  return matched ? counts : null;
}

const counted = (count: number, one: string, many: string) =>
  `${count} ${count === 1 ? one : many}`;

/** «61 conformes · 2 no conformes». Lo que no ocurrió no se dice: en una
 *  columna de cincuenta filas, «0 no aplica» cincuenta veces es ruido. Los
 *  conformes salen siempre, aunque sean cero. */
export const checklistCellText = (counts: ChecklistCounts): string =>
  [
    counted(counts.ok, "conforme", "conformes"),
    ...(counts.fail > 0
      ? [counted(counts.fail, "no conforme", "no conformes")]
      : []),
    ...(counts.na > 0 ? [`${counts.na} no aplica`] : []),
    ...(counts.unanswered > 0 ? [`${counts.unanswered} sin responder`] : []),
  ].join(" · ");

export interface ResponseCell {
  fieldId: string;
  label: string;
  /** Lo que se lee. Vacío si la respuesta no tiene ese dato. */
  text: string;
  /** Una lista de chequeo con algún ítem no conforme. */
  hasFindings: boolean;
  numeric: boolean;
}

/**
 * Las celdas de una fila, una por encabezado y en su orden.
 *
 * Se casan por `fieldId` y no por posición: si el formato se publica entre
 * que llega la fila y llegan los encabezados, las posiciones ya no coinciden
 * y una placa acabaría bajo «Conductor».
 */
export function responseCells(
  columns: readonly ResponseColumn[],
  row: ReadonlyArray<{ fieldId: string; text: string }>,
): ResponseCell[] {
  const textById = new Map(row.map((cell) => [cell.fieldId, cell.text]));

  return columns.map((column) => {
    const text = textById.get(column.fieldId) ?? "";
    const counts =
      column.type === "checklist" ? parseChecklistSummary(text) : null;
    return {
      fieldId: column.fieldId,
      label: column.label,
      text: counts ? checklistCellText(counts) : text,
      hasFindings: (counts?.fail ?? 0) > 0,
      numeric: isNumericColumn(column),
    };
  });
}

export interface CellPart {
  text: string;
  /** El trozo que dice cuántos ítems no cumplen: el único que va en rojo. */
  isFinding: boolean;
}

const FINDING_PART = /^\d+ no conformes?$/;

/**
 * Una celda partida en lo que se pinta igual y lo que se pinta en rojo.
 *
 * Sólo se parte la de una lista de chequeo con hallazgos: «61 conformes · 2
 * no conformes» lleva en rojo el segundo trozo y nada más. Pintar la celda
 * entera haría rojos también los conformes.
 */
export const cellParts = (cell: ResponseCell): CellPart[] =>
  cell.hasFindings
    ? cell.text
        .split(" · ")
        .map((text) => ({ text, isFinding: FINDING_PART.test(text) }))
    : [{ text: cell.text, isFinding: false }];

/** Cuántos datos caben bajo el título de una fila en el teléfono. */
export const PHONE_ROW_DETAILS = 3;

/** Lo esencial de una fila para el teléfono: sus primeros datos con
 *  respuesta. Una celda vacía no gasta uno de los tres sitios. Los hallazgos
 *  de una lista de chequeo son lo que quien revisa busca, así que no se
 *  quedan fuera por estar en la cuarta columna: ocupan los últimos sitios,
 *  y el orden del formato se conserva. */
export const phoneRowDetails = (
  cells: readonly ResponseCell[],
  limit = PHONE_ROW_DETAILS,
): ResponseCell[] => {
  const answered = cells.filter((cell) => cell.text !== "");
  const findings = answered.filter((cell) => cell.hasFindings).slice(0, limit);
  const others = answered
    .filter((cell) => !cell.hasFindings)
    .slice(0, limit - findings.length);
  const chosen = new Set([...others, ...findings]);
  return answered.filter((cell) => chosen.has(cell));
};

const plural = (count: number, one: string, many: string) =>
  count === 1 ? one : many;

/** «50 respuestas cargadas», «1 elemento». Con más páginas por traer se dice
 *  que son las cargadas: no son todas. */
export function loadedCountText(
  count: number,
  kind: "record" | "catalog",
  canLoadMore: boolean,
): string {
  const noun =
    kind === "record"
      ? plural(count, "respuesta", "respuestas")
      : plural(count, "elemento", "elementos");
  if (!canLoadMore) return `${count} ${noun}`;
  const loaded =
    kind === "record"
      ? plural(count, "cargada", "cargadas")
      : plural(count, "cargado", "cargados");
  return `${count} ${noun} ${loaded}`;
}
