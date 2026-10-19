import { describe, expect, it } from "vitest";

import {
  checklistField,
  field,
  oneSection,
  referenceField,
  rule,
  selectField,
  signatureField,
  when,
} from "@/convex/lib/__tests__/form.fixtures";
import type { FormSection } from "@/convex/lib/form_types";

import type { ImportCell } from "../import-cells";
import { BLANK_CHOICE } from "../import-mapping";
import {
  type ImportPlan,
  batchesOf,
  buildRows,
  groupProblems,
  summarizeRows,
} from "../import-rows";
import type { ImportSheet } from "../import-sheet";

const TODAY = "2026-10-10";

const INSPECTION: FormSection[] = oneSection(
  referenceField("vehiculo", "listado", [], {
    label: "Vehículo",
    required: true,
  }),
  field("km", { type: "number", label: "Kilometraje", required: true }),
  selectField("turno", ["Día", "Noche"], { label: "Turno" }),
  field("novedad", {
    label: "Novedad",
    config: { visibility: when(rule("turno", "eq", "Noche")) },
  }),
  checklistField("revision", { label: "Revisión", required: true }),
  signatureField("firma", "author", { label: "Firma", required: true }),
);

const sheet = (...rows: ImportCell[][]): ImportSheet => ({
  headers: ["Fecha", "Placa", "Km", "Turno", "Novedad", "Aceite"],
  rows: rows.map((cells, index) => ({ line: index + 2, cells })),
});

const plan = (extra: Partial<ImportPlan> = {}): ImportPlan => ({
  kind: "record",
  sections: INSPECTION,
  dateColumn: 0,
  mapping: {
    1: "vehiculo",
    2: "km",
    3: "turno",
    4: "novedad",
    5: "revision::aceite",
  },
  valueMaps: {
    vehiculo: { slp835: "entry1" },
    turno: { dia: "Día", noche: "Noche", "n/d": BLANK_CHOICE },
    "revision::aceite": { si: "b", no: "m" },
  },
  ...extra,
});

