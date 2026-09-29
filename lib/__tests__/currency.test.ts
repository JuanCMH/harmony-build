import { describe, expect, it } from "vitest";
import { formatCurrency, parseCurrency } from "../currency";

/** `Intl` separa el símbolo con un espacio duro: se compara sin él. */
const plain = (text: string) => text.replace(/\s/g, " ");

describe("el dinero", () => {
  it("se lee en pesos, con separador de miles y sin decimales", () => {
    expect(plain(formatCurrency(1250000))).toBe("$ 1.250.000");
    expect(plain(formatCurrency(1999.6))).toBe("$ 2.000");
  });

  it("lo que no es una cifra se lee como cero", () => {
    expect(plain(formatCurrency(Number.NaN))).toBe("$ 0");
  });

  it("de lo escrito sólo cuentan los dígitos", () => {
    expect(parseCurrency("$ 1.250.000")).toBe(1250000);
    expect(parseCurrency("45abc")).toBe(45);
  });

  it("sin dígitos no hay valor", () => {
    expect(parseCurrency("")).toBeNull();
    expect(parseCurrency("$ ")).toBeNull();
  });
});
