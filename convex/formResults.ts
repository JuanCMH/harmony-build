import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { type QueryCtx, mutation, query } from "./_generated/server";
import { addDays, daysBetween } from "./lib/date_buckets";
import { formResultsErrors } from "./lib/error_messages";
import { canViewAll, findVisibleForm, requireForm } from "./lib/form_access";
import { flattenFields } from "./lib/form_evaluation";
import { loadPublished } from "./lib/form_store";
import {
  type ComputedEntry,
  type ComputedResponse,
  computeResult,
} from "./lib/result_compute";
import {
  RESULT_PROBLEMS,
  compositeResultIds,
  resultName,
  resultProblem,
} from "./lib/result_definition";
import { RESULT_LIMITS } from "./lib/result_types";
import { resultConfig } from "./lib/result_validators";
import { fromStoredValues } from "./lib/stored_values";
import { isRealDate } from "./lib/value_validation";

/** Cuántas respuestas entran en un cálculo. Una inspección de 63 ítems pesa
 *  varios kilobytes: leer más en cada apertura del tablero no escala
 *  (`01 §6`). Por encima, el resultado dice que está truncado; el paso
 *  siguiente es un resumen diario mantenido al escribir. */
const RESPONSES_CAP = 300;
/** Los elementos activos de un listado que se miran por vencimientos. */
const ENTRIES_CAP = 500;

/** Los resultados de un formato, en el orden en que se crearon. */
export const resultsOf = (ctx: QueryCtx, formId: Id<"forms">) =>
  ctx.db
    .query("formResults")
    .withIndex("formId", (q) => q.eq("formId", formId))
    .take(RESULT_LIMITS.maxPerForm);

/* ─────────────────────────────── Lecturas ───────────────────────────────── */

/**
 * Los resultados de un formato **calculados** para un rango de fechas.
 *
 * Todos de una vez: leen las mismas respuestas, y así la pestaña de un
 * tablero con cinco resultados del mismo formato las lee una sola vez —el
 * cliente comparte la suscripción—.
 *
 * Es un agregado de las respuestas de todos: exige verlas (`viewResponses`).
 * `null` si el formato no existe, no se tiene acceso o el rango no es válido:
 * las fechas vienen de la dirección, que escribe cualquiera. `today` lo manda
 * el cliente porque una query no lee el reloj.
 */
