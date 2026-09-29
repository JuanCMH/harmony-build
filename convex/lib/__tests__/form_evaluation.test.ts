import { describe, expect, it } from "vitest";

import { formContext } from "../form_context";
import {
  evaluateForm,
  flattenFields,
  missingRequired,
  missingRequiredFields,
  pruneFormValues,
  sectionVisibility,
  visibleFields,
  visibleSections,
} from "../form_evaluation";
import {
  checklistField,
  field,
  oneSection,
  referenceField,
  rule,
  section,
  signatureField,
  tableField,
  when,
} from "./form.fixtures";

describe("flattenFields", () => {
  it("respeta el orden de las secciones, no el del arreglo", () => {
    const order = flattenFields([
      section("s2", 2, [field("b")]),
      section("s1", 1, [field("a")]),
    ]).map((f) => f.id);
    expect(order).toEqual(["a", "b"]);
  });
});

describe("missingRequiredFields", () => {
  it("señala los obligatorios vacíos", () => {
    const form = oneSection(field("a", { required: true, label: "Placa" }));
    expect(missingRequiredFields(form, {})).toEqual(["Placa"]);
    expect(missingRequiredFields(form, { a: "SLP-835" })).toEqual([]);
  });

  it("un campo de sólo espacios sigue estando vacío", () => {
    const form = oneSection(field("a", { required: true, label: "Placa" }));
    expect(missingRequiredFields(form, { a: "   " })).toEqual(["Placa"]);
  });

  it("una lista múltiple vacía cuenta como sin rellenar", () => {
    const form = oneSection(
      field("a", { type: "multiSelect", required: true, label: "Turnos" }),
    );
    expect(missingRequiredFields(form, { a: [] })).toEqual(["Turnos"]);
    expect(missingRequiredFields(form, { a: ["diurno"] })).toEqual([]);
  });

  it("una casilla sin marcar es una respuesta, no un vacío", () => {
    const form = oneSection(
      field("a", { type: "checkbox", required: true, label: "¿Usa casco?" }),
    );
    expect(missingRequiredFields(form, { a: false })).toEqual([]);
    expect(missingRequiredFields(form, {})).toEqual(["¿Usa casco?"]);
  });

  it("NO exige un campo obligatorio que está oculto", () => {
    // Es la razón de que esto exista: exigir algo que nadie ve bloquearía el
    // envío para siempre. Y es lo que permite que un condicional sea
    // obligatorio: se exige sólo cuando se muestra.
    const form = oneSection(
      field("tipo"),
      field("placa", {
        required: true,
        label: "Placa",
        config: { visibility: when(rule("tipo", "eq", "moto")) },
      }),
    );
    expect(missingRequiredFields(form, { tipo: "a pie" })).toEqual([]);
    expect(missingRequiredFields(form, { tipo: "moto" })).toEqual(["Placa"]);
  });

  it("NO exige un campo calculado: no lo rellena nadie", () => {
    const form = oneSection(
      field("total", {
        type: "number",
        required: true,
        label: "Total",
        config: {
          computed: { kind: "formula", terms: [{ type: "const", value: 1 }] },
        },
      }),
    );
    expect(missingRequiredFields(form, {})).toEqual([]);
  });

  it("los tipos nuevos están vacíos cuando no apuntan a nada", () => {
    const form = oneSection(
      referenceField("vehiculo", "f1", [], { required: true }),
      signatureField("firma", "author", { required: true }),
      tableField("entregas", { required: true }),
      checklistField("inspeccion", { required: true }),
    );
    expect(missingRequiredFields(form, {})).toEqual([
      "vehiculo",
      "firma",
      "entregas",
      "inspeccion",
    ]);
    expect(
      missingRequiredFields(form, {
        vehiculo: { responseId: "", label: "", snapshot: [] },
        firma: { storageId: "", name: "", signerName: "" },
        // Una fila o un ítem que nadie tocó no son una respuesta.
        entregas: [
          { rowId: "1", cells: [{ columnId: "elemento", value: "" }] },
        ],
        inspeccion: [{ itemId: "aceite" }],
      }),
    ).toHaveLength(4);
    expect(
      missingRequiredFields(form, {
        vehiculo: { responseId: "r1", label: "SLP-835", snapshot: [] },
        firma: { storageId: "s1", name: "firma.png", signerName: "Ana" },
        entregas: [
          { rowId: "1", cells: [{ columnId: "elemento", value: "Casco" }] },
        ],
        inspeccion: [{ itemId: "aceite", value: "b" }],
      }),
    ).toEqual([]);
  });

  it("sin secciones no falta nada", () => {
    expect(missingRequiredFields([], {})).toEqual([]);
  });
});

