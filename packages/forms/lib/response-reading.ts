import { todayInColombia } from "@/convex/lib/dates";
import { computeComputedValues } from "@/convex/lib/field_computed";
import { dateText } from "@/convex/lib/field_text";
import { isTodayDependent } from "@/convex/lib/field_logic";
import { formContext } from "@/convex/lib/form_context";
import {
  type VisibleSection,
  evaluateForm,
  visibleSections,
} from "@/convex/lib/form_evaluation";
import type {
  FormField,
  FormSection,
  FormValues,
  StoredFieldValue,
  TableColumn,
} from "@/convex/lib/form_types";
import { fromStoredValues } from "@/convex/lib/stored_values";

/**
 * Una respuesta guardada, lista para leerla: qué secciones y qué campos se
 * enseñan, y con qué valores.
 *
 * Sin pintar nada. La pantalla de una respuesta sólo recorre lo que sale de
 * aquí, y por eso lo que se ve al leer es lo que el servidor decidió al
 * guardar: las mismas funciones, los mismos valores.
 */

export interface StoredResponse {
  /** Las secciones de **su** versión, no las de la vigente. */
  sections: readonly FormSection[];
  values: readonly StoredFieldValue[];
  /** La fecha de negocio, `YYYY-MM-DD`. */
  date: string;
  /** Quien la diligenció; `null` si su cuenta ya no existe. */
  authorId: string | null;
}

export interface ReadResponse {
  /** Las secciones que se veían al responder, cada una con sus campos. */
  sections: VisibleSection[];
  /** `fieldId → valor`, con los derivados de hoy ya calculados. */
  values: FormValues;
  /** Si la versión tiene más de una sección: sólo entonces se titulan. */
  hasSectionTitles: boolean;
}

/**
 * Lee una respuesta.
 *
 * - Sólo sale lo que **era visible al responder**: la visibilidad se evalúa
 *   sobre los valores guardados, con la fecha y el autor de la respuesta como
 *   contexto. Un campo que quedó oculto no se enseña como «sin respuesta»:
 *   nadie lo vio.
 * - Los derivados que dependen de hoy no se guardan nunca: se calculan aquí,
 *   con `today`. Los demás derivados se leen como se guardaron: el servidor ya
 *   los calculó, y recalcularlos con otra versión del motor cambiaría un
 *   registro.
 */
export function readResponse(
  response: StoredResponse,
  today: string,
): ReadResponse {
  const stored = fromStoredValues(response.values);
  const context = formContext({
    date: response.date,
    authorId: response.authorId ?? "",
  });

  const evaluated = evaluateForm(response.sections, stored, context);
  const computed = computeComputedValues(
    evaluated.fields,
    evaluated.values,
    evaluated.visibility,
    today,
  );

  const values: FormValues = { ...stored };
  for (const field of evaluated.fields) {
    const recipe = field.config.computed;
    if (!recipe || !isTodayDependent(recipe)) continue;
    const value = computed.get(field.id);
    if (value !== undefined) values[field.id] = value;
  }

  return {
    sections: visibleSections(response.sections, stored, context),
    values,
    hasSectionTitles: response.sections.length > 1,
  };
}

/** Dónde está cada archivo y cada firma de una respuesta, por su `storageId`.
 *  Un archivo que el almacenamiento ya no tiene no entra. */
export function fileUrlsById(
  files: ReadonlyArray<{ storageId: string; url: string | null }>,
): Map<string, string> {
  const urls = new Map<string, string>();
  for (const file of files) {
    if (file.url) urls.set(file.storageId, file.url);
  }
  return urls;
}

/** Lo que un valor necesita saber de la respuesta en la que está para
 *  enseñarse: no sale de su campo, sale de la respuesta y de quien mira. */
