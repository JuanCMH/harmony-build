import type { FieldSize } from "@/convex/lib/form_types";

/**
 * Cuánto ocupa cada tamaño, por punto de ruptura.
 *
 * Un token con cuatro valores se configura de un vistazo, y como lo usan tanto
 * el constructor como el formulario, lo que se ve al diseñar es lo que sale.
 *
 * En teléfono todo ocupa el ancho completo: en 390px la ergonomía táctil manda
 * sobre la maquetación.
 *
 * En tableta sólo hay dos anchos, media fila y fila entera: con tres, una fila
 * de escritorio «medio + pequeño + pequeño» se partía en «medio + pequeño» y un
 * pequeño suelto. Así, toda fila que cierra en doce cierra también en seis,
 * siempre que los pequeños vayan de dos en dos (lo vigila la prueba de la
 * biblioteca).
 */
export const FIELD_SIZE_SPAN: Record<FieldSize, string> = {
  small: "col-span-1 sm:col-span-3 lg:col-span-3",
  medium: "col-span-1 sm:col-span-6 lg:col-span-6",
  large: "col-span-1 sm:col-span-6 lg:col-span-9",
  full: "col-span-1 sm:col-span-6 lg:col-span-12",
};

/** Más aire entre filas que entre columnas: la ayuda de un campo se pegaba a
 *  la etiqueta del de abajo. */
export const FIELD_GRID =
  "grid grid-cols-1 sm:grid-cols-6 lg:grid-cols-12 gap-x-4 gap-y-6";

/**
 * Un campo dentro de `FIELD_GRID`: dos pistas —la etiqueta con su ayuda, y el
 * control— que comparte con sus vecinos de fila (`subgrid`). Sin esto, un
 * campo con ayuda o con la etiqueta en dos líneas empujaba su control hacia
 * abajo y la fila quedaba en escalera.
 *
 * Lleva dos hijos, ni uno más: el primero se alinea abajo (`FIELD_CELL_LABEL`)
 * para que la etiqueta no se separe de su control.
 */
export const FIELD_CELL = "row-span-2 grid grid-rows-subgrid gap-y-1.5 min-w-0";
export const FIELD_CELL_LABEL = "self-end";

/** Cómo se llama cada tamaño en la interfaz. */
export const FIELD_SIZE_LABEL: Record<FieldSize, string> = {
  small: "Un cuarto de fila",
  medium: "Media fila",
  large: "Tres cuartos de fila",
  full: "Fila entera",
};