describe("buildRows en un formato", () => {
  it("arma lo que se envía, sin exigir firma ni la lista completa", () => {
    const [row] = buildRows(
      sheet(["3/11/2025", "SLP835", "1.200", "Noche", "Ruido", "No"]),
      plan(),
      TODAY,
    );
    expect(row).toEqual({
      line: 2,
      date: "2025-11-03",
      problems: [],
      warnings: [],
      values: [
        {
          fieldId: "vehiculo",
          value: {
            kind: "reference",
            responseId: "entry1",
            label: "",
            snapshot: [],
          },
        },
        { fieldId: "km", value: { kind: "number", value: 1200 } },
        { fieldId: "turno", value: { kind: "text", value: "Noche" } },
        { fieldId: "novedad", value: { kind: "text", value: "Ruido" } },
        {
          fieldId: "revision",
          value: {
            kind: "checklist",
            items: [{ itemId: "aceite", value: "m" }],
          },
        },
      ],
    });
  });

  it("poda lo que el formato oculta, como hará el servidor", () => {
    const [row] = buildRows(
      sheet(["2025-11-03", "slp835", 10, "Día", "No debería guardarse", null]),
      plan(),
      TODAY,
    );
    expect(row.problems).toEqual([]);
    expect(row.values.map((value) => value.fieldId)).toEqual([
      "vehiculo",
      "km",
      "turno",
    ]);
  });

  it("dice por qué una fila se queda fuera", () => {
    const rows = buildRows(
      sheet(
        [null, "SLP835", 10, null, null, null],
        ["mañana", "SLP835", 10, null, null, null],
        ["2099-01-01", "SLP835", 10, null, null, null],
        ["2025-11-03", "ZZZ999", "mucho", "Tarde", null, "Regular"],
        ["2025-11-03", null, null, null, null, null],
      ),
      plan(),
      TODAY,
    );
    expect(rows.map((row) => row.problems)).toEqual([
      ["Falta la fecha del hecho"],
      ["La fecha del hecho «mañana» no es una fecha"],
      ["La fecha del hecho es posterior a hoy"],
      [
        "«Vehículo»: «ZZZ999» no corresponde a ningún elemento del listado",
        "«Kilometraje»: «mucho» no es un número",
        "«Turno»: «Tarde» no corresponde a ninguna opción",
        "«Revisión › Aceite de motor»: «Regular» no corresponde a ninguna opción",
      ],
      ["Falta «Vehículo», «Kilometraje»"],
    ]);
    expect(summarizeRows(rows)).toEqual({ ready: 0, rejected: 5, warned: 0 });
    expect(groupProblems(rows).at(-1)).toEqual({
      message: "Falta «Vehículo», «Kilometraje»",
      lines: [6],
    });
  });

  it("un valor que se deja vacío a propósito no deja la fila fuera", () => {
    const [row] = buildRows(
      sheet(["2025-11-03", "SLP835", 10, "N/D", null, null]),
      plan(),
      TODAY,
    );
    expect(row.problems).toEqual([]);
    expect(row.values.map((value) => value.fieldId)).toEqual([
      "vehiculo",
      "km",
    ]);
  });

  it("aplica las reglas de cada valor: fuera de rango", () => {
    const sections = oneSection(
      field("km", { type: "number", label: "Km", config: { minValue: 0 } }),
    );
    const [row] = buildRows(
      {
        headers: ["Fecha", "Km"],
        rows: [{ line: 2, cells: ["2025-11-03", -5] }],
      },
      {
        kind: "record",
        sections,
        dateColumn: 0,
        mapping: { 1: "km" },
        valueMaps: {},
      },
      TODAY,
    );
    expect(row.problems).toHaveLength(1);
    expect(row.problems[0]).toContain("«Km»");
  });

  it("dos filas idénticas entran las dos, con aviso", () => {
    const cells: ImportCell[] = ["2025-11-03", "SLP835", 10, null, null, null];
    const rows = buildRows(sheet(cells, [...cells], [...cells]), plan(), TODAY);
    expect(rows.map((row) => [row.problems, row.warnings])).toEqual([
      [[], []],
      [[], ["Es idéntica a la fila 2"]],
      [[], ["Es idéntica a la fila 2"]],
    ]);
    expect(summarizeRows(rows)).toEqual({ ready: 3, rejected: 0, warned: 2 });
  });

  it("sin columnas asignadas, la fila no trae nada", () => {
    const sections = oneSection(field("nota", { label: "Nota" }));
    const [row] = buildRows(
      { headers: ["Fecha"], rows: [{ line: 2, cells: ["2025-11-03"] }] },
      { kind: "record", sections, dateColumn: 0, mapping: {}, valueMaps: {} },
      TODAY,
    );
    expect(row.problems).toEqual([
      "La fila no trae ningún dato de las columnas asignadas",
    ]);
  });
});

describe("buildRows en un listado", () => {
  const VEHICLES = oneSection(
    field("placa", { label: "Placa", required: true }),
    field("vence", { type: "date", label: "Vigencia del SOAT" }),
    field("foto", { type: "image", label: "Foto", required: true }),
  );
  const catalog: ImportPlan = {
    kind: "catalog",
    sections: VEHICLES,
    titleFieldId: "placa",
    dateColumn: null,
    mapping: { 0: "placa", 1: "vence" },
    valueMaps: {},
  };
  const rows = (...cells: ImportCell[][]): ImportSheet => ({
    headers: ["Placa", "Vence"],
    rows: cells.map((row, index) => ({ line: index + 2, cells: row })),
  });

  it("no pide fecha del hecho ni la foto", () => {
    const [row] = buildRows(rows(["SLP835", "1/03/2027"]), catalog, TODAY);
    expect(row).toMatchObject({
      problems: [],
      values: [
        { fieldId: "placa", value: { kind: "text", value: "SLP835" } },
        { fieldId: "vence", value: { kind: "text", value: "2027-03-01" } },
      ],
    });
    expect(row.date).toBeUndefined();
  });

  it("un título repetido en el archivo se dice, y entra el primero", () => {
    const built = buildRows(
      rows(["Camión 1", null], ["CAMION 1 ", null], [null, "2027-01-01"]),
      catalog,
      TODAY,
    );
    expect(built.map((row) => row.problems)).toEqual([
      [],
      ["«Placa» repite el de la fila 2: cada elemento va una vez"],
      ["Falta «Placa»"],
    ]);
  });
});

describe("batchesOf", () => {
  it("parte en lotes del tamaño pedido", () => {
    expect(batchesOf([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(batchesOf([], 2)).toEqual([]);
  });
});
