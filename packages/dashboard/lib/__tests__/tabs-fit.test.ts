import { describe, expect, it } from "vitest";
import { visibleTabCount } from "../tabs-fit";

describe("visibleTabCount", () => {
  const widths = [100, 100, 100, 100];

  it("si caben todas, van todas y no hace falta «Más»", () => {
    expect(visibleTabCount(widths, 400, 80)).toBe(4);
    expect(visibleTabCount([], 0, 80)).toBe(0);
  });

  it("si no caben, deja sitio al botón «Más»", () => {
    // Cabrían tres sin el botón, pero con él sólo dos.
    expect(visibleTabCount(widths, 399, 120)).toBe(2);
    expect(visibleTabCount(widths, 399, 80)).toBe(3);
  });

  it("no salta una ancha para colar una estrecha: el orden manda", () => {
    expect(visibleTabCount([100, 300, 50], 260, 80)).toBe(1);
  });

  it("en una fila muy estrecha no enseña ninguna: todo va en «Más»", () => {
    expect(visibleTabCount(widths, 150, 80)).toBe(0);
  });
});
