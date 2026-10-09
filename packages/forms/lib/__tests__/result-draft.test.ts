import {
  checklistField,
  field,
  referenceField,
  selectField,
} from "@/convex/lib/__tests__/form.fixtures";
import { resultProblem } from "@/convex/lib/result_definition";
import type { ResultConfig } from "@/convex/lib/result_types";
import { describe, expect, it } from "vitest";

import {
  draftConfig,
  draftFromResult,
  emptyMeasure,
  emptyResultDraft,
  removeTerm,
  withHeatValue,
  withOperation,
} from "../result-draft";

const FIELDS = [
  referenceField("vehiculo", "vehiculos", [], { label: "Vehículo" }),
  selectField("turno", ["dia", "noche"], { label: "Turno" }),
  field("km", { type: "number", label: "Kilometraje" }),
  checklistField("estado", { label: "Estado" }),
];

describe("emptyResultDraft", () => {
  it("un resultado nuevo ya es válido: cuenta respuestas", () => {
    const draft = emptyResultDraft("record", FIELDS);
    expect(draftConfig(draft)).toEqual({
      type: "indicator",
      measure: { operation: "count" },
    });
    expect(resultProblem(draftConfig(draft), "record", FIELDS)).toBeNull();
  });

  it("en un listado sólo caben los vencimientos, con sus fechas elegidas", () => {
    const dates = [field("soat", { type: "date" }), field("placa")];
    expect(draftConfig(emptyResultDraft("catalog", dates))).toEqual({
      type: "expirations",
      dateFieldIds: ["soat"],
    });
  });
});

describe("draftConfig y draftFromResult", () => {
  const configs: ResultConfig[] = [
    { type: "indicator", measure: { operation: "last", fieldId: "km" } },
    { type: "trend", measure: { operation: "count" }, interval: "month" },
    {
      type: "distribution",
      byFieldId: "turno",
      measure: { operation: "count" },
    },
    {
      type: "table",
      byFieldId: "vehiculo",
      measures: [{ operation: "count" }, { operation: "max", fieldId: "km" }],
    },
    { type: "compliance", checklistFieldId: "estado", interval: "week" },
    { type: "findings", checklistFieldId: "estado" },
    {
      type: "heatmap",
      rowFieldId: "vehiculo",
      value: "failures",
      valueFieldId: "estado",
    },
    { type: "heatmap", rowFieldId: "vehiculo", value: "count" },
    {
      type: "indicator",
      measure: {
        operation: "formula",
        terms: [
          { type: "agg", operation: "sum", fieldId: "km" },
          { type: "op", op: "/" },
          { type: "agg", operation: "count" },
        ],
        unit: "km",
        decimals: 2,
      },
      goal: { value: 80, direction: "max" },
      compare: true,
      filters: [{ fieldId: "turno", operator: "eq", values: ["dia"] }],
    },
    {
      type: "trend",
      measure: { operation: "sum", fieldId: "km", label: "Recorrido" },
      interval: "week",
      series: [{ operation: "count", label: "Inspecciones" }],
    },
    {
      type: "composite",
      terms: [
        { type: "result", resultId: "a" },
        { type: "op", op: "/" },
        { type: "result", resultId: "b" },
      ],
      unit: "%",
    },
  ];

  it.each(configs.map((config) => [config.type, config] as const))(
    "%s: lo guardado vuelve a ser lo mismo al reabrirlo",
    (_type, config) => {
      const draft = draftFromResult(
        { name: "Mi resultado", config },
        "record",
        FIELDS,
      );
      expect(draftConfig(draft)).toEqual(config);
      expect(resultProblem(config, "record", FIELDS)).toBeNull();
    },
  );
});

describe("cambios dentro del editor", () => {
  it("al pasar de contar a sumar se elige un campo numérico", () => {
    const counted = emptyMeasure();
    expect(withOperation(counted, "sum", FIELDS)).toMatchObject({
      operation: "sum",
      fieldId: "km",
    });
    expect(
      withOperation(
        { ...counted, operation: "sum", fieldId: "km" },
        "count",
        FIELDS,
      ),
    ).toEqual(counted);
  });

  it("una fórmula nueva parte de lo que la medida ya decía", () => {
    const summed = { ...emptyMeasure("sum"), fieldId: "km" };
    expect(withOperation(summed, "formula", FIELDS).terms).toEqual([
      { type: "agg", operation: "sum", fieldId: "km" },
    ]);
  });

  it("quitar un operando se lleva el operador que lo unía", () => {
    const terms = ["a", "+", "b", "/", "c"];
    expect(removeTerm(terms, 0)).toEqual(["b", "/", "c"]);
    expect(removeTerm(terms, 2)).toEqual(["a", "/", "c"]);
    expect(removeTerm(terms, 4)).toEqual(["a", "+", "b"]);
  });

  it("el mapa de calor cambia de campo con lo que mide", () => {
    const draft = emptyResultDraft("record", FIELDS);
    expect(withHeatValue(draft, "sum", FIELDS).valueFieldId).toBe("km");
    expect(withHeatValue(draft, "failures", FIELDS).valueFieldId).toBe(
      "estado",
    );
    expect(withHeatValue(draft, "count", FIELDS).valueFieldId).toBeNull();
  });
});
