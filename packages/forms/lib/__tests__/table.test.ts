import type { TableConfig } from "@/convex/lib/form_types";
import { describe, expect, it } from "vitest";
import {
  addRow,
  canAddRow,
  canRemoveRow,
  cellValue,
  countFilledRows,
  ensureRows,
  isEmptyRow,
  maximumRows,
  minimumRows,
  nextRowId,
  removeRow,
  setCell,
} from "../table";

const config = (extras: Partial<TableConfig> = {}): TableConfig => ({
  rowLabel: "Elemento",
  columns: [
    { id: "cantidad", label: "Cantidad", type: "number", required: true },
    { id: "detalle", label: "Detalle", type: "text", required: true },
    { id: "talla", label: "Talla", type: "text", required: false },
  ],
  ...extras,
});

describe("cuántas filas tiene una tabla", () => {
  it("nace con las filas mínimas que pide", () => {
    const rows = ensureRows(undefined, config({ minRows: 2 }), false);
    expect(rows.map((row) => row.rowId)).toEqual(["fila-1", "fila-2"]);
    expect(rows.every(isEmptyRow)).toBe(true);
  });

  it("una tabla obligatoria nace con una fila aunque no pida mínimo", () => {
    expect(ensureRows(undefined, config(), true)).toHaveLength(1);
    expect(minimumRows(config(), true)).toBe(1);
  });

  it("una tabla opcional sin mínimo nace vacía", () => {
    expect(ensureRows(undefined, config(), false)).toEqual([]);
  });

  it("conserva las filas que ya hay y completa hasta el mínimo", () => {
    const existing = [
      { rowId: "fila-4", cells: [{ columnId: "detalle", value: "Casco" }] },
    ];
    const rows = ensureRows(existing, config({ minRows: 2 }), true);
    expect(rows.map((row) => row.rowId)).toEqual(["fila-4", "fila-5"]);
    expect(cellValue(rows[0], "detalle")).toBe("Casco");
  });

  it("descarta lo que no tiene forma de fila", () => {
    const rows = ensureRows(
      [{ rowId: "fila-1", cells: [] }, "basura", null, { rowId: 3 }],
      config(),
      false,
    );
    expect(rows).toEqual([{ rowId: "fila-1", cells: [] }]);
  });

  it("el tope nunca pasa del límite del formato", () => {
    expect(maximumRows(config({ maxRows: 3 }))).toBe(3);
    expect(maximumRows(config({ maxRows: 5000 }))).toBe(100);
    expect(maximumRows(config())).toBe(100);
  });
});

describe("añadir y quitar filas", () => {
  it("añade al final con un id que no existe", () => {
    const rows = addRow(
      [
        { rowId: "fila-1", cells: [] },
        { rowId: "fila-3", cells: [] },
      ],
      config(),
    );
    expect(rows.map((row) => row.rowId)).toEqual([
      "fila-1",
      "fila-3",
      "fila-4",
    ]);
  });

  it("no reutiliza el id de una fila quitada si queda una posterior", () => {
    expect(nextRowId([{ rowId: "fila-2", cells: [] }])).toBe("fila-3");
    expect(nextRowId([])).toBe("fila-1");
  });

  it("no añade por encima del máximo", () => {
    const full = ensureRows(
      undefined,
      config({ minRows: 2, maxRows: 2 }),
      true,
    );
    expect(canAddRow(full, config({ maxRows: 2 }))).toBe(false);
    expect(addRow(full, config({ maxRows: 2 }))).toHaveLength(2);
  });

  it("no quita por debajo del mínimo", () => {
    const rows = ensureRows(undefined, config({ minRows: 1 }), true);
    expect(canRemoveRow(rows, config({ minRows: 1 }), true)).toBe(false);
    expect(removeRow(rows, config({ minRows: 1 }), true, "fila-1")).toEqual(
      rows,
    );
  });

  it("quita la fila pedida y deja las demás como estaban", () => {
    const rows = [
      { rowId: "fila-1", cells: [{ columnId: "detalle", value: "Casco" }] },
      { rowId: "fila-2", cells: [{ columnId: "detalle", value: "Botas" }] },
    ];
    expect(removeRow(rows, config({ minRows: 1 }), true, "fila-1")).toEqual([
      rows[1],
    ]);
  });

  it("una tabla opcional se puede quedar sin filas", () => {
    const rows = [{ rowId: "fila-1", cells: [] }];
    expect(removeRow(rows, config(), false, "fila-1")).toEqual([]);
  });
});

describe("cambiar una celda", () => {
  const rows = [
    { rowId: "fila-1", cells: [{ columnId: "detalle", value: "Casco" }] },
    { rowId: "fila-2", cells: [] },
  ];

  it("escribe la celda sin tocar las otras filas", () => {
    const next = setCell(rows, config(), "fila-2", "cantidad", 3);
    expect(next[0]).toBe(rows[0]);
    expect(next[1].cells).toEqual([{ columnId: "cantidad", value: 3 }]);
  });

  it("deja las celdas en el orden de las columnas", () => {
    const next = setCell(rows, config(), "fila-1", "cantidad", 2);
    expect(next[0].cells.map((cell) => cell.columnId)).toEqual([
      "cantidad",
      "detalle",
    ]);
  });

  it("una celda que queda vacía desaparece de su fila", () => {
    const next = setCell(rows, config(), "fila-1", "detalle", "  ");
    expect(next[0].cells).toEqual([]);
    expect(isEmptyRow(next[0])).toBe(true);
  });

  it("una casilla sin marcar es una respuesta, no un vacío", () => {
    const next = setCell(rows, config(), "fila-2", "talla", false);
    expect(cellValue(next[1], "talla")).toBe(false);
  });

  it("no muta las filas que recibe", () => {
    setCell(rows, config(), "fila-1", "detalle", "Guantes");
    expect(cellValue(rows[0], "detalle")).toBe("Casco");
  });
});

describe("filas llenas", () => {
  it("sólo cuentan las que tienen algo escrito", () => {
    expect(
      countFilledRows([
        { rowId: "fila-1", cells: [{ columnId: "detalle", value: "Casco" }] },
        { rowId: "fila-2", cells: [] },
        { rowId: "fila-3", cells: [{ columnId: "talla", value: "" }] },
      ]),
    ).toBe(1);
  });
});
