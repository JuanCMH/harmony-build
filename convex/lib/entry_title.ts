/** El título de un elemento de listado, a partir de sus valores.
 *
 *  Vive aquí y no en `formEntries.ts` porque lo usan también la instalación de
 *  la biblioteca (`formLibrary.ts`) y la reconstrucción de títulos, y un
 *  módulo de funciones públicas no exporta ayudantes (`01 §3`).
 */

import type { Doc } from "../_generated/dataModel";
import { fieldText } from "./field_text";
import { flattenFields } from "./form_evaluation";
import type { FormSection } from "./form_types";
import { fromStoredValues } from "./stored_values";
import { normalizeText, searchableText } from "./text";

/** El título de un elemento: el valor de su campo de título, limpio, y como
 *  se busca. Es un derivado de `values` (`01 §7.3`). */
export function entryTitle(
  form: Doc<"forms">,
  sections: readonly FormSection[],
  values: Doc<"formResponses">["values"],
) {
  const field = flattenFields(sections).find(
    (candidate) => candidate.id === form.titleFieldId,
  );
  const title = field
    ? normalizeText(fieldText(field, fromStoredValues(values)[field.id]))
    : "";
  return { title, titleSearch: searchableText(title) };
}
