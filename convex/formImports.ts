import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import {
  type MutationCtx,
  type QueryCtx,
  internalMutation,
  mutation,
  query,
} from "./_generated/server";
import { todayInColombia } from "./lib/dates";
import { entryTitle } from "./lib/entry_title";
import { formImportsErrors } from "./lib/error_messages";
import { canViewAll, loadViewer, requireUser } from "./lib/form_access";
import { digestAdd, digestRemove } from "./lib/form_digests";
import { nameReader } from "./lib/form_rows";
import { loadPublished } from "./lib/form_store";
import type { FormSection } from "./lib/form_types";
import {
  releaseFiles,
  replaceLinks,
  resolveValues,
  writeLinks,
} from "./lib/form_values";
import { storedFieldValues } from "./lib/form_validators";
import {
  IMPORT_LIMITS,
  IMPORT_MODES,
  importSections,
} from "./lib/import_types";
import { normalizeText } from "./lib/text";
import { isRealDate } from "./lib/value_validation";

/** Cuántas importaciones de un formato enseña su lista. */
const LIST_LIMIT = 50;

/** Cuántas respuestas retira una pasada de `purge`. Cada una arrastra sus
 *  relaciones, así que el lote es corto. */
const PURGE_BATCH = 100;

const importMode = v.union(...IMPORT_MODES.map((mode) => v.literal(mode)));

const importRow = v.object({
  /** El número de la fila en el archivo: con él se devuelve su motivo. */
  row: v.number(),
  /** La fecha del hecho, `YYYY-MM-DD`. Sólo en un formato. */
  date: v.optional(v.string()),
  values: storedFieldValues,
});

/** Lo que crea una importación, según la clase del formato. */
const NOUN: Record<Doc<"forms">["kind"], string> = {
  record: "respuestas",
  catalog: "elementos",
  tracking: "asuntos",
};

/* ─────────────────────────────── Ayudantes ──────────────────────────────── */

/** Identidad, existencia y la llave de importar, con el proyecto derivado del
 *  formato (`01 §4.3`). */
async function requireImporter(ctx: QueryCtx, formId: Id<"forms">) {
  const userId = await requireUser(ctx, formImportsErrors);

  const form = await ctx.db.get(formId);
  if (!form) throw new ConvexError(formImportsErrors.formNotFound);

  const viewer = await loadViewer(ctx, userId, form.projectId);
  if (!viewer?.access.can("importResponses")) {
    throw new ConvexError(formImportsErrors.insufficientPermissions);
  }
  return { userId, form };
}

/** Lo mismo a partir de una importación: su formato dice el proyecto. */
async function requireImport(ctx: QueryCtx, importId: Id<"formImports">) {
  const userId = await requireUser(ctx, formImportsErrors);

  const record = await ctx.db.get(importId);
  if (!record) throw new ConvexError(formImportsErrors.importNotFound);
  const form = await ctx.db.get(record.formId);
  if (!form) throw new ConvexError(formImportsErrors.formNotFound);

  const viewer = await loadViewer(ctx, userId, form.projectId);
  if (!viewer?.access.can("importResponses")) {
    throw new ConvexError(formImportsErrors.insufficientPermissions);
  }
  return { userId, record, form };
}

/** Lo que pasó con una fila. */
type RowOutcome =
  | { kind: "created" | "updated" | "skipped" }
  | { kind: "rejected"; message: string };

const rejected = (message: string): RowOutcome => ({
  kind: "rejected",
  message,
});

/**
 * Los valores de una fila, por la frontera de siempre. Una fila que no la
 * pasa **no tumba el lote**: `resolveValues` no escribe, así que su error se
 * convierte en el motivo de esa fila y las demás siguen.
 */
async function resolveRow(
  ctx: MutationCtx,
  input: Parameters<typeof resolveValues>[1],
) {
  try {
    return await resolveValues(ctx, input);
  } catch (error) {
    if (error instanceof ConvexError && typeof error.data === "string") {
      return error.data;
    }
    throw error;
  }
}

