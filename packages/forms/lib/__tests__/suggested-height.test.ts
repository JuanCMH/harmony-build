import { describe, expect, it } from "vitest";

import { suggestedHeight } from "../suggested-height";

const expirations = (count: number) => ({
  type: "expirations" as const,
  rows: Array.from({ length: count }, (_, index) => ({
    entryId: `e${index}`,
    title: `Vehículo ${index}`,
    fieldLabel: "SOAT",
    date: "2026-11-01",
    daysLeft: 20,
  })),
  expired: 0,
  soon: count,
});

describe("el alto sugerido de un resultado", () => {
  it("el más bajo en que caben todas las filas de hoy", () => {
    // Tres recargas caben en dos pisos; diez piden más.
    expect(suggestedHeight("expirations", expirations(3))).toBe("short");
    expect(suggestedHeight("expirations", expirations(6))).toBe("medium");
    expect(suggestedHeight("expirations", expirations(30))).toBe("tall");
  });

  it("lo que no es una lista se queda con el alto de su tipo", () => {
    expect(suggestedHeight("indicator", undefined)).toBe("short");
    expect(suggestedHeight("trend", undefined)).toBe("medium");
  });

  it("un seguimiento sin nada abierto va bajo", () => {
    expect(
      suggestedHeight("tracking", {
        type: "tracking",
        percent: 100,
        opened: 3,
        closed: 3,
        open: 0,
        overdue: 0,
        averageDays: 2,
        pending: [],
      }),
    ).toBe("short");
  });

  it("una tabla de cuatro filas cabe en dos pisos: va a sangre", () => {
    const rows = ["a", "b", "c", "d"].map((key) => ({
      key,
      label: key,
      values: [1],
    }));
    const table = (count: number) => ({
      type: "table" as const,
      groupLabel: "Conductor",
      columns: [{ operation: "count" as const, fieldLabel: null }],
      rows: rows.slice(0, count),
      totals: [count],
    });
    expect(suggestedHeight("table", table(4))).toBe("short");
  });
});
