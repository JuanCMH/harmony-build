import { todayInColombia } from "@/convex/lib/dates";

/**
 * Cuándo fue algo, dicho como se dice: «hoy a las 6:40», «ayer», «hace 3
 * días». Puro: recibe el instante de ahora, no lo lee.
 *
 * Todo en hora de Colombia, como la fecha de negocio de una respuesta
 * (`todayInColombia`): «hoy» tiene que ser el mismo día que el servidor puso
 * en la respuesta, esté donde esté el reloj del teléfono.
 */

/** Colombia no tiene horario de verano: el desfase es constante. */
const COLOMBIA_OFFSET_MS = -5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** A partir de cuántos días se dice la fecha en vez de contarlos. */
const DAYS_BEFORE_DATE = 30;

const toUtcDay = (date: string): number | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  return match
    ? Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    : null;
};

/** Cuántos días van de `from` a `to`, las dos `YYYY-MM-DD`. Negativo si `to`
 *  es anterior; `null` si alguna no es una fecha. */
export const daysBetween = (from: string, to: string): number | null => {
  const start = toUtcDay(from);
  const end = toUtcDay(to);
  return start === null || end === null
    ? null
    : Math.round((end - start) / DAY_MS);
};

/** La hora que era en Colombia en ese instante. */
export const colombiaClock = (
  timestamp: number,
): { hour: number; minute: number } => {
  const local = new Date(timestamp + COLOMBIA_OFFSET_MS);
  return { hour: local.getUTCHours(), minute: local.getUTCMinutes() };
};

/** «6:40», «18:05»: en 24 horas y sin cero delante, como se dice. */
export const clockText = (timestamp: number): string => {
  const { hour, minute } = colombiaClock(timestamp);
  return `${hour}:${String(minute).padStart(2, "0")}`;
};

const shortDate = (date: string): string => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : date;
};

/**
 * Cuándo fue un día respecto a hoy: «hoy», «ayer», «hace 3 días», y pasado un
 * mes, la fecha. Con `at`, hoy y ayer dicen además la hora.
 *
 * Una fecha posterior a hoy —el reloj del teléfono va mal— se lee como hoy:
 * «dentro de 1 día» sería cierto y no le serviría a nadie.
 */
export function relativeDayText(
  date: string,
  now: number,
  at?: number | null,
): string {
  const days = daysBetween(date, todayInColombia(now));
  if (days === null) return date;

  const time = at ? ` a las ${clockText(at)}` : "";
  if (days <= 0) return `hoy${time}`;
  if (days === 1) return `ayer${time}`;
  if (days < DAYS_BEFORE_DATE) return `hace ${days} días`;
  return `el ${shortDate(date)}`;
}

/** Lo que dice la fila de un formato en «Para diligenciar». En un
 *  seguimiento no se diligencia: se abre un asunto. */
export function lastFilledText(
  last: { date: string | null; at: number | null },
  now: number,
  kind: "record" | "tracking" = "record",
): string {
  // Sin fecha de negocio se deduce del instante: es el mismo día, dicho por el
  // mismo reloj.
  const date = last.date ?? (last.at ? todayInColombia(last.at) : null);
  if (kind === "tracking") {
    return date === null
      ? "Todavía no has abierto ningún asunto"
      : `Último asunto: ${relativeDayText(date, now, last.at)}`;
  }
  return date === null
    ? "Todavía no lo has diligenciado"
    : `Última vez: ${relativeDayText(date, now, last.at)}`;
}
