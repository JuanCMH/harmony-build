/** El valor de un campo como texto legible.
 *
 *  Portado de `convex/lib/field_text.ts` de Harmony y ampliado a los tipos
 *  nuevos. Lo usan el servidor —la instantánea de una relación, el título de
 *  un elemento, las columnas del listado de respuestas— y la interfaz, que
 *  tiene que decir lo mismo: la etiqueta de una lista y no su valor, «Sí» y no
 *  `true`, `15/09/2026` y no `2026-09-15`.
 *
 *  Sin `Intl`: el separador de miles se pone a mano para que el texto sea el
 *  mismo en cualquier runtime.
 */

import { checklistSummaryText, summarizeChecklist } from "./checklist_summary";
import type { ChecklistAnswer, FormField } from "./form_types";
import {
  isEmptyValue,
  isFileValue,
  isReferenceValue,
  isSignatureValue,
} from "./stored_values";

/** `1234567.5` → `1.234.567,5`. */
export function groupThousands(value: number, maxDecimals = 2): string {
  const sign = value < 0 ? "-" : "";
  const fixed = Math.abs(value).toFixed(maxDecimals);
  // Sólo se quitan ceros de la parte decimal: `1250000` no es `125`.
  const trimmed = fixed.includes(".") ? fixed.replace(/\.?0+$/, "") : fixed;
  const [integer, decimals] = trimmed.split(".");
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${sign}${grouped}${decimals ? `,${decimals}` : ""}`;
}

/** `2026-09-15` → `15/09/2026`; lo que no es una fecha se deja como está. */
export function dateText(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}

const optionLabel = (field: FormField, value: string): string =>
  field.config.options?.find((option) => option.value === value)?.label ??
  value;

const rowsText = (count: number) => (count === 1 ? "1 fila" : `${count} filas`);

/** El texto de una respuesta; vacío si no hay respuesta. */
export function fieldText(field: FormField, value: unknown): string {
  if (isEmptyValue(field, value)) return "";

  switch (field.type) {
    case "checkbox":
      return value === true || value === "true" ? "Sí" : "No";
    case "date":
      return dateText(String(value));
    case "currency": {
      const amount = Number(value);
      return Number.isFinite(amount)
        ? `$ ${groupThousands(amount, 0)}`
        : String(value);
    }
    case "number": {
      const amount = Number(value);
      return Number.isFinite(amount)
        ? groupThousands(amount, 3)
        : String(value);
    }
    case "select":
      return optionLabel(field, String(value));
    case "multiSelect":
      return Array.isArray(value)
        ? value.map((item) => optionLabel(field, String(item))).join(", ")
        : optionLabel(field, String(value));
    case "file":
    case "image":
      return isFileValue(value) ? value.name : "";
    case "signature":
      return isSignatureValue(value) ? `Firmado por ${value.signerName}` : "";
    case "reference":
      return isReferenceValue(value) ? value.label : "";
    case "checklist":
      return field.config.checklist && Array.isArray(value)
        ? checklistSummaryText(
            summarizeChecklist(
              field.config.checklist,
              value as ChecklistAnswer[],
            ),
          )
        : "";
    case "table":
      return Array.isArray(value) ? rowsText(value.length) : "";
    default:
      return String(value);
  }
}