export interface ValueViewContext {
  /** Dónde está cada archivo y cada firma, por su `storageId`. */
  fileUrls: ReadonlyMap<string, string>;
  /** La dirección de un elemento de un listado; `undefined` si quien mira no
   *  puede abrirlo. */
  entryHref: (catalogId: string, entryId: string) => string | undefined;
  /** Si la respuesta se importó: lo que un archivo no puede traer no se lee
   *  «sin respuesta», sino que no estaba disponible. */
  imported?: boolean;
}

/**
 * La columna de una tabla, como el campo que sería si estuviera suelta.
 *
 * Una celda se lee igual que un campo de su tipo —la etiqueta de la opción,
 * `15/09/2026`, «Sí»—, y quien sabe leer un campo es `fieldText`. Así no hay
 * una segunda manera de leer un valor.
 */
export const columnAsField = (column: TableColumn): FormField => ({
  id: column.id,
  type: column.type,
  label: column.label,
  required: column.required,
  size: "full",
  showInTable: false,
  config: {
    ...(column.options ? { options: column.options } : {}),
    ...(column.reference ? { reference: column.reference } : {}),
  },
});

/* ───────────────────────── La cabecera de la respuesta ──────────────────── */

/** «Versión 4 · publicada el 15/05/2026», como en el encabezado del papel. El
 *  día es el de Colombia, no el del navegador. */
export function versionLine(
  version: { number: number; publishedAt: number | null } | null,
): string {
  if (!version) return "Versión no disponible";
  const base = `Versión ${version.number}`;
  return version.publishedAt === null
    ? base
    : `${base} · publicada el ${dateText(todayInColombia(version.publishedAt))}`;
}

/**
 * El aviso de un elemento que se guardó con una versión del listado que ya no
 * es la vigente. `null` si está al día, o si el listado no tiene versión
 * publicada con la que compararlo.
 */
export function outdatedEntryNotice(
  entry: {
    version: { _id: string; number: number } | null;
    form: { publishedVersionId: string | null };
  },
  publishedVersionNumber: number | null,
): string | null {
  const { version, form } = entry;
  if (!version || form.publishedVersionId === null) return null;
  if (version._id === form.publishedVersionId) return null;
  const saved = `Este elemento se guardó con la versión ${version.number} del listado`;
  return publishedVersionNumber === null
    ? `${saved}; al editarlo pasará a la vigente.`
    : `${saved}; al editarlo pasará a la ${publishedVersionNumber}.`;
}

const COLOMBIA_TIME = new Intl.DateTimeFormat("es-CO", {
  timeZone: "America/Bogota",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** La hora de un instante en Colombia, `06:40`: la misma que ve quien
 *  diligencia en la obra, esté donde esté quien la lee. */
export const timeText = (timestamp: number): string =>
  COLOMBIA_TIME.format(timestamp);

/** «15/09/2026 a las 06:40». El año entero, como en el resto de la
 *  respuesta: un registro que se guarda años no se fecha con dos cifras. */
export const momentText = (timestamp: number): string =>
  `${dateText(todayInColombia(timestamp))} a las ${timeText(timestamp)}`;

/** El nombre de una persona que puede no tener nombre, o no existir ya. */
export const personName = (
  person: { name?: string; email?: string } | null,
): string => person?.name?.trim() || person?.email || "Usuario desconocido";

/** Lo que se dice de una respuesta —o de un elemento— que llegó de un
 *  archivo: cuándo, quién y de cuál. Es lo que la distingue para siempre de
 *  lo diligenciado aquí. */
export const importedNotice = (
  imported: {
    at: number;
    by: { name?: string; email?: string } | null;
    fileName: string | null;
  },
  isEntry: boolean,
): string => {
  const source = imported.fileName ? `, desde ${imported.fileName}` : "";
  const what = isEntry ? "Elemento importado" : "Respuesta importada";
  const missing = isEntry
    ? ""
    : " No se diligenció aquí: no trae firmas, fotos, archivos ni tablas.";
  return `${what} el ${momentText(imported.at)} por ${personName(imported.by)}${source}.${missing}`;
};
