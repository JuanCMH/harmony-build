import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { type QueryCtx, mutation, query } from "./_generated/server";
import { todayInColombia } from "./lib/dates";
import { entryTitle } from "./lib/entry_title";
import { formTrackingsErrors } from "./lib/error_messages";
import {
  canOpenTracking,
  loadViewer,
  requireForm,
  requireUser,
  requireViewer,
} from "./lib/form_access";
import { flattenFields } from "./lib/form_evaluation";
import { requireNotArchived } from "./lib/form_details";
import { nameReader } from "./lib/form_rows";
import { loadDraft, loadPublished } from "./lib/form_store";
import { replaceLinks, resolveValues, writeLinks } from "./lib/form_values";
import { storedFieldValues } from "./lib/form_validators";
import { normalizeText } from "./lib/text";
import {
  TRACKING_LIST_LIMIT,
  TRACKING_PREFIX_MAX,
  nextTrackingNumber,
  stagesOf,
  trackingCode,
  trackingFacts,
} from "./lib/tracking";

type StoredValues = Doc<"formResponses">["values"];

/** Lo que llega, limitado a los campos de una etapa: lo demás no es de quien
 *  la completa. */
const onlyOf = (
  values: StoredValues,
  section: { fields: readonly { id: string }[] },
): StoredValues => {
  const ids = new Set(section.fields.map((field) => field.id));
  return values.filter((value) => ids.has(value.fieldId));
};

/* ────────────────────────────── Escrituras ──────────────────────────────── */

/**
 * Declara lo que hace que un asunto se pueda seguir: su fecha de compromiso,
 * su responsable y el prefijo de su consecutivo. El título se declara con
 * `forms.setTitleField`, como en un listado.
 */
export const configure = mutation({
  args: {
    formId: v.id("forms"),
    dueDateFieldId: v.optional(v.string()),
    responsibleFieldId: v.optional(v.string()),
    numberPrefix: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { form } = await requireForm(
      ctx,
      args.formId,
      "editForms",
      formTrackingsErrors,
    );
    requireNotArchived(form);
    if (form.kind !== "tracking") {
      throw new ConvexError(formTrackingsErrors.notTracking);
    }

    // Cada campo tiene que existir, con su tipo, en lo que se va a publicar.
    const draft = await loadDraft(ctx, form);
    const fields = flattenFields(draft?.sections ?? []);
    const typeOf = (id: string | undefined) =>
      fields.find((field) => field.id === id)?.type;
    if (args.dueDateFieldId && typeOf(args.dueDateFieldId) !== "date") {
      throw new ConvexError(formTrackingsErrors.fieldNotDate);
    }
    // Una relación con un listado de personas, o un texto corto cuando la
    // empresa todavía no tiene ese listado.
    const responsible = typeOf(args.responsibleFieldId);
    if (
      args.responsibleFieldId &&
      responsible !== "reference" &&
      responsible !== "text"
    ) {
      throw new ConvexError(formTrackingsErrors.fieldNotReference);
    }
    const prefix = normalizeText(args.numberPrefix ?? "").toUpperCase();
    if (!/^[A-Z0-9]*$/.test(prefix) || prefix.length > TRACKING_PREFIX_MAX) {
      throw new ConvexError(formTrackingsErrors.invalidPrefix);
    }

    await ctx.db.patch(form._id, {
      dueDateFieldId: args.dueDateFieldId || undefined,
      responsibleFieldId: args.responsibleFieldId || undefined,
      numberPrefix: prefix || undefined,
    });

    await ctx.runMutation(internal.logs.create, {
      description: `Seguimiento actualizado: ${form.name} (cambió cómo se sigue)`,
      type: "update",
      projectId: form.projectId,
      affectedEntityType: "form",
      affectedEntityId: form._id,
    });
    return form._id;
  },
});

/**
 * Abre un asunto: completa la primera etapa del seguimiento.
 *
 * Sólo se guardan los valores de esa etapa; el consecutivo lo pone el
 * servidor, por formato y año. Un seguimiento de una sola etapa nace cerrado.
 *
 * **No escribe auditoría**, como una respuesta: el asunto ya dice quién y
 * cuándo.
 */
