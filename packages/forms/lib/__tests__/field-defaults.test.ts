import { describe, expect, it } from "vitest";

import {
  FIELD_TYPES,
  type FormField,
  type FormSection,
  FULL_WIDTH_TYPES,
} from "@/convex/lib/form_types";
import { validateForm } from "@/convex/lib/form_validation";

import {
  columnTypeConfig,
  duplicateField,
  duplicateSection,
  newField,
  newOption,
  newSection,
} from "../field-defaults";

describe("newOption", () => {
  it("numera la etiqueta de la siguiente opción", () => {
    expect(newOption([{ label: "Moto", value: "opcion-1" }]).label).toBe(
      "Opción 2",
    );
  });

  it("no reutiliza el valor de una opción borrada", () => {
    // Había tres; se borró la tercera. La nueva no puede volver a ser
    // `opcion-3`: heredaría las reglas y respuestas de la borrada.
    const next = newOption([
      { label: "Bajo", value: "opcion-1" },
      { label: "Medio", value: "opcion-2" },
    ]);
    expect(next.value).not.toBe("opcion-3");
    expect(next.value).toMatch(/^opcion-3-[a-z0-9]+$/);
  });

  it("dos opciones añadidas seguidas no comparten valor", () => {
    const first = newOption([]);
    const second = newOption([first]);
    expect(second.value).not.toBe(first.value);
  });
});

