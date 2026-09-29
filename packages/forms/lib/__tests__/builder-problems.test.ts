import { describe, expect, it } from "vitest";

import { formProblems, formsErrors } from "@/convex/lib/error_messages";
import type { FormField, FormSection } from "@/convex/lib/form_types";

import {
  builderProblems,
  countProblems,
  typeConfigProblems,
} from "../builder-problems";
import { newField } from "../field-defaults";

const section = (fields: FormField[]): FormSection => ({
  id: "s1",
  label: "General",
  order: 1,
  fields,
});

const text = (id: string, label = id): FormField => ({
  ...newField("text", label),
  id,
});

describe("builderProblems", () => {
  it("un formato sin campos se guarda pero no se publica", () => {
    const problems = builderProblems([section([])], { kind: "record" });
    expect(problems.save).toEqual([]);
    expect(problems.publish).toEqual([formsErrors.emptyForm]);
  });

  it("un listado sin título no se publica", () => {
    const problems = builderProblems([section([text("a", "Placa")])], {
      kind: "catalog",
    });
    expect(problems.publish).toEqual([formsErrors.titleFieldRequired]);
    expect(
      builderProblems([section([{ ...text("a", "Placa"), required: true }])], {
        kind: "catalog",
        titleFieldId: "a",
      }).publish,
    ).toEqual([]);
  });

  it("enseña todos los problemas, con su sitio", () => {
    const problems = builderProblems(
      [section([text("a", ""), text("b", "")])],
      { kind: "record" },
    );
    expect(problems.save).toHaveLength(2);
    expect(problems.save[0].message).toBe(formProblems.labelRequired);
    expect(problems.save[0].location).toBe("General");
  });
});

describe("typeConfigProblems", () => {
  it("dice lo que le falta a una lista de chequeo recién creada, sin repetir", () => {
    const field = newField("checklist", "Inspección");
    expect(typeConfigProblems(field, "record")).toEqual([
      formProblems.checklistNoItems,
    ]);
  });

  it("una relación sin listado", () => {
    expect(
      typeConfigProblems(newField("reference", "Vehículo"), "record"),
    ).toEqual([formProblems.referenceFormRequired]);
  });

  it("una firma por fila no cabe en un listado", () => {
    const field = newField("table", "Entregas");
    const table = field.config.table;
    if (!table) throw new Error("sin tabla");
    const withSignature: FormField = {
      ...field,
      config: {
        table: {
          ...table,
          columns: [{ ...table.columns[0], type: "signature" }],
        },
      },
    };
    expect(typeConfigProblems(withSignature, "catalog")).toContain(
      formProblems.typeNotAllowed,
    );
    expect(typeConfigProblems(withSignature, "record")).toEqual([]);
  });
});

describe("countProblems", () => {
  it("en singular y en plural", () => {
    expect(countProblems(1)).toBe("1 problema");
    expect(countProblems(3)).toBe("3 problemas");
  });
});