export const open = mutation({
  args: { formId: v.id("forms"), values: storedFieldValues },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx, formTrackingsErrors);
    const form = await ctx.db.get(args.formId);
    if (!form) throw new ConvexError(formTrackingsErrors.formNotFound);

    const viewer = await loadViewer(ctx, userId, form.projectId);
    if (form.kind !== "tracking") {
      throw new ConvexError(formTrackingsErrors.notTracking);
    }
    if (!viewer || !canOpenTracking(viewer, form)) {
      throw new ConvexError(formTrackingsErrors.insufficientPermissions);
    }
    const version = await loadPublished(ctx, form);
    if (!version) throw new ConvexError(formTrackingsErrors.formNotFound);

    const stages = stagesOf(version.sections);
    const [first] = stages;
    const author = await ctx.db.get(userId);
    const date = todayInColombia(Date.now());
    const resolved = await resolveValues(ctx, {
      projectId: form.projectId,
      sections: [first],
      values: onlyOf(args.values, first),
      date,
      authorId: userId,
      signerName: author?.name?.trim() || "Usuario desconocido",
    });

    const now = Date.now();
    const year = Number(date.slice(0, 4));
    const serial = nextTrackingNumber(form.lastNumber, year);
    const closed = stages.length === 1;
    const issue = {
      formId: form._id,
      projectId: form.projectId,
      versionId: version._id,
      date,
      submittedBy: userId,
      status: closed ? ("closed" as const) : ("open" as const),
      number: serial.value,
      year,
      stages: [{ sectionId: first.id, completedBy: userId, completedAt: now }],
      ...(closed ? { closedAt: now } : {}),
      ...entryTitle(form, version.sections, resolved.values),
      ...trackingFacts(form, version.sections, resolved.values),
      values: resolved.values,
    };
    const issueId = await ctx.db.insert("formResponses", issue);
    await writeLinks(ctx, { ...issue, _id: issueId }, resolved.links);
    await ctx.db.patch(form._id, {
      responseCount: form.responseCount + 1,
      lastNumber: serial,
    });
    return issueId;
  },
});

/**
 * Completa la etapa que toca de un asunto abierto. Lo ya completado **no se
 * toca**: de lo que llega sólo se toman los campos de esta etapa, y lo
 * anterior se conserva como estaba. Completar la última cierra el asunto.
 */
export const completeStage = mutation({
  args: { id: v.id("formResponses"), values: storedFieldValues },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx, formTrackingsErrors);
    const issue = await ctx.db.get(args.id);
    if (!issue) throw new ConvexError(formTrackingsErrors.trackingNotFound);
    const form = await ctx.db.get(issue.formId);
    if (!form) throw new ConvexError(formTrackingsErrors.formNotFound);

    // El proyecto sale del asunto, nunca de un argumento.
    const viewer = await loadViewer(ctx, userId, issue.projectId);
    if (form.kind !== "tracking") {
      throw new ConvexError(formTrackingsErrors.notTracking);
    }
    if (!viewer || !canOpenTracking(viewer, form)) {
      throw new ConvexError(formTrackingsErrors.insufficientPermissions);
    }
    if (issue.status !== "open") {
      throw new ConvexError(formTrackingsErrors.notOpen);
    }

    // Con la versión con que se abrió, etapas incluidas.
    const version = await ctx.db.get(issue.versionId);
    const stages = stagesOf(version?.sections ?? []);
    const done = issue.stages ?? [];
    const stage = stages[done.length];
    if (!stage) throw new ConvexError(formTrackingsErrors.notOpen);

    const author = await ctx.db.get(userId);
    const reached = stages.slice(0, done.length + 1);
    const earlier = new Set(
      reached.slice(0, -1).flatMap((section) =>
        section.fields.map((field) => field.id),
      ),
    );
    const resolved = await resolveValues(ctx, {
      projectId: issue.projectId,
      sections: reached,
      values: [
        ...issue.values.filter((value) => earlier.has(value.fieldId)),
        ...onlyOf(args.values, stage),
      ],
      date: issue.date,
      authorId: issue.submittedBy,
      signerName: author?.name?.trim() || "Usuario desconocido",
      previous: issue.values,
    });

    const now = Date.now();
    const closed = done.length + 1 === stages.length;
    await ctx.db.patch(issue._id, {
      values: resolved.values,
      stages: [
        ...done,
        { sectionId: stage.id, completedBy: userId, completedAt: now },
      ],
      ...(closed ? { status: "closed" as const, closedAt: now } : {}),
      ...trackingFacts(form, version?.sections ?? [], resolved.values),
    });
    await replaceLinks(ctx, issue, resolved.links);
    return issue._id;
  },
});

