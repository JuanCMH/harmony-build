/**
 * El trazo de una firma, sin lienzo: los puntos, y cómo se convierten en
 * curvas. El lienzo sólo pinta lo que sale de aquí.
 */

export interface SignaturePoint {
  x: number;
  y: number;
}

/** Un trazo es lo dibujado entre que el dedo baja y sube. */
export type SignatureStroke = SignaturePoint[];

/** Por debajo de esto no es una firma, es un toque accidental. */
const MIN_STROKE_LENGTH = 40;

const distance = (a: SignaturePoint, b: SignaturePoint) =>
  Math.hypot(b.x - a.x, b.y - a.y);

/** Cuánto se dibujó en total, en píxeles. */
export const strokesLength = (strokes: readonly SignatureStroke[]): number =>
  strokes.reduce(
    (total, stroke) =>
      total +
      stroke.reduce(
        (length, point, index) =>
          index === 0 ? 0 : length + distance(stroke[index - 1], point),
        0,
      ),
    0,
  );

export const isSignatureDrawn = (strokes: readonly SignatureStroke[]) =>
  strokesLength(strokes) >= MIN_STROKE_LENGTH;

/**
 * El trazo como `path` de SVG, suavizado: cada tramo es una curva cuadrática
 * que pasa por el punto medio entre dos muestras. Unir las muestras con rectas
 * deja una firma de esquinas; así queda como la tinta.
 */
export const strokeToPath = (stroke: SignatureStroke): string => {
  if (stroke.length === 0) return "";
  const [first, ...rest] = stroke;
  if (rest.length === 0)
    // Un punto solo: un trazo de longitud cero, que con extremos redondeados
    // se ve como el punto de una i.
    return `M ${first.x} ${first.y} L ${first.x} ${first.y}`;

  let path = `M ${first.x} ${first.y}`;
  for (let index = 1; index < stroke.length - 1; index += 1) {
    const current = stroke[index];
    const next = stroke[index + 1];
    const midX = (current.x + next.x) / 2;
    const midY = (current.y + next.y) / 2;
    path += ` Q ${current.x} ${current.y} ${midX} ${midY}`;
  }
  const last = stroke[stroke.length - 1];
  return `${path} L ${last.x} ${last.y}`;
};

/** El nombre del archivo de una firma: dice de quién es sin abrirlo. */
export const signatureFileName = (signerName: string): string => {
  const slug = signerName
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return `firma-${slug || "sin-nombre"}.png`;
};
