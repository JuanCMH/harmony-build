/** El resumen de una respuesta: lo que un resultado puede necesitar de ella,
 *  y nada más.
 *
 *  Una inspección de 63 ítems pesa varios kilobytes, y un resultado sólo mira
 *  de ella unos pocos datos: los números, lo elegido en una lista o en una
 *  relación, y de cada lista de chequeo cuántos ítems salieron conformes y
 *  cuáles no. Ese resumen pesa unos cientos de bytes, se guarda por formato y
 *  día al escribir la respuesta, y es lo que deja calcular un año entero sin
 *  leer un año de respuestas
 *  (`docs/plans/2026-10-10-resumenes-de-resultados-design.md`, `01 §6`).
 *
 *  No depende de la definición de ningún resultado: cambiar un resultado no
 *  obliga a reconstruir nada. Sólo cambia si cambia **esta** regla, y entonces
 *  sube `DIGEST_VERSION`.
 *
 *  Puro.
 */

import { answerableItems } from "./checklist_summary";
import type {
  ChecklistAnswer,
  ChecklistConfig,
  FormField,
  FormValues,
  StoredFieldValue,
} from "./form_types";

/** La versión de la regla de resumen. Un formato cuyos resúmenes son de otra
 *  versión se calcula leyendo sus respuestas, con tope, hasta reconstruirlos. */
export const DIGEST_VERSION = 1;

export const DIGEST_LIMITS = {
  /** Respuestas resumidas en el documento de un día. Por encima, el día se
   *  marca como desbordado y sus cifras se dicen parciales. */
  maxPerDay: 1000,
  /** Respuestas que entran en un cálculo. */
  maxPerCompute: 12000,
  /** Un texto más largo no entra en el resumen: no es por lo que se agrupa
   *  ni lo que se mide. */
  maxTextLength: 120,
} as const;

/** Lo que una lista de chequeo dice a un resultado. */
export interface ChecklistTally {
  ok: number;
  /** Los ítems no conformes. */
  failed: string[];
}

export type DigestValue =
  | { kind: "text"; value: string }
  | { kind: "number"; value: number }
  | { kind: "boolean"; value: boolean }
  | { kind: "list"; value: string[] }
  | { kind: "reference"; responseId: string; label: string }
  | ({ kind: "tally" } & ChecklistTally);

export interface DigestFieldValue {
  fieldId: string;
  value: DigestValue;
}

/** Cuántos ítems de cada sentido tiene una lista respondida, y cuáles
 *  fallaron. Cuenta por el sentido de la opción, con la escala de la versión
 *  con que se respondió. */
export function tallyChecklist(
  config: ChecklistConfig,
  answers: readonly ChecklistAnswer[],
): ChecklistTally {
  const meaning = new Map(
    config.options.map((option) => [option.value, option.meaning]),
  );
  const answerable = new Set(answerableItems(config).map((item) => item.id));
  let ok = 0;
  const failed: string[] = [];
  for (const answer of answers) {
    if (!answerable.has(answer.itemId) || answer.value === undefined) continue;
    const sense = meaning.get(answer.value);
    if (sense === "ok") ok += 1;
    if (sense === "fail") failed.push(answer.itemId);
  }
  return { ok, failed };
}

export const isChecklistTally = (value: unknown): value is ChecklistTally =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as ChecklistTally).ok === "number" &&
  Array.isArray((value as ChecklistTally).failed);

/**
 * El resumen de los valores de una respuesta, con los campos de **su**
 * versión.
 *
 * Fuera quedan lo que ningún resultado mide ni agrupa: texto largo, archivos,
 * firmas, tablas y la instantánea de una relación.
 */
export function digestValues(
  fields: readonly FormField[],
  values: readonly StoredFieldValue[],
): DigestFieldValue[] {
  const byId = new Map(fields.map((field) => [field.id, field]));
  const digest: DigestFieldValue[] = [];
  for (const { fieldId, value } of values) {
    const field = byId.get(fieldId);
    if (!field || field.type === "textarea") continue;
    switch (value.kind) {
      case "text":
        if (value.value.length <= DIGEST_LIMITS.maxTextLength) {
          digest.push({ fieldId, value: { kind: "text", value: value.value } });
        }
        break;
      case "number":
      case "boolean":
      case "list":
        digest.push({ fieldId, value });
        break;
      case "reference":
        digest.push({
          fieldId,
          value: {
            kind: "reference",
            responseId: value.responseId,
            label: value.label,
          },
        });
        break;
      case "checklist": {
        const config = field.config.checklist;
        if (config) {
          digest.push({
            fieldId,
            value: { kind: "tally", ...tallyChecklist(config, value.items) },
          });
        }
        break;
      }
    }
  }
  return digest;
}

/** Un resumen, como el mapa `fieldId → valor` que espera `computeResult`. Una
 *  lista de chequeo llega ya contada. */
export function fromDigestValues(
  digest: readonly DigestFieldValue[],
): FormValues {
  const values: FormValues = {};
  for (const { fieldId, value } of digest) {
    switch (value.kind) {
      case "reference":
        values[fieldId] = {
          responseId: value.responseId,
          label: value.label,
          snapshot: [],
        };
        break;
      case "tally":
        values[fieldId] = { ok: value.ok, failed: value.failed };
        break;
      default:
        values[fieldId] = value.value;
    }
  }
  return values;
}
