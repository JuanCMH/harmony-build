/** El grafo de relaciones entre formatos.
 *
 *  Un campo de relación apunta a un listado, y un listado puede apuntar a
 *  otro —vehículo → conductor habitual—, pero **sin ciclos**: si A apunta a B,
 *  B no puede apuntar a A, ni directamente ni a través de un tercero
 *  (diseño §5). Un ciclo no rompe nada al guardar; rompe al crear el primer
 *  elemento, que necesitaría que el otro existiera antes.
 *
 *  Puro: recibe las secciones ya leídas. Quien lee la base y decide qué
 *  formatos entran es `formVersions.publish`.
 */

import type { FormSection, ReferenceConfig } from "./form_types";

/** Una relación dentro de un formato: el campo —o la columna de su tabla— y
 *  el listado al que apunta. */
export interface FormReference {
  fieldId: string;
  /** El nombre con que se lee en un error: el del campo, o «campo › columna». */
  label: string;
  /** Sólo cuando la relación es la columna de una tabla. */
  columnId?: string;
  config: ReferenceConfig;
}

/** Todas las relaciones de un formato, incluidas las columnas de sus tablas,
 *  en el orden en que aparecen. */
export function collectFormReferences(
  sections: readonly FormSection[],
): FormReference[] {
  const references: FormReference[] = [];
  for (const section of [...sections].sort((a, b) => a.order - b.order)) {
    for (const field of section.fields) {
      if (field.type === "reference" && field.config.reference) {
        references.push({
          fieldId: field.id,
          label: field.label,
          config: field.config.reference,
        });
      }
      if (field.type !== "table") continue;
      for (const column of field.config.table?.columns ?? []) {
        if (column.type !== "reference" || !column.reference) continue;
        references.push({
          fieldId: field.id,
          label: `${field.label} › ${column.label}`,
          columnId: column.id,
          config: column.reference,
        });
      }
    }
  }
  return references;
}

/** Los listados a los que apunta un formato, sin repetir. */
export const referencedFormIds = (
  sections: readonly FormSection[],
): string[] => [
  ...new Set(
    collectFormReferences(sections)
      .map((reference) => reference.config.formId)
      .filter((formId) => formId !== ""),
  ),
];

/** Un formato con su definición, como nodo del grafo. */
export interface FormNode {
  formId: string;
  sections: readonly FormSection[];
}

/** `formId → listados a los que apunta`. */
export function buildReferenceGraph(
  forms: readonly FormNode[],
): Map<string, string[]> {
  return new Map(
    forms.map((form) => [form.formId, referencedFormIds(form.sections)]),
  );
}

/**
 * El primer ciclo del grafo, como el camino que lo recorre —`[A, B, A]`—, o
 * `null` si no hay ninguno. Un formato que se apunta a sí mismo es el ciclo
 * más corto: `[A, A]`.
 *
 * Devuelve el camino y no un booleano para que el error pueda nombrar los
 * formatos: «Vehículos → Conductores → Vehículos».
 *
 * Con `from`, sólo busca los ciclos que se alcanzan desde ese formato: al
 * publicar interesa el que cierra lo que se publica, no uno ajeno que ya
 * estuviera ahí.
 */
export function findReferenceCycle(
  forms: readonly FormNode[],
  from?: string,
): string[] | null {
  const graph = buildReferenceGraph(forms);
  const state = new Map<string, "visiting" | "done">();
  const path: string[] = [];

  const visit = (formId: string): string[] | null => {
    if (state.get(formId) === "done") return null;
    if (state.get(formId) === "visiting") {
      return [...path.slice(path.indexOf(formId)), formId];
    }
    state.set(formId, "visiting");
    path.push(formId);
    for (const target of graph.get(formId) ?? []) {
      const cycle = visit(target);
      if (cycle) return cycle;
    }
    path.pop();
    state.set(formId, "done");
    return null;
  };

  for (const formId of from === undefined ? graph.keys() : [from]) {
    const cycle = visit(formId);
    if (cycle) return cycle;
  }
  return null;
}
