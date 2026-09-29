import { describe, expect, it } from "vitest";

import { FORM_CONTEXT_FIELDS } from "@/convex/lib/form_context";
import type { FormField, FormSection } from "@/convex/lib/form_types";
import { validateForm } from "@/convex/lib/form_validation";

import {
  autoValueCandidates,
  builderContextFields,
  controllerCandidates,
  describeAutoValue,
  describeComputed,
  describeCondition,
  describeRule,
  describeVisibility,
  fieldOption,
  newComputed,
  newRule,
  operandCandidates,
  sectionControllerCandidates,
} from "../field-rules";

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

const vehicle = field("vehiculo", {
  type: "select",
  label: "Tipo de vehículo",
  config: {
    options: [
      { label: "Moto", value: "moto" },
      { label: "Carro", value: "carro" },
      { label: "Bicicleta", value: "bicicleta" },
    ],
  },
});

describe("describeRule", () => {
  it("nombra el campo y la opción por su etiqueta, no por su valor", () => {
    expect(
      describeRule({ fieldId: "vehiculo", operator: "eq", values: ["moto"] }, [
        vehicle,
      ]),
    ).toBe("«Tipo de vehículo» es igual a «Moto»");
  });

  it("une un conjunto con comas y «o»", () => {
    expect(
      describeRule(
        {
          fieldId: "vehiculo",
          operator: "anyOf",
          values: ["moto", "carro", "bicicleta"],
        },
        [vehicle],
      ),
    ).toBe("«Tipo de vehículo» es alguno de «Moto», «Carro» o «Bicicleta»");
  });

  it("escribe una fecha como se lee en Colombia", () => {
    const entry = field("ingreso", { type: "date", label: "Fecha de ingreso" });
    expect(
      describeRule(
        { fieldId: "ingreso", operator: "before", values: ["2026-01-01"] },
        [entry],
      ),
    ).toBe("«Fecha de ingreso» es anterior a «01/01/2026»");
  });

  it("un importe sale en pesos", () => {
    const amount = field("valor", { type: "currency", label: "Valor" });
    expect(
      describeRule({ fieldId: "valor", operator: "gt", values: ["1900000"] }, [
        amount,
      ]),
    ).toBe("«Valor» es mayor que «$ 1.900.000»");
  });

  it("un operador unario no lleva valor", () => {
    const signature = field("firma", { type: "signature", label: "Firma" });
    expect(
      describeRule({ fieldId: "firma", operator: "isNotEmpty", values: [] }, [
        signature,
      ]),
    ).toBe("«Firma» tiene algún valor");
  });

  it("no inventa el nombre de un campo que ya no existe", () => {
    expect(
      describeRule(
        { fieldId: "fantasma", operator: "isNotEmpty", values: [] },
        [],
      ),
    ).toBe("un campo eliminado tiene algún valor");
  });

  it("una regla a medias lo deja ver", () => {
    expect(
      describeRule({ fieldId: "vehiculo", operator: "eq", values: [] }, [
        vehicle,
      ]),
    ).toBe("«Tipo de vehículo» es igual a …");
  });

  it("de una relación dice el título del elemento, y nunca su id", () => {
    const equipment = field("equipo", { type: "reference", label: "Equipo" });
    const rule = {
      fieldId: "equipo",
      operator: "eq" as const,
      values: ["k17abc"],
    };
    expect(describeRule(rule, [equipment])).toBe(
      "«Equipo» es igual a un elemento del listado",
    );
    expect(
      describeRule(rule, [equipment], new Map([["k17abc", "Pulidora 3"]])),
    ).toBe("«Equipo» es igual a «Pulidora 3»");
  });
});

describe("describeVisibility y describeCondition", () => {
  const plate = (match: "all" | "any") =>
    field("placa", {
      label: "Placa",
      config: {
        visibility: {
          match,
          rules: [
            { fieldId: "vehiculo", operator: "eq", values: ["moto"] },
            { fieldId: "vehiculo", operator: "eq", values: ["carro"] },
          ],
        },
      },
    });

  it("«todas» se lee con «y», y «alguna» con «o»", () => {
    expect(describeVisibility(plate("all"), [vehicle])).toBe(
      "Cuando «Tipo de vehículo» es igual a «Moto» y «Tipo de vehículo» es igual a «Carro»",
    );
    expect(describeVisibility(plate("any"), [vehicle])).toContain(
      "«Moto» o «Tipo",
    );
  });

  it("un campo sin reglas no tiene frase: se ve siempre", () => {
    expect(describeVisibility(field("a"), [])).toBeNull();
  });

  it("la condición de una sección se lee igual que la de un campo", () => {
    expect(
      describeCondition(
        {
          match: "all",
          rules: [{ fieldId: "vehiculo", operator: "neq", values: ["moto"] }],
        },
        [vehicle],
      ),
    ).toBe("Cuando «Tipo de vehículo» es distinto de «Moto»");
  });
});

