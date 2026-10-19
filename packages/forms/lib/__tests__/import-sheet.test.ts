import { describe, expect, it } from "vitest";

import { normalizeExcelValue, sheetFromMatrix } from "../import-sheet";

describe("normalizeExcelValue", () => {
  it("deja pasar lo simple y aplana lo que Excel envuelve", () => {
    const date = new Date("2025-11-03T00:00:00Z");
    expect(normalizeExcelValue("SLP835")).toBe("SLP835");
    expect(normalizeExcelValue(12)).toBe(12);
    expect(normalizeExcelValue(false)).toBe(false);
    expect(normalizeExcelValue(date)).toBe(date);
    expect(normalizeExcelValue(undefined)).toBeNull();
    expect(
      normalizeExcelValue({
        richText: [{ text: "Luces " }, { text: "altas" }],
      }),
    ).toBe("Luces altas");
    expect(normalizeExcelValue({ formula: "A1*2", result: 24 })).toBe(24);
    expect(normalizeExcelValue({ sharedFormula: "A1", result: date })).toBe(
      date,
    );
    expect(normalizeExcelValue({ formula: "A1" })).toBeNull();
    expect(
      normalizeExcelValue({ text: "ver", hyperlink: "https://x.co" }),
    ).toBe("ver");
    expect(normalizeExcelValue({ error: "#N/A" })).toBeNull();
  });
});

describe("sheetFromMatrix", () => {
  it("toma la primera fila con datos como encabezados y conserva las líneas", () => {
    const sheet = sheetFromMatrix([
      [null, null],
      ["  Placa ", "Tipo\nde vehículo", null],
      ["SLP835", "Furgón", null],
      ["", "  ", null],
      ["TRK402", null, null],
    ]);
    expect(sheet.headers).toEqual(["Placa", "Tipo de vehículo"]);
    expect(sheet.rows).toEqual([
      { line: 3, cells: ["SLP835", "Furgón"] },
      { line: 5, cells: ["TRK402", null] },
    ]);
  });

  it("nombra las columnas sin encabezado y rellena las filas cortas", () => {
    const sheet = sheetFromMatrix([
      ["Placa", null, "Km"],
      ["SLP835"],
      [null, "x", 12],
    ]);
    expect(sheet.headers).toEqual(["Placa", "Columna 2", "Km"]);
    expect(sheet.rows.map((row) => row.cells)).toEqual([
      ["SLP835", null, null],
      [null, "x", 12],
    ]);
  });

  it("una hoja vacía no tiene encabezados", () => {
    expect(sheetFromMatrix([])).toEqual({ headers: [], rows: [] });
    expect(sheetFromMatrix([[null], [""]])).toEqual({ headers: [], rows: [] });
  });
});
