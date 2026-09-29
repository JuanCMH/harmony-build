import type {
  ChecklistAnswer,
  ChecklistBlock,
  ChecklistConfig,
  ChecklistItem,
  ChecklistMeaning,
  ChecklistOption,
} from "@/convex/lib/form_types";

/**
 * Lo que se hace con las respuestas de una lista de chequeo, sin pintar nada.
 *
 * Una respuesta es un arreglo de `{ itemId, value, … }`: aquí vive cómo se
 * lee, cómo se cambia un ítem sin tocar los demás, y qué le falta. El control
 * y la vista de sólo lectura lo comparten.
 */

/** Las filas que se responden: todas menos las que sólo agrupan. */
export const answerableItems = (block: ChecklistBlock): ChecklistItem[] =>
  block.items.filter((item) => !item.heading);

export const allAnswerableItems = (config: ChecklistConfig): ChecklistItem[] =>
  config.blocks.flatMap(answerableItems);

export const answersByItem = (
  answers: readonly ChecklistAnswer[],
): Map<string, ChecklistAnswer> =>
  new Map(answers.map((answer) => [answer.itemId, answer]));

export const optionByValue = (
  config: ChecklistConfig,
  value: string | undefined,
): ChecklistOption | undefined =>
  value === undefined
    ? undefined
    : config.options.find((option) => option.value === value);

/** Una respuesta sin nada dentro no es una respuesta: no se guarda. */
const isBlank = (answer: ChecklistAnswer) =>
  answer.value === undefined &&
  !answer.note &&
  answer.quantity === undefined &&
  !answer.date;

/**
 * Cambia un ítem y devuelve la lista entera, en el orden de la definición.
 *
 * `patch` con una clave en `undefined` la quita. El orden se rehace siempre
 * desde la definición para que dos personas que responden lo mismo guarden lo
 * mismo, pulsen en el orden que pulsen.
 */
export const patchAnswer = (
  config: ChecklistConfig,
  answers: readonly ChecklistAnswer[],
  itemId: string,
  patch: Partial<Omit<ChecklistAnswer, "itemId">>,
): ChecklistAnswer[] => {
  const byItem = answersByItem(answers);
  const next: ChecklistAnswer = { ...byItem.get(itemId), itemId, ...patch };
  for (const key of ["value", "note", "quantity", "date"] as const) {
    if (next[key] === undefined || next[key] === "") delete next[key];
  }
  byItem.set(itemId, next);

  return allAnswerableItems(config).flatMap((item) => {
    const answer = byItem.get(item.id);
    return answer && !isBlank(answer) ? [answer] : [];
  });
};

/**
 * Responde con `value` los ítems de un bloque que **todavía no tienen
 * respuesta**. No pisa lo ya marcado: quien encontró un fallo y luego pulsa
 * «marcar todo» no quiere perderlo.
 */
export const fillBlock = (
  config: ChecklistConfig,
  answers: readonly ChecklistAnswer[],
  blockId: string,
  value: string,
): ChecklistAnswer[] => {
  const block = config.blocks.find((candidate) => candidate.id === blockId);
  if (!block) return [...answers];

  const byItem = answersByItem(answers);
  let next = [...answers];
  for (const item of answerableItems(block)) {
    if (byItem.get(item.id)?.value !== undefined) continue;
    next = patchAnswer(config, next, item.id, { value });
  }
  return next;
};

/** La opción con la que «marcar todo» responde: la primera conforme. */
export const defaultOkOption = (
  config: ChecklistConfig,
): ChecklistOption | undefined =>
  config.options.find((option) => option.meaning === "ok");

/** Si a este ítem, respondido así, le falta la observación. */
export const needsNote = (
  config: ChecklistConfig,
  answer: ChecklistAnswer | undefined,
): boolean => {
  if (config.note !== "onFail") return false;
  if (optionByValue(config, answer?.value)?.meaning !== "fail") return false;
  return !answer?.note?.trim();
};

export interface ChecklistProgress {
  total: number;
  answered: number;
  /** Cuántos respondidos por lo que su opción significa. */
  byMeaning: Record<ChecklistMeaning, number>;
  /** Ítems no conformes a los que les falta la observación. */
  missingNotes: number;
}

export const checklistProgress = (
  config: ChecklistConfig,
  answers: readonly ChecklistAnswer[],
  items: readonly ChecklistItem[] = allAnswerableItems(config),
): ChecklistProgress => {
  const byItem = answersByItem(answers);
  const progress: ChecklistProgress = {
    total: items.length,
    answered: 0,
    byMeaning: { ok: 0, fail: 0, na: 0 },
    missingNotes: 0,
  };

  for (const item of items) {
    const answer = byItem.get(item.id);
    const option = optionByValue(config, answer?.value);
    if (!option) continue;
    progress.answered += 1;
    progress.byMeaning[option.meaning] += 1;
    if (needsNote(config, answer)) progress.missingNotes += 1;
  }
  return progress;
};

/** El primer ítem que impide enviar: sin responder, o sin su observación. */
export const firstIncompleteItem = (
  config: ChecklistConfig,
  answers: readonly ChecklistAnswer[],
  required: boolean,
): string | undefined => {
  const byItem = answersByItem(answers);
  return allAnswerableItems(config).find((item) => {
    const answer = byItem.get(item.id);
    if (answer?.value === undefined) return required;
    return needsNote(config, answer);
  })?.id;
};

const plural = (count: number, one: string, many: string) =>
  `${count} ${count === 1 ? one : many}`;

/** «61 conformes · 2 no conformes · 1 no aplica». Lo que no ocurrió, no sale. */
export const describeProgress = (progress: ChecklistProgress): string => {
  const parts = [
    plural(progress.byMeaning.ok, "conforme", "conformes"),
    ...(progress.byMeaning.fail > 0
      ? [plural(progress.byMeaning.fail, "no conforme", "no conformes")]
      : []),
    ...(progress.byMeaning.na > 0
      ? [`${progress.byMeaning.na} no aplica`]
      : []),
  ];
  return parts.join(" · ");
};
