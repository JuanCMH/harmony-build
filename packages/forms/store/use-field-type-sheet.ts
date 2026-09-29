import { atom, useAtom } from "jotai";

/**
 * El editor propio de un tipo —la lista de chequeo, la tabla, la relación—,
 * abierto sobre el campo de este id. `null` es el sheet cerrado.
 *
 * Como el de comportamiento, guarda el id y no el campo: el editor escribe en
 * el borrador del constructor y lee siempre la versión viva.
 */
const fieldTypeSheetAtom = atom<string | null>(null);

export const useFieldTypeSheet = () => useAtom(fieldTypeSheetAtom);
