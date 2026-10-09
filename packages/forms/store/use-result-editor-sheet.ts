import type { Id } from "@/convex/_generated/dataModel";
import type { ResultConfig } from "@/convex/lib/result_types";
import { atom, useAtom } from "jotai";

/** El resultado que se edita; `"new"` crea uno; `null` es el sheet cerrado. */
export type ResultEditorState =
  | { _id: Id<"formResults">; name: string; config: ResultConfig }
  | "new"
  | null;

const resultEditorAtom = atom<ResultEditorState>(null);

/**
 * El sheet del editor de resultados (`03 §3.0`). Es un átomo porque lo abren
 * desde dos sitios: «Añadir resultado», en la barra de la página, y «Editar»,
 * en el menú de cada tarjeta.
 */
export const useResultEditorSheet = () => useAtom(resultEditorAtom);
