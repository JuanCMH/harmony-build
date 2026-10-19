import { getAuthUserId } from "@convex-dev/auth/server";
import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import { mutation, query } from "./_generated/server";
import { todayInColombia } from "./lib/dates";
import { formResponsesErrors } from "./lib/error_messages";
import { dateText } from "./lib/field_text";
import { stagesOf, trackingCode } from "./lib/tracking";
import {
  canEditEntries,
  canOpenTracking,
  canViewAll,
  canViewResponse,
  isFillable,
  loadViewer,
  mayFill,
  requireUser,
} from "./lib/form_access";
import { digestAdd, digestRemove } from "./lib/form_digests";
import { rowReader } from "./lib/form_rows";
import { VOID_REASON_MAX, VOID_REASON_MIN } from "./lib/form_types";
import { resolveValues, writeLinks } from "./lib/form_values";
import { storedFieldValues } from "./lib/form_validators";
import { storedFileIds } from "./lib/stored_values";
import { normalizeText } from "./lib/text";
import { publicUser } from "./members";

/* ────────────────────────────── Escrituras ──────────────────────────────── */

/**
 * Diligencia un formato: guarda una respuesta contra su última versión
 * publicada.
 *
 * Lo que se escribe no es lo que llega: pasa por `resolveValues`. Y la fecha
 * de negocio la pone el servidor, en hora de Colombia.
 *
 * **No escribe auditoría**: la respuesta ya es el registro de quién, qué y
 * cuándo, y cien inspecciones diarias enterrarían todo lo demás (diseño,
 * «Reglas de acceso»).
 */
export const submit = mutation({
  args: { formId: v.id("forms"), values: storedFieldValues },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx, formResponsesErrors);

    const form = await ctx.db.get(args.formId);
    if (!form) throw new ConvexError(formResponsesErrors.formNotFound);

    const viewer = await loadViewer(ctx, userId, form.projectId);
    if (!viewer || !mayFill(viewer, form)) {
      throw new ConvexError(formResponsesErrors.insufficientPermissions);
    }

    if (form.kind !== "record") {
      throw new ConvexError(formResponsesErrors.notRecord);
    }
    const version =
      isFillable(form) && form.publishedVersionId
        ? await ctx.db.get(form.publishedVersionId)
        : null;
    if (!version) {
      throw new ConvexError(formResponsesErrors.formNotFillable(form.kind));
    }
    const author = await ctx.db.get(userId);

    const date = todayInColombia(Date.now());
    const resolved = await resolveValues(ctx, {
      projectId: form.projectId,
      sections: version.sections,
      values: args.values,
      date,
      authorId: userId,
      signerName: author?.name?.trim() || "Usuario desconocido",
    });

    const response = {
      formId: form._id,
      projectId: form.projectId,
      versionId: version._id,
      date,
      submittedBy: userId,
      status: "submitted" as const,
      values: resolved.values,
    };
    const responseId = await ctx.db.insert("formResponses", response);
    await writeLinks(ctx, { ...response, _id: responseId }, resolved.links);
    await digestAdd(ctx, form, [{ ...response, _id: responseId }]);
    await ctx.db.patch(form._id, { responseCount: form.responseCount + 1 });

    return responseId;
  },
});

/** Anula una respuesta equivocada. Sigue existiendo —tachada, con quién la
 *  anuló y por qué—; no se borra (diseño §6). */
