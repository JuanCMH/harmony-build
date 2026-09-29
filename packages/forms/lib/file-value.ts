/** Un archivo elegido en el formulario y todavía sin subir.
 *
 *  Se sube al pulsar «Enviar», no al elegirlo: así un formulario que nadie
 *  envía no deja archivos huérfanos en el almacenamiento.
 */
export interface PendingFile {
  file: File;
  name: string;
}

/** Una firma trazada y todavía sin subir: la imagen, y quién firma. */
export interface PendingSignature extends PendingFile {
  signerName: string;
  signerDocument?: string;
}

export const isPendingFile = (value: unknown): value is PendingFile =>
  typeof value === "object" &&
  value !== null &&
  typeof File !== "undefined" &&
  (value as PendingFile).file instanceof File;

export const isPendingSignature = (value: unknown): value is PendingSignature =>
  isPendingFile(value) &&
  typeof (value as PendingSignature).signerName === "string";