/* ─────────────────────────────── Lecturas ───────────────────────────────── */

async function issueRow(
  form: Doc<"forms">,
  issue: Doc<"formResponses">,
  stageLabels: readonly string[],
  nameOf: (id: Id<"users">) => Promise<string>,
) {
  const done = issue.stages?.length ?? 0;
  return {
    _id: issue._id,
    _creationTime: issue._creationTime,
    formId: form._id,
    formName: form.name,
    code: trackingCode({
      prefix: form.numberPrefix,
      year: issue.year,
      number: issue.number,
    }),
    title: issue.title ?? "",
    status: issue.status,
    date: issue.date,
    dueDate: issue.dueDate ?? null,
    responsible: issue.responsibleLabel ?? null,
    openedBy: await nameOf(issue.submittedBy),
    closedAt: issue.closedAt ?? null,
    /** La etapa que toca, o `null` si ya no toca ninguna. */
    stage: issue.status === "open" ? (stageLabels[done] ?? null) : null,
    stagesDone: done,
    stagesTotal: stageLabels.length,
  };
}

/** Las etiquetas de las etapas de cada versión, leídas una vez. */
function stageReader(ctx: QueryCtx) {
  const known = new Map<Id<"formVersions">, string[]>();
  return async (versionId: Id<"formVersions">) => {
    const cached = known.get(versionId);
    if (cached) return cached;
    const version = await ctx.db.get(versionId);
    const labels = stagesOf(version?.sections ?? []).map(
      (section) => section.label,
    );
    known.set(versionId, labels);
    return labels;
  };
}

/**
 * La bandeja: los asuntos abiertos —o los cerrados— de un proyecto, o de uno
 * de sus seguimientos.
 *
 * Los abiertos **no dependen de un rango de fechas**: uno de hace ocho meses
 * que sigue abierto es justo el que hay que ver. Se leen por estado, con
 * tope, y salen los vencidos primero. Quien no ve las respuestas de todos
 * recibe sólo los que abrió.
 */
export const list = query({
  args: {
    projectId: v.id("projects"),
    state: v.union(v.literal("open"), v.literal("closed")),
    formId: v.optional(v.id("forms")),
  },
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx, args.projectId, formTrackingsErrors);
    const seesAll = viewer.access.can("viewResponses");
    if (!seesAll && !viewer.access.can("fillForms")) {
      throw new ConvexError(formTrackingsErrors.insufficientPermissions);
    }

    // Un formato que llega por argumentos demuestra que es del proyecto.
    const only = args.formId ? await ctx.db.get(args.formId) : null;
    if (args.formId && only?.projectId !== args.projectId) {
      throw new ConvexError(formTrackingsErrors.formNotFound);
    }

    const found = only
      ? ctx.db
          .query("formResponses")
          .withIndex("formId_status", (q) =>
            q.eq("formId", only._id).eq("status", args.state),
          )
      : ctx.db
          .query("formResponses")
          .withIndex("projectId_status", (q) =>
            q.eq("projectId", args.projectId).eq("status", args.state),
          );
    const read = await (seesAll
      ? found
      : found.filter((q) => q.eq(q.field("submittedBy"), viewer.userId))
    )
      .order("desc")
      .take(TRACKING_LIST_LIMIT + 1);

    const forms = new Map<Id<"forms">, Doc<"forms"> | null>();
    const stagesOfVersion = stageReader(ctx);
    const nameOf = nameReader(ctx);
    const rows = [];
    for (const issue of read.slice(0, TRACKING_LIST_LIMIT)) {
      if (!forms.has(issue.formId)) {
        forms.set(issue.formId, await ctx.db.get(issue.formId));
      }
      const form = forms.get(issue.formId);
      if (!form) continue;
      rows.push(
        await issueRow(
          form,
          issue,
          await stagesOfVersion(issue.versionId),
          nameOf,
        ),
      );
    }

    // Abiertos: lo que tiene fecha de compromiso primero, la más vieja
    // arriba —ahí están los vencidos—; después, lo que no tiene fecha.
    if (args.state === "open") {
      rows.sort((a, b) =>
        (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"),
      );
    }
    return { rows, capped: read.length > TRACKING_LIST_LIMIT };
  },
});
