/** Las reglas de un asunto de seguimiento que no necesitan la base: sus
 *  etapas, su consecutivo y lo que se copia de sus valores para la bandeja
 *  (`docs/plans/2026-10-10-seguimiento-de-hallazgos-design.md`).
 *
 *  Puro: lo usan el servidor al abrir y completar, y el navegador al pintar.
 */

import { fieldText } from "./field_text";
import { flattenFields, sortSections } from "./form_evaluation";
import type { FormSection, StoredFieldValue } from "./form_types";
import { fromStoredValues, isReferenceValue } from "./stored_values";
import { isRealDate } from "./value_validation";

export const TRACKING_PREFIX_MAX = 8;

/** Cuántos asuntos abiertos —o cerrados— enseña la bandeja de una vez. */
export const TRACKING_LIST_LIMIT = 200;

/** Las etapas de un seguimiento: sus secciones, en orden. Cada una se
 *  completa una vez. */
export const stagesOf = <S extends { order: number }>(
  sections: readonly S[],
): S[] => sortSections(sections);

/** «AC-2026-014», o «2026-014» sin prefijo. */
export const trackingCode = (issue: {
  prefix?: string;
  year?: number;
  number?: number;
}): string => {
  if (issue.year === undefined || issue.number === undefined) return "";
  const serial = `${issue.year}-${String(issue.number).padStart(3, "0")}`;
  return issue.prefix ? `${issue.prefix}-${serial}` : serial;
};

/** El consecutivo que sigue: reinicia cada año. */
export const nextTrackingNumber = (
  last: { year: number; value: number } | undefined,
  year: number,
): { year: number; value: number } => ({
  year,
  value: last && last.year === year ? last.value + 1 : 1,
});

/** Lo que la bandeja necesita de los valores de un asunto, sin abrirlo. */
export function trackingFacts(
  form: { dueDateFieldId?: string; responsibleFieldId?: string },
  sections: readonly FormSection[],
  stored: readonly StoredFieldValue[],
): { dueDate?: string; responsibleLabel?: string } {
  const values = fromStoredValues(stored);
  const fields = flattenFields(sections);
  const facts: { dueDate?: string; responsibleLabel?: string } = {};

  const due = form.dueDateFieldId ? values[form.dueDateFieldId] : undefined;
  if (typeof due === "string" && isRealDate(due)) facts.dueDate = due;

  const field = fields.find(
    (candidate) => candidate.id === form.responsibleFieldId,
  );
  const responsible = field ? values[field.id] : undefined;
  if (field && responsible !== undefined) {
    const label = isReferenceValue(responsible)
      ? responsible.label
      : fieldText(field, responsible);
    if (label) facts.responsibleLabel = label;
  }
  return facts;
}

/** Si un asunto abierto ya pasó su fecha de compromiso. No se guarda: se
 *  calcula contra el día de hoy. */
export const isOverdue = (
  issue: { status: string; dueDate?: string | null },
  today: string,
): boolean =>
  issue.status === "open" && !!issue.dueDate && issue.dueDate < today;
