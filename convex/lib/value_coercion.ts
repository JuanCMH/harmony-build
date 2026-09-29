/** Cómo lee el motor un valor que puede venir de cualquier control.
 *
 *  Lo comparten las reglas (`field_logic.ts`) y las recetas
 *  (`field_computed.ts`): que «vacío», «número» y «fecha» signifiquen lo mismo
 *  en los dos es lo que impide que una condición y un cálculo discrepen sobre
 *  el mismo campo. Puro.
 */

const isRecord = (raw: unknown): raw is Record<string, unknown> =>
  typeof raw === "object" && raw !== null && !Array.isArray(raw);

/**
 * El valor de un controlador como el texto con el que se compara.
 *
 * Una relación se compara por el **id del elemento** elegido, que es lo único
 * estable: su título cambia cuando alguien corrige el listado. Un archivo, una
 * firma o una fila de tabla no tienen texto con el que comparar.
 */
export const toText = (raw: unknown): string => {
  if (raw == null) return "";
  if (typeof raw === "boolean") return raw ? "true" : "false";
  if (typeof raw === "number") return Number.isFinite(raw) ? String(raw) : "";
  if (isRecord(raw)) {
    return typeof raw.responseId === "string" ? raw.responseId : "";
  }
  return String(raw);
};

/**
 * ¿Está sin responder?
 *
 * Un arreglo —lista múltiple, filas de una tabla, ítems de una lista de
 * chequeo— está vacío si no tiene elementos. Un objeto —archivo, firma,
 * relación— lo está si no apunta a nada.
 */
export const isBlank = (raw: unknown): boolean => {
  if (Array.isArray(raw)) return raw.length === 0;
  if (isRecord(raw)) {
    const pointer = raw.storageId ?? raw.responseId;
    return typeof pointer !== "string" || pointer === "";
  }
  return toText(raw).trim() === "";
};

export const toNumber = (raw: unknown): number | null => {
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  if (typeof raw === "string" && raw.trim() !== "") {
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

/**
 * Un valor como marca de tiempo.
 *
 * `YYYY-MM-DD` se ancla a **medianoche local**, no UTC: interpretarlo como UTC
 * corre la fecha un día para quien esté al oeste de Greenwich, que es todo
 * Colombia.
 */
export const toTimestamp = (raw: unknown): number | null => {
  if (raw == null || raw === "") return null;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  const text = String(raw).trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (match) {
    return new Date(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3]),
    ).getTime();
  }
  const parsed = Date.parse(text);
  return Number.isFinite(parsed) ? parsed : null;
};

/**
 * Una hora `HH:mm` como minutos desde medianoche, o `null` si no lo es.
 *
 * Existe porque una hora no es una fecha: `toTimestamp("08:00")` acaba en
 * `Date.parse`, que no la entiende, y «es anterior a» sobre un campo de hora
 * no se cumpliría nunca.
 */
export const toMinutes = (raw: unknown): number | null => {
  if (typeof raw !== "string") return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(raw.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
};

/** `YYYY-MM-DD` en sus tres números, sin pasar por ninguna zona horaria. */
export const dateParts = (raw: unknown) => {
  if (typeof raw !== "string") return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw.trim());
  return match
    ? { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) }
    : null;
};