interface RowContext {
  record: Doc<"formImports">;
  form: Doc<"forms">;
  /** Las secciones de la versión, como las exige una importación. */
  sections: FormSection[];
  userId: Id<"users">;
  today: string;
  /** Las respuestas que el lote lleva escritas: se resumen juntas al final. */
  written: Pick<
    Doc<"formResponses">,
    "_id" | "date" | "values" | "versionId"
  >[];
}

/** Una fila de un formato: una respuesta con la fecha del hecho. */
async function writeResponse(
  ctx: MutationCtx,
  { record, form, sections, userId, today, written }: RowContext,
  row: { date?: string; values: Doc<"formResponses">["values"] },
): Promise<RowOutcome> {
  if (!row.date || !isRealDate(row.date)) {
    return rejected(formImportsErrors.rowDateMissing);
  }
  if (row.date > today) return rejected(formImportsErrors.rowDateInFuture);

  const resolved = await resolveRow(ctx, {
    projectId: form.projectId,
    sections,
    values: row.values,
    date: row.date,
    authorId: userId,
    // Un archivo no trae firmas: no hay nombre con el que firmar.
    signerName: "",
    allowInactive: true,
  });
  if (typeof resolved === "string") return rejected(resolved);
  if (resolved.values.length === 0) {
    return rejected(formImportsErrors.rowEmpty);
  }

  const response = {
    formId: form._id,
    projectId: form.projectId,
    versionId: record.versionId,
    date: row.date,
    submittedBy: userId,
    status: "submitted" as const,
    importId: record._id,
    values: resolved.values,
  };
  const responseId = await ctx.db.insert("formResponses", response);
  await writeLinks(ctx, { ...response, _id: responseId }, resolved.links);
  written.push({ ...response, _id: responseId });
  return { kind: "created" };
}

/** Una fila de un listado: un elemento nuevo, o el que ya tiene ese título. */
async function writeEntry(
  ctx: MutationCtx,
  { record, form, sections, userId, today }: RowContext,
  row: { values: Doc<"formResponses">["values"] },
): Promise<RowOutcome> {
  // El título sale de lo que llega: es un campo de texto, y limpio dice lo
  // mismo antes y después de la frontera.
  const { title, titleSearch } = entryTitle(form, sections, row.values);
  if (title === "") return rejected(formImportsErrors.rowTitleMissing);

  const existing = await ctx.db
    .query("formResponses")
    .withIndex("formId_titleSearch", (q) =>
      q.eq("formId", form._id).eq("titleSearch", titleSearch),
    )
    .first();

  if (!existing) {
    const resolved = await resolveRow(ctx, {
      projectId: form.projectId,
      sections,
      values: row.values,
      date: today,
      authorId: userId,
      signerName: "",
      allowInactive: true,
    });
    if (typeof resolved === "string") return rejected(resolved);

    const entry = {
      formId: form._id,
      projectId: form.projectId,
      versionId: record.versionId,
      date: today,
      submittedBy: userId,
      status: "submitted" as const,
      importId: record._id,
      title,
      titleSearch,
      active: true,
      values: resolved.values,
    };
    const entryId = await ctx.db.insert("formResponses", entry);
    await writeLinks(ctx, { ...entry, _id: entryId }, resolved.links);
    return { kind: "created" };
  }

  if (record.mode !== "update") return { kind: "skipped" };

  // Se sobrescribe lo que el archivo trae y se conserva lo demás.
  const brought = new Set(row.values.map((value) => value.fieldId));
  const resolved = await resolveRow(ctx, {
    projectId: form.projectId,
    sections,
    values: [
      ...existing.values.filter((value) => !brought.has(value.fieldId)),
      ...row.values,
    ],
    // Actualizarlo no lo convierte en otro: conserva su fecha y su autor.
    date: existing.date,
    authorId: existing.submittedBy,
    signerName: "",
    previous: existing.values,
    allowInactive: true,
  });
  if (typeof resolved === "string") return rejected(resolved);

  await ctx.db.patch(existing._id, {
    versionId: record.versionId,
    values: resolved.values,
    title,
    titleSearch,
    updatedAt: Date.now(),
    updatedBy: userId,
  });
  await replaceLinks(ctx, existing, resolved.links);
  await releaseFiles(ctx, existing.values, resolved.values);
  return { kind: "updated" };
}

