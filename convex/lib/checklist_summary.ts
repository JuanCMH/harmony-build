/** El recuento de una lista de chequeo respondida.
 *
 *  Cuenta por el **sentido** de la opción elegida —conforme, no conforme, no
 *  aplica— y no por su letra: así «M», «No» y «NC» suman en la misma columna
 *  sin que nadie sepa qué escala usa el formato (diseño §4.1). Puro: lo usan
 *  la columna resumen del listado de respuestas, la vista de una respuesta y,
 *  cuando lleguen, las gráficas.
 */

import type {
  ChecklistAnswer,
  ChecklistConfig,
  ChecklistItem,
  ChecklistMeaning,
} from "./form_types";

export interface ChecklistSummary {
  /** Conformes. */
  ok: number;
  /** No conformes. */
  fail: number;
  /** No aplica. */
  na: number;
  /** Ítems que se responden y nadie respondió. */
  unanswered: number;
  /** Ítems que se responden: todos menos los encabezados. */
  total: number;
}

/** Los ítems que se responden: un `heading` sólo agrupa. */
export const answerableItems = (config: ChecklistConfig): ChecklistItem[] =>
  config.blocks.flatMap((block) => block.items.filter((item) => !item.heading));

/**
 * Cuántos ítems hay de cada sentido en una respuesta.
 *
 * Una respuesta cuya opción ya no existe en la escala cuenta como sin
 * responder: no se sabe qué quiso decir.
 */
export function summarizeChecklist(
  config: ChecklistConfig,
  answers: readonly ChecklistAnswer[],
): ChecklistSummary {
  const meaningOf = new Map<string, ChecklistMeaning>(
    config.options.map((option) => [option.value, option.meaning]),
  );
  const chosen = new Map(
    answers.map((answer) => [answer.itemId, answer.value] as const),
  );

  const summary: ChecklistSummary = {
    ok: 0,
    fail: 0,
    na: 0,
    unanswered: 0,
    total: 0,
  };
  for (const item of answerableItems(config)) {
    summary.total += 1;
    const value = chosen.get(item.id);
    const meaning = value === undefined ? undefined : meaningOf.get(value);
    if (meaning) summary[meaning] += 1;
    else summary.unanswered += 1;
  }
  return summary;
}

const counted = (count: number, singular: string, plural: string) =>
  `${count} ${count === 1 ? singular : plural}`;

/** «61 conformes · 2 no conformes · 0 no aplica», y lo que falte por
 *  responder sólo si falta algo. */
export function checklistSummaryText(summary: ChecklistSummary): string {
  const parts = [
    counted(summary.ok, "conforme", "conformes"),
    counted(summary.fail, "no conforme", "no conformes"),
    `${summary.na} no aplica`,
  ];
  if (summary.unanswered > 0) parts.push(`${summary.unanswered} sin responder`);
  return parts.join(" · ");
}
