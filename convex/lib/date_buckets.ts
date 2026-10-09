/** Fechas de negocio `YYYY-MM-DD` agrupadas por día, semana o mes.
 *
 *  Puro y sin zona horaria: el día ya lo fijó el servidor al guardar cada
 *  respuesta (`todayInColombia`). La semana va de lunes a domingo.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

const toUtc = (date: string): number => Date.parse(`${date}T00:00:00Z`);

const fromUtc = (time: number): string =>
  new Date(time).toISOString().slice(0, 10);

export const addDays = (date: string, days: number): string =>
  fromUtc(toUtc(date) + days * DAY_MS);

/** Cuántos días van de `from` a `to`; negativo si `to` es anterior. */
export const daysBetween = (from: string, to: string): number =>
  Math.round((toUtc(to) - toUtc(from)) / DAY_MS);

export type Bucket = "day" | "week" | "month";

/** El primer día del intervalo que contiene a `date`. */
export function bucketStart(bucket: Bucket, date: string): string {
  if (bucket === "day") return date;
  if (bucket === "month") return `${date.slice(0, 7)}-01`;
  // `getUTCDay`: 0 es domingo. El lunes de un domingo es seis días atrás.
  const weekday = new Date(toUtc(date)).getUTCDay();
  return addDays(date, -((weekday + 6) % 7));
}

const nextBucket = (bucket: Bucket, start: string): string => {
  if (bucket === "day") return addDays(start, 1);
  if (bucket === "week") return addDays(start, 7);
  const first = new Date(toUtc(start));
  return fromUtc(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 1));
};

/** Los intervalos que tocan el rango `[from, to]`, en orden. */
export function bucketsBetween(
  bucket: Bucket,
  from: string,
  to: string,
): string[] {
  const keys: string[] = [];
  for (
    let key = bucketStart(bucket, from);
    key <= to;
    key = nextBucket(bucket, key)
  ) {
    keys.push(key);
  }
  return keys;
}

const COARSER: Record<Bucket, Bucket | null> = {
  day: "week",
  week: "month",
  month: null,
};

/** El intervalo pedido, o uno más ancho si el rango daría más de `max`
 *  puntos: un año por días no se lee, y un año por semanas sí. */
export function fitBucket(
  bucket: Bucket,
  from: string,
  to: string,
  max: number,
): Bucket {
  let fitted = bucket;
  for (;;) {
    const coarser = COARSER[fitted];
    if (coarser === null || bucketsBetween(fitted, from, to).length <= max) {
      return fitted;
    }
    fitted = coarser;
  }
}
