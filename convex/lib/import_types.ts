/** Lo que una importación exige y lo que perdona.
 *
 *  Una respuesta importada pasa por la misma frontera que una diligenciada
 *  (`resolveValues`), con las secciones **como las exige una importación**:
 *  una hoja de cálculo no trae firmas, fotos ni archivos, y una exportación de
 *  formulario trae la opción de cada ítem, no su observación
 *  (`docs/plans/2026-10-10-importacion-de-registros-design.md §3`).
 *
 *  Puro: lo usan el servidor al escribir cada lote y el navegador al revisar
 *  las filas antes de enviarlas (`01 §2.2`).
 */

import type { FieldType, FormField, FormSection } from "./form_types";

export const IMPORT_LIMITS = {
  /** Filas por archivo. Por encima, se pide partirlo. */
  maxRows: 5000,
  /** Filas por lote: lejos de los límites de una transacción. */
  batchSize: 50,
  /** Valores distintos que se asignan uno a uno en un campo. */
  maxDistinctValues: 300,
  maxFileMb: 10,
  maxFileNameLength: 200,
} as const;

/** `add` en un formato: cada fila es un hecho nuevo. En un listado, qué pasa
 *  con la fila cuyo título ya existe: se omite o actualiza el elemento. */
export const IMPORT_MODES = ["add", "skip", "update"] as const;
export type ImportMode = (typeof IMPORT_MODES)[number];

export const IMPORT_STATUSES = ["running", "done", "reverted"] as const;
export type ImportStatus = (typeof IMPORT_STATUSES)[number];

/** Los tipos que un archivo no puede traer. */
const EXEMPT_TYPES: readonly FieldType[] = [
  "file",
  "image",
  "signature",
  "table",
];

/** Si una importación no puede traer este campo: no se ofrece como destino,
 *  no se exige, y la respuesta lo dice. */
export const isImportExempt = (field: Pick<FormField, "type">): boolean =>
  EXEMPT_TYPES.includes(field.type);

function importField(field: FormField): FormField {
  if (isImportExempt(field)) return { ...field, required: false };
  if (field.type !== "checklist") return field;

  const checklist = field.config.checklist;
  return {
    ...field,
    // Los ítems sin columna quedan sin responder.
    required: false,
    config: {
      ...field.config,
      ...(checklist
        ? {
            checklist: {
              ...checklist,
              note: checklist.note === "onFail" ? "optional" : checklist.note,
            },
          }
        : {}),
    },
  };
}

/**
 * Las secciones de un formato, como las exige una importación.
 *
 * Sólo cambia lo que se **exige**: los ids, los tipos, las opciones y las
 * reglas son los mismos, así que lo que se guarda se lee con la versión real.
 */
export const importSections = (
  sections: readonly FormSection[],
): FormSection[] =>
  sections.map((section) => ({
    ...section,
    fields: section.fields.map(importField),
  }));