/* ────────────────────────────── Escrituras ──────────────────────────────── */

/**
 * Empieza una importación: deja el registro contra el que se escriben los
 * lotes, con la versión del formato fijada para todos ellos.
 *
 * La constancia en la auditoría se escribe aquí y no al terminar: una
 * importación que se interrumpe también pasó.
 */
export const start = mutation({
  args: {
    formId: v.id("forms"),
    fileName: v.string(),
    fingerprint: v.string(),
    mode: importMode,
    /** Las filas que se van a enviar. */
    total: v.number(),
  },
  handler: async (ctx, args) => {
    const { userId, form } = await requireImporter(ctx, args.formId);

    const version =
      form.status === "published" ? await loadPublished(ctx, form) : null;
    if (!version) throw new ConvexError(formImportsErrors.formNotPublished);

    // Un asunto de seguimiento se abre y avanza por etapas: no se importa.
    if (
      form.kind === "tracking" ||
      (form.kind === "record") !== (args.mode === "add")
    ) {
      throw new ConvexError(formImportsErrors.invalidMode);
    }
    const fileName = normalizeText(args.fileName);
    if (
      fileName === "" ||
      fileName.length > IMPORT_LIMITS.maxFileNameLength ||
      args.fingerprint.length > IMPORT_LIMITS.maxFileNameLength
    ) {
      throw new ConvexError(formImportsErrors.invalidFileName);
    }
    if (
      !Number.isInteger(args.total) ||
      args.total < 1 ||
      args.total > IMPORT_LIMITS.maxRows
    ) {
      throw new ConvexError(formImportsErrors.invalidTotal);
    }

    const importId = await ctx.db.insert("formImports", {
      projectId: form.projectId,
      formId: form._id,
      versionId: version._id,
      createdBy: userId,
      fileName,
      fingerprint: args.fingerprint,
      mode: args.mode,
      status: "running",
      counts: {
        total: args.total,
        created: 0,
        updated: 0,
        skipped: 0,
        rejected: 0,
      },
    });

    await ctx.runMutation(internal.logs.create, {
      description: `Importación en ${form.name}: ${fileName} (${args.total} filas)`,
      type: "create",
      projectId: form.projectId,
      affectedEntityType: "form",
      affectedEntityId: form._id,
    });

    return importId;
  },
});

/**
 * Escribe un lote de filas de una importación en curso.
 *
 * Es la primera mutation del proyecto que recibe un arreglo (`01 §5.6`): el
 * ámbito no sale de ninguna fila, sino de la importación, que dice su formato
 * y su proyecto. Cada fila pasa por `resolveValues`; la que falla vuelve con
 * su motivo y no impide a las demás.
 *
 * **No escribe auditoría por fila**: la importación ya es el registro.
 */
