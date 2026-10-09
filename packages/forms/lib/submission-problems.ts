import type { ValueProblemCode } from "@/convex/lib/error_messages";
import type { FormContext } from "@/convex/lib/form_context";
import { pruneFormValues, visibleSections } from "@/convex/lib/form_evaluation";
import type {
  ChecklistAnswer,
  FormSection,
  FormValues,
} from "@/convex/lib/form_types";
import { isEmptyValue } from "@/convex/lib/stored_values";
import {
  type ValueProblem,
  validateValues,
} from "@/convex/lib/value_validation";

import { answersByItem, firstIncompleteItem } from "./checklist";
import { withUploadPlaceholders } from "./upload-pending-files";

/**
 * Lo que impide enviar un formato, en el orden en que se recorre: qué campo,
 * en qué sección, y —si el problema está dentro— qué ítem de la lista de
 * chequeo o qué celda de la tabla.
 *
 * No inventa ninguna regla: junta las tres que ya existen y que el servidor
 * vuelve a aplicar al guardar —`missingRequired` (aquí, `isEmptyValue` sobre
 * lo visible), `validateValues` y, para decir **qué ítem** de una lista de
 * chequeo, `firstIncompleteItem`—. Lo que hace es ordenarlas: el foco tiene
 * que ir al primer problema del formato, no al primero que una función
 * encontró.
 */

export interface SubmissionProblem {
  fieldId: string;
  sectionId: string;
  /** `missing`: falta algo por llenar. `invalid`: lo escrito no vale. */
  kind: "missing" | "invalid";
  /** Lo que se lee bajo el campo. */
  message: string;
  itemId?: string;
  rowId?: string;
  columnId?: string;
}

export const REQUIRED_MESSAGE = "Este campo es obligatorio";

/** Los problemas de valor que en realidad son algo sin llenar. */
const MISSING_CODES: readonly ValueProblemCode[] = [
  "checklistIncomplete",
  "checklistNoteRequired",
  "tableTooFewRows",
  "tableCellRequired",
  "signerNameRequired",
];

const fromValueProblem = (
  problem: ValueProblem,
  sectionId: string,
): SubmissionProblem => ({
  fieldId: problem.fieldId,
  sectionId,
  kind: MISSING_CODES.includes(problem.code) ? "missing" : "invalid",
  message: problem.message,
  ...(problem.itemId ? { itemId: problem.itemId } : {}),
  ...(problem.rowId ? { rowId: problem.rowId } : {}),
  ...(problem.columnId ? { columnId: problem.columnId } : {}),
});

/**
 * Un problema por campo —el primero—, en el orden del formato. Una lista
 * vacía si se puede enviar.
 *
 * Sólo mira lo que se ve: un campo oculto, o de una sección que no aplica, ni
 * se exige ni se valida, porque su valor se descarta al guardar.
 */
export function collectProblems(
  sections: readonly FormSection[],
  values: FormValues,
  context?: FormContext,
): SubmissionProblem[] {
  // Un archivo sin subir todavía no tiene la forma de lo que se guarda: se
  // valida como quedará después de subirlo.
  const pruned = withUploadPlaceholders(
    pruneFormValues(sections, values, context),
  );
  const byField = new Map<string, ValueProblem[]>();
  for (const problem of validateValues(sections, pruned)) {
    const list = byField.get(problem.fieldId) ?? [];
    list.push(problem);
    byField.set(problem.fieldId, list);
  }

  const problems: SubmissionProblem[] = [];
  for (const { section, fields } of visibleSections(
    sections,
    values,
    context,
  )) {
    for (const field of fields) {
      // Un derivado no lo llena nadie: ni falta ni está mal.
      if (field.config.computed) continue;
      const value = pruned[field.id];

      if (isEmptyValue(field, value)) {
        if (field.required) {
          problems.push({
            fieldId: field.id,
            sectionId: section.id,
            kind: "missing",
            message: REQUIRED_MESSAGE,
          });
        }
        continue;
      }

      const found = byField.get(field.id) ?? [];
      if (found.length === 0) continue;

      // `validateValues` dice los problemas de una lista de chequeo en el
      // orden en que se respondió; el foco va al primer ítem **de la lista**.
      const checklist = field.config.checklist;
      if (field.type === "checklist" && checklist && Array.isArray(value)) {
        const answers = value as ChecklistAnswer[];
        const itemId = firstIncompleteItem(checklist, answers, field.required);
        if (itemId !== undefined) {
          const isAnswered =
            answersByItem(answers).get(itemId)?.value !== undefined;
          const code = isAnswered
            ? "checklistNoteRequired"
            : "checklistIncomplete";
          const message =
            found.find((problem) => problem.code === code)?.message ??
            found[0].message;
          problems.push({
            fieldId: field.id,
            sectionId: section.id,
            kind: "missing",
            message,
            itemId,
          });
          continue;
        }
      }

      problems.push(fromValueProblem(found[0], section.id));
    }
  }
  return problems;
}

const plural = (count: number, one: string, many: string) =>
  count === 1 ? one : many;

/**
 * Lo que dice la barra de envío: «Faltan 3 obligatorios», «1 por corregir», o
 * las dos cosas. `null` si no falta nada.
 */
export function problemsSummary(
  problems: readonly SubmissionProblem[],
): string | null {
  const missing = problems.filter((item) => item.kind === "missing").length;
  const invalid = problems.length - missing;

  const parts = [
    ...(missing > 0
      ? [
          `${plural(missing, "Falta", "Faltan")} ${missing} ${plural(missing, "obligatorio", "obligatorios")}`,
        ]
      : []),
    ...(invalid > 0 ? [`${invalid} por corregir`] : []),
  ];
  return parts.length > 0 ? parts.join(" · ") : null;
}

/** Cuántos problemas hay en cada sección: lo que cuenta cada pestaña. */
export function problemsBySection(
  problems: readonly SubmissionProblem[],
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const problem of problems) {
    counts.set(problem.sectionId, (counts.get(problem.sectionId) ?? 0) + 1);
  }
  return counts;
}
