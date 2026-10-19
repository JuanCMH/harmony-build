/** La frontera única por la que pasan los valores de una respuesta antes de
 *  guardarse.
 *
 *  Portado de `resolveValues` (`convex/formTemplates.ts` de Harmony) y de la
 *  validación de archivos de `convex/lib/form_values.ts`. La regla es la de
 *  allí: **el cliente propone; el servidor dispone**. Lo que llega del
 *  navegador se convierte, se poda, se recalcula y se comprueba, y lo que se
 *  escribe es lo que sale de aquí, no lo que entró.
 *
 *  Una sola función para los tres caminos que escriben —diligenciar un
 *  formato, crear un elemento y editarlo—: con dos copias, una acabaría
 *  olvidando comprobar un archivo o componer una instantánea.
 */

import { ConvexError } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { formResponsesErrors } from "./error_messages";
import { computeComputedValues } from "./field_computed";
import { isTodayDependent } from "./field_logic";
import { fieldText } from "./field_text";
import { formContext } from "./form_context";
import {
  evaluateForm,
  flattenFields,
  missingRequiredFields,
} from "./form_evaluation";
import {
  DEFAULT_FILE_SIZE_MB,
  type FileValue,
  type FormField,
  type FormSection,
  type FormValues,
  type ReferenceConfig,
  type ReferenceSnapshotEntry,
  type ReferenceValue,
  type StoredCellValue,
  type StoredFieldValue,
  type TableRow,
} from "./form_types";
import {
  fromStoredValues,
  isFileValue,
  isReferenceValue,
  isSignatureValue,
  storedFileIds,
  toStoredValues,
} from "./stored_values";
import { validateValues } from "./value_validation";

type StoredValues = Doc<"formResponses">["values"];
type StoredValue = StoredValues[number]["value"];
type StoredCell = Extract<
  StoredValue,
  { kind: "table" }
>["rows"][number]["cells"][number]["value"];

/** Cuánto puede tener un archivo desde que se subió hasta que se liga a una
 *  respuesta. Un `storageId` más viejo no es de esta subida: podría ser el de
 *  otra respuesta, o el logo del proyecto. */
const UPLOAD_WINDOW_MS = 60 * 60 * 1000;

const MEGABYTE = 1024 * 1024;

/* ───────────────────────────── Relaciones ───────────────────────────────── */

/** Una relación resuelta contra la base. */
export interface ComposedReference {
  responseId: Id<"formResponses">;
  targetFormId: Id<"forms">;
  /** Si el elemento sigue activo. Uno inactivo no se puede elegir. */
  active: boolean;
  /** El título del elemento, tal como está ahora. */
  label: string;
  /** Los campos que la relación trae, como texto, tal como están ahora. */
  snapshot: ReferenceSnapshotEntry[];
}

/** Las versiones ya leídas durante una resolución: una tabla de cien filas
 *  que elige elementos del mismo listado lee su definición una vez. */
type VersionCache = Map<Id<"formVersions">, FormField[]>;

async function versionFields(
  ctx: QueryCtx,
  versionId: Id<"formVersions"> | undefined,
  cache: VersionCache,
): Promise<FormField[]> {
  if (!versionId) return [];
  const cached = cache.get(versionId);
  if (cached) return cached;
  const version = await ctx.db.get(versionId);
  const fields = version ? flattenFields(version.sections) : [];
  cache.set(versionId, fields);
  return fields;
}

/**
 * El elemento que elige una relación, con el título y la instantánea que **el
 * servidor** compone a partir del `fill` del campo (diseño §5).
 *
 * Devuelve `null` si el elemento no existe, no es del listado configurado o no
 * es de este proyecto: las tres cosas son la misma para quien pregunta, y
 * distinguirlas le diría qué hay en otro proyecto. Que esté inactivo se
 * devuelve aparte, porque a veces se tolera (`resolveValues`).
 */
