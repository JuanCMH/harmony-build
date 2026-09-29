import type { ChecklistMeaning } from "@/convex/lib/form_types";

/**
 * El color de una respuesta de lista de chequeo, según lo que su opción
 * **significa** (`03 §1.4`). Vive aquí y en ningún otro sitio: el control, la
 * vista de sólo lectura y el resumen de una columna dicen «no conforme» con el
 * mismo rojo.
 *
 * El color nunca va solo: la opción lleva siempre su letra o su nombre.
 */

/** El botón de la opción elegida. */
export const MEANING_SELECTED: Record<ChecklistMeaning, string> = {
  ok: "border-green-600 bg-green-600 text-white hover:bg-green-600",
  fail: "border-red-600 bg-red-600 text-white hover:bg-red-600",
  na: "border-gray-500 bg-gray-500 text-white hover:bg-gray-500",
};

/** La respuesta ya dada, leída: tinte suave con el texto en su color. */
export const MEANING_TINT: Record<ChecklistMeaning, string> = {
  ok: "border-green-500/20 bg-green-500/10 text-green-700 dark:text-green-400",
  fail: "border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-400",
  na: "border-gray-500/20 bg-gray-500/10 text-gray-600 dark:text-gray-400",
};

/** El punto que acompaña a una cifra del resumen. */
export const MEANING_DOT: Record<ChecklistMeaning, string> = {
  ok: "bg-green-500",
  fail: "bg-red-500",
  na: "bg-gray-400",
};

export const MEANING_LABEL: Record<
  ChecklistMeaning,
  { one: string; many: string }
> = {
  ok: { one: "conforme", many: "conformes" },
  fail: { one: "no conforme", many: "no conformes" },
  na: { one: "no aplica", many: "no aplican" },
};

/** Tailwind necesita ver la clase entera: el número de columnas no se
 *  interpola. Una escala tiene entre dos y cinco opciones. */
export const OPTION_COLUMNS: Record<number, string> = {
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
  5: "grid-cols-5",
};
