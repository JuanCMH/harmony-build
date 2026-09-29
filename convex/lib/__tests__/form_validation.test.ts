import { describe, expect, it } from "vitest";

import { formProblems } from "../error_messages";
import { FORM_LIMITS, type FormField, type FormSection } from "../form_types";
import { type ValidateFormOptions, validateForm } from "../form_validation";
import {
  checklistConfig,
  checklistField,
  field,
  oneSection,
  referenceField,
  rule,
  SCALE_BMNA,
  section,
  selectField,
  signatureField,
  tableConfig,
  tableField,
  when,
} from "./form.fixtures";

/** Los códigos de los problemas de un formato, sin repetir. */
const codes = (
  sections: readonly FormSection[],
  options: ValidateFormOptions = { kind: "record" },
) => [...new Set(validateForm(sections, options).map((p) => p.code))];

const number = (id: string, extra: Partial<FormField> = {}) =>
  field(id, { type: "number", ...extra });
const date = (id: string, extra: Partial<FormField> = {}) =>
  field(id, { type: "date", ...extra });

describe("validateForm", () => {
  it("acepta un formato sencillo, y uno vacío", () => {
    expect(codes(oneSection(field("a"), field("b")))).toEqual([]);
    expect(codes([])).toEqual([]);
  });

  it("devuelve el código, el mensaje en español y dónde está el problema", () => {
    const problems = validateForm(
      oneSection(field("a"), field("a", { label: "" })),
      { kind: "record" },
    );
    expect(problems).toContainEqual({
      code: "duplicateFieldId",
      message: formProblems.duplicateFieldId,
      sectionId: "general",
      fieldId: "a",
    });
    expect(problems.map((p) => p.code)).toContain("labelRequired");
  });

  it("rechaza dos campos con el mismo identificador", () => {
    // Aunque estén en secciones distintas: los valores se guardan por `fieldId`.
    const form = [
      section("s1", 1, [field("a")]),
      section("s2", 2, [field("a")]),
    ];
    expect(codes(form)).toEqual(["duplicateFieldId"]);
  });

  it("rechaza dos secciones con el mismo identificador", () => {
    const form = [section("s", 1, [field("a")]), section("s", 2, [field("b")])];
    expect(codes(form)).toEqual(["duplicateSectionId"]);
  });

  it("un campo no puede usar un id con @", () => {
    expect(codes(oneSection(field("@fecha")))).toContain("reservedFieldId");
  });

  it("respeta los techos de secciones y de campos", () => {
    const sections = Array.from(
      { length: FORM_LIMITS.maxSections + 1 },
      (_, i) => section(`s${i}`, i, [field(`c${i}`)]),
    );
    expect(codes(sections)).toEqual(["tooManySections"]);

    const fields = Array.from({ length: FORM_LIMITS.maxFields + 1 }, (_, i) =>
      field(`c${i}`),
    );
    expect(codes(oneSection(...fields))).toEqual(["tooManyFields"]);
  });

  it("un texto largo, una lista de chequeo y una tabla ocupan la fila entera", () => {
    expect(
      codes(oneSection(field("a", { type: "textarea", size: "large" }))),
    ).toEqual(["sizeNotFull"]);
    expect(
      codes(oneSection(field("a", { type: "textarea", size: "full" }))),
    ).toEqual([]);
    expect(codes(oneSection(checklistField("a", { size: "medium" })))).toEqual([
      "sizeNotFull",
    ]);
    expect(codes(oneSection(tableField("a", { size: "small" })))).toEqual([
      "sizeNotFull",
    ]);
  });

  it("el tamaño máximo de un archivo va de 1 a 50 MB", () => {
    const file = (maxFileSize: number) =>
      oneSection(field("a", { type: "file", config: { maxFileSize } }));
    expect(codes(file(25))).toEqual([]);
    expect(codes(file(0))).toEqual(["fileSizeRange"]);
    expect(codes(file(80))).toEqual(["fileSizeRange"]);
  });

  it("un mínimo no puede superar a su máximo", () => {
    expect(
      codes(oneSection(field("a", { config: { minLength: 5, maxLength: 3 } }))),
    ).toEqual(["rangeInvalid"]);
    expect(
      codes(oneSection(number("a", { config: { minValue: 10, maxValue: 1 } }))),
    ).toEqual(["rangeInvalid"]);
    expect(
      codes(oneSection(field("a", { config: { minLength: -1 } }))),
    ).toEqual(["rangeInvalid"]);
    expect(
      codes(oneSection(number("a", { config: { minValue: -5, maxValue: 5 } }))),
    ).toEqual([]);
  });

  describe("opciones de una lista", () => {
    const list = selectField("tipo", ["opcion-1", "opcion-2"]);
    const plate = (value: string) =>
      field("placa", {
        config: { visibility: when(rule("tipo", "eq", value)) },
      });

    it("una lista necesita opciones, con nombre y sin valores repetidos", () => {
      expect(codes(oneSection(field("a", { type: "select" })))).toEqual([
        "optionsRequired",
      ]);
      expect(codes(oneSection(selectField("a", ["x", "x"])))).toEqual([
        "duplicateOption",
      ]);
      expect(
        codes(
          oneSection(
            field("a", {
              type: "multiSelect",
              config: { options: [{ label: " ", value: "x" }] },
            }),
          ),
        ),
      ).toEqual(["labelRequired"]);
    });

    it("dos listas distintas pueden usar los mismos valores", () => {
      expect(
        codes(
          oneSection(
            selectField("a", ["si", "no"]),
            selectField("b", ["si", "no"]),
          ),
        ),
      ).toEqual([]);
    });

    it("una regla sigue valiendo aunque la opción cambie de etiqueta", () => {
      expect(codes(oneSection(list, plate("opcion-1")))).toEqual([]);
    });

    it("rechaza una regla que compara con una opción que ya no existe", () => {
      expect(codes(oneSection(list, plate("opcion-9")))).toEqual([
        "ruleOptionMissing",
      ]);
    });

    it("rechaza un valor sugerido que no es opción de su propia lista", () => {
      const suggested = selectField("tipo2", ["opcion-1"], {
        config: {
          options: [{ label: "Moto", value: "opcion-1" }],
          autoValue: {
            rules: [{ ...rule("casco", "isChecked"), set: "borrada" }],
          },
        },
      });
      expect(
        codes(oneSection(field("casco", { type: "checkbox" }), suggested)),
      ).toEqual(["ruleOptionMissing"]);
    });
  });

  describe("condiciones", () => {
    it("una condición sin campo elegido no se guarda, con su propio mensaje", () => {
      expect(
        codes(
          oneSection(
            field("a"),
            field("b", { config: { visibility: when(rule("", "eq")) } }),
          ),
        ),
      ).toEqual(["ruleWithoutField"]);
    });

    it("rechaza una regla que apunta a un campo inexistente", () => {
      // No falla sola: el campo desaparecería sin motivo visible.
      expect(
        codes(
          oneSection(
            field("a", {
              config: { visibility: when(rule("fantasma", "eq", "1")) },
            }),
          ),
        ),
      ).toEqual(["unknownReference"]);
    });

    it("rechaza un ciclo de dependencias", () => {
      const dependsOn = (id: string, ref: string) =>
        field(id, { config: { visibility: when(rule(ref, "eq", "1")) } });
      expect(
        codes(oneSection(dependsOn("a", "b"), dependsOn("b", "a"))),
      ).toEqual(["dependencyCycle"]);
    });

    it("una regla binaria sin valor de comparación no se guarda", () => {
      // «Igual a nada» se cumpliría sólo con el controlador vacío: lo
      // contrario de lo que quiso decir quien la escribió.
      expect(
        codes(
          oneSection(
            field("a"),
            field("b", { config: { visibility: when(rule("a", "eq")) } }),
          ),
        ),
      ).toEqual(["ruleWithoutValue"]);
    });

    it("un operador unario no necesita valor de comparación", () => {
      expect(
        codes(
          oneSection(
            field("a"),
            field("b", {
              config: { visibility: when(rule("a", "isNotEmpty")) },
            }),
          ),
        ),
      ).toEqual([]);
    });

    it("un campo condicional sí puede ser obligatorio: se exige cuando se muestra", () => {
      expect(
        codes(
          oneSection(
            field("a"),
            field("b", {
              required: true,
              config: { visibility: when(rule("a", "eq", "1")) },
            }),
          ),
        ),
      ).toEqual([]);
    });

    it("las reglas pueden mirar los datos de la respuesta", () => {
      expect(
        codes(
          oneSection(
            field("a", {
              config: {
                visibility: when(rule("@fecha", "after", "2026-01-01")),
              },
            }),
            date("vence", {
              config: {
                computed: {
                  kind: "dateAdd",
                  of: "@fecha",
                  amount: 30,
                  unit: "days",
                },
              },
            }),
          ),
        ),
      ).toEqual([]);
      // `@autor` es un texto: no sirve para sumar días.
      expect(
        codes(
          oneSection(
            date("vence", {
              config: {
                computed: {
                  kind: "dateAdd",
                  of: "@autor",
                  amount: 1,
                  unit: "days",
                },
              },
            }),
          ),
        ),
      ).toEqual(["computedOperandType"]);
    });
  });

  describe("los tipos nuevos como controladores (diseño §4.5)", () => {
    const dependsOn = (
      controller: FormField,
      ...args: Parameters<typeof rule> extends [string, ...infer R] ? R : never
    ) =>
      oneSection(
        controller,
        field("dependiente", {
          config: { visibility: when(rule(controller.id, ...args)) },
        }),
      );

    it("una lista de chequeo no condiciona a nadie", () => {
      expect(codes(dependsOn(checklistField("lista"), "isNotEmpty"))).toEqual([
        "controllerNotAllowed",
      ]);
    });

    it("una firma, una tabla y un archivo sólo dicen si están", () => {
      for (const controller of [
        signatureField("c"),
        tableField("c"),
        field("c", { type: "file" }),
        field("c", { type: "image" }),
      ]) {
        expect(codes(dependsOn(controller, "isNotEmpty"))).toEqual([]);
        expect(codes(dependsOn(controller, "isEmpty"))).toEqual([]);
        expect(codes(dependsOn(controller, "eq", "x"))).toEqual([
          "operatorNotAllowed",
        ]);
        expect(codes(dependsOn(controller, "isChecked"))).toEqual([
          "operatorNotAllowed",
        ]);
      }
    });

    it("una relación dice además cuál elemento es", () => {
      const vehicle = referenceField("c", "listado");
      for (const operator of ["eq", "neq", "anyOf"] as const) {
        expect(codes(dependsOn(vehicle, operator, "r1"))).toEqual([]);
      }
      expect(codes(dependsOn(vehicle, "isEmpty"))).toEqual([]);
      expect(codes(dependsOn(vehicle, "gt", "3"))).toEqual([
        "operatorNotAllowed",
      ]);
    });
  });

  describe("secciones condicionales", () => {
    const conditional = (
      rules: ReturnType<typeof when>,
      fields: FormField[],
    ) => [
      section("equipo", 1, [field("tipo")]),
      section("conexiones", 2, fields, rules),
      section("cierre", 3, [field("nota")]),
    ];

    it("puede condicionarse a un campo de una sección anterior", () => {
      expect(
        codes(
          conditional(when(rule("tipo", "eq", "electrico")), [field("cable")]),
        ),
      ).toEqual([]);
    });

    it("nunca a un campo suyo ni de una sección posterior", () => {
      expect(
        codes(conditional(when(rule("cable", "isNotEmpty")), [field("cable")])),
      ).toEqual(["sectionRuleNotEarlier", "dependencyCycle"]);
      expect(
        codes(conditional(when(rule("nota", "isNotEmpty")), [field("cable")])),
      ).toEqual(["sectionRuleNotEarlier"]);
    });

    it("lo que cuenta es el orden de la sección, no su sitio en el arreglo", () => {
      const form = [
        section(
          "conexiones",
          2,
          [field("cable")],
          when(rule("tipo", "eq", "x")),
        ),
        section("equipo", 1, [field("tipo")]),
      ];
      expect(codes(form)).toEqual([]);
    });

    it("puede mirar los datos de la respuesta", () => {
      expect(
        codes(
          conditional(when(rule("@fecha", "after", "2026-01-01")), [
            field("cable"),
          ]),
        ),
      ).toEqual([]);
    });

    it("sus condiciones pasan por las mismas reglas que las de un campo", () => {
      expect(
        codes(conditional(when(rule("tipo", "eq")), [field("cable")])),
      ).toEqual(["ruleWithoutValue"]);
      expect(
        codes(conditional(when(rule("fantasma", "eq", "1")), [field("cable")])),
      ).toEqual(["unknownReference"]);
    });

    it("detecta el ciclo que pasa por una sección", () => {
      // `tipo` depende de `cable`, y la sección de `cable` depende de `tipo`.
      const form = [
        section("equipo", 1, [
          field("tipo", {
            config: { visibility: when(rule("cable", "isNotEmpty")) },
          }),
        ]),
        section(
          "conexiones",
          2,
          [field("cable")],
          when(rule("tipo", "eq", "x")),
        ),
      ];
      expect(codes(form)).toEqual(["dependencyCycle"]);
    });
  });

  describe("recetas", () => {
    const formula = {
      kind: "formula" as const,
      terms: [{ type: "const" as const, value: 1 }],
    };

    it("una fórmula no cabe en un texto, pero sí en una moneda", () => {
      expect(
        codes(oneSection(field("a", { config: { computed: formula } }))),
      ).toEqual(["computedTypeMismatch"]);
      expect(
        codes(
          oneSection(
            field("a", { type: "currency", config: { computed: formula } }),
          ),
        ),
      ).toEqual([]);
    });

    it("cada receta sólo cabe en su tipo", () => {
      expect(
        codes(
          oneSection(
            number("c"),
            date("x", {
              config: { computed: { kind: "percent", of: "c", percent: 19 } },
            }),
          ),
        ),
      ).toEqual(["computedTypeMismatch"]);
      expect(
        codes(
          oneSection(
            date("e"),
            date("v", {
              config: {
                computed: {
                  kind: "dateAdd",
                  of: "e",
                  amount: 1,
                  unit: "years",
                },
              },
            }),
          ),
        ),
      ).toEqual([]);
    });

    it("los operandos tienen que ser del tipo que la receta pide", () => {
      expect(
        codes(
          oneSection(
            field("t"),
            number("iva", {
              config: { computed: { kind: "percent", of: "t", percent: 19 } },
            }),
          ),
        ),
      ).toEqual(["computedOperandType"]);
      expect(
        codes(
          oneSection(
            number("n"),
            number("d", {
              config: { computed: { kind: "daysUntil", of: "n" } },
            }),
          ),
        ),
      ).toEqual(["computedOperandType"]);
    });

    it("una operación necesita dos operandos", () => {
      expect(
        codes(
          oneSection(
            number("a"),
            number("x", {
              config: {
                computed: { kind: "arithmetic", operands: ["a"], op: "+" },
              },
            }),
          ),
        ),
      ).toEqual(["computedIncomplete"]);
    });

    it("una moneda no lleva decimales, y un número como mucho dos", () => {
      const percent = (rounding: number) => ({
        kind: "percent" as const,
        of: "a",
        percent: 5,
        rounding,
      });
      expect(
        codes(
          oneSection(
            number("a"),
            field("x", { type: "currency", config: { computed: percent(2) } }),
          ),
        ),
      ).toEqual(["computedRounding"]);
      expect(
        codes(
          oneSection(
            number("a"),
            number("x", { config: { computed: percent(3) } }),
          ),
        ),
      ).toEqual(["computedRounding"]);
    });

    it("nadie puede depender de lo que cambia con el día", () => {
      const remaining = number("faltan", {
        config: { computed: { kind: "daysUntil", of: "vence" } },
      });
      // Ni una receta…
      expect(
        codes(
          oneSection(
            date("vence"),
            remaining,
            number("doble", {
              config: {
                computed: {
                  kind: "arithmetic",
                  operands: ["faltan", "faltan"],
                  op: "+",
                },
              },
            }),
          ),
        ),
      ).toEqual(["todayDerivedReferenced"]);
      // …ni una condición.
      expect(
        codes(
          oneSection(
            date("vence"),
            remaining,
            field("aviso", {
              config: { visibility: when(rule("faltan", "lt", "30")) },
            }),
          ),
        ),
      ).toEqual(["todayDerivedReferenced"]);
      expect(codes(oneSection(date("vence"), remaining))).toEqual([]);
    });

    it("un campo calculado no puede ser obligatorio", () => {
      // No lo rellena nadie: exigirlo bloquearía el formulario para siempre.
      expect(
        codes(
          oneSection(
            number("a", { required: true, config: { computed: formula } }),
          ),
        ),
      ).toEqual(["computedIsRequired"]);
    });

    it("una receta no puede tomar un tipo nuevo como operando", () => {
      const concat = (of: string) =>
        field("resumen", {
          config: {
            computed: {
              kind: "concat",
              parts: [{ type: "field", fieldId: of }],
            },
          },
        });
      for (const operand of [
        referenceField("x", "listado"),
        checklistField("x"),
        signatureField("x"),
        tableField("x"),
      ]) {
        expect(codes(oneSection(operand, concat("x")))).toEqual([
          "computedOperandType",
        ]);
      }
      expect(codes(oneSection(field("x"), concat("x")))).toEqual([]);
    });

    it("un tipo nuevo no puede calcularse", () => {
      expect(
        codes(
          oneSection(
            field("a"),
            referenceField("x", "listado", [], {
              config: {
                reference: { formId: "listado", fill: [] },
                computed: {
                  kind: "concat",
                  parts: [{ type: "field", fieldId: "a" }],
                },
              },
            }),
          ),
        ),
      ).toEqual(["computedTypeMismatch"]);
    });
  });

  describe("valor sugerido", () => {
    const suggested = (
      regla: { operator: "eq" | "isNotEmpty"; values: string[]; set: string },
      extra: Partial<FormField> = {},
      controller: FormField = field("a"),
    ) =>
      oneSection(
        controller,
        field("b", {
          ...extra,
          config: {
            ...extra.config,
            autoValue: { rules: [{ fieldId: controller.id, ...regla }] },
          },
        }),
      );

    it("necesita condición completa y valor que asignar", () => {
      expect(
        codes(suggested({ operator: "eq", values: [], set: "x" })),
      ).toEqual(["ruleWithoutValue"]);
      // Sin valor que asignar, vaciaría el campo cada vez que se cumpliera.
      expect(
        codes(suggested({ operator: "isNotEmpty", values: [], set: "" })),
      ).toEqual(["autoValueWithoutValue"]);
      expect(
        codes(suggested({ operator: "eq", values: ["1"], set: "x" })),
      ).toEqual([]);
    });

    it("sólo cabe en una lista, una casilla, un texto o una fecha", () => {
      expect(
        codes(
          suggested(
            { operator: "isNotEmpty", values: [], set: "5" },
            { type: "number" },
          ),
        ),
      ).toEqual(["autoValueTypeMismatch"]);
    });

    it("no puede depender de un tipo nuevo", () => {
      for (const controller of [
        referenceField("a", "listado"),
        signatureField("a"),
        tableField("a"),
      ]) {
        expect(
          codes(
            suggested(
              { operator: "isNotEmpty", values: [], set: "x" },
              {},
              controller,
            ),
          ),
        ).toEqual(["autoValueControllerType"]);
      }
    });
  });
});

