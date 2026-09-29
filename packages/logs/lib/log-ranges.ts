/**
 * Intervalos de tiempo para consultar registros.
 *
 * Se calculan en el navegador a propósito: el servidor razona en UTC y, al
 * comparar allí un "yyyy-MM-dd" con la hora de creación, la jornada colombiana
 * se partía cinco horas antes de tiempo —lo registrado después de las 19:00
 * aparecía en el día siguiente—. Quien mira sabe en qué huso está; el servidor,
 * no.
 */

export type LogRange = { from: number; to: number };

/** El día natural de `date`, de 00:00 a 00:00 del siguiente. */
export const dayRange = (date: Date): LogRange => {
  const from = new Date(date);
  from.setHours(0, 0, 0, 0);

  const to = new Date(from);
  to.setDate(to.getDate() + 1);

  return { from: from.getTime(), to: to.getTime() };
};

/** El mes natural al que pertenece `date`. */
export const monthRange = (date: Date): LogRange => {
  const from = new Date(date.getFullYear(), date.getMonth(), 1);
  const to = new Date(date.getFullYear(), date.getMonth() + 1, 1);

  return { from: from.getTime(), to: to.getTime() };
};