export const compute = query({
  args: {
    formId: v.id("forms"),
    from: v.string(),
    to: v.string(),
    today: v.string(),
  },
  handler: async (ctx, args) => {
    const found = await findVisibleForm(ctx, args.formId);
    if (!found || !canViewAll(found.viewer, found.form)) return null;
    const { form } = found;

    if (
      !isRealDate(args.from) ||
      !isRealDate(args.to) ||
      !isRealDate(args.today) ||
      args.from > args.to ||
      daysBetween(args.from, args.to) > RESULT_LIMITS.maxRangeDays
    ) {
      return null;
    }

    const [results, published] = await Promise.all([
      resultsOf(ctx, form._id),
      loadPublished(ctx, form),
    ]);
    const fields = flattenFields(published?.sections ?? []);

    /** Las respuestas vigentes de un formato en un rango, de la más vieja a
     *  la más nueva. Si no caben todas, se quedan las más recientes. */
    const responsesOf = async (
      formId: Id<"forms">,
      from: string,
      to: string,
    ) => {
      const read = await ctx.db
        .query("formResponses")
        .withIndex("formId_date", (q) =>
          q.eq("formId", formId).gte("date", from).lte("date", to),
        )
        .order("desc")
        .take(RESPONSES_CAP + 1);
      return {
        capped: read.length > RESPONSES_CAP,
        responses: read
          .slice(0, RESPONSES_CAP)
          .reverse()
          // Una respuesta anulada no cuenta en ningún resultado: es la única
          // forma de sacar un registro, y deja quién y por qué.
          .filter((response) => response.status === "submitted")
          .map((response) => ({
            date: response.date,
            values: fromStoredValues(response.values),
          })),
      };
    };

    let responses: ComputedResponse[] = [];
    let previous: ComputedResponse[] | undefined;
    let entries: ComputedEntry[] = [];
    let capped = false;
    const reads = results.some((result) => result.config.type !== "composite");
    if (reads && form.kind === "record") {
      const read = await responsesOf(form._id, args.from, args.to);
      capped = read.capped;
      responses = read.responses;

      // El periodo anterior, de igual largo, sólo si algún indicador se
      // compara. Si no cabe entero, no se compara: media cifra engaña.
      if (
        results.some(
          (result) =>
            result.config.type === "indicator" && result.config.compare,
        )
      ) {
        const days = daysBetween(args.from, args.to) + 1;
        const before = await responsesOf(
          form._id,
          addDays(args.from, -days),
          addDays(args.from, -1),
        );
        previous = before.capped ? undefined : before.responses;
      }
    }
    if (results.length > 0 && form.kind === "catalog") {
      const read = await ctx.db
        .query("formResponses")
        .withIndex("formId_active_titleSearch", (q) =>
          q.eq("formId", form._id).eq("active", true),
        )
        .take(ENTRIES_CAP + 1);
      capped = read.length > ENTRIES_CAP;
      entries = read.slice(0, ENTRIES_CAP).map((entry) => ({
        id: entry._id,
        title: entry.title ?? "",
        values: fromStoredValues(entry.values),
      }));
    }

    const input = {
      fields,
      responses,
      entries,
      previous,
      range: { from: args.from, to: args.to },
      today: args.today,
    };

    // Los indicadores que entran en las cifras compuestas. Pueden ser de
    // otros formatos del proyecto: cada formato se lee una sola vez.
    const indicators = new Map<
      string,
      { name: string; formName: string; value: number | null }
    >();
    const missing = new Set<string>();
    const operandIds = new Set(
      results.flatMap((result) =>
        result.config.type === "composite"
          ? compositeResultIds(result.config.terms)
          : [],
      ),
    );
    const inputs = new Map<Id<"forms">, typeof input | null>([
      [form._id, input],
    ]);
    for (const raw of operandIds) {
      const id = ctx.db.normalizeId("formResults", raw);
      const operand = id ? await ctx.db.get(id) : null;
      if (
        !operand ||
        operand.projectId !== form.projectId ||
        operand.config.type !== "indicator"
      ) {
        missing.add(raw);
        continue;
      }
      if (!inputs.has(operand.formId)) {
        const other = await ctx.db.get(operand.formId);
        const otherPublished =
          other && canViewAll(found.viewer, other)
            ? await loadPublished(ctx, other)
            : null;
        if (other?.kind === "record" && otherPublished) {
          const read = await responsesOf(other._id, args.from, args.to);
          capped = capped || read.capped;
          inputs.set(other._id, {
            ...input,
            fields: flattenFields(otherPublished.sections),
            responses: read.responses,
            entries: [],
            previous: undefined,
          });
        } else {
          inputs.set(operand.formId, null);
        }
      }
      const operandInput = inputs.get(operand.formId);
      const operandForm =
        operand.formId === form._id ? form : await ctx.db.get(operand.formId);
      if (!operandInput || !operandForm) {
        missing.add(raw);
        continue;
      }
      const data = computeResult(operand.config, operandInput);
      indicators.set(raw, {
        name: operand.name,
        formName: operandForm.name,
        value: data.type === "indicator" ? data.value : null,
      });
    }

    return {
      form: { _id: form._id, name: form.name, kind: form.kind },
      /** Si se leyó el tope: las cifras son de una parte del rango. */
      capped,
      results: results.map((result) => ({
        _id: result._id,
        name: result.name,
        config: result.config,
        // Un resultado que apunta a algo que ya no está no se calcula: se
        // dice, en vez de enseñar un cero que parece un dato.
        problem:
          resultProblem(result.config, form.kind, fields) ??
          (result.config.type === "composite" &&
          compositeResultIds(result.config.terms).some((id) => missing.has(id))
            ? RESULT_PROBLEMS.compositeMissing
            : null),
        data: computeResult(result.config, { ...input, indicators }),
      })),
    };
  },
});

/** Las definiciones de los resultados de un formato, para quien los edita. */
export const get = query({
  args: { formId: v.id("forms") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    const found = await findVisibleForm(ctx, args.formId);
    if (!found) return null;
    const results = await resultsOf(ctx, args.formId);
    return results.map((result) => ({
      _id: result._id,
      name: result.name,
      config: result.config,
    }));
  },
});

/** Cuántos indicadores del proyecto se ofrecen para armar una cifra
 *  compuesta. */
const INDICATORS_CAP = 200;

/**
 * Los indicadores de todos los formatos del proyecto: con ellos se arma una
 * cifra compuesta. Sólo para quien ve las respuestas de todos, que es quien
 * puede ver lo que valen.
 */
export const indicators = query({
  args: { formId: v.id("forms") },
  handler: async (ctx, args) => {
    const found = await findVisibleForm(ctx, args.formId);
    if (!found || !canViewAll(found.viewer, found.form)) return null;
    const all = await ctx.db
      .query("formResults")
      .withIndex("projectId", (q) => q.eq("projectId", found.form.projectId))
      .take(INDICATORS_CAP);
    const names = new Map<Id<"forms">, string | null>();
    const listed = [];
    for (const result of all) {
      if (result.config.type !== "indicator") continue;
      if (!names.has(result.formId)) {
        const form = await ctx.db.get(result.formId);
        names.set(
          result.formId,
          form && form.kind === "record" ? form.name : null,
        );
      }
      const formName = names.get(result.formId);
      if (formName)
        listed.push({ _id: result._id, name: result.name, formName });
    }
    return listed;
  },
});