describe("newField", () => {
  it("los tipos que ocupan la fila entera y la firma nacen en fila entera, y el resto en media", () => {
    for (const type of FIELD_TYPES) {
      expect(newField(type, "Campo").size).toBe(
        FULL_WIDTH_TYPES.includes(type) || type === "signature"
          ? "full"
          : "medium",
      );
    }
  });

  it("una lista de chequeo nace con la escala B/M/N.A y un bloque vacío", () => {
    const { checklist } = newField("checklist", "Inspección").config;
    expect(checklist?.options.map((option) => option.short)).toEqual([
      "B",
      "M",
      "N.A",
    ]);
    expect(checklist?.blocks).toHaveLength(1);
    expect(checklist?.blocks[0].items).toEqual([]);
  });

  it("una tabla nace con una columna de texto y el nombre de su fila", () => {
    const { table } = newField("table", "Elementos").config;
    expect(table?.columns).toHaveLength(1);
    expect(table?.columns[0]).toMatchObject({ type: "text", required: false });
    expect(table?.rowLabel.trim()).not.toBe("");
  });

  it("una firma nace firmando quien diligencia", () => {
    expect(newField("signature", "Firma").config.signature).toEqual({
      signer: "author",
    });
  });

  it("una lista nace con una opción, para no salir vacía", () => {
    expect(newField("select", "Tipo").config.options).toHaveLength(1);
    expect(newField("multiSelect", "Tipos").config.options).toHaveLength(1);
  });

  it("cada tipo nace con su configuración propia y sin la de los demás", () => {
    const allowed = new Set([
      // Lo que a un campo recién nacido le falta por definición: los ítems de
      // la lista y el listado de la relación los pone quien diseña.
      "checklistNoItems",
      "referenceFormRequired",
    ]);
    for (const type of FIELD_TYPES) {
      const section: FormSection = {
        ...newSection(1),
        fields: [newField(type, "Campo")],
      };
      const problems = validateForm([section], { kind: "record" })
        .map((problem) => problem.code)
        .filter((code) => !allowed.has(code));
      expect(problems, type).toEqual([]);
    }
  });

  it("dos campos nuevos no comparten ningún identificador", () => {
    const fields = [newField("table", "A"), newField("table", "B")];
    const ids = fields.flatMap((field) => [
      field.id,
      ...(field.config.table?.columns.map((column) => column.id) ?? []),
    ]);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("columnTypeConfig", () => {
  it("da a cada tipo de columna lo suyo y nada más", () => {
    expect(columnTypeConfig("select").options).toHaveLength(1);
    expect(columnTypeConfig("reference")).toEqual({
      reference: { formId: "", fill: [] },
    });
    expect(columnTypeConfig("date")).toEqual({});
  });
});

const field = (id: string, extra: Partial<FormField> = {}): FormField => ({
  id,
  type: "text",
  label: id,
  required: false,
  size: "medium",
  showInTable: false,
  config: {},
  ...extra,
});

describe("duplicateSection", () => {
  const section: FormSection = {
    id: "sec",
    label: "Inspección",
    order: 1,
    visibility: {
      match: "all",
      rules: [{ fieldId: "@fecha", operator: "after", values: ["2026-01-01"] }],
    },
    fields: [
      field("tipo", {
        type: "select",
        label: "Tipo",
        config: { options: [{ label: "Eléctrico", value: "electrico" }] },
      }),
      field("voltaje", {
        label: "Voltaje",
        config: {
          visibility: {
            match: "all",
            rules: [{ fieldId: "tipo", operator: "eq", values: ["electrico"] }],
          },
        },
      }),
    ],
  };

  it("da ids nuevos: dos campos con el mismo id serían la misma respuesta", () => {
    const copy = duplicateSection(section, 2);
    expect(copy.id).not.toBe(section.id);
    expect(copy.fields.map((item) => item.id)).not.toEqual(["tipo", "voltaje"]);
    expect(new Set(copy.fields.map((item) => item.id)).size).toBe(2);
  });

  it("reapunta las reglas internas a los campos de la copia", () => {
    const copy = duplicateSection(section, 2);
    const [type, voltage] = copy.fields;
    // «Voltaje se ve si Tipo es eléctrico» sigue mirando al Tipo **de la
    // copia**, no al del original.
    expect(voltage.config.visibility?.rules[0].fieldId).toBe(type.id);
  });

  it("conserva la condición de la sección y avisa de que es una copia", () => {
    const copy = duplicateSection(section, 2);
    expect(copy.visibility).toEqual(section.visibility);
    expect(copy.label).toBe("Inspección (copia)");
    expect(copy.order).toBe(2);
  });

  it("no toca una regla que apunta a un dato de la respuesta ni a un campo de fuera", () => {
    const copy = duplicateSection(
      {
        ...section,
        fields: [
          field("a", {
            config: {
              visibility: {
                match: "any",
                rules: [
                  { fieldId: "@autor", operator: "isNotEmpty", values: [] },
                  {
                    fieldId: "de-otra-seccion",
                    operator: "isNotEmpty",
                    values: [],
                  },
                ],
              },
            },
          }),
        ],
      },
      2,
    );
    expect(
      copy.fields[0].config.visibility?.rules.map((rule) => rule.fieldId),
    ).toEqual(["@autor", "de-otra-seccion"]);
  });

  it("reapunta los operandos de una receta", () => {
    const copy = duplicateSection(
      {
        ...section,
        fields: [
          field("horas", { type: "number" }),
          field("personas", { type: "number" }),
          field("total", {
            type: "number",
            config: {
              computed: {
                kind: "arithmetic",
                operands: ["horas", "personas"],
                op: "*",
              },
            },
          }),
        ],
      },
      2,
    );
    const [hours, people, total] = copy.fields;
    expect(total.config.computed).toEqual({
      kind: "arithmetic",
      operands: [hours.id, people.id],
      op: "*",
    });
  });

  it("da ids nuevos a bloques, ítems y columnas: son únicos en todo el formato", () => {
    const checklist = newField("checklist", "Lista");
    checklist.config.checklist?.blocks[0].items.push({
      id: "item-1",
      label: "Frenos",
    });
    const original: FormSection = {
      ...newSection(1),
      fields: [checklist, newField("table", "Tabla")],
    };
    const copy = duplicateSection(original, 2);

    const problems = validateForm([original, copy], { kind: "record" }).map(
      (problem) => problem.code,
    );
    expect(problems).not.toContain("duplicateBlockId");
    expect(problems).not.toContain("duplicateItemId");
    expect(problems).not.toContain("duplicateColumnId");
    expect(problems).not.toContain("duplicateFieldId");
  });
});

describe("duplicateField", () => {
  it("copia el campo con id nuevo y sus reglas mirando a los mismos campos", () => {
    const original = field("voltaje", {
      label: "Voltaje",
      config: {
        visibility: {
          match: "all",
          rules: [{ fieldId: "tipo", operator: "eq", values: ["electrico"] }],
        },
      },
    });
    const copy = duplicateField(original);
    expect(copy.id).not.toBe(original.id);
    expect(copy.label).toBe("Voltaje (copia)");
    expect(copy.config.visibility).toEqual(original.config.visibility);
  });
});
