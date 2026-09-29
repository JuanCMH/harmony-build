/** Colombia no tiene horario de verano: el desfase es constante. */
const COLOMBIA_OFFSET_MS = -5 * 60 * 60 * 1000;

const twoDigits = (value: number) => String(value).padStart(2, "0");

/** El día `YYYY-MM-DD` que es **en Colombia** en el instante `now`.
 *
 *  El servidor corre en UTC: sin esto, lo hecho después de las 19:00 cae en el
 *  día siguiente. Es una función pura —recibe el instante, no lo lee— para que
 *  una query pueda usarla sin llamar al reloj. */
export function todayInColombia(now: number): string {
  const local = new Date(now + COLOMBIA_OFFSET_MS);
  return `${local.getUTCFullYear()}-${twoDigits(local.getUTCMonth() + 1)}-${twoDigits(local.getUTCDate())}`;
}
