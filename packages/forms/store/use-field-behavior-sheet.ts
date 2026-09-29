import { atom, useAtom } from "jotai";

/** Qué pestaña del comportamiento se abre. */
export type BehaviorFocus = "visibility" | "value" | "autoValue";

type BehaviorSheetState = { fieldId: string; focus: BehaviorFocus } | null;

const behaviorSheetAtom = atom<BehaviorSheetState>(null);

/**
 * El sheet de comportamiento de un campo del constructor.
 *
 * Guarda el **identificador** del campo y no el campo: el borrador vive en el
 * constructor y cambia con cada edición, y una copia aquí se quedaría atrás en
 * cuanto el sheet escribiera la primera regla. `null` es el sheet cerrado.
 */
export const useFieldBehaviorSheet = () => useAtom(behaviorSheetAtom);