export const writeBatch = mutation({
  args: { importId: v.id("formImports"), rows: v.array(importRow) },
  handler: async (ctx, args) => {
    const { userId, record, form } = await requireImport(ctx, args.importId);

    if (record.status !== "running") {
      throw new ConvexError(formImportsErrors.notRunning);
    }
    if (record.createdBy !== userId) {
      throw new ConvexError(formImportsErrors.notOwnImport);
    }
    if (args.rows.length > IMPORT_LIMITS.batchSize) {
      throw new ConvexError(formImportsErrors.batchTooLarge);
    }
    const { counts } = record;
    const done =
      counts.created + counts.updated + counts.skipped + counts.rejected;
    if (done + args.rows.length > counts.total) {
      throw new ConvexError(formImportsErrors.overTotal);
    }
    const version = await ctx.db.get(record.versionId);
    if (!version || form.status !== "published") {
      throw new ConvexError(formImportsErrors.formNotPublished);
    }

    const context: RowContext = {
      record,
      form,
      sections: importSections(version.sections),
      userId,
      today: todayInColombia(Date.now()),
      written: [],
    };
    const next = { ...counts };
    const problems: { row: number; message: string }[] = [];

    for (const row of args.rows) {
      const outcome =
        form.kind === "record"
          ? await writeResponse(ctx, context, row)
          : await writeEntry(ctx, context, row);
      next[outcome.kind] += 1;
      if (outcome.kind === "rejected") {
        problems.push({ row: row.row, message: outcome.message });
      }
    }

    await digestAdd(ctx, form, context.written);
    await ctx.db.patch(record._id, { counts: next });
    const created = next.created - counts.created;
    if (created > 0) {
      await ctx.db.patch(form._id, {
        responseCount: form.responseCount + created,
      });
    }

    return { counts: next, problems };
  },
});

/** Cierra una importación. Lo que no llegó a enviarse no se anota: la
 *  diferencia entre `total` y lo contado dice que quedó a medias. */
export const finish = mutation({
  args: { importId: v.id("formImports") },
  handler: async (ctx, args) => {
    const { userId, record } = await requireImport(ctx, args.importId);

    if (record.status !== "running") {
      throw new ConvexError(formImportsErrors.notRunning);
    }
    if (record.createdBy !== userId) {
      throw new ConvexError(formImportsErrors.notOwnImport);
    }

    await ctx.db.patch(record._id, { status: "done", finishedAt: Date.now() });
    return record._id;
  },
});

/**
 * Deshace una importación entera: es el único borrado de respuestas que
 * existe, y no borra una fila suelta —para eso está anular— (diseño §5).
 *
 * Marca y agenda: retirar miles de respuestas con sus relaciones no cabe en
 * una transacción (`01 §6.1`). Vale también para una importación que se quedó
 * a medias.
 */
export const revert = mutation({
  args: { importId: v.id("formImports") },
  handler: async (ctx, args) => {
    const { userId, record, form } = await requireImport(ctx, args.importId);

    if (record.status === "reverted") {
      throw new ConvexError(formImportsErrors.alreadyReverted);
    }

    await ctx.db.patch(record._id, {
      status: "reverted",
      revertedBy: userId,
      revertedAt: Date.now(),
    });
    await ctx.scheduler.runAfter(0, internal.formImports.purge, {
      importId: record._id,
    });

    await ctx.runMutation(internal.logs.create, {
      description: `Importación deshecha en ${form.name}: ${record.fileName} (${record.counts.created} ${NOUN[form.kind]})`,
      type: "delete",
      projectId: form.projectId,
      affectedEntityType: "form",
      affectedEntityId: form._id,
    });

    return record._id;
  },
});

/**
 * Retira lo que creó una importación deshecha, por lotes, re-agendándose.
 *
 * En un listado **conserva** el elemento que alguna respuesta ya eligió
 * —borrarlo dejaría a esa respuesta señalando a nada— y le quita la marca,
 * para que la pasada siguiente no vuelva a encontrarlo. Las actualizaciones
 * que hizo la importación no se revierten: no se guardó cómo era antes.
 *
 * Idempotente: consulta lo que queda por índice y lo retira.
 */
