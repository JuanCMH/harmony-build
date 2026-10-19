import { describe, expect, it } from "vitest";

import { placeWidgets } from "@/convex/lib/widget_layout";

import { arrangeResults } from "../results-layout";

describe("el acomodo de los resultados de un formato", () => {
  it("no deja huecos: la cifra suelta y la gráfica suelta van a la fila entera", () => {
    const arranged = arrangeResults([
      { type: "indicator", height: "short" },
      { type: "coverage", height: "tall" },
      { type: "compliance", height: "medium" },
      { type: "distribution", height: "short" },
      { type: "findings", height: "medium" },
      { type: "table", height: "short" },
      { type: "heatmap", height: "short" },
    ]);
    expect(placeWidgets(arranged).holes).toEqual([]);
    expect(arranged[0]).toEqual({ index: 0, size: "full", height: "short" });
  });

  it("empareja las medias filas con el mismo alto", () => {
    const arranged = arrangeResults([
      { type: "coverage", height: "tall" },
      { type: "distribution", height: "short" },
    ]);
    expect(arranged.map((one) => one.height)).toEqual(["tall", "tall"]);
    expect(placeWidgets(arranged).holes).toEqual([]);
  });

  it("tres cifras van en tercios", () => {
    const arranged = arrangeResults([
      { type: "indicator", height: "short" },
      { type: "indicator", height: "short" },
      { type: "composite", height: "short" },
    ]);
    expect(arranged.map((one) => one.size)).toEqual([
      "third",
      "third",
      "third",
    ]);
  });
});