describe("la configuración propia de cada tipo", () => {
  it("es obligatoria en su tipo", () => {
    for (const type of ["checklist", "table"] as const) {
      expect(codes(oneSection(field("a", { type, size: "full" })))).toEqual([
        "configRequired",
      ]);
    }
    for (const type of ["reference", "signature"] as const) {
      expect(codes(oneSection(field("a", { type })))).toEqual([
        "configRequired",
      ]);
    }
  });

  it("está prohibida en los demás", () => {
    expect(
      codes(
        oneSection(field("a", { config: { checklist: checklistConfig() } })),
      ),
    ).toEqual(["configNotAllowed"]);
    expect(
      codes(oneSection(field("a", { config: { table: tableConfig() } }))),
    ).toEqual(["configNotAllowed"]);
    expect(
      codes(
        oneSection(
          field("a", { config: { reference: { formId: "x", fill: [] } } }),
        ),
      ),
    ).toEqual(["configNotAllowed"]);
    expect(
      codes(
        oneSection(
          referenceField("a", "x", [], {
            config: {
              reference: { formId: "x", fill: [] },
              signature: { signer: "author" },
            },
          }),
        ),
      ),
    ).toEqual(["configNotAllowed"]);
  });
});

describe("lista de chequeo", () => {
  const list = (config: Parameters<typeof checklistConfig>[0]) =>
    oneSection(checklistField("inspeccion", {}, config));

  it("acepta la inspección de ejemplo", () => {
    expect(codes(list({}))).toEqual([]);
  });

  it("la escala tiene de 2 a 5 opciones", () => {
    expect(
      codes(list({ options: SCALE_BMNA.slice(0, 1), note: "never" })),
    ).toEqual(["checklistOptionsCount"]);
    const six = Array.from({ length: 6 }, (_, i) => ({
      value: `o${i}`,
      label: `Opción ${i}`,
      short: `${i}`,
      meaning: "ok" as const,
    }));
    expect(codes(list({ options: six, note: "never" }))).toEqual([
      "checklistOptionsCount",
    ]);
  });

  it("la abreviatura tiene de 1 a 4 caracteres", () => {
    const withShort = (short: string) =>
      list({ options: [{ ...SCALE_BMNA[0], short }, SCALE_BMNA[1]] });
    expect(codes(withShort(""))).toEqual(["checklistShort"]);
    expect(codes(withShort("BUENO"))).toEqual(["checklistShort"]);
    expect(codes(withShort("N.A."))).toEqual([]);
  });

  it("las opciones de la escala no repiten valor", () => {
    expect(
      codes(list({ options: [SCALE_BMNA[0], SCALE_BMNA[1], SCALE_BMNA[1]] })),
    ).toEqual(["duplicateOption"]);
  });

  it("necesita al menos un ítem que se responda", () => {
    expect(codes(list({ blocks: [] }))).toEqual(["checklistNoItems"]);
    expect(
      codes(
        list({
          blocks: [
            {
              id: "b",
              label: "",
              items: [{ id: "i", label: "Luces", heading: true }],
            },
          ],
        }),
      ),
    ).toEqual(["checklistNoItems"]);
  });

  it("un bloque puede no tener título, un ítem no", () => {
    const block = (label: string, itemLabel: string) =>
      list({
        blocks: [{ id: "b", label, items: [{ id: "i", label: itemLabel }] }],
      });
    expect(codes(block("", "Aceite"))).toEqual([]);
    expect(codes(block("Niveles", ""))).toEqual(["labelRequired"]);
  });

  it("un subítem sólo va tras un ítem que agrupa o tras otro subítem", () => {
    const items = (
      ...list: { id: string; heading?: boolean; indented?: boolean }[]
    ) =>
      codes(
        oneSection(
          checklistField(
            "inspeccion",
            {},
            {
              blocks: [
                {
                  id: "b",
                  label: "",
                  items: list.map((item) => ({ label: item.id, ...item })),
                },
              ],
            },
          ),
        ),
      );
    expect(
      items(
        { id: "luces", heading: true },
        { id: "altas", indented: true },
        { id: "bajas", indented: true },
      ),
    ).toEqual([]);
    // El primero del bloque no cuelga de nadie.
    expect(items({ id: "altas", indented: true })).toEqual([
      "checklistIndentedOrphan",
    ]);
    // Y tras un ítem normal, tampoco.
    expect(
      items(
        { id: "luces", heading: true },
        { id: "altas", indented: true },
        { id: "pito" },
        { id: "bajas", indented: true },
      ),
    ).toEqual(["checklistIndentedOrphan"]);
  });

  it("la cadena de subítems no cruza de un bloque a otro", () => {
    expect(
      codes(
        list({
          blocks: [
            {
              id: "b1",
              label: "",
              items: [
                { id: "luces", label: "Luces", heading: true },
                { id: "a", label: "Altas", indented: true },
              ],
            },
            {
              id: "b2",
              label: "",
              items: [{ id: "b", label: "Bajas", indented: true }],
            },
          ],
        }),
      ),
    ).toEqual(["checklistIndentedOrphan"]);
  });

  it("exigir la observación en lo no conforme pide una opción «no conforme»", () => {
    const yesOnly = [
      { value: "si", label: "Sí", short: "Sí", meaning: "ok" as const },
      { value: "na", label: "No aplica", short: "N.A", meaning: "na" as const },
    ];
    expect(codes(list({ options: yesOnly, note: "onFail" }))).toEqual([
      "checklistNoteNeedsFail",
    ]);
    expect(codes(list({ options: yesOnly, note: "optional" }))).toEqual([]);
  });

  it("no admite más de 150 ítems", () => {
    const items = Array.from(
      { length: FORM_LIMITS.maxChecklistItems + 1 },
      (_, i) => ({ id: `i${i}`, label: `Ítem ${i}` }),
    );
    expect(codes(list({ blocks: [{ id: "b", label: "", items }] }))).toEqual([
      "checklistTooManyItems",
    ]);
  });

  it("los ids de bloque y de ítem son únicos en todo el formato", () => {
    expect(
      codes(oneSection(checklistField("manana"), checklistField("tarde"))),
    ).toEqual(["duplicateBlockId", "duplicateItemId"]);
  });
});

