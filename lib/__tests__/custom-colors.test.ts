import { describe, expect, it } from "vitest";

import {
  type CustomColor,
  customColors,
  hexCustomColors,
  textOnCustomColors,
} from "../custom-colors";

/** Luminancia relativa según WCAG 2.1. */
const luminancia = (hex: string) => {
  const canal = (i: number) => Number.parseInt(hex.slice(i, i + 2), 16) / 255;
  const lineal = (c: number) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  return (
    0.2126 * lineal(canal(1)) +
    0.7152 * lineal(canal(3)) +
    0.0722 * lineal(canal(5))
  );
};

const contraste = (a: number, b: number) =>
  (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

const LUM_BLANCO = 1;
const LUM_GRIS_900 = luminancia("#111827"); // gray-900 de Tailwind

describe("la paleta de dominio", () => {
  const nombres = Object.keys(customColors) as CustomColor[];

  it("tiene los mismos 24 colores en las cuatro tablas", () => {
    expect(nombres).toHaveLength(24);
    expect(Object.keys(hexCustomColors).sort()).toEqual([...nombres].sort());
    expect(Object.keys(textOnCustomColors).sort()).toEqual([...nombres].sort());
  });

  it("elige siempre el texto que más contrasta", () => {
    // La tabla no se mantiene a ojo: si alguien cambia un hex de la paleta y no
    // el texto, esta prueba lo dice.
    for (const nombre of nombres) {
      const lum = luminancia(hexCustomColors[nombre]);
      const mejor =
        contraste(lum, LUM_GRIS_900) > contraste(lum, LUM_BLANCO)
          ? "text-gray-900"
          : "text-white";
      expect(textOnCustomColors[nombre], `color ${nombre}`).toBe(mejor);
    }
  });

  it("los 24 quedan a un pelo de AA o por encima", () => {
    // Veintidós pasan AA (4.5:1). `kelly` se queda en 4,497 y `cobalt` en
    // 4,499 — dos milésimas por debajo, y con texto oscuro contrastarían
    // menos, así que la elección es la correcta. Son valores de la paleta que
    // el usuario elige, no una decisión de la interfaz: se deja constancia en
    // vez de falsear el umbral.
    for (const nombre of nombres) {
      const lum = luminancia(hexCustomColors[nombre]);
      const lumTexto =
        textOnCustomColors[nombre] === "text-white" ? LUM_BLANCO : LUM_GRIS_900;
      expect(contraste(lum, lumTexto), `color ${nombre}`).toBeGreaterThan(4.49);
    }
  });

  it("sólo kelly y cobalt se quedan por debajo de AA", () => {
    const flojos = nombres.filter((nombre) => {
      const lum = luminancia(hexCustomColors[nombre]);
      const lumTexto =
        textOnCustomColors[nombre] === "text-white" ? LUM_BLANCO : LUM_GRIS_900;
      return contraste(lum, lumTexto) < 4.5;
    });
    expect(flojos.sort()).toEqual(["cobalt", "kelly"]);
  });

  it("los seis claros necesitan texto oscuro", () => {
    // La lista escrita a mano que había en las etiquetas de turno sólo tenía
    // los tres primeros.
    const oscuros = nombres.filter(
      (n) => textOnCustomColors[n] === "text-gray-900",
    );
    expect(oscuros).toEqual([
      "yellow",
      "gold",
      "orange",
      "rose",
      "blue",
      "turquoise",
    ]);
  });
});
