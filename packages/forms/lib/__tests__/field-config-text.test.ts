import { describe, expect, it } from "vitest";

import type { FormField } from "@/convex/lib/form_types";

import {
  newChecklistBlock,
  newChecklistItem,
  newField,
} from "../field-defaults";
import { describeTypeConfig, parseOptionalNumber } from "../field-config-text";

const names = new Map([["cat1", "Vehículos"]]);

const withConfig = (
  field: FormField,
  config: FormField["config"],
): FormField => ({
  ...field,
  config: { ...field.config, ...config },
});

describe("describeTypeConfig", () => {
  it("una lista de chequeo: ítems, bloques y escala", () => {
    const field = newField("checklist", "Inspección");
    const checklist = field.config.checklist;
    if (!checklist) throw new Error("sin lista");
    expect(describeTypeConfig(field, names)).toBe("Sin ítems todavía");
    const filled = withConfig(field, {
      checklist: {
        ...checklist,
        blocks: [
          newChecklistBlock("Niveles", [newChecklistItem("Aceite")]),
          newChecklistBlock("Luces", [
            newChecklistItem("Altas"),
            newChecklistItem("Bajas"),
          ]),
        ],
      },
    });
    expect(describeTypeConfig(filled, names)).toBe(
      "3 ítems en 2 bloques · B / M / N.A",
    );
  });

  it("una escala cambiada a mano se lee por sus letras", () => {
    const field = newField("checklist", "Inspección");
    const checklist = field.config.checklist;
    if (!checklist) throw new Error("sin lista");
    const custom = withConfig(field, {
      checklist: {
        ...checklist,
        options: checklist.options.map((option, index) =>
          index === 0 ? { ...option, short: "OK" } : option,
        ),
        blocks: [newChecklistBlock("", [newChecklistItem("Aceite")])],
      },
    });
    expect(describeTypeConfig(custom, names)).toBe("1 ítem · OK / M / N.A");
  });

  it("una tabla: columnas y nombre de la fila", () => {
    expect(describeTypeConfig(newField("table", "Entregas"), names)).toBe(
      "1 columna · cada fila: Fila",
    );
  });

  it("una relación: el listado por su nombre y cuántos datos trae", () => {
    const field = newField("reference", "Vehículo");
    expect(describeTypeConfig(field, names)).toBe("Sin listado elegido");
    expect(
      describeTypeConfig(
        withConfig(field, { reference: { formId: "cat1", fill: ["a", "b"] } }),
        names,
      ),
    ).toBe("Del listado «Vehículos» · trae 2 datos");
    expect(
      describeTypeConfig(
        withConfig(field, { reference: { formId: "otro", fill: [] } }),
        names,
      ),
    ).toBe("De un listado que ya no está publicado");
  });

  it("una firma dice quién firma; un texto no tiene nada que decir", () => {
    expect(describeTypeConfig(newField("signature", "Firma"), names)).toBe(
      "Firma quien diligencia",
    );
    expect(describeTypeConfig(newField("text", "Placa"), names)).toBeNull();
  });
});

describe("parseOptionalNumber", () => {
  it("vacío o no numérico es sin límite", () => {
    expect(parseOptionalNumber("")).toBeUndefined();
    expect(parseOptionalNumber("  ")).toBeUndefined();
    expect(parseOptionalNumber("abc")).toBeUndefined();
  });

  it("trunca cuando se pide un entero", () => {
    expect(parseOptionalNumber("12.7")).toBe(12.7);
    expect(parseOptionalNumber("12.7", true)).toBe(12);
    expect(parseOptionalNumber("-3", true)).toBe(-3);
  });
});
