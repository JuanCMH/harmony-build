import {
  checklistSummaryText,
  summarizeChecklist,
} from "@/convex/lib/checklist_summary";
import type {
  ChecklistConfig,
  FieldType,
  FormField,
  FormSection,
} from "@/convex/lib/form_types";
import { describe, expect, it } from "vitest";
import {
  cellParts,
  checklistCellText,
  entryColumns,
  loadedCountText,
  parseChecklistSummary,
  phoneRowDetails,
  responseCells,
  responseColumns,
} from "../response-columns";

const field = (
  id: string,
  type: FieldType,
  showInTable: boolean,
): FormField => ({
  id,
  type,
  label: `Campo ${id}`,
  required: false,
  size: "medium",
  showInTable,
  config: {},
});

const section = (
  id: string,
  order: number,
  fields: FormField[],
): FormSection => ({ id, label: id, order, fields });

describe("los encabezados del listado", () => {
  it("son los campos que se muestran como columna, en el orden del formato", () => {
    const sections = [
      section("b", 2, [field("hallazgos", "checklist", true)]),
      section("a", 1, [
        field("placa", "reference", true),
        field("nota", "textarea", false),
        field("km", "number", true),
      ]),
    ];
    expect(responseColumns(sections)).toEqual([
      { fieldId: "placa", label: "Campo placa", type: "reference" },
      { fieldId: "km", label: "Campo km", type: "number" },
      { fieldId: "hallazgos", label: "Campo hallazgos", type: "checklist" },
    ]);
  });

  it("en un listado, el campo de título no se repite como columna", () => {
    const sections = [
      section("a", 1, [
        field("placa", "text", true),
        field("soat", "text", true),
      ]),
    ];
    expect(
      entryColumns(sections, "placa").map((column) => column.fieldId),
    ).toEqual(["soat"]);
    expect(entryColumns(sections, undefined)).toHaveLength(2);
  });
});

describe("el resumen de una lista de chequeo, leído de su texto", () => {
  it("saca las cifras de lo que escribe el servidor", () => {
    expect(
      parseChecklistSummary("61 conformes · 2 no conformes · 0 no aplica"),
    ).toEqual({ ok: 61, fail: 2, na: 0, unanswered: 0 });
  });

  it("entiende el singular y lo que quedó sin responder", () => {
    expect(
      parseChecklistSummary(
        "1 conforme · 1 no conforme · 3 no aplica · 4 sin responder",
      ),
    ).toEqual({ ok: 1, fail: 1, na: 3, unanswered: 4 });
  });

  it("lo que no es un resumen no se interpreta", () => {
    expect(parseChecklistSummary("")).toBeNull();
    expect(parseChecklistSummary("SLP-835")).toBeNull();
    expect(parseChecklistSummary("2 conformes · algo más")).toBeNull();
  });

  it("lee lo que de verdad produce el módulo del servidor", () => {
    const config: ChecklistConfig = {
      note: "onFail",
      options: [
        { value: "b", label: "Bueno", short: "B", meaning: "ok" },
        { value: "m", label: "Malo", short: "M", meaning: "fail" },
        { value: "na", label: "No aplica", short: "N.A", meaning: "na" },
      ],
      blocks: [
        {
          id: "bloque",
          label: "Niveles",
          items: [
            { id: "aceite", label: "Aceite" },
            { id: "agua", label: "Agua" },
            { id: "frenos", label: "Líquido de frenos" },
          ],
        },
      ],
    };
    const written = checklistSummaryText(
      summarizeChecklist(config, [
        { itemId: "aceite", value: "b" },
        { itemId: "agua", value: "m", note: "Fuga" },
      ]),
    );
    expect(parseChecklistSummary(written)).toEqual({
      ok: 1,
      fail: 1,
      na: 0,
      unanswered: 1,
    });
  });
});

describe("la celda de una lista de chequeo", () => {
  it("calla lo que no ocurrió", () => {
    expect(checklistCellText({ ok: 63, fail: 0, na: 0, unanswered: 0 })).toBe(
      "63 conformes",
    );
    expect(checklistCellText({ ok: 61, fail: 2, na: 0, unanswered: 0 })).toBe(
      "61 conformes · 2 no conformes",
    );
  });

  it("dice los conformes aunque sean cero", () => {
    expect(checklistCellText({ ok: 0, fail: 1, na: 2, unanswered: 0 })).toBe(
      "0 conformes · 1 no conforme · 2 no aplica",
    );
  });
});

