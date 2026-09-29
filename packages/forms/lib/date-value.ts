/**
 * Una fecha de formulario va y viene como `YYYY-MM-DD`, que es lo que el motor
 * de reglas compara y lo que se guarda.
 *
 * Se ancla a **medianoche local**: leerla como UTC corre el día en Colombia.
 */

/** Lo guardado como `Date`, o `undefined` si no hay fecha válida. */
export const toDate = (value: unknown): Date | undefined => {
  if (!value) return undefined;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value));
  if (match)
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? undefined : date;
};

/** Un `Date` como `YYYY-MM-DD`. */
export const toDateValue = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

/** `YYYY-MM-DD` como se lee en Colombia: `30/09/2026`. */
export const shortDateEs = (value: string): string => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
};
