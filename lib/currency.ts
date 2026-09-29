/** El dinero de Harmony Build es peso colombiano.
 *
 *  Portado de Harmony, donde existe porque el dinero no se formateaba igual en
 *  todas partes: dos pantallas mostraban pesos mexicanos mientras el resto
 *  usaba `es-CO` y `COP`. Un único helper impide que vuelva a divergir.
 *
 *  El peso no usa decimales: una cifra con centavos se redondea al leerla.
 */

const COP = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export const formatCurrency = (value: number): string =>
  COP.format(Number.isFinite(value) ? value : 0);

/** Lo escrito en un campo de dinero, como número: sólo cuentan los dígitos.
 *  `null` si no hay ninguno. */
export const parseCurrency = (text: string): number | null => {
  const digits = text.replace(/\D/g, "");
  return digits === "" ? null : Number(digits);
};