export async function composeReference(
  ctx: QueryCtx,
  args: {
    projectId: Id<"projects">;
    config: ReferenceConfig;
    responseId: string;
    cache?: VersionCache;
  },
): Promise<ComposedReference | null> {
  const catalogId = ctx.db.normalizeId("forms", args.config.formId);
  const entryId = ctx.db.normalizeId("formResponses", args.responseId);
  if (!catalogId || !entryId) return null;

  const entry = await ctx.db.get(entryId);
  if (
    !entry ||
    entry.formId !== catalogId ||
    entry.projectId !== args.projectId
  ) {
    return null;
  }

  const cache = args.cache ?? new Map();
  // El elemento se lee con la versión con que se guardó. Un campo que entró
  // al listado después no lo tiene: sale con su nombre y sin valor.
  const own = new Map(
    (await versionFields(ctx, entry.versionId, cache)).map((field) => [
      field.id,
      field,
    ]),
  );
  const missing = args.config.fill.some((fieldId) => !own.has(fieldId));
  const catalog = missing ? await ctx.db.get(catalogId) : null;
  const current = new Map(
    (await versionFields(ctx, catalog?.publishedVersionId, cache)).map(
      (field) => [field.id, field],
    ),
  );

  const values = fromStoredValues(entry.values);
  const snapshot: ReferenceSnapshotEntry[] = [];
  for (const fieldId of args.config.fill) {
    const field = own.get(fieldId) ?? current.get(fieldId);
    if (!field) continue;
    snapshot.push({
      fieldId,
      label: field.label,
      text: own.has(fieldId) ? fieldText(field, values[fieldId]) : "",
    });
  }

  return {
    responseId: entry._id,
    targetFormId: catalogId,
    active: entry.active === true,
    label: entry.title ?? "",
    snapshot,
  };
}

/* ─────────────────────── Recorrer lo que hay que leer ───────────────────── */

/** Un valor que vive en un campo o en la celda de una tabla, con la forma de
 *  dejar otro en su sitio. */
interface Slot<Config> {
  /** El nombre con que se lee en un error. */
  label: string;
  fieldId: string;
  config: Config;
  value: unknown;
  replace: (value: unknown) => void;
}

/** Qué se le exige a un archivo. */
interface FileRule {
  kind: "file" | "image" | "signature";
  maxSizeMb: number;
  acceptedFormats: readonly string[];
}

const tableRows = (value: unknown): TableRow[] =>
  Array.isArray(value) ? (value as TableRow[]) : [];

/**
 * Los valores de un tipo de campo —y de las columnas de tabla de ese tipo—
 * que hay en una respuesta. Es lo que hace que un archivo o una relación
 * dentro de una fila pase por las mismas comprobaciones que uno suelto.
 */
function collectSlots<Config>(
  sections: readonly FormSection[],
  values: FormValues,
  ofField: (field: FormField) => Config | null,
  ofColumn: (
    column: NonNullable<FormField["config"]["table"]>["columns"][number],
  ) => Config | null,
): Slot<Config>[] {
  const slots: Slot<Config>[] = [];
  for (const field of flattenFields(sections)) {
    const value = values[field.id];
    if (value === undefined) continue;

    const config = ofField(field);
    if (config !== null) {
      slots.push({
        label: field.label,
        fieldId: field.id,
        config,
        value,
        replace: (next) => {
          values[field.id] = next;
        },
      });
    }

    for (const column of field.config.table?.columns ?? []) {
      const columnConfig = ofColumn(column);
      if (columnConfig === null) continue;
      for (const row of tableRows(value)) {
        for (const cell of row.cells) {
          if (cell.columnId !== column.id) continue;
          slots.push({
            label: `${field.label} › ${column.label}`,
            fieldId: field.id,
            config: columnConfig,
            value: cell.value,
            replace: (next) => {
              cell.value = next as typeof cell.value;
            },
          });
        }
      }
    }
  }
  return slots;
}

const fileSlots = (sections: readonly FormSection[], values: FormValues) =>
  collectSlots<FileRule>(
    sections,
    values,
    (field) =>
      field.type === "file" ||
      field.type === "image" ||
      field.type === "signature"
        ? {
            kind: field.type,
            maxSizeMb: field.config.maxFileSize ?? DEFAULT_FILE_SIZE_MB,
            acceptedFormats: field.config.acceptedFormats ?? [],
          }
        : null,
    (column) =>
      column.type === "image" || column.type === "signature"
        ? {
            kind: column.type,
            maxSizeMb: DEFAULT_FILE_SIZE_MB,
            acceptedFormats: [],
          }
        : null,
  );

