import type {
  FileValue,
  FormValues,
  SignatureValue,
} from "@/convex/lib/form_types";

import {
  isPendingFile,
  isPendingSignature,
  type PendingFile,
} from "./file-value";
import { type DraftRow, isDraftRow } from "./table";

/**
 * Los archivos y las firmas que se eligieron y todavía no se han subido: dónde
 * están dentro de los valores, y cómo se cambian por lo que se guarda.
 *
 * Portado de Harmony y ampliado: allí sólo había archivos sueltos; aquí hay
 * además firmas, y las dos cosas pueden estar **dentro de la celda de una
 * tabla** (la firma de recibido de cada elemento entregado).
 *
 * Se sube justo antes de enviar: subir al elegir dejaría huérfanos en el
 * almacenamiento los archivos de un formulario que nadie envía.
 */

/** Pide al servidor una dirección a la que subir un archivo. */
export type GenerateUploadUrl = () => Promise<string | null | undefined>;

/** Lo ya subido en este formulario: `File → storageId`. Si el envío falla
 *  después de subir —el servidor rechazó un valor—, el reintento no vuelve a
 *  subir lo mismo. */
export type UploadCache = Map<File, string>;

interface UploadOptions {
  cache?: UploadCache;
  /** Sólo para las pruebas: por omisión, el `fetch` del navegador. */
  fetch?: typeof fetch;
}

const isTable = (value: unknown): value is DraftRow[] =>
  Array.isArray(value) && value.length > 0 && value.every(isDraftRow);

/** Todos los pendientes de unos valores, los sueltos y los de las celdas. */
export function collectPendingFiles(values: FormValues): PendingFile[] {
  const pending: PendingFile[] = [];
  for (const value of Object.values(values)) {
    if (isPendingFile(value)) pending.push(value);
    else if (isTable(value)) {
      for (const row of value) {
        for (const cell of row.cells) {
          if (isPendingFile(cell.value)) pending.push(cell.value);
        }
      }
    }
  }
  return pending;
}

/** ¿Queda algo por subir? */
export const hasPendingFiles = (values: FormValues): boolean =>
  collectPendingFiles(values).length > 0;

/** Lo que se guarda de un pendiente ya subido: una firma conserva quién
 *  firma. */
const storedFrom = (
  pending: PendingFile,
  storageId: string,
): FileValue | SignatureValue =>
  isPendingSignature(pending)
    ? {
        storageId,
        name: pending.name,
        signerName: pending.signerName,
        ...(pending.signerDocument
          ? { signerDocument: pending.signerDocument }
          : {}),
      }
    : { storageId, name: pending.name };

/**
 * Los mismos valores con cada pendiente cambiado por lo que devuelva
 * `replace`. No muta lo que recibe; lo que no es un pendiente se deja como
 * está.
 */
export function replacePendingFiles(
  values: FormValues,
  replace: (pending: PendingFile) => unknown,
): FormValues {
  const next: FormValues = {};
  for (const [fieldId, value] of Object.entries(values)) {
    if (isPendingFile(value)) next[fieldId] = replace(value);
    else if (isTable(value)) {
      next[fieldId] = value.map((row) => ({
        ...row,
        cells: row.cells.map((cell) =>
          isPendingFile(cell.value)
            ? { ...cell, value: replace(cell.value) }
            : cell,
        ),
      }));
    } else next[fieldId] = value;
  }
  return next;
}

/** El `storageId` de lo que todavía no se ha subido, para validar antes de
 *  subir. No llega nunca al servidor. */
export const PENDING_STORAGE_ID = "pendiente";

/**
 * Los valores como quedarán después de subir, sin subir nada: cada pendiente
 * con un `storageId` de mentira.
 *
 * `validateValues` comprueba la forma de lo que se guarda, y un archivo sin
 * subir todavía no la tiene. Validar antes de subir evita gastar los datos del
 * teléfono en un formulario que el servidor iba a rechazar por otro campo.
 */
export const withUploadPlaceholders = (values: FormValues): FormValues =>
  replacePendingFiles(values, (pending) =>
    storedFrom(pending, PENDING_STORAGE_ID),
  );

async function uploadFile(
  file: File,
  generateUrl: GenerateUploadUrl,
  send: typeof fetch,
): Promise<string> {
  const url = await generateUrl();
  if (!url) throw new Error("No se pudo preparar la subida del archivo");

  const response = await send(url, {
    method: "POST",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body: file,
  });
  if (!response.ok) {
    throw new Error(`No se pudo subir «${file.name}». Revisa la conexión`);
  }
  const { storageId } = (await response.json()) as { storageId?: string };
  if (!storageId) {
    throw new Error(`No se pudo subir «${file.name}». Revisa la conexión`);
  }
  return storageId;
}

/**
 * Sube lo pendiente —archivos, fotos y firmas, sueltos o en celdas— y devuelve
 * los valores con cada uno cambiado por su `{ storageId, name }`.
 *
 * Las subidas van en paralelo: no dependen unas de otras (`06 §2.7`). Lanza si
 * alguna falla, y quien llama no debe enviar a medias; las que sí subieron
 * quedan en `cache` para el reintento.
 */
export async function uploadPendingFiles(
  values: FormValues,
  generateUrl: GenerateUploadUrl,
  options: UploadOptions = {},
): Promise<FormValues> {
  const cache = options.cache ?? new Map<File, string>();
  const send = options.fetch ?? fetch;

  // Un mismo archivo puede estar en dos campos: se sube una vez.
  const files = [
    ...new Set(collectPendingFiles(values).map((pending) => pending.file)),
  ].filter((file) => !cache.has(file));

  const results = await Promise.allSettled(
    files.map(async (file) => {
      cache.set(file, await uploadFile(file, generateUrl, send));
    }),
  );
  const failed = results.find((result) => result.status === "rejected");
  if (failed) throw failed.reason;

  return replacePendingFiles(values, (pending) =>
    storedFrom(pending, cache.get(pending.file) ?? ""),
  );
}
