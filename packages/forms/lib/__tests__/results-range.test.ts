import { describe, expect, it } from "vitest";

import {
  RANGE_PRESETS,
  lastDays,
  presetOf,
  resolveRange,
} from "../results-range";

const TODAY = "2026-10-09";

describe("resolveRange", () => {
  it("sin rango en la dirección, los últimos treinta días con hoy", () => {
    expect(resolveRange({ from: null, to: null }, TODAY)).toEqual({
      from: "2026-09-10",
      to: "2026-10-09",
    });
  });

  it("respeta un rango válido", () => {
    expect(
      resolveRange({ from: "2026-09-01", to: "2026-09-30" }, TODAY),
    ).toEqual({ from: "2026-09-01", to: "2026-09-30" });
  });

  it("lo que no es una fecha, o un rango al revés, cae en el de omisión", () => {
    for (const raw of [
      { from: "ayer", to: "2026-09-30" },
      { from: "2026-09-30", to: "2026-09-01" },
      { from: "2026-09-01", to: null },
    ]) {
      expect(resolveRange(raw, TODAY)).toEqual(lastDays(TODAY, 30));
    }
  });
});

describe("presetOf", () => {
  it("reconoce el atajo que da ese rango", () => {
    expect(presetOf(lastDays(TODAY, 7), TODAY)?.id).toBe("7");
    expect(
      presetOf({ from: "2026-09-02", to: "2026-09-30" }, TODAY),
    ).toBeNull();
  });
});

describe("RANGE_PRESETS", () => {
  const rangeOf = (id: string, today = TODAY) =>
    RANGE_PRESETS.find((preset) => preset.id === id)?.range(today);

  it("los del calendario salen de hoy", () => {
    expect(rangeOf("month")).toEqual({ from: "2026-10-01", to: TODAY });
    expect(rangeOf("lastMonth")).toEqual({
      from: "2026-09-01",
      to: "2026-09-30",
    });
    expect(rangeOf("year")).toEqual({ from: "2026-01-01", to: TODAY });
  });

  it("el mes pasado de enero es diciembre del año anterior", () => {
    expect(rangeOf("lastMonth", "2027-01-15")).toEqual({
      from: "2026-12-01",
      to: "2026-12-31",
    });
  });

  it("ninguno pide más de lo que el servidor calcula", () => {
    for (const preset of RANGE_PRESETS) {
      const range = preset.range("2026-12-31");
      expect(resolveRange(range, "2026-12-31")).toEqual(range);
    }
  });
});