const voidResponse = mutation({
  args: { id: v.id("formResponses"), reason: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx, formResponsesErrors);

    const response = await ctx.db.get(args.id);
    if (!response) throw new ConvexError(formResponsesErrors.responseNotFound);
    const form = await ctx.db.get(response.formId);
    if (!form) throw new ConvexError(formResponsesErrors.formNotFound);

    const viewer = await loadViewer(ctx, userId, response.projectId);
    if (!viewer?.access.can("voidResponses")) {
      throw new ConvexError(formResponsesErrors.insufficientPermissions);
    }

    if (form.kind === "catalog") {
      throw new ConvexError(formResponsesErrors.cannotVoidEntry);
    }
    if (response.status === "voided") {
      throw new ConvexError(formResponsesErrors.alreadyVoided);
    }
    const reason = normalizeText(args.reason);
    if (reason.length < VOID_REASON_MIN || reason.length > VOID_REASON_MAX) {
      throw new ConvexError(formResponsesErrors.invalidVoidReason);
    }

    await ctx.db.patch(args.id, {
      status: "voided",
      voidedBy: userId,
      voidedAt: Date.now(),
      voidReason: reason,
    });
    // Una respuesta anulada no cuenta en ningún resultado.
    await digestRemove(ctx, form, [response]);

    await ctx.runMutation(internal.logs.create, {
      description:
        form.kind === "tracking"
          ? `Asunto anulado: ${form.name}, ${response.title ?? ""}`
          : `Respuesta anulada: ${form.name} del ${dateText(response.date)}`,
      type: "update",
      projectId: response.projectId,
      affectedEntityType: "formResponse",
      affectedEntityId: args.id,
    });

    return args.id;
  },
});

// `void` es palabra reservada como nombre de variable, pero no como nombre de
// exportación: la función se llama `formResponses.void`.
export { voidResponse as void };

/* ─────────────────────────────── Lecturas ───────────────────────────────── */

/**
 * Una respuesta —o un elemento—, con todo lo que hace falta para leerla: sus
 * valores, las secciones de **su** versión, su autor y las direcciones de sus
 * archivos. `null` si no existe o si quien pregunta no puede verla.
 */
export const getById = query({
  args: { id: v.id("formResponses") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;

    const response = await ctx.db.get(args.id);
    if (!response) return null;
    const form = await ctx.db.get(response.formId);
    if (!form) return null;

    // El proyecto sale de la respuesta, nunca de un argumento.
    const viewer = await loadViewer(ctx, userId, response.projectId);
    if (!viewer || !canViewResponse(viewer, form, response)) return null;

    const [version, record, author, voidedBy, updatedBy, files] =
      await Promise.all([
        ctx.db.get(response.versionId),
        response.importId ? ctx.db.get(response.importId) : null,
        publicUser(ctx, response.submittedBy),
        response.voidedBy ? publicUser(ctx, response.voidedBy) : null,
        response.updatedBy ? publicUser(ctx, response.updatedBy) : null,
        Promise.all(
          storedFileIds(response.values).map(async (storageId) => {
            const id = ctx.db.system.normalizeId("_storage", storageId);
            return { storageId, url: id ? await ctx.storage.getUrl(id) : null };
          }),
        ),
      ]);
    const importedBy = record ? await publicUser(ctx, record.createdBy) : null;

    return {
      _id: response._id,
      _creationTime: response._creationTime,
      projectId: response.projectId,
      date: response.date,
      status: response.status,
      form: {
        _id: form._id,
        kind: form.kind,
        name: form.name,
        code: form.code,
        status: form.status,
        titleFieldId: form.titleFieldId,
        publishedVersionId: form.publishedVersionId ?? null,
      },
      version: version
        ? {
            _id: version._id,
            number: version.number,
            publishedAt: version.publishedAt ?? null,
          }
        : null,
      sections: version?.sections ?? [],
      values: response.values,
      /** La dirección firmada de cada archivo y cada firma de `values`. */
      files,
      author,
      /** Si no se diligenció aquí: cuándo se trajo, quién y de qué archivo.
       *  El registro de la importación puede faltar; la marca, no. */
      imported: response.importId
        ? {
            at: record?._creationTime ?? response._creationTime,
            by: importedBy,
            fileName: record?.fileName ?? null,
          }
        : null,
      voided:
        response.status === "voided"
          ? {
              by: voidedBy,
              at: response.voidedAt ?? null,
              reason: response.voidReason ?? "",
            }
          : null,
      /** Sólo en un asunto de seguimiento: su consecutivo, sus etapas y si
       *  quien mira puede completar la que toca. */
      tracking:
        form.kind === "tracking"
          ? {
              code: trackingCode({
                prefix: form.numberPrefix,
                year: response.year,
                number: response.number,
              }),
              dueDate: response.dueDate ?? null,
              responsible: response.responsibleLabel ?? null,
              closedAt: response.closedAt ?? null,
              stages: await Promise.all(
                stagesOf(version?.sections ?? []).map(async (section, index) => {
                  const done = response.stages?.[index];
                  return {
                    sectionId: section.id,
                    label: section.label,
                    completedAt: done?.completedAt ?? null,
                    completedBy: done
                      ? await publicUser(ctx, done.completedBy)
                      : null,
                  };
                }),
              ),
              canComplete:
                response.status === "open" && canOpenTracking(viewer, form),
            }
          : null,
      // En los elementos de un listado y en los asuntos de un seguimiento.
      title: response.title ?? null,
      active: response.active ?? null,
      updatedAt: response.updatedAt ?? null,
      updatedBy,
      canVoid:
        form.kind !== "catalog" &&
        response.status !== "voided" &&
        viewer.access.can("voidResponses"),
      canEdit: canEditEntries(viewer, form),
    };
  },
});

