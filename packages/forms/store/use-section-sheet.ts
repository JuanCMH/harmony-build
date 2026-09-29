import { atom, useAtom } from "jotai";

/** La condición de una sección, abierta sobre la sección de este id. `null`
 *  es el sheet cerrado. */
const sectionSheetAtom = atom<string | null>(null);

export const useSectionSheet = () => useAtom(sectionSheetAtom);