export const purge = internalMutation({
  args: { importId: v.id("formImports") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const record = await ctx.db.get(args.importId);
    if (!record || record.status !== "reverted") return null;

    const form = await ctx.db.get(record.formId);
    const batch = await ctx.db
      .query("formResponses")
      .withIndex("importId", (q) => q.eq("importId", args.importId))
      .take(PURGE_BATCH);

    let removed = 0;
    const gone: Doc<"formResponses">[] = [];
    for (const response of batch) {
      if (form?.kind === "catalog") {
        const user = await ctx.db
          .query("formResponseLinks")
          .withIndex("targetResponseId", (q) =>
            q.eq("targetResponseId", response._id),
          )
          .first();
        if (user) {
          await ctx.db.patch(response._id, { importId: undefined });
          continue;
        }
      }

      const links = await ctx.db
        .query("formResponseLinks")
        .withIndex("responseId", (q) => q.eq("responseId", response._id))
        .collect();
      for (const link of links) await ctx.db.delete(link._id);
      await releaseFiles(ctx, response.values, []);
      await ctx.db.delete(response._id);
      gone.push(response);
      removed += 1;
    }
    if (form) await digestRemove(ctx, form, gone);

    if (form && removed > 0) {
      await ctx.db.patch(form._id, {
        responseCount: Math.max(0, form.responseCount - removed),
      });
    }
    if (batch.length === PURGE_BATCH) {
      await ctx.scheduler.runAfter(0, internal.formImports.purge, {
        importId: args.importId,
      });
    }
    return null;
  },
});

/* ─────────────────────────────── Lecturas ───────────────────────────────── */

/**
 * Las últimas importaciones de un formato, la más reciente primero.
 *
 * La ve quien consulta sus respuestas —o mantiene sus elementos— y quien
 * importa. Trae la huella de cada archivo: con ella el navegador avisa de una
 * segunda subida del mismo.
 */
export const list = query({
  args: { formId: v.id("forms") },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx, formImportsErrors);

    const form = await ctx.db.get(args.formId);
    if (!form) throw new ConvexError(formImportsErrors.formNotFound);

    const viewer = await loadViewer(ctx, userId, form.projectId);
    const canImport = viewer?.access.can("importResponses") === true;
    if (!viewer || !(canImport || canViewAll(viewer, form))) {
      throw new ConvexError(formImportsErrors.insufficientPermissions);
    }

    const records = await ctx.db
      .query("formImports")
      .withIndex("formId", (q) => q.eq("formId", form._id))
      .order("desc")
      .take(LIST_LIMIT);

    const nameOf = nameReader(ctx);
    return await Promise.all(
      records.map(async (record) => ({
        _id: record._id,
        _creationTime: record._creationTime,
        fileName: record.fileName,
        fingerprint: record.fingerprint,
        mode: record.mode,
        status: record.status,
        counts: record.counts,
        author: await nameOf(record.createdBy),
        revertedAt: record.revertedAt ?? null,
        revertedBy: record.revertedBy ? await nameOf(record.revertedBy) : null,
        canRevert: canImport && record.status !== "reverted",
      })),
    );
  },
});

/**
 * Los títulos de los elementos de un listado, por páginas: con ellos el paso
 * de valores de una importación resuelve cada relación.
 *
 * Exige la llave de importar, no `viewResponses`: quien importa necesita
 * saber qué elementos hay, y lo que sale de aquí es el título, no lo que el
 * elemento lleva dentro. Los inactivos salen también: lo que se importa pasó
 * cuando quizá estaban activos, pero una relación a uno inactivo se rechaza
 * igual que al diligenciar.
 */
export const entryTitles = query({
  args: { formId: v.id("forms"), paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const { form } = await requireImporter(ctx, args.formId);
    if (form.kind !== "catalog") {
      throw new ConvexError(formImportsErrors.notCatalog);
    }

    const page = await ctx.db
      .query("formResponses")
      .withIndex("formId_titleSearch", (q) => q.eq("formId", form._id))
      .paginate(args.paginationOpts);

    return {
      ...page,
      page: page.page.map((entry) => ({
        _id: entry._id,
        title: entry.title ?? "",
        active: entry.active === true,
      })),
    };
  },
});