describe("tabla", () => {
  const table = (config: Parameters<typeof tableConfig>[0]) =>
    oneSection(tableField("entregas", {}, config));

  it("acepta la entrega de dotación", () => {
    expect(codes(table({}))).toEqual([]);
  });

  it("tiene de 1 a 12 columnas", () => {
    expect(codes(table({ columns: [] }))).toEqual(["tableColumnsCount"]);
    const columns = Array.from(
      { length: FORM_LIMITS.maxTableColumns + 1 },
      (_, i) => ({
        id: `c${i}`,
        label: `Columna ${i}`,
        type: "text" as const,
        required: false,
      }),
    );
    expect(codes(table({ columns }))).toEqual(["tableColumnsCount"]);
  });

  it("una columna de lista exige opciones, y una de relación su listado", () => {
    const column = (extra: object) =>
      table({
        columns: [
          {
            id: "c",
            label: "Columna",
            required: false,
            type: "text",
            ...extra,
          },
        ],
      });
    expect(codes(column({ type: "select" }))).toEqual(["tableColumnOptions"]);
    expect(codes(column({ type: "reference" }))).toEqual([
      "tableColumnReference",
    ]);
    expect(
      codes(column({ type: "reference", reference: { formId: "", fill: [] } })),
    ).toEqual(["referenceFormRequired"]);
    expect(
      codes(
        column({ type: "reference", reference: { formId: "f", fill: [] } }),
      ),
    ).toEqual([]);
    // Y lo que no es suyo, sobra.
    expect(
      codes(column({ type: "text", options: [{ label: "A", value: "a" }] })),
    ).toEqual(["tableColumnConfigNotAllowed"]);
    expect(
      codes(column({ type: "number", reference: { formId: "f", fill: [] } })),
    ).toEqual(["tableColumnConfigNotAllowed"]);
  });

  it("las filas mínimas no superan a las máximas, ni estas a 100", () => {
    expect(codes(table({ minRows: 5, maxRows: 3 }))).toEqual([
      "tableRowsRange",
    ]);
    expect(codes(table({ maxRows: 101 }))).toEqual(["tableRowsRange"]);
    expect(codes(table({ minRows: -1 }))).toEqual(["tableRowsRange"]);
    expect(codes(table({ maxRows: 0 }))).toEqual(["tableRowsRange"]);
    expect(codes(table({ minRows: 1, maxRows: 100 }))).toEqual([]);
    expect(codes(table({ minRows: 3, maxRows: 3 }))).toEqual([]);
  });

  it("los ids de columna son únicos en todo el formato", () => {
    expect(
      codes(oneSection(tableField("entregas"), tableField("devoluciones"))),
    ).toEqual(["duplicateColumnId"]);
  });
});

