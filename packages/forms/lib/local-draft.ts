import { todayInColombia } from "@/convex/lib/dates";
import { flattenFields } from "@/convex/lib/form_evaluation";
import type { FormSection, FormValues } from "@/convex/lib/form_types";
import { isEmptyValue, isFileValue } from "@/convex/lib/stored_values";

import { isPendingFile } from "./file-value";
import { colombiaClock, daysBetween } from "./relative-day";
import { isDraftRow } from "./table";

/**
 * El borrador local de un formato a medio diligenciar (diseño §6): qué se
 * guarda en el dispositivo, con qué clave, y cuándo un borrador guardado sirve
 * todavía. Sin React y sin tocar `localStorage` más que por las tres funciones
 * del final, que nunca lanzan.
 *
 * No se guardan archivos ni firmas: no caben en `localStorage`, y un archivo
 * ya subido caduca en una hora. Se recuerda **de qué campos eran**, para poder
 * decirlo al recuperar el borrador.
 */

const KEY_PREFIX = "harmony-build:borrador-formato";

/** La forma de lo guardado. Si cambia, los borradores viejos se descartan. */
const DRAFT_SHAPE = 1;

/** Un borrador de hace más de una semana ya no es «lo que llevabas»: es de
 *  otra inspección. */
export const DRAFT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export interface DraftScope {
  projectId: string;
  formId: string;
  /** El número de la versión publicada que se está diligenciando. */
  versionNumber: number;
}

export interface LocalDraft {
  savedAt: number;
  values: FormValues;
  /** Los nombres de los campos cuyo archivo o firma no se guardó. */
  omitted: string[];
}

const formPrefix = (scope: Pick<DraftScope, "projectId" | "formId">) =>
  `${KEY_PREFIX}:${scope.projectId}:${scope.formId}:`;

/** Por proyecto, formato **y versión**: el borrador de la versión 3 no se
 *  recupera sobre la 4, cuyos campos pueden ser otros. */
export const draftKey = (scope: DraftScope): string =>
  `${formPrefix(scope)}v${scope.versionNumber}`;

/** De todas las claves guardadas, las de borradores de **otra versión** de
 *  este formato: ya no se van a recuperar nunca y hay que borrarlas. */
export const staleDraftKeys = (
  keys: readonly string[],
  scope: DraftScope,
): string[] => {
  const prefix = formPrefix(scope);
  const current = draftKey(scope);
  return keys.filter((key) => key.startsWith(prefix) && key !== current);
};

const isFile = (value: unknown) => isPendingFile(value) || isFileValue(value);

/**
 * Los valores sin sus archivos ni sus firmas —los sueltos y los de las celdas
 * de una tabla—, y los nombres de los campos que los tenían.
 *
 * Sólo entra lo que es de un campo del formato: lo demás no se va a guardar
 * nunca y no tiene por qué ocupar sitio.
 */
export function stripFiles(
  sections: readonly FormSection[],
  values: FormValues,
): { values: FormValues; omitted: string[] } {
  const kept: FormValues = {};
  const omitted: string[] = [];

  for (const field of flattenFields(sections)) {
    const value = values[field.id];
    if (value === undefined) continue;

    if (isFile(value)) {
      omitted.push(field.label);
      continue;
    }
    if (Array.isArray(value) && value.length > 0 && value.every(isDraftRow)) {
      let hadFiles = false;
      kept[field.id] = value.map((row) => ({
        ...row,
        cells: row.cells.filter((cell) => {
          if (!isFile(cell.value)) return true;
          hadFiles = true;
          return false;
        }),
      }));
      if (hadFiles) omitted.push(field.label);
      continue;
    }
    kept[field.id] = value;
  }
  return { values: kept, omitted };
}

/**
 * El borrador como texto, listo para guardar; `null` si no hay nada escrito
 * que merezca guardarse —y entonces lo que hubiera guardado se borra—.
 */
export function serializeDraft(
  sections: readonly FormSection[],
  values: FormValues,
  savedAt: number,
): string | null {
  const stripped = stripFiles(sections, values);
  const hasContent = flattenFields(sections).some(
    (field) => !isEmptyValue(field, stripped.values[field.id]),
  );
  if (!hasContent) return null;

  return JSON.stringify({
    shape: DRAFT_SHAPE,
    savedAt,
    values: stripped.values,
    omitted: stripped.omitted,
  });
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Lo guardado, si todavía sirve: tiene la forma de hoy, no es de hace más de
 * una semana y no viene del futuro. `null` en cualquier otro caso —también si
 * el texto está corrupto—: un borrador que no se entiende no debe romper el
 * formulario.
 */
export function parseDraft(raw: string | null, now: number): LocalDraft | null {
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(parsed) || parsed.shape !== DRAFT_SHAPE) return null;

  const { savedAt, values, omitted } = parsed;
  if (typeof savedAt !== "number" || !isRecord(values)) return null;
  if (now - savedAt > DRAFT_MAX_AGE_MS) return null;
  if (Object.keys(values).length === 0) return null;

  return {
    savedAt,
    values,
    omitted: Array.isArray(omitted)
      ? omitted.filter((label): label is string => typeof label === "string")
      : [],
  };
}

