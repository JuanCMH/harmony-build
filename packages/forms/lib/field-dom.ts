import type { SubmissionProblem } from "./submission-problems";

/**
 * Los `id` que un campo deja en el documento, y a cuál de ellos se lleva la
 * vista cuando algo impide enviar.
 *
 * Viven en un solo sitio porque los escriben tres controles —el campo, la
 * celda de una tabla, el ítem de una lista de chequeo— y los lee quien lleva
 * el foco: si cada uno inventara el suyo, el salto al primer problema dejaría
 * de encontrar su destino sin que nada fallara.
 */

/** Una petición de llevar la vista a un problema. `attempt` cambia en cada
 *  intento de envío, para repetir el salto aunque sea el mismo campo. */
export interface FormFocusRequest {
  problem: SubmissionProblem;
  attempt: number;
}

/** El id del control de un campo: a él apunta su `Label`. */
export const fieldDomId = (fieldId: string): string => `campo-${fieldId}`;

/** El bloque entero del campo —etiqueta, control y error—. */
export const fieldFrameId = (fieldId: string): string =>
  `${fieldDomId(fieldId)}-bloque`;

/** El control de una celda de tabla. */
export const cellDomId = (
  tableDomId: string,
  rowId: string,
  columnId: string,
): string => `${tableDomId}-${rowId}-${columnId}`;

/** El bloque de una celda: su etiqueta en teléfono y su control. */
export const cellFrameId = (
  tableDomId: string,
  rowId: string,
  columnId: string,
): string => `${cellDomId(tableDomId, rowId, columnId)}-bloque`;

/** El ítem de una lista de chequeo: el mismo que escribe
 *  `ChecklistFieldControl` (`checklistItemId`). */
export const checklistItemDomId = (fieldId: string, itemId: string): string =>
  `${fieldDomId(fieldId)}-item-${itemId}`;

/**
 * A dónde ir por un problema, del destino más preciso al más amplio: el ítem
 * que falta, la celda que falta, el campo. Quien lleva el foco toma el primero
 * que exista en el documento; el bloque del campo existe siempre.
 */
export function problemTargets(problem: SubmissionProblem): string[] {
  const targets: string[] = [];
  if (problem.itemId) {
    targets.push(checklistItemDomId(problem.fieldId, problem.itemId));
  }
  if (problem.rowId && problem.columnId) {
    targets.push(
      cellFrameId(fieldDomId(problem.fieldId), problem.rowId, problem.columnId),
    );
  }
  targets.push(fieldFrameId(problem.fieldId));
  return targets;
}
