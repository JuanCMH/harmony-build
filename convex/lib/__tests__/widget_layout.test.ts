import { describe, expect, it } from "vitest";

import { heightOf, placeWidgets, widenInto } from "../widget_layout";

describe("el alto de un resultado en el tablero", () => {
  it("usa el guardado si el tipo lo admite, y si no el suyo por omisión", () => {
    expect(heightOf("trend", "tall")).toBe("tall");
    expect(heightOf("trend", undefined)).toBe("medium");
    // Una cifra no se estira a cuatro pisos.
    expect(heightOf("indicator", "tall")).toBe("short");
  });
});

describe("la colocación en la retícula", () => {
  it("pone un alto junto a dos bajos apilados, sin huecos", () => {
    const { placed, holes, floors } = placeWidgets([
      { size: "half", height: "tall" },
      { size: "half", height: "short" },
      { size: "half", height: "short" },
    ]);
    expect(placed).toEqual([
      { row: 0, column: 0, columns: 6, floors: 4 },
      { row: 0, column: 6, columns: 6, floors: 2 },
      { row: 2, column: 6, columns: 6, floors: 2 },
    ]);
    expect(holes).toEqual([]);
    expect(floors).toBe(4);
  });

  it("un medio junto a dos bajos deja libre el piso de debajo del medio", () => {
    const { placed, holes } = placeWidgets([
      { size: "half", height: "medium" },
      { size: "half", height: "short" },
      { size: "half", height: "short" },
    ]);
    expect(placed[2]).toEqual({ row: 2, column: 6, columns: 6, floors: 2 });
    expect(holes).toEqual([{ row: 3, column: 0, columns: 6, floors: 1 }]);
  });

  it("no vuelve atrás: lo que no cabe a la derecha baja, y deja el hueco", () => {
    const { placed, holes } = placeWidgets([
      { size: "third", height: "short" },
      { size: "full", height: "short" },
      { size: "third", height: "short" },
    ]);
    expect(placed[2]).toEqual({ row: 4, column: 0, columns: 4, floors: 2 });
    expect(holes).toEqual([
      { row: 0, column: 4, columns: 8, floors: 2 },
      { row: 4, column: 4, columns: 8, floors: 2 },
    ]);
  });

  it("encuentra la media fila que deja el último resultado", () => {
    const { placed, holes } = placeWidgets([
      { size: "half", height: "short" },
      { size: "half", height: "short" },
      { size: "half", height: "short" },
    ]);
    expect(holes).toEqual([{ row: 2, column: 6, columns: 6, floors: 2 }]);
    expect(widenInto(placed, holes[0])).toEqual({ index: 2, size: "full" });
  });

  it("no ofrece ensanchar si el ancho resultante no es uno de los cuatro", () => {
    const { placed, holes } = placeWidgets([
      { size: "twoThirds", height: "short" },
      { size: "half", height: "short" },
    ]);
    // Dos tercios dejan un tercio libre, y la media fila baja.
    expect(holes[0]).toEqual({ row: 0, column: 8, columns: 4, floors: 2 });
    expect(widenInto(placed, holes[0])).toEqual({ index: 0, size: "full" });
    expect(widenInto(placed, holes[1])).toEqual({ index: 1, size: "full" });
    expect(
      widenInto([{ row: 0, column: 0, columns: 4, floors: 2 }], {
        row: 0,
        column: 4,
        columns: 6,
        floors: 2,
      }),
    ).toBeNull();
  });

  it("un tablero vacío no tiene alto ni huecos", () => {
    expect(placeWidgets([])).toEqual({ placed: [], holes: [], floors: 0 });
  });
});