const referenceSlots = (sections: readonly FormSection[], values: FormValues) =>
  collectSlots<ReferenceConfig>(
    sections,
    values,
    (field) =>
      field.type === "reference" ? (field.config.reference ?? null) : null,
    (column) =>
      column.type === "reference" ? (column.reference ?? null) : null,
  );

/* ─────────────────────────────── Archivos ───────────────────────────────── */

const isAccepted = (rule: FileRule, file: FileValue, contentType: string) => {
  if (rule.kind === "image") return contentType.startsWith("image/");
  // La firma sale de un lienzo: siempre es un PNG.
  if (rule.kind === "signature") return contentType === "image/png";
  return (
    rule.acceptedFormats.length === 0 ||
    rule.acceptedFormats.some((format) =>
      format.startsWith(".")
        ? file.name.toLowerCase().endsWith(format.toLowerCase())
        : contentType === format,
    )
  );
};

/**
 * Los archivos y las firmas que llegan a guardarse: los que el elemento ya
 * tenía pasan; los nuevos tienen que existir, ser recientes y respetar el tipo
 * y el tamaño de su campo. El formulario ya lo comprueba antes de subir; esto
 * es lo que manda.
 */
async function validateFiles(
  ctx: MutationCtx,
  sections: readonly FormSection[],
  values: FormValues,
  alreadyLinked: ReadonlySet<string>,
) {
  for (const { config: rule, value } of fileSlots(sections, values)) {
    if (!isFileValue(value) || value.storageId === "") continue;
    if (alreadyLinked.has(value.storageId)) continue;

    const invalid =
      rule.kind === "signature"
        ? formResponsesErrors.signatureInvalid
        : formResponsesErrors.fileInvalid;

    const id = ctx.db.system.normalizeId("_storage", value.storageId);
    const meta = id ? await ctx.db.system.get(id) : null;
    if (!meta || Date.now() - meta._creationTime > UPLOAD_WINDOW_MS) {
      throw new ConvexError(invalid);
    }
    if (meta.size > rule.maxSizeMb * MEGABYTE) {
      throw new ConvexError(formResponsesErrors.fileTooLarge);
    }
    if (!isAccepted(rule, value, meta.contentType ?? "")) {
      throw new ConvexError(
        rule.kind === "signature" ? invalid : formResponsesErrors.fileWrongType,
      );
    }
  }
}

/* ───────────────────────────── La frontera ──────────────────────────────── */

/** Una fila de `formResponseLinks`, antes de conocer el id de la respuesta. */
export interface ResolvedLink {
  fieldId: string;
  targetFormId: Id<"forms">;
  targetResponseId: Id<"formResponses">;
}

export interface ResolvedValues {
  values: StoredValues;
  /** Una por elemento distinto que la respuesta relaciona. */
  links: ResolvedLink[];
}

export interface ResolveInput {
  projectId: Id<"projects">;
  /** Las secciones de la versión con que se responde. */
  sections: readonly FormSection[];
  /** Lo que llegó del navegador. */
  values: StoredValues;
  /** La fecha de negocio de la respuesta. */
  date: string;
  /** Quien diligencia: el `@autor` de las reglas. */
  authorId: Id<"users">;
  /** El nombre con que firma quien diligencia. Sale de la sesión. */
  signerName: string;
  /** Al editar un elemento, lo que tenía guardado: sus archivos no vuelven a
   *  pasar por la ventana de subida, y una relación que no cambia se conserva
   *  aunque el elemento elegido se haya inactivado después. */
  previous?: StoredValues;
  /** Sólo al importar: se admite elegir un elemento inactivo. Lo que se
   *  importa ya pasó, y pasó cuando ese vehículo todavía rodaba. */
  allowInactive?: boolean;
}

/** Las relaciones que había en unos valores guardados, por elemento. */
function storedReferences(values: StoredValues): Map<string, ReferenceValue> {
  const references = new Map<string, ReferenceValue>();
  const collect = (value: StoredCell) => {
    if (value.kind === "reference") references.set(value.responseId, value);
  };
  for (const { value } of values) {
    if (value.kind === "table") {
      for (const row of value.rows) {
        for (const cell of row.cells) collect(cell.value);
      }
    } else if (value.kind === "reference") collect(value);
  }
  return references;
}