describe("las celdas de una fila", () => {
  const columns = [
    { fieldId: "placa", label: "Vehículo", type: "reference" as const },
    { fieldId: "km", label: "Kilometraje", type: "number" as const },
    { fieldId: "lista", label: "Inspección", type: "checklist" as const },
  ];

  it("se casan con su encabezado por el campo, no por la posición", () => {
    const cells = responseCells(columns, [
      { fieldId: "km", text: "120.500" },
      { fieldId: "placa", text: "SLP-835" },
    ]);
    expect(cells.map((cell) => cell.text)).toEqual(["SLP-835", "120.500", ""]);
  });

  it("una cifra se alinea como cifra", () => {
    const cells = responseCells(columns, []);
    expect(cells.map((cell) => cell.numeric)).toEqual([false, true, false]);
  });

  it("sólo lleva tinte la lista de chequeo con algún no conforme", () => {
    const withFindings = responseCells(columns, [
      { fieldId: "lista", text: "61 conformes · 2 no conformes · 0 no aplica" },
    ]);
    expect(withFindings[2]).toMatchObject({
      text: "61 conformes · 2 no conformes",
      hasFindings: true,
    });

    // El servidor escribe «0 no conformes»: el texto contiene «no conforme»
    // y la celda no tiene ningún hallazgo.
    const clean = responseCells(columns, [
      { fieldId: "lista", text: "63 conformes · 0 no conformes · 0 no aplica" },
    ]);
    expect(clean[2]).toMatchObject({
      text: "63 conformes",
      hasFindings: false,
    });
  });

  it("un texto que dice «no conforme» en otra columna no se tiñe", () => {
    const cells = responseCells(columns, [
      { fieldId: "placa", text: "2 no conformes" },
    ]);
    expect(cells[0].hasFindings).toBe(false);
    expect(cells[0].text).toBe("2 no conformes");
  });

  it("una respuesta de otra versión deja vacío lo que no tiene", () => {
    const cells = responseCells(columns, [
      { fieldId: "placa", text: "SLP-835" },
      { fieldId: "km", text: "" },
      { fieldId: "lista", text: "" },
    ]);
    expect(cells[2]).toMatchObject({ text: "", hasFindings: false });
  });
});

describe("lo esencial de una fila en el teléfono", () => {
  const cell = (fieldId: string, text: string) => ({
    fieldId,
    label: fieldId,
    text,
    hasFindings: false,
    numeric: false,
  });

  it("son los primeros datos con respuesta", () => {
    const details = phoneRowDetails([
      cell("a", ""),
      cell("b", "B"),
      cell("c", "C"),
      cell("d", "D"),
      cell("e", "E"),
    ]);
    expect(details.map((detail) => detail.fieldId)).toEqual(["b", "c", "d"]);
  });

  it("los hallazgos no se quedan fuera, y el orden se conserva", () => {
    const details = phoneRowDetails([
      cell("a", "A"),
      cell("b", "B"),
      cell("c", "C"),
      { ...cell("d", "61 conformes · 2 no conformes"), hasFindings: true },
    ]);
    expect(details.map((detail) => detail.fieldId)).toEqual(["a", "b", "d"]);
  });
});

describe("el recuento de lo cargado", () => {
  it("con todo a la vista dice cuántas son", () => {
    expect(loadedCountText(1, "record", false)).toBe("1 respuesta");
    expect(loadedCountText(12, "record", false)).toBe("12 respuestas");
    expect(loadedCountText(3, "catalog", false)).toBe("3 elementos");
  });

  it("con más por traer dice que son las cargadas", () => {
    expect(loadedCountText(50, "record", true)).toBe("50 respuestas cargadas");
    expect(loadedCountText(1, "catalog", true)).toBe("1 elemento cargado");
  });
});

describe("los trozos de una celda", () => {
  const cell = (text: string, hasFindings: boolean) => ({
    fieldId: "lista",
    label: "Lista",
    text,
    hasFindings,
    numeric: false,
  });

  it("en rojo va sólo el trozo de los no conformes", () => {
    expect(
      cellParts(cell("61 conformes · 2 no conformes · 1 no aplica", true)),
    ).toEqual([
      { text: "61 conformes", isFinding: false },
      { text: "2 no conformes", isFinding: true },
      { text: "1 no aplica", isFinding: false },
    ]);
    expect(cellParts(cell("0 conformes · 1 no conforme", true))[1]).toEqual({
      text: "1 no conforme",
      isFinding: true,
    });
  });

  it("una celda sin hallazgos no se parte, aunque lleve el separador", () => {
    expect(cellParts(cell("SLP-835 · Camioneta", false))).toEqual([
      { text: "SLP-835 · Camioneta", isFinding: false },
    ]);
  });
});
