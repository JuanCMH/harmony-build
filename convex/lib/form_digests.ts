/** Mantener y leer los resúmenes diarios de un formato (`formDayDigests`).
 *
 *  Con `ctx`. La regla de qué entra en un resumen es pura y está en
 *  `response_digest.ts`.
 *
 *  Quien escribe una respuesta vigente de un formato llama a `digestAdd`;
 *  quien la anula o la retira, a `digestRemove`. **No hay otra forma** de que
 *  el resumen siga a su fuente (`01 §7.3`), y por eso son dos funciones y no
 *  código repetido en cada mutation.
 */

import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { flattenFields } from "./form_evaluation";
import type { FormField } from "./form_types";
import {
  DIGEST_LIMITS,
  DIGEST_VERSION,
  digestValues,
  fromDigestValues,
} from "./response_digest";
import type { ComputedResponse } from "./result_compute";

type Response = Pick<
  Doc<"formResponses">,
  "_id" | "date" | "values" | "versionId"
>;
type Row = Doc<"formDayDigests">["rows"][number];

/** Los campos de cada versión, leídos una vez. */
function fieldReader(ctx: QueryCtx) {
  const known = new Map<Id<"formVersions">, FormField[]>();
  return async (versionId: Id<"formVersions">) => {
    const cached = known.get(versionId);
    if (cached) return cached;
    const version = await ctx.db.get(versionId);
    const fields = version ? flattenFields(version.sections) : [];
    known.set(versionId, fields);
    return fields;
  };
}

const dayOf = (ctx: QueryCtx, formId: Id<"forms">, date: string) =>
  ctx.db
    .query("formDayDigests")
    .withIndex("formId_date", (q) => q.eq("formId", formId).eq("date", date))
    .unique();

async function writeDay(
  ctx: MutationCtx,
  form: Pick<Doc<"forms">, "_id" | "projectId">,
  date: string,
  current: Doc<"formDayDigests"> | null,
  rows: Row[],
  overflow: boolean,
) {
  if (rows.length === 0 && !overflow) {
    if (current) await ctx.db.delete(current._id);
    return;
  }
  if (current) await ctx.db.patch(current._id, { rows, overflow });
  else {
    await ctx.db.insert("formDayDigests", {
      projectId: form.projectId,
      formId: form._id,
      date,
      rows,
      overflow,
    });
  }
}

/**
 * Suma respuestas recién escritas a los resúmenes de su día.
 *
 * La primera respuesta de un formato lo deja al día sin más: no hay historia
 * que reconstruir.
 */
export async function digestAdd(
  ctx: MutationCtx,
  form: Doc<"forms">,
  responses: readonly Response[],
) {
  if (form.kind !== "record" || responses.length === 0) return;
  if (form.digestVersion === undefined && form.responseCount === 0) {
    await ctx.db.patch(form._id, { digestVersion: DIGEST_VERSION });
  }

  const fieldsOf = fieldReader(ctx);
  const byDate = new Map<string, Response[]>();
  for (const response of responses) {
    const day = byDate.get(response.date);
    if (day) day.push(response);
    else byDate.set(response.date, [response]);
  }

  for (const [date, added] of byDate) {
    const current = await dayOf(ctx, form._id, date);
    const rows = [...(current?.rows ?? [])];
    let overflow = current?.overflow ?? false;
    for (const response of added) {
      if (rows.length >= DIGEST_LIMITS.maxPerDay) {
        overflow = true;
        break;
      }
      rows.push({
        responseId: response._id,
        values: digestValues(
          await fieldsOf(response.versionId),
          response.values,
        ),
      });
    }
    await writeDay(ctx, form, date, current, rows, overflow);
  }
}

/** Quita de los resúmenes las respuestas que dejaron de contar: anuladas o
 *  retiradas. Un día desbordado se reconstruye entero: la que sale puede dar
 *  sitio a una que no cabía. */
export async function digestRemove(
  ctx: MutationCtx,
  form: Doc<"forms">,
  responses: readonly Pick<Doc<"formResponses">, "_id" | "date">[],
) {
  if (form.kind !== "record") return;
  const byDate = new Map<string, Set<Id<"formResponses">>>();
  for (const response of responses) {
    const day = byDate.get(response.date);
    if (day) day.add(response._id);
    else byDate.set(response.date, new Set([response._id]));
  }
  for (const [date, removed] of byDate) {
    const current = await dayOf(ctx, form._id, date);
    if (!current) continue;
    if (current.overflow) {
      await digestRebuildDay(ctx, form, date, removed);
      continue;
    }
    await writeDay(
      ctx,
      form,
      date,
      current,
      current.rows.filter((row) => !removed.has(row.responseId)),
      false,
    );
  }
}

/**
 * Rehace el resumen de un día a partir de sus respuestas. Idempotente: es lo
 * que usa la reconstrucción, y lo que hace que una escritura que llega a
 * media reconstrucción no se pierda ni se cuente dos veces.
 *
 * Devuelve cuántas respuestas leyó.
 */
export async function digestRebuildDay(
  ctx: MutationCtx,
  form: Doc<"forms">,
  date: string,
  except: ReadonlySet<Id<"formResponses">> = new Set(),
): Promise<number> {
  const read = await ctx.db
    .query("formResponses")
    .withIndex("formId_date", (q) => q.eq("formId", form._id).eq("date", date))
    .take(DIGEST_LIMITS.maxPerDay + except.size + 1);
  const live = read.filter(
    (response) => response.status === "submitted" && !except.has(response._id),
  );

  const fieldsOf = fieldReader(ctx);
  const rows: Row[] = [];
  for (const response of live.slice(0, DIGEST_LIMITS.maxPerDay)) {
    rows.push({
      responseId: response._id,
      values: digestValues(await fieldsOf(response.versionId), response.values),
    });
  }
  await writeDay(
    ctx,
    form,
    date,
    await dayOf(ctx, form._id, date),
    rows,
    read.length > DIGEST_LIMITS.maxPerDay + except.size ||
      live.length > DIGEST_LIMITS.maxPerDay,
  );
  return read.length;
}

/** Si los resultados de este formato se pueden calcular de sus resúmenes. */
export const hasCurrentDigests = (form: Doc<"forms">): boolean =>
  form.kind === "record" && form.digestVersion === DIGEST_VERSION;

/**
 * Las respuestas vigentes de un formato en un rango, de la más vieja a la más
 * nueva, leídas de sus resúmenes. Si no caben todas, se quedan las más
 * recientes y se dice.
 */
export async function digestRange(
  ctx: QueryCtx,
  formId: Id<"forms">,
  from: string,
  to: string,
): Promise<{ capped: boolean; responses: ComputedResponse[] }> {
  const days = ctx.db
    .query("formDayDigests")
    .withIndex("formId_date", (q) =>
      q.eq("formId", formId).gte("date", from).lte("date", to),
    )
    .order("desc");

  let capped = false;
  const newestFirst: ComputedResponse[][] = [];
  let count = 0;
  for await (const day of days) {
    if (count + day.rows.length > DIGEST_LIMITS.maxPerCompute) {
      capped = true;
      break;
    }
    capped ||= day.overflow;
    count += day.rows.length;
    newestFirst.push(
      day.rows.map((row) => ({
        date: day.date,
        values: fromDigestValues(row.values),
      })),
    );
  }
  return { capped, responses: newestFirst.reverse().flat() };
}