/** Quien diligencia firma con su nombre: sale de la sesión, no de lo que
 *  escriba el navegador (diseño §4.2). */
function signAsAuthor(
  sections: readonly FormSection[],
  values: FormValues,
  signerName: string,
) {
  for (const field of flattenFields(sections)) {
    if (field.type !== "signature") continue;
    if (field.config.signature?.signer !== "author") continue;
    const value = values[field.id];
    if (!isSignatureValue(value)) continue;
    values[field.id] = {
      storageId: value.storageId,
      name: value.name,
      signerName,
    };
  }
}

/** Poda lo oculto —sección incluida— y recalcula los derivados. Lo que
 *  depende de hoy **no se guarda nunca**: se evalúa al leer, o mañana ya
 *  sería mentira. */
function pruneAndCompute(
  sections: readonly FormSection[],
  received: FormValues,
  context: ReturnType<typeof formContext>,
): FormValues {
  const fields = flattenFields(sections);
  const evaluated = evaluateForm(sections, received, context);

  const kept: FormValues = {};
  for (const [id, value] of Object.entries(evaluated.values)) {
    if (evaluated.visibility.get(id) !== false) kept[id] = value;
  }

  const computed = computeComputedValues(
    evaluated.fields,
    kept,
    evaluated.visibility,
  );

  const result: FormValues = {};
  for (const field of fields) {
    const recipe = field.config.computed;
    if (!recipe) {
      if (kept[field.id] !== undefined) result[field.id] = kept[field.id];
      continue;
    }
    // Un derivado sin resultado —dividir por cero— no se guarda: lo que el
    // cliente dijera que valía es justo lo que esta función existe para
    // impedir.
    if (!isTodayDependent(recipe) && computed.has(field.id)) {
      result[field.id] = computed.get(field.id);
    }
  }
  // Lo que no es de ningún campo —ni los datos de contexto— no pasó a
  // `result`: nunca se guarda como respuesta.
  return result;
}

const fieldLabel = (sections: readonly FormSection[], fieldId: string) =>
  flattenFields(sections).find((field) => field.id === fieldId)?.label ??
  fieldId;

/** Pone a los ids la marca de su tabla, que el módulo puro no conoce. Todos
 *  vienen ya comprobados contra la base; si alguno no fuera de su tabla, es
 *  que algo se saltó la frontera. */
export function brandValues(
  ctx: QueryCtx,
  stored: readonly StoredFieldValue[],
): StoredValues {
  const brandCell = (value: StoredCellValue): StoredCell => {
    if (value.kind === "file" || value.kind === "signature") {
      const storageId = ctx.db.system.normalizeId("_storage", value.storageId);
      if (!storageId) throw new ConvexError(formResponsesErrors.fileInvalid);
      return { ...value, storageId };
    }
    if (value.kind === "reference") {
      const responseId = ctx.db.normalizeId("formResponses", value.responseId);
      if (!responseId) {
        throw new ConvexError(formResponsesErrors.responseNotFound);
      }
      return { ...value, responseId };
    }
    return value;
  };

  return stored.map(({ fieldId, value }) => {
    if (value.kind === "list" || value.kind === "checklist") {
      return { fieldId, value };
    }
    if (value.kind === "table") {
      return {
        fieldId,
        value: {
          kind: "table" as const,
          rows: value.rows.map((row) => ({
            rowId: row.rowId,
            cells: row.cells.map((cell) => ({
              columnId: cell.columnId,
              value: brandCell(cell.value),
            })),
          })),
        },
      };
    }
    return { fieldId, value: brandCell(value) };
  });
}

/**
 * Lo que de verdad se va a guardar de unas respuestas, y las filas de
 * `formResponseLinks` que salen de ellas.
 *
 * En orden: convierte a memoria; firma como autor; poda lo oculto; recalcula
 * los derivados; exige los obligatorios visibles; valida cada valor contra su
 * campo; comprueba archivos y firmas; resuelve cada relación y **compone aquí**
 * su título y su instantánea —lo que el navegador mandara en `label` y
 * `snapshot` se ignora—; y convierte a la forma guardada.
 *
 * Lanza con el mensaje del primer problema. No escribe nada.
 */
