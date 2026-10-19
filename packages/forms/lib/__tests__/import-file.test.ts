import { Workbook } from "exceljs";
import { describe, expect, it } from "vitest";

import {
  fileProblem,
  fingerprintOf,
  readImportFile,
  sheetProblem,
} from "../import-file";

async function xlsx(rows: unknown[][]): Promise<File> {
  const workbook = new Workbook();
  workbook.addWorksheet("Vacía");
  const sheet = workbook.addWorksheet("Respuestas");
  for (const row of rows) sheet.addRow(row);
  const buffer = await workbook.xlsx.writeBuffer();
  return new File([buffer], "historia.xlsx");
}

describe("fileProblem", () => {
  it("admite .xlsx y .csv dentro del tamaño", () => {
    expect(fileProblem({ name: "Historia.XLSX", size: 1000 })).toBeNull();
    expect(fileProblem({ name: "historia.csv", size: 1000 })).toBeNull();
    expect(fileProblem({ name: "historia.xls", size: 1000 })).toContain(
      ".xlsx",
    );
    expect(fileProblem({ name: "historia.pdf", size: 1000 })).toContain(".csv");
    expect(
      fileProblem({ name: "historia.csv", size: 11 * 1024 * 1024 }),
    ).toContain("10 MB");
  });
});

describe("readImportFile", () => {
  it("lee un .xlsx con sus tipos, desde la primera hoja con datos", async () => {
    const file = await xlsx([
      ["Marca temporal", "Placa", "Km", "Aprobado"],
      [new Date("2025-11-03T07:15:00Z"), "SLP835", 1200.5, true],
      [],
      [
        new Date("2025-11-04T00:00:00Z"),
        "TRK402",
        { formula: "C2*2", result: 2401 },
      ],
    ]);
    const sheet = await readImportFile(file);

    expect(sheet.headers).toEqual([
      "Marca temporal",
      "Placa",
      "Km",
      "Aprobado",
    ]);
    expect(sheet.rows.map((row) => row.line)).toEqual([2, 4]);
    expect(sheet.rows[0].cells).toEqual([
      new Date("2025-11-03T07:15:00Z"),
      "SLP835",
      1200.5,
      true,
    ]);
    expect(sheet.rows[1].cells.slice(1)).toEqual(["TRK402", 2401, null]);
    expect(sheetProblem(sheet)).toBeNull();
  });

  it("lee un .csv con separador de punto y coma y tildes en Latin-1", async () => {
    const latin1 = Uint8Array.from(
      [..."Placa;Descripción\nSLP835;Camión 1\n"].map((c) => c.charCodeAt(0)),
    );
    const sheet = await readImportFile(new File([latin1], "listado.csv"));
    expect(sheet.headers).toEqual(["Placa", "Descripción"]);
    expect(sheet.rows).toEqual([{ line: 2, cells: ["SLP835", "Camión 1"] }]);
  });

  it("dice cuándo no hay nada que importar", async () => {
    expect(
      sheetProblem(await readImportFile(new File([""], "vacio.csv"))),
    ).toBe("El archivo está vacío");
    expect(
      sheetProblem(await readImportFile(new File(["Placa,Km\n"], "solo.csv"))),
    ).toBe("El archivo sólo trae la fila de encabezados");
  });
});

describe("fingerprintOf", () => {
  it("es la misma para el mismo contenido y distinta para otro", async () => {
    const a = await fingerprintOf(new File(["Placa,Km\n"], "a.csv"));
    const b = await fingerprintOf(new File(["Placa,Km\n"], "b.csv"));
    const c = await fingerprintOf(new File(["Placa;Km\n"], "c.csv"));
    expect(a).toHaveLength(64);
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });
});