/** Desde qué hora es tarde y desde cuál es noche. */
const AFTERNOON_FROM = 12;
const NIGHT_FROM = 19;
const JUST_NOW_MS = 60 * 60 * 1000;

/**
 * De cuándo es el borrador, para la franja: «de hace un momento», «de esta
 * mañana», «de ayer», «de hace 3 días».
 */
export function draftAgeText(savedAt: number, now: number): string {
  const days =
    daysBetween(todayInColombia(savedAt), todayInColombia(now)) ?? 0;
  if (days >= 2) return `de hace ${days} días`;
  if (days === 1) return "de ayer";

  if (now - savedAt < JUST_NOW_MS) return "de hace un momento";
  const { hour } = colombiaClock(savedAt);
  if (hour < AFTERNOON_FROM) return "de esta mañana";
  return hour < NIGHT_FROM ? "de esta tarde" : "de esta noche";
}

const quoted = (labels: readonly string[]): string => {
  const names = labels.map((label) => `«${label}»`);
  return names.length <= 1
    ? (names[0] ?? "")
    : `${names.slice(0, -1).join(", ")} y ${names.at(-1)}`;
};

/** Lo que la franja dice de lo que no se pudo guardar; `null` si se guardó
 *  todo. */
export const omittedText = (omitted: readonly string[]): string | null => {
  const labels = [...new Set(omitted)];
  if (labels.length === 0) return null;
  return labels.length === 1
    ? `${quoted(labels)} no se guardó en el dispositivo: vuelve a ponerlo.`
    : `${quoted(labels)} no se guardaron en el dispositivo: vuelve a ponerlos.`;
};

/* ─────────────────────────── El almacenamiento ──────────────────────────── */

/** Lo que se usa de `localStorage`. Se recibe en vez de leerse del entorno
 *  para poder probarlo, y para que quien llama decida qué pasa si no existe. */
export type DraftStorage = Pick<
  Storage,
  "getItem" | "setItem" | "removeItem" | "key" | "length"
>;

/**
 * `localStorage`, o `null` si no se puede usar: en el render del servidor, en
 * un navegador en modo privado que lo niega, o con el almacenamiento
 * deshabilitado. Leer la propiedad ya puede lanzar.
 */
export const browserStorage = (): DraftStorage | null => {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
};

const storedKeys = (storage: DraftStorage): string[] => {
  const keys: string[] = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key !== null) keys.push(key);
  }
  return keys;
};

const remove = (storage: DraftStorage, key: string) => {
  try {
    storage.removeItem(key);
  } catch {
    // Sin almacenamiento no hay borrador que borrar.
  }
};

/**
 * El borrador de este formato y esta versión, si hay uno que sirva. De paso
 * borra los de otras versiones del mismo formato y el que ya no sirve.
 */
export function readDraft(
  storage: DraftStorage | null,
  scope: DraftScope,
  now: number,
): LocalDraft | null {
  if (!storage) return null;
  try {
    for (const key of staleDraftKeys(storedKeys(storage), scope)) {
      remove(storage, key);
    }
    const key = draftKey(scope);
    const raw = storage.getItem(key);
    const draft = parseDraft(raw, now);
    if (raw !== null && draft === null) remove(storage, key);
    return draft;
  } catch {
    return null;
  }
}

/**
 * Guarda lo escrito, o borra lo guardado si ya no hay nada escrito. Devuelve
 * si el borrador quedó a salvo: con el almacenamiento lleno o negado, no, y el
 * formulario sigue funcionando igual.
 */
export function writeDraft(
  storage: DraftStorage | null,
  scope: DraftScope,
  sections: readonly FormSection[],
  values: FormValues,
  now: number,
): boolean {
  if (!storage) return false;
  const serialized = serializeDraft(sections, values, now);
  if (serialized === null) {
    remove(storage, draftKey(scope));
    return false;
  }
  try {
    storage.setItem(draftKey(scope), serialized);
    return true;
  } catch {
    return false;
  }
}

export function clearDraft(storage: DraftStorage | null, scope: DraftScope) {
  if (storage) remove(storage, draftKey(scope));
}