describe("missingRequired", () => {
  it("dice en qué sección está cada obligatorio vacío, en el orden del formato", () => {
    const sections = [
      section("s2", 2, [field("correo", { required: true, label: "Correo" })]),
      section("s1", 1, [field("codigo", { required: true, label: "Código" })]),
    ];
    expect(missingRequired(sections, {})).toEqual([
      { id: "codigo", label: "Código", sectionId: "s1" },
      { id: "correo", label: "Correo", sectionId: "s2" },
    ]);
  });
});

describe("visibilidad de sección", () => {
  /** «Si el equipo es eléctrico, muestra la sección de conexiones». */
  const form = [
    section("equipo", 1, [field("tipo"), field("nota")]),
    section(
      "conexiones",
      2,
      [field("cable"), field("clavija", { required: true })],
      when(rule("tipo", "eq", "electrico")),
    ),
  ];

  it("una sección sin condición se ve siempre", () => {
    const map = sectionVisibility([section("s", 1, [field("a")])], [], {});
    expect(map.get("s")).toBe(true);
  });

  it("una sección puede depender de un campo de una sección anterior", () => {
    const electric = evaluateForm(form, { tipo: "electrico" });
    expect(electric.sections.get("conexiones")).toBe(true);
    expect(electric.visibility.get("cable")).toBe(true);

    const manual = evaluateForm(form, { tipo: "manual" });
    expect(manual.sections.get("conexiones")).toBe(false);
    // El campo no tiene ninguna regla propia y aun así no se ve.
    expect(manual.visibility.get("cable")).toBe(false);
    expect(manual.visibility.get("nota")).toBe(true);
  });

  it("la sección manda sobre un campo con «cualquiera de estas»", () => {
    // Un campo con `match: "any"` se ve por su cuenta; dentro de una sección
    // que no aplica, no: el «Y» de la sección es externo a sus reglas.
    const withAny = [
      section("equipo", 1, [field("tipo")]),
      section(
        "conexiones",
        2,
        [
          field("cable", {
            config: {
              visibility: {
                match: "any",
                rules: [rule("tipo", "isNotEmpty")],
              },
            },
          }),
        ],
        when(rule("tipo", "eq", "electrico")),
      ),
    ];
    expect(
      evaluateForm(withAny, { tipo: "electrico" }).visibility.get("cable"),
    ).toBe(true);
    expect(
      evaluateForm(withAny, { tipo: "manual" }).visibility.get("cable"),
    ).toBe(false);
  });

  it("una sección que no aplica no deja pestaña ni exige sus obligatorios", () => {
    expect(
      visibleSections(form, { tipo: "manual" }).map((s) => s.section.id),
    ).toEqual(["equipo"]);
    expect(missingRequired(form, { tipo: "manual" })).toEqual([]);
    expect(missingRequired(form, { tipo: "electrico" })).toEqual([
      { id: "clavija", label: "clavija", sectionId: "conexiones" },
    ]);
  });

  it("lo escrito en una sección que deja de aplicar no se guarda", () => {
    const values = { tipo: "electrico", cable: "bueno", clavija: "buena" };
    expect(pruneFormValues(form, values)).toEqual(values);
    expect(pruneFormValues(form, { ...values, tipo: "manual" })).toEqual({
      tipo: "manual",
    });
  });

  it("quien depende de un campo oculto por su sección tampoco se ve", () => {
    // La transitividad cruza la sección: `resumen` mira `cable`, que no
    // existe para nadie cuando su sección no aplica. Y no se evalúa contra lo
    // que quedara escrito en él.
    const chained = [
      ...form,
      section("cierre", 3, [
        field("resumen", {
          config: { visibility: when(rule("cable", "isNotEmpty")) },
        }),
        field("aviso", {
          config: { visibility: when(rule("cable", "isEmpty")) },
        }),
      ]),
    ];
    const manual = evaluateForm(chained, { tipo: "manual", cable: "bueno" });
    expect(manual.visibility.get("resumen")).toBe(false);
    expect(manual.visibility.get("aviso")).toBe(false);

    const electric = evaluateForm(chained, {
      tipo: "electrico",
      cable: "bueno",
    });
    expect(electric.visibility.get("resumen")).toBe(true);
    expect(electric.visibility.get("aviso")).toBe(false);
  });

  it("una sección encadenada a otra que no aplica tampoco aplica", () => {
    const chained = [
      ...form,
      section("tablero", 3, [field("breaker")], when(rule("cable", "isEmpty"))),
    ];
    // `cable` está vacío, pero su sección no aplica: la regla no se cumple.
    expect(
      evaluateForm(chained, { tipo: "manual" }).sections.get("tablero"),
    ).toBe(false);
    expect(
      evaluateForm(chained, { tipo: "electrico" }).sections.get("tablero"),
    ).toBe(true);
  });

  it("una sección sin campos visibles no sale, aunque su condición se cumpla", () => {
    const allHidden = [
      section("s", 1, [
        field("a", { config: { visibility: when(rule("b", "isNotEmpty")) } }),
        field("b", { config: { visibility: when(rule("a", "isNotEmpty")) } }),
      ]),
    ];
    // Con el ciclo el motor enseña; con una regla que no se cumple, no.
    const hidden = [
      section("s", 1, [
        field("tipo"),
        field("a", { config: { visibility: when(rule("tipo", "eq", "x")) } }),
      ]),
      section("t", 2, [
        field("c", { config: { visibility: when(rule("tipo", "eq", "x")) } }),
      ]),
    ];
    expect(visibleSections(hidden, {}).map((s) => s.section.id)).toEqual(["s"]);
    expect(() => visibleSections(allHidden, {})).not.toThrow();
  });

  it("los campos visibles salen en el orden del formato", () => {
    expect(visibleFields(form, { tipo: "electrico" }).map((f) => f.id)).toEqual(
      ["tipo", "nota", "cable", "clavija"],
    );
    expect(visibleFields(form, {}).map((f) => f.id)).toEqual(["tipo", "nota"]);
  });
});

describe("contexto de la respuesta", () => {
  const context = formContext({ date: "2026-09-29", authorId: "usuario-1" });

  it("una regla puede mirar la fecha de la respuesta", () => {
    const form = oneSection(
      field("nuevo", {
        config: { visibility: when(rule("@fecha", "after", "2026-09-01")) },
      }),
    );
    expect(evaluateForm(form, {}, context).visibility.get("nuevo")).toBe(true);
    expect(
      evaluateForm(
        form,
        {},
        formContext({ date: "2026-08-15", authorId: "usuario-1" }),
      ).visibility.get("nuevo"),
    ).toBe(false);
  });

  it("los valores no pueden traer un dato del contexto", () => {
    // Si no, bastaría mandar `@autor` para hacerse pasar por otra persona.
    const form = oneSection(
      field("solo-ana", {
        required: true,
        config: { visibility: when(rule("@autor", "eq", "ana")) },
      }),
    );
    const forged = { "@autor": "ana" };
    expect(evaluateForm(form, forged, context).visibility.get("solo-ana")).toBe(
      false,
    );
    expect(evaluateForm(form, forged, context).values["@autor"]).toBe(
      "usuario-1",
    );
    expect(missingRequired(form, forged, context)).toEqual([]);
  });
});