describe("describeAutoValue", () => {
  it("dice qué valor toma, en palabras", () => {
    const helmet = field("casco", {
      type: "checkbox",
      label: "Usa casco",
      config: {
        autoValue: {
          rules: [
            {
              fieldId: "vehiculo",
              operator: "eq",
              values: ["moto"],
              set: "true",
            },
          ],
        },
      },
    });
    expect(describeAutoValue(helmet, [vehicle, helmet])).toEqual([
      "Si «Tipo de vehículo» es igual a «Moto», toma «marcada»",
    ]);
  });
});

describe("controllerCandidates", () => {
  const a = field("a");
  const b = field("b", {
    config: {
      visibility: {
        match: "all",
        rules: [{ fieldId: "a", operator: "isNotEmpty", values: [] }],
      },
    },
  });
  const c = field("c");

  it("no ofrece el propio campo ni uno que depende de él", () => {
    // B se ve según A: si A pudiera depender de B, sería un círculo.
    expect(controllerCandidates(a, [a, b, c]).map((item) => item.id)).toEqual([
      "c",
    ]);
  });

  it("ofrece todos los demás", () => {
    expect(controllerCandidates(b, [a, b, c]).map((item) => item.id)).toEqual([
      "a",
      "c",
    ]);
  });

  it("no ofrece una lista de chequeo: no condiciona a nadie", () => {
    const checklist = field("lista", { type: "checklist" });
    const signature = field("firma", { type: "signature" });
    expect(
      controllerCandidates(c, [checklist, signature, c]).map((item) => item.id),
    ).toEqual(["firma"]);
  });
});

describe("autoValueCandidates", () => {
  it("un valor sugerido no depende de una relación, una firma ni una tabla", () => {
    const own = field("propio");
    const candidates = autoValueCandidates(own, [
      own,
      vehicle,
      field("equipo", { type: "reference" }),
      field("firma", { type: "signature" }),
      field("tabla", { type: "table" }),
      field("lista", { type: "checklist" }),
    ]);
    expect(candidates.map((item) => item.id)).toEqual(["vehiculo"]);
  });
});

describe("sectionControllerCandidates", () => {
  const section = (
    id: string,
    order: number,
    fields: FormField[],
  ): FormSection => ({ id, label: id, order, fields });

  const first = section("uno", 1, [vehicle, field("lista", { type: "checklist" })]);
  const second = section("dos", 2, [field("placa")]);
  const third = section("tres", 3, [field("final")]);

  it("una sección sólo mira los datos de la respuesta y las secciones anteriores", () => {
    expect(
      sectionControllerCandidates(
        second,
        [third, second, first],
        FORM_CONTEXT_FIELDS,
      ).map((item) => item.id),
    ).toEqual(["@fecha", "@autor", "vehiculo"]);
  });

  it("la primera sección sólo puede depender de los datos de la respuesta", () => {
    expect(
      sectionControllerCandidates(first, [first, second], []).map(
        (item) => item.id,
      ),
    ).toEqual([]);
  });

  it("lo que ofrece lo acepta la validación del formato", () => {
    const [candidate] = sectionControllerCandidates(second, [first, second], []);
    const problems = validateForm(
      [
        first,
        {
          ...second,
          visibility: {
            match: "all",
            rules: [
              { fieldId: candidate.id, operator: "eq", values: ["moto"] },
            ],
          },
        },
      ],
      { kind: "record" },
    ).map((problem) => problem.code);
    expect(problems).not.toContain("sectionRuleNotEarlier");
  });
});

describe("newRule", () => {
  it("empieza con el primer operador del tipo y sin valor", () => {
    expect(newRule(field("f", { type: "date" }))).toEqual({
      fieldId: "f",
      operator: "before",
      values: [],
    });
  });

  it("sobre una firma empieza preguntando si está", () => {
    expect(newRule(field("f", { type: "signature" })).operator).toBe("isEmpty");
  });

  it("una condición recién añadida empieza sin campo, y la frase lo dice", () => {
    const rule = newRule();
    expect(rule).toEqual({ fieldId: "", operator: "eq", values: [] });
    expect(describeRule(rule, [])).toBe("una condición sin completar");
  });
});

describe("newComputed prefiere el mismo tipo", () => {
  it("el porcentaje de un importe parte de otro importe", () => {
    const vehicles = field("vehiculos", { type: "number" });
    const policy = field("poliza", { type: "currency" });
    const deductible = field("deducible", { type: "currency" });
    expect(
      newComputed("percent", deductible, [vehicles, policy, deductible]),
    ).toMatchObject({ kind: "percent", of: "poliza" });
  });
});

