import type { WidgetHeight, WidgetSize } from "@/convex/lib/result_validators";

/**
 * La retícula de los resultados: doce columnas y pisos de 136 px con 16 de
 * separación, así que un alto (cuatro pisos, 592 px) mide lo mismo que dos
 * bajos apilados (`docs/plans/2026-10-14-tablero-a-la-medida-design.md` §1).
 * En teléfono todo va a fila entera y conserva su alto.
 */
export const WIDGET_GRID = "grid auto-rows-[136px] gap-4 lg:grid-cols-12";

/** Lo que ocupa cada ancho en la retícula de doce. */
export const SIZE_SPAN: Record<WidgetSize, string> = {
  third: "lg:col-span-4",
  half: "lg:col-span-6",
  twoThirds: "lg:col-span-8",
  full: "lg:col-span-12",
};

/** Los pisos de cada alto. */
export const HEIGHT_SPAN: Record<WidgetHeight, string> = {
  short: "row-span-2",
  medium: "row-span-3",
  tall: "row-span-4",
};
