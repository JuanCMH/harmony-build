/**
 * Cuántas pestañas del tablero caben en la fila, de la primera en adelante
 * (`docs/plans/2026-10-12-programa-y-cierre-de-hallazgos-design.md §5`).
 *
 * Si caben todas, van todas. Si no, van las que quepan dejando sitio al botón
 * «Más», que guarda el resto: la fila nunca se desplaza de lado.
 */
export function visibleTabCount(
  /** El ancho de cada pestaña, en el orden en que se guardaron. */
  widths: readonly number[],
  /** El ancho disponible para la fila. */
  available: number,
  /** Lo que ocupa el botón «Más». */
  more: number,
): number {
  const total = widths.reduce((sum, width) => sum + width, 0);
  if (total <= available) return widths.length;

  let used = more;
  let count = 0;
  for (const width of widths) {
    if (used + width > available) break;
    used += width;
    count += 1;
  }
  return count;
}