describe("describeComputed", () => {
  const contract = field("contrato", {
    type: "currency",
    label: "Valor del contrato",
  });
  const expiry = field("vence", { type: "date", label: "Vencimiento" });
  const withRecipe = (computed: FormField["config"]["computed"]) =>
    field("x", { type: "number", config: { computed } });

  it("lee cada receta como una frase", () => {
    const all = [contract, expiry];
    expect(
      describeComputed(
        withRecipe({ kind: "percent", of: "contrato", percent: 19 }),
        all,
      ),
    ).toBe("19 % de «Valor del contrato»");
    expect(
      describeComputed(withRecipe({ kind: "daysUntil", of: "vence" }), all),
    ).toBe("Días hasta «Vencimiento»");
    expect(
      describeComputed(
        withRecipe({ kind: "dateAdd", of: "vence", amount: 2, unit: "years" }),
        all,
      ),
    ).toBe("«Vencimiento» + 2 años");
    expect(
      describeComputed(
        withRecipe({ kind: "dateAdd", of: "vence", amount: -1, unit: "months" }),
        all,
      ),
    ).toBe("«Vencimiento» − 1 mes");
    expect(
      describeComputed(
        withRecipe({
          kind: "arithmetic",
          operands: ["contrato", "contrato"],
          op: "*",
        }),
        all,
      ),
    ).toBe("«Valor del contrato» × «Valor del contrato»");
    expect(
      describeComputed(
        withRecipe({
          kind: "formula",
          terms: [
            { type: "field", fieldId: "contrato" },
            { type: "op", op: "/" },
            { type: "const", value: 1000 },
          ],
        }),
        all,
      ),
    ).toBe("Fórmula: «Valor del contrato» ÷ 1.000");
  });

  it("un campo que escribe el usuario no tiene frase", () => {
    expect(describeComputed(field("a"), [])).toBeNull();
  });
});

describe("operandCandidates y newComputed", () => {
  const issued = field("expedicion", { type: "date", label: "Expedición" });
  const remaining = field("faltan", {
    type: "number",
    config: { computed: { kind: "daysUntil", of: "expedicion" } },
  });
  const note = field("nota");
  const expiry = field("vence", { type: "date" });

  it("sólo ofrece operandos del tipo que la receta pide", () => {
    expect(
      operandCandidates(expiry, [issued, remaining, note, expiry], "dateAdd").map(
        (item) => item.id,
      ),
    ).toEqual(["expedicion"]);
  });

  it("no ofrece lo que depende de hoy", () => {
    const total = field("total", { type: "number" });
    expect(
      operandCandidates(total, [remaining, total], "arithmetic").map(
        (item) => item.id,
      ),
    ).toEqual([]);
  });

  it("una relación o una tabla no entran en un texto compuesto", () => {
    const title = field("titulo");
    expect(
      operandCandidates(
        title,
        [
          title,
          note,
          field("equipo", { type: "reference" }),
          field("tabla", { type: "table" }),
        ],
        "concat",
      ).map((item) => item.id),
    ).toEqual(["nota"]);
  });

  it("una receta nueva nace con el primer operando que le sirve", () => {
    expect(newComputed("dateAdd", expiry, [issued, expiry])).toEqual({
      kind: "dateAdd",
      of: "expedicion",
      amount: 1,
      unit: "years",
    });
    expect(newComputed("count", expiry, [issued, expiry])).toBeNull();
  });
});

describe("los datos de la respuesta en el constructor", () => {
  const members = [
    { label: "Ana Ruiz", value: "user-ana" },
    { label: "Luis Gil", value: "user-luis" },
  ];
  const context = builderContextFields(FORM_CONTEXT_FIELDS, members);

  it("quien diligencia se elige de una lista de miembros, no se escribe", () => {
    const author = context.find((item) => item.id === "@autor");
    expect(author?.type).toBe("select");
    expect(author?.config.options).toEqual(members);
  });

  it("la fecha de la respuesta sigue siendo una fecha", () => {
    expect(context.find((item) => item.id === "@fecha")?.type).toBe("date");
  });

  it("la regla nombra al miembro, y lleva su grupo en el selector", () => {
    expect(
      describeRule(
        { fieldId: "@autor", operator: "eq", values: ["user-ana"] },
        context,
      ),
    ).toBe("«Quien diligencia» es igual a «Ana Ruiz»");
    expect(fieldOption(context[0]).description).toBe("De la respuesta");
    expect(fieldOption(vehicle).description).toBeUndefined();
  });

  it("la regla que sale del constructor la acepta el servidor", () => {
    const section: FormSection = {
      id: "s",
      label: "General",
      order: 1,
      fields: [
        field("nota", {
          config: {
            visibility: {
              match: "all",
              rules: [
                { fieldId: "@autor", operator: "anyOf", values: ["user-ana"] },
              ],
            },
          },
        }),
      ],
    };
    expect(validateForm([section], { kind: "record" })).toEqual([]);
  });
});
