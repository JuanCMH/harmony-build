import { describe, expect, it } from "vitest";

import {
  checklistField,
  field,
  oneSection,
  referenceField,
  selectField,
  signatureField,
  tableField,
} from "@/convex/lib/__tests__/form.fixtures";

import {
  BLANK_CHOICE,
  assignColumn,
  choicesOf,
  distinctValues,
  entryChoices,
  groupChoices,
  groupValues,
  mappedColumns,
  needsValueMap,
  resolveValueMap,
  suggestDateColumn,
  suggestMapping,
  suggestValueMap,
  targetsOf,
  valueGroups,
  valueMapsByTarget,
} from "../import-mapping";
import type { ImportRow } from "../import-sheet";

const SECTIONS = oneSection(
  referenceField("vehiculo", "listado", [], { label: "Vehículo" }),
  field("km", { type: "number", label: "Kilometraje" }),
  selectField("turno", ["Día", "Noche"], { label: "Turno" }),
  field("total", {
    type: "number",
    label: "Total",
    config: { computed: { kind: "arithmetic", operands: ["km"], op: "+" } },
  }),
  checklistField("revision", { label: "Revisión" }),
  signatureField("firma", "author", { label: "Firma" }),
  tableField("entrega", { label: "Entrega" }),
);

const targets = targetsOf(SECTIONS);
const byKey = (key: string) => {
  const target = targets.find((candidate) => candidate.key === key);
  if (!target) throw new Error(`Sin destino ${key}`);
  return target;
};
const rows = (...cells: (string | null)[]): ImportRow[] =>
  cells.map((cell, index) => ({ line: index + 2, cells: [cell] }));

describe("targetsOf", () => {
  it("ofrece los campos que un archivo puede traer, y los ítems de la lista", () => {
    expect(targets.map((target) => target.key)).toEqual([
      "vehiculo",
      "km",
      "turno",
      "revision::aceite",
      "revision::refrigerante",
      "revision::altas",
      "revision::medias",
    ]);
    expect(byKey("revision::altas").label).toBe("Revisión › Altas");
  });
});

describe("suggestMapping", () => {
  it("propone por nombre, sin mayúsculas ni tildes", () => {
    expect(
      suggestMapping(
        [
          "Marca temporal",
          "VEHICULO",
          "kilometraje ",
          "Aceite de motor",
          "Otra",
        ],
        targets,
      ),
    ).toEqual({ 1: "vehiculo", 2: "km", 3: "revision::aceite" });
  });

  it("acepta el nombre completo de un ítem y no reparte un destino dos veces", () => {
    expect(
      suggestMapping(["Revisión › Altas", "Altas", "Turno", "turno"], targets),
    ).toEqual({ 0: "revision::altas", 2: "turno" });
  });

  it("no propone un nombre que comparten dos destinos", () => {
    const twin = targetsOf(
      oneSection(
        checklistField("a", { label: "Antes" }),
        checklistField("b", { label: "Después" }),
      ),
    );
    expect(suggestMapping(["Altas", "Antes › Altas"], twin)).toEqual({
      1: "a::altas",
    });
  });
});

describe("assignColumn", () => {
  it("mueve el destino de columna y suelta una columna", () => {
    expect(assignColumn({ 0: "km", 1: "turno" }, 2, "km")).toEqual({
      1: "turno",
      2: "km",
    });
    expect(assignColumn({ 0: "km", 1: "turno" }, 0, null)).toEqual({
      1: "turno",
    });
  });
});

describe("suggestDateColumn", () => {
  it("prefiere el nombre más reconocible", () => {
    expect(suggestDateColumn(["Placa", "Fecha de vencimiento", "Fecha"])).toBe(
      2,
    );
    expect(suggestDateColumn(["Marca temporal", "Placa"])).toBe(0);
    expect(suggestDateColumn(["Placa", "Fecha de ingreso"])).toBe(1);
    expect(suggestDateColumn(["Placa", "Km"])).toBeNull();
  });
});

describe("distinctValues", () => {
  it("agrupa lo que se escribió de varias maneras y cuenta", () => {
    expect(
      distinctValues(
        rows("SLP835", "slp835 ", null, "TRK402", "  ", "Slp835"),
        0,
        byKey("vehiculo"),
      ),
    ).toEqual([
      { key: "slp835", text: "SLP835", count: 3 },
      { key: "trk402", text: "TRK402", count: 1 },
    ]);
  });

  it("parte las celdas de una lista múltiple", () => {
    const multi = targetsOf(
      oneSection(
        field("epp", {
          type: "multiSelect",
          label: "EPP",
          config: { options: [{ label: "Casco", value: "casco" }] },
        }),
      ),
    )[0];
    expect(
      distinctValues(rows("Casco, Botas", "botas; Guantes"), 0, multi).map(
        (value) => [value.text, value.count],
      ),
    ).toEqual([
      ["Botas", 2],
      ["Casco", 1],
      ["Guantes", 1],
    ]);
  });
});

