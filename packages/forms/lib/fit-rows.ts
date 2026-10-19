/**
 * Cuántas filas de una lista caben en una tarjeta de alto fijo
 * (`docs/plans/2026-10-14-tablero-a-la-medida-design.md` §2).
 *
 * Si caben todas, todas. Si no, las que quepan dejando sitio a la línea de
 * «y N más», que dice lo que quedó fuera: una lista no se corta a media fila
 * ni desplaza por dentro.
 */
export function fitRows({
  space,
  total,
  rowHeight,
  moreHeight,
  more = false,
}: {
  /** El alto disponible, en píxeles. */
  space: number;
  total: number;
  rowHeight: number;
  /** El alto de la línea de «y N más». */
  moreHeight: number;
  /** Si la línea va de todos modos: hay más de las que llegaron. */
  more?: boolean;
}): number {
  if (!more && total * rowHeight <= space) return total;
  return Math.min(
    total,
    Math.max(0, Math.floor((space - moreHeight) / rowHeight)),
  );
}
