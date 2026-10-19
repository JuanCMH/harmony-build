import { describe, expect, it } from "vitest";

import { cutPeriods, isCut } from "../result-periods";

describe("los periodos que corta el rango", () => {
  const range = { from: "2026-09-15", to: "2026-10-14" };

  it("la semana en curso y la que empezó antes del rango", () => {
    // Semanas desde el lunes 14 de septiembre hasta la del 12 de octubre.
    const keys = [
      "2026-09-14",
      "2026-09-21",
      "2026-09-28",
      "2026-10-05",
      "2026-10-12",
    ];
    expect(cutPeriods("week", keys, range)).toEqual({
      first: true,
      last: true,
    });
    expect(isCut({ first: true, last: true }, 0, keys.length)).toBe(true);
    expect(isCut({ first: true, last: true }, 2, keys.length)).toBe(false);
  });

  it("un rango que cubre los periodos enteros no corta ninguno", () => {
    expect(
      cutPeriods("month", ["2026-07-01", "2026-08-01", "2026-09-01"], {
        from: "2026-07-01",
        to: "2026-09-30",
      }),
    ).toEqual({ first: false, last: false });
  });

  it("un día nunca está cortado", () => {
    expect(cutPeriods("day", ["2026-10-14"], range)).toEqual({
      first: false,
      last: false,
    });
  });
});