describe("suggestValueMap", () => {
  it("un valor va a la opción que se llama igual", () => {
    const target = byKey("turno");
    expect(needsValueMap(target)).toBe(true);
    expect(needsValueMap(byKey("km"))).toBe(false);
    expect(
      suggestValueMap(
        distinctValues(rows("dia", "NOCHE", "tarde"), 0, target),
        choicesOf(target),
      ),
    ).toEqual({ dia: "Día", noche: "Noche" });
  });

  it("una escala se reconoce por su letra y por su sentido", () => {
    const target = byKey("revision::aceite");
    expect(
      suggestValueMap(
        distinctValues(
          rows("Bueno", "M", "N/A", "Cumple", "No cumple", "regular"),
          0,
          target,
        ),
        choicesOf(target),
      ),
    ).toEqual({
      bueno: "b",
      m: "m",
      "n/a": "na",
      cumple: "b",
      "no cumple": "m",
    });
  });

  it("el sentido no se adivina si dos opciones lo comparten", () => {
    const target = targetsOf(
      oneSection(
        checklistField(
          "lista",
          {},
          {
            options: [
              { value: "b", label: "Bueno", short: "B", meaning: "ok" },
              { value: "e", label: "Excelente", short: "E", meaning: "ok" },
              { value: "no", label: "No", short: "N", meaning: "fail" },
            ],
          },
        ),
      ),
    )[0];
    expect(
      suggestValueMap(
        distinctValues(rows("Cumple", "No", "No cumple"), 0, target),
        choicesOf(target),
      ),
    ).toEqual({ no: "no", "no cumple": "no" });
  });

  it("una relación coincide sin espacios ni signos, si es la única", () => {
    const choices = entryChoices([
      { _id: "e1", title: "SLP-835" },
      { _id: "e2", title: "TRK 402" },
      { _id: "e3", title: "TRK-402" },
    ]);
    expect(
      suggestValueMap(
        distinctValues(
          rows("slp835", "TRK402", "trk 402"),
          0,
          byKey("vehiculo"),
        ),
        choices,
      ),
    ).toEqual({ slp835: "e1", "trk 402": "e2" });
    expect(BLANK_CHOICE).toBe("@blank");
  });
});

describe("valueGroups", () => {
  const mapped = mappedColumns(
    {
      5: "revision::altas",
      0: "vehiculo",
      1: "km",
      2: "turno",
      4: "revision::aceite",
      9: "ya no existe",
    },
    targets,
  );

  it("las columnas asignadas salen en el orden del archivo", () => {
    expect(mapped.map((entry) => entry.column)).toEqual([0, 1, 2, 4, 5]);
  });

  it("los ítems de una lista forman un solo grupo, con su escala", () => {
    const groups = valueGroups(mapped);
    expect(
      groups.map((group) => [group.key, group.columns.length, group.catalogId]),
    ).toEqual([
      ["vehiculo", 1, "listado"],
      ["turno", 1, null],
      ["revision", 2, null],
    ]);
    expect(groupChoices(groups[2]).map((choice) => choice.value)).toEqual([
      "b",
      "m",
      "na",
    ]);
  });

  it("suma los valores de todas las columnas del grupo", () => {
    const group = valueGroups(mapped)[2];
    const sheet: ImportRow[] = [
      { line: 2, cells: [null, null, null, null, "Sí", "No"] },
      { line: 3, cells: [null, null, null, null, "si", "SI"] },
    ];
    expect(
      groupValues(sheet, group).map((value) => [value.text, value.count]),
    ).toEqual([
      ["Sí", 3],
      ["No", 1],
    ]);
  });

  it("lo corregido manda sobre lo propuesto, y lo vacío lo quita", () => {
    expect(
      resolveValueMap({ si: "b", no: "m" }, { no: "", regular: "m" }),
    ).toEqual({ si: "b", regular: "m" });
    expect(resolveValueMap({ si: "b" }, undefined)).toEqual({ si: "b" });
  });

  it("cada destino recibe la correspondencia de su grupo", () => {
    const groups = valueGroups(mapped);
    expect(
      valueMapsByTarget(groups, {
        revision: { si: "b" },
        turno: { dia: "Día" },
      }),
    ).toEqual({
      vehiculo: {},
      turno: { dia: "Día" },
      "revision::aceite": { si: "b" },
      "revision::altas": { si: "b" },
    });
  });
});
