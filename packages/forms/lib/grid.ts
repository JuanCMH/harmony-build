import type { FieldSize } from "@/convex/lib/form_types";

/**
 * Cuánto ocupa cada tamaño, por punto de ruptura.
 *
 * Un token con cuatro valores se configura de un vistazo, y como lo usan tanto
 * el constructor como el formulario, lo que se ve al diseñar es lo que sale.
 *
 * En teléfono todo ocupa el ancho completo: en 390px la ergonomía táctil manda
 * sobre la maquetación.
 */
export const FIELD_SIZE_SPAN: Record<FieldSize, string> = {
  small: "col-span-1 sm:col-span-2 lg:col-span-3",
  medium: "col-span-1 sm:col-span-3 lg:col-span-6",
  large: "col-span-1 sm:col-span-4 lg:col-span-9",
  full: "col-span-1 sm:col-span-6 lg:col-span-12",
};

/** Más aire entre filas que entre columnas: la ayuda de un campo se pegaba a
 *  la etiqueta del de abajo. */
export const FIELD_GRID =
  "grid grid-cols-1 sm:grid-cols-6 lg:grid-cols-12 gap-x-4 gap-y-6";

/** Cómo se llama cada tamaño en la interfaz. */
export const FIELD_SIZE_LABEL: Record<FieldSize, string> = {
  small: "Un cuarto de fila",
  medium: "Media fila",
  large: "Tres cuartos de fila",
  full: "Fila entera",
};
