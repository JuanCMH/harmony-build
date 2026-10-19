/** De la celda de un archivo al valor de un campo.
 *
 *  Un `.xlsx` trae números, fechas y casillas con su tipo; un `.csv`, todo
 *  como texto, escrito como lo escribe la gente en Colombia: día primero,
 *  coma decimal, «a. m.». Cada función devuelve `null` cuando la celda no dice
 *  lo que el campo pide: quien arma la fila lo convierte en su motivo.
 *
 *  Puro.
 */

import { searchableText } from "@/convex/lib/text";
import { isRealDate, isTime } from "@/convex/lib/value_validation";

/** Lo que cabe en una celda leída. Una fecha de Excel llega como `Date` en
 *  UTC: sus partes UTC son lo que se veía en la hoja. */
export type ImportCell = string | number | boolean | Date | null;

const two = (value: number) => String(value).padStart(2, "0");

const isoDate = (date: Date) =>
  `${date.getUTCFullYear()}-${two(date.getUTCMonth() + 1)}-${two(date.getUTCDate())}`;

export const isBlankCell = (cell: ImportCell): boolean =>
  cell === null || (typeof cell === "string" && cell.trim() === "");

/** La celda como texto, tal como se leería en la hoja. */
export function cellText(cell: ImportCell): string {
  if (cell === null) return "";
  if (typeof cell === "string") return cell.trim();
  if (typeof cell === "boolean") return cell ? "Sí" : "No";
  if (cell instanceof Date) {
    return Number.isNaN(cell.getTime()) ? "" : isoDate(cell);
  }
  return Number.isFinite(cell) ? String(cell) : "";
}

/* ──────────────────────────────── Número ────────────────────────────────── */

/**
 * Un número, con la coma decimal y el punto de miles de Colombia.
 *
 * Con los dos signos, el último es el decimal. Sólo con coma, la coma es
 * decimal. Sólo con punto, es de miles cuando agrupa de tres en tres
 * («12.500» son doce mil quinientos) y decimal en el resto («12.5»).
 */
export function parseNumber(cell: ImportCell): number | null {
  if (typeof cell === "number") return Number.isFinite(cell) ? cell : null;
  if (typeof cell !== "string") return null;

  let text = cell.replace(/[\s $]/g, "");
  if (!/^-?[\d.,]+$/.test(text) || !/\d/.test(text)) return null;

  const comma = text.lastIndexOf(",");
  const dot = text.lastIndexOf(".");
  if (comma !== -1 && dot !== -1) {
    text =
      comma > dot
        ? text.replace(/\./g, "").replace(",", ".")
        : text.replace(/,/g, "");
  } else if (comma !== -1) {
    if (text.indexOf(",") !== comma) return null;
    text = text.replace(",", ".");
  } else if (/^-?\d{1,3}(\.\d{3})+$/.test(text)) {
    text = text.replace(/\./g, "");
  }

  if (!/^-?\d+(\.\d+)?$/.test(text)) return null;
  const value = Number(text);
  return Number.isFinite(value) ? value : null;
}

/* ───────────────────────────────── Fecha ────────────────────────────────── */

/** El día cero de los números de serie de Excel. */
const EXCEL_EPOCH = Date.UTC(1899, 11, 30);
const DAY_MS = 24 * 60 * 60 * 1000;
/** De 1954 a 2119: fuera de aquí, un número no es una fecha. */
const SERIAL_MIN = 20000;
const SERIAL_MAX = 80000;

const realDate = (year: number, month: number, day: number): string | null => {
  const text = `${String(year).padStart(4, "0")}-${two(month)}-${two(day)}`;
  return isRealDate(text) ? text : null;
};

/**
 * Una fecha `YYYY-MM-DD`.
 *
 * De un texto: ISO, o día-mes-año con `/`, `-` o `.`; si el «mes» pasa de
 * doce, es que venía mes primero. La hora que la siga se ignora: la fecha de
 * negocio no tiene hora.
 */
export function parseDate(cell: ImportCell): string | null {
  if (cell instanceof Date) {
    return Number.isNaN(cell.getTime()) ? null : isoDate(cell);
  }
  if (typeof cell === "number") {
    if (cell < SERIAL_MIN || cell > SERIAL_MAX) return null;
    return isoDate(new Date(EXCEL_EPOCH + Math.floor(cell) * DAY_MS));
  }
  if (typeof cell !== "string") return null;

  const text = cell.trim();
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s].*)?$/.exec(text);
  if (iso) return realDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));

  const local = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4}|\d{2})(?:[,\s].*)?$/.exec(
    text,
  );
  if (!local) return null;
  const [first, second] = [Number(local[1]), Number(local[2])];
  const year =
    local[3].length === 2 ? 2000 + Number(local[3]) : Number(local[3]);
  return second > 12 && first <= 12
    ? realDate(year, first, second)
    : realDate(year, second, first);
}

/* ───────────────────────────────── Hora ─────────────────────────────────── */

/** Una hora `HH:mm`. Acepta segundos, que descarta, y «a. m.» / «p. m.». */
export function parseTime(cell: ImportCell): string | null {
  if (cell instanceof Date) {
    if (Number.isNaN(cell.getTime())) return null;
    return `${two(cell.getUTCHours())}:${two(cell.getUTCMinutes())}`;
  }
  if (typeof cell === "number") {
    // La fracción de día de Excel: 0,5 son las 12:00.
    if (cell < 0 || cell >= 1) return null;
    const minutes = Math.round(cell * 24 * 60);
    return `${two(Math.floor(minutes / 60) % 24)}:${two(minutes % 60)}`;
  }
  if (typeof cell !== "string") return null;

  const match = /^(\d{1,2}):(\d{2})(?::\d{2})?\s*([ap])?\.?\s*m?\.?$/i.exec(
    cell.trim(),
  );
  if (!match) return null;
  let hours = Number(match[1]);
  const half = match[3]?.toLowerCase();
  if (half) {
    if (hours < 1 || hours > 12) return null;
    hours = (hours % 12) + (half === "p" ? 12 : 0);
  }
  const text = `${two(hours)}:${match[2]}`;
  return isTime(text) ? text : null;
}

/* ──────────────────────────────── Casilla ───────────────────────────────── */

const TRUE_WORDS = new Set(["si", "s", "true", "verdadero", "x", "1", "yes"]);
const FALSE_WORDS = new Set(["no", "n", "false", "falso", "0"]);

/** Una casilla: «Sí», «No», «X», 1 y 0. */
export function parseBoolean(cell: ImportCell): boolean | null {
  if (typeof cell === "boolean") return cell;
  if (typeof cell === "number")
    return cell === 1 ? true : cell === 0 ? false : null;
  if (typeof cell !== "string") return null;
  const word = searchableText(cell);
  if (TRUE_WORDS.has(word)) return true;
  if (FALSE_WORDS.has(word)) return false;
  return null;
}