describe("relación", () => {
  it("necesita su listado", () => {
    expect(codes(oneSection(referenceField("vehiculo", "")))).toEqual([
      "referenceFormRequired",
    ]);
  });

  it("trae como máximo 12 campos, sin repetir", () => {
    expect(
      codes(oneSection(referenceField("vehiculo", "f", ["soat", "soat"]))),
    ).toEqual(["referenceFillInvalid"]);
    const many = Array.from(
      { length: FORM_LIMITS.maxReferenceFill + 1 },
      (_, i) => `c${i}`,
    );
    expect(codes(oneSection(referenceField("vehiculo", "f", many)))).toEqual([
      "referenceFillInvalid",
    ]);
    expect(
      codes(oneSection(referenceField("vehiculo", "f", ["soat", "tipo"]))),
    ).toEqual([]);
  });
});

describe("por clase de formato", () => {
  it("la firma sólo cabe en un formato que no se edita", () => {
    const form = oneSection(signatureField("firma"));
    expect(codes(form, { kind: "record" })).toEqual([]);
    expect(codes(form, { kind: "catalog" })).toEqual(["typeNotAllowed"]);
  });

  it("tampoco como columna de una tabla de un listado", () => {
    const form = oneSection(
      tableField(
        "entregas",
        {},
        {
          columns: [
            { id: "firma", label: "Firma", type: "signature", required: true },
          ],
        },
      ),
    );
    expect(codes(form, { kind: "record" })).toEqual([]);
    expect(codes(form, { kind: "catalog" })).toEqual(["typeNotAllowed"]);
  });

  describe("campo de título de un listado", () => {
    const vehicles = (
      plate: Partial<FormField>,
      visibility?: ReturnType<typeof when>,
    ) => [
      section("datos", 1, [field("tipo")]),
      section(
        "identidad",
        2,
        [field("placa", { required: true, ...plate }), field("soat")],
        visibility,
      ),
    ];
    const titled = (sections: FormSection[], titleFieldId = "placa") =>
      codes(sections, { kind: "catalog", titleFieldId });

    it("es un texto corto, obligatorio y sin condición", () => {
      expect(titled(vehicles({}))).toEqual([]);
      expect(titled(vehicles({ required: false }))).toEqual([
        "titleFieldInvalid",
      ]);
      expect(titled(vehicles({ type: "textarea", size: "full" }))).toEqual([
        "titleFieldInvalid",
      ]);
      expect(
        titled(
          vehicles({
            config: { visibility: when(rule("tipo", "isNotEmpty")) },
          }),
        ),
      ).toEqual(["titleFieldInvalid"]);
    });

    it("tampoco puede estar en una sección condicional", () => {
      expect(titled(vehicles({}, when(rule("tipo", "isNotEmpty"))))).toEqual([
        "titleFieldInvalid",
      ]);
    });

    it("no puede ser un campo derivado", () => {
      expect(
        titled(
          vehicles({
            required: true,
            config: {
              computed: {
                kind: "concat",
                parts: [{ type: "field", fieldId: "tipo" }],
              },
            },
          }),
        ),
      ).toEqual(["computedIsRequired", "titleFieldInvalid"]);
    });

    it("tiene que existir en el listado", () => {
      expect(titled(vehicles({}), "fantasma")).toEqual(["titleFieldMissing"]);
    });

    it("sin elegir todavía, el borrador es válido; y en un formato no aplica", () => {
      expect(codes(vehicles({ required: false }), { kind: "catalog" })).toEqual(
        [],
      );
      expect(
        codes(vehicles({ required: false }), {
          kind: "record",
          titleFieldId: "placa",
        }),
      ).toEqual([]);
    });
  });
});