/**
 * Las respuestas de un formato, por fecha de negocio, lo más reciente
 * primero.
 *
 * Quien no tiene `viewResponses` recibe **sólo las suyas**, pida lo que pida:
 * la llave se comprueba aquí y no se confía en que la pantalla filtre
 * (`01 §5.2`). `from` y `to` son fechas de negocio, las dos incluidas.
 */
export const list = query({
  args: {
    formId: v.id("forms"),
    paginationOpts: paginationOptsValidator,
    mine: v.optional(v.boolean()),
    from: v.optional(v.string()),
    to: v.optional(v.string()),
    targetResponseId: v.optional(v.id("formResponses")),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx, formResponsesErrors);

    const form = await ctx.db.get(args.formId);
    if (!form) throw new ConvexError(formResponsesErrors.formNotFound);

    const viewer = await loadViewer(ctx, userId, form.projectId);
    const seesAll = viewer !== null && canViewAll(viewer, form);
    if (!viewer || !(seesAll || viewer.access.can("fillForms"))) {
      throw new ConvexError(formResponsesErrors.insufficientPermissions);
    }
    if (form.kind !== "record") {
      throw new ConvexError(formResponsesErrors.notRecord);
    }

    const onlyMine = args.mine === true || !seesAll;
    const from = args.from ?? "";
    // `~` va después de cualquier fecha: sin `to`, el rango no tiene techo.
    const to = args.to ?? "~";
    const toRow = await rowReader(ctx, form);

    // Por elemento relacionado se pagina sobre las relaciones, que es lo que
    // está indexado por él, y de cada una se carga su respuesta.
    if (args.targetResponseId) {
      const target = args.targetResponseId;
      const links = ctx.db
        .query("formResponseLinks")
        .withIndex("targetResponseId_formId_date", (q) =>
          q
            .eq("targetResponseId", target)
            .eq("formId", form._id)
            .gte("date", from)
            .lte("date", to),
        )
        .order("desc");
      const page = await (onlyMine
        ? links.filter((q) => q.eq(q.field("submittedBy"), userId))
        : links
      ).paginate(args.paginationOpts);

      const rows = [];
      for (const link of page.page) {
        const response = await ctx.db.get(link.responseId);
        if (response) rows.push(await toRow(response));
      }
      return { ...page, page: rows };
    }

    // Siempre por fecha de negocio: una respuesta importada se creó hoy y
    // ocurrió hace meses, así que el orden de creación ya no es el de los
    // hechos. A igual fecha, el índice desempata por creación.
    const responses = onlyMine
      ? ctx.db
          .query("formResponses")
          .withIndex("formId_submittedBy_date", (q) =>
            q
              .eq("formId", form._id)
              .eq("submittedBy", userId)
              .gte("date", from)
              .lte("date", to),
          )
      : ctx.db
          .query("formResponses")
          .withIndex("formId_date", (q) =>
            q.eq("formId", form._id).gte("date", from).lte("date", to),
          );

    const page = await responses.order("desc").paginate(args.paginationOpts);
    return { ...page, page: await Promise.all(page.page.map(toRow)) };
  },
});