/* ────────────────────────────── Escrituras ──────────────────────────────── */

/** El nombre y la configuración, validados contra los campos publicados del
 *  formato (`01 §4.2`). */
async function validated(
  ctx: QueryCtx,
  form: Doc<"forms">,
  args: { name: string; config: Doc<"formResults">["config"] },
) {
  const published = await loadPublished(ctx, form);
  if (!published) throw new ConvexError(formResultsErrors.formNotPublished);

  const name = resultName(args.name);
  const problem =
    name === null
      ? RESULT_PROBLEMS.invalidName
      : resultProblem(
          args.config,
          form.kind,
          flattenFields(published.sections),
        );
  if (name === null || problem) {
    throw new ConvexError(problem ?? RESULT_PROBLEMS.invalidName);
  }
  // Una cifra compuesta sólo se arma con indicadores de este proyecto. Con
  // otra compuesta no: no hay ciclos que vigilar.
  if (args.config.type === "composite") {
    for (const raw of compositeResultIds(args.config.terms)) {
      const id = ctx.db.normalizeId("formResults", raw);
      const operand = id ? await ctx.db.get(id) : null;
      if (
        !operand ||
        operand.projectId !== form.projectId ||
        operand.config.type !== "indicator"
      ) {
        throw new ConvexError(RESULT_PROBLEMS.compositeMissing);
      }
    }
  }
  return { name, config: args.config };
}

/** Define un resultado nuevo en un formato. Lo hace quien construye los
 *  formatos (`editForms`): es parte de su definición. */
export const create = mutation({
  args: { formId: v.id("forms"), name: v.string(), config: resultConfig },
  handler: async (ctx, args) => {
    const { viewer, form } = await requireForm(
      ctx,
      args.formId,
      "editForms",
      formResultsErrors,
    );
    const definition = await validated(ctx, form, args);
    const existing = await resultsOf(ctx, form._id);
    if (existing.length >= RESULT_LIMITS.maxPerForm) {
      throw new ConvexError(formResultsErrors.tooManyResults);
    }

    const id = await ctx.db.insert("formResults", {
      ...definition,
      projectId: form.projectId,
      formId: form._id,
      createdBy: viewer.userId,
    });

    await ctx.runMutation(internal.logs.create, {
      description: `Resultado creado en ${form.name}: ${definition.name}`,
      type: "create",
      projectId: form.projectId,
      affectedEntityType: "form",
      affectedEntityId: form._id,
    });
    return id;
  },
});

/** Identidad, existencia y llave, con el formato derivado del resultado. */
async function requireResult(ctx: QueryCtx, id: Id<"formResults">) {
  const result = await ctx.db.get(id);
  if (!result) {
    // Antes de saber de qué proyecto es no hay permiso que comprobar; sin
    // sesión, `requireForm` de abajo no llega a correr.
    if ((await getAuthUserId(ctx)) === null) {
      throw new ConvexError(formResultsErrors.userNotAuthenticated);
    }
    throw new ConvexError(formResultsErrors.resultNotFound);
  }
  const { form } = await requireForm(
    ctx,
    result.formId,
    "editForms",
    formResultsErrors,
  );
  return { result, form };
}

export const update = mutation({
  args: { id: v.id("formResults"), name: v.string(), config: resultConfig },
  handler: async (ctx, args) => {
    const { form } = await requireResult(ctx, args.id);
    const definition = await validated(ctx, form, args);
    await ctx.db.patch(args.id, definition);

    await ctx.runMutation(internal.logs.create, {
      description: `Resultado actualizado en ${form.name}: ${definition.name}`,
      type: "update",
      projectId: form.projectId,
      affectedEntityType: "form",
      affectedEntityId: form._id,
    });
    return args.id;
  },
});

/** Elimina un resultado. El tablero deja de enseñarlo: una pestaña no guarda
 *  una copia, apunta a él. */
export const remove = mutation({
  args: { id: v.id("formResults") },
  handler: async (ctx, args) => {
    const { result, form } = await requireResult(ctx, args.id);
    await ctx.db.delete(args.id);

    await ctx.runMutation(internal.logs.create, {
      description: `Resultado eliminado de ${form.name}: ${result.name}`,
      type: "delete",
      projectId: form.projectId,
      affectedEntityType: "form",
      affectedEntityId: form._id,
    });
    return args.id;
  },
});