export async function resolveValues(
  ctx: MutationCtx,
  input: ResolveInput,
): Promise<ResolvedValues> {
  const { sections } = input;
  const context = formContext({ date: input.date, authorId: input.authorId });

  const received = fromStoredValues(input.values);
  signAsAuthor(sections, received, input.signerName);
  const values = pruneAndCompute(sections, received, context);

  const missing = missingRequiredFields(sections, values, context);
  if (missing.length > 0) {
    throw new ConvexError(
      `${formResponsesErrors.missingRequiredFields}: ${missing.join(", ")}`,
    );
  }

  const [problem] = validateValues(sections, values);
  if (problem) {
    throw new ConvexError(
      `«${fieldLabel(sections, problem.fieldId)}»: ${problem.message}`,
    );
  }

  await validateFiles(
    ctx,
    sections,
    values,
    new Set(storedFileIds(input.previous ?? [])),
  );

  const before = storedReferences(input.previous ?? []);
  const cache: VersionCache = new Map();
  const links = new Map<Id<"formResponses">, ResolvedLink>();

  for (const slot of referenceSlots(sections, values)) {
    if (!isReferenceValue(slot.value) || slot.value.responseId === "") continue;

    const composed = await composeReference(ctx, {
      projectId: input.projectId,
      config: slot.config,
      responseId: slot.value.responseId,
      cache,
    });
    const kept = before.get(slot.value.responseId);
    if (!composed || (!composed.active && !kept && !input.allowInactive)) {
      throw new ConvexError(formResponsesErrors.referenceInvalid(slot.label));
    }

    // Un elemento que se inactivó después de elegirlo se conserva como
    // estaba: no se puede volver a elegir, pero tampoco obliga a cambiarlo
    // a quien edita otra cosa.
    slot.replace({
      responseId: composed.responseId,
      label: composed.active ? composed.label : (kept?.label ?? composed.label),
      snapshot: composed.active
        ? composed.snapshot
        : (kept?.snapshot ?? composed.snapshot),
    } satisfies ReferenceValue);

    if (!links.has(composed.responseId)) {
      links.set(composed.responseId, {
        fieldId: slot.fieldId,
        targetFormId: composed.targetFormId,
        targetResponseId: composed.responseId,
      });
    }
  }

  return {
    values: brandValues(ctx, toStoredValues(sections, values)),
    links: [...links.values()],
  };
}

/* ─────────────────────── Escribir lo que se resolvió ────────────────────── */

/** Las filas de relación de una respuesta recién escrita. */
export async function writeLinks(
  ctx: MutationCtx,
  response: Pick<
    Doc<"formResponses">,
    "_id" | "projectId" | "formId" | "date" | "submittedBy"
  >,
  links: readonly ResolvedLink[],
) {
  for (const link of links) {
    await ctx.db.insert("formResponseLinks", {
      projectId: response.projectId,
      formId: response.formId,
      responseId: response._id,
      date: response.date,
      submittedBy: response.submittedBy,
      ...link,
    });
  }
}

/** Las filas de relación de un elemento que se volvió a guardar: fuera las que
 *  tenía, dentro las que salen de sus valores de ahora. */
export async function replaceLinks(
  ctx: MutationCtx,
  entry: Pick<
    Doc<"formResponses">,
    "_id" | "projectId" | "formId" | "date" | "submittedBy"
  >,
  links: readonly ResolvedLink[],
) {
  const current = await ctx.db
    .query("formResponseLinks")
    .withIndex("responseId", (q) => q.eq("responseId", entry._id))
    .collect();
  for (const link of current) await ctx.db.delete(link._id);
  await writeLinks(ctx, entry, links);
}

/** Borra del almacenamiento los archivos que una respuesta dejó de nombrar.
 *
 *  Un archivo es de una sola respuesta: para ligarlo tuvo que ser recién
 *  subido, así que lo que el elemento suelta no lo usa nadie más. */
export async function releaseFiles(
  ctx: MutationCtx,
  before: StoredValues,
  after: StoredValues,
) {
  const kept = new Set(storedFileIds(after));
  for (const storageId of storedFileIds(before)) {
    if (kept.has(storageId)) continue;
    const id = ctx.db.system.normalizeId("_storage", storageId);
    // Otra pasada pudo borrarlo ya.
    if (id && (await ctx.db.system.get(id))) await ctx.storage.delete(id);
  }
}
