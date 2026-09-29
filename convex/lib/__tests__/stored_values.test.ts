import { describe, expect, it } from "vitest";

import type { StoredFieldValue } from "../form_types";
import {
  fromStoredValue,
  fromStoredValues,
  isEmptyValue,
  storedFileIds,
  toStoredValue,
  toStoredValues,
} from "../stored_values";
import {
  checklistField,
  field,
  oneSection,
  referenceField,
  section,
  selectField,
  signatureField,
  tableField,
} from "./form.fixtures";

const signature = {
  storageId: "kg2firma",
  name: "firma.png",
  signerName: "Ana Rojas",
  signerDocument: "1020304050",
};
const vehicle = {
  responseId: "jd7slp835",
  label: "SLP-835",
  snapshot: [{ fieldId: "soat", label: "SOAT", text: "12345" }],
};

describe("toStoredValue", () => {
  it("cada tipo de campo guarda su `kind`", () => {
    const cases = [
      [field("a"), "SLP-835", { kind: "text", value: "SLP-835" }],
      [
        field("a", { type: "textarea" }),
        "Sin novedad",
        { kind: "text", value: "Sin novedad" },
      ],
      [
        field("a", { type: "email" }),
        "ana@obra.co",
        { kind: "text", value: "ana@obra.co" },
      ],
      [
        field("a", { type: "date" }),
        "2026-09-29",
        { kind: "text", value: "2026-09-29" },
      ],
      [field("a", { type: "time" }), "07:30", { kind: "text", value: "07:30" }],
      [
        selectField("a", ["diurno"]),
        "diurno",
        { kind: "text", value: "diurno" },
      ],
      [field("a", { type: "number" }), 8, { kind: "number", value: 8 }],
      [
        field("a", { type: "currency" }),
        1250000,
        { kind: "number", value: 1250000 },
      ],
      [
        field("a", { type: "checkbox" }),
        false,
        { kind: "boolean", value: false },
      ],
      [
        field("a", { type: "multiSelect" }),
        ["a", "b"],
        { kind: "list", value: ["a", "b"] },
      ],
      [
        field("a", { type: "image" }),
        { storageId: "kg2foto", name: "foto.jpg" },
        { kind: "file", storageId: "kg2foto", name: "foto.jpg" },
      ],
      [signatureField("a"), signature, { kind: "signature", ...signature }],
      [referenceField("a", "f"), vehicle, { kind: "reference", ...vehicle }],
    ] as const;
    for (const [definition, value, stored] of cases) {
      expect(toStoredValue(definition, value), definition.type).toEqual(stored);
    }
  });

  it("un valor vacío no se guarda", () => {
    expect(toStoredValue(field("a"), "")).toBeNull();
    expect(toStoredValue(field("a"), "   ")).toBeNull();
    expect(toStoredValue(field("a"), undefined)).toBeNull();
    expect(
      toStoredValue(field("a", { type: "number" }), Number.NaN),
    ).toBeNull();
    expect(toStoredValue(field("a", { type: "multiSelect" }), [])).toBeNull();
    expect(toStoredValue(tableField("a"), [])).toBeNull();
    expect(
      toStoredValue(checklistField("a"), [{ itemId: "aceite" }]),
    ).toBeNull();
    expect(
      toStoredValue(referenceField("a", "f"), { ...vehicle, responseId: "" }),
    ).toBeNull();
  });

  it("acepta lo que un control de texto entrega para un número o una casilla", () => {
    // Un valor sugerido escribe `"true"`; un `<input>` entrega «12».
    expect(toStoredValue(field("a", { type: "number" }), "12")).toEqual({
      kind: "number",
      value: 12,
    });
    expect(toStoredValue(field("a", { type: "checkbox" }), "true")).toEqual({
      kind: "boolean",
      value: true,
    });
  });

  it("no guarda un valor cuya forma no es la de su campo", () => {
    expect(toStoredValue(field("a"), 5)).toBeNull();
    expect(toStoredValue(field("a", { type: "number" }), "doce")).toBeNull();
    expect(toStoredValue(field("a", { type: "checkbox" }), "sí")).toBeNull();
    expect(toStoredValue(field("a", { type: "multiSelect" }), "a")).toBeNull();
    expect(toStoredValue(field("a", { type: "file" }), "foto.jpg")).toBeNull();
    // Una imagen no es una firma: le falta quién firma.
    expect(
      toStoredValue(signatureField("a"), { storageId: "k", name: "f.png" }),
    ).toBeNull();
    expect(toStoredValue(referenceField("a", "f"), "jd7slp835")).toBeNull();
  });

  it("de una lista de chequeo guarda sólo los ítems que dicen algo", () => {
    expect(
      toStoredValue(checklistField("a"), [
        { itemId: "aceite", value: "b" },
        { itemId: "refrigerante" },
        { itemId: "altas", value: "m", note: "  Fundida  " },
        { itemId: "medias", note: "   " },
      ]),
    ).toEqual({
      kind: "checklist",
      items: [
        { itemId: "aceite", value: "b" },
        { itemId: "altas", value: "m", note: "Fundida" },
      ],
    });
  });

  it("de una tabla guarda cada celda con el `kind` de su columna", () => {
    expect(
      toStoredValue(tableField("a"), [
        {
          rowId: "r1",
          cells: [
            { columnId: "elemento", value: "Casco" },
            { columnId: "cantidad", value: 2 },
            { columnId: "fecha", value: "" },
          ],
        },
        // Una fila que nadie llenó no se guarda.
        { rowId: "r2", cells: [{ columnId: "elemento", value: "" }] },
      ]),
    ).toEqual({
      kind: "table",
      rows: [
        {
          rowId: "r1",
          cells: [
            { columnId: "elemento", value: { kind: "text", value: "Casco" } },
            { columnId: "cantidad", value: { kind: "number", value: 2 } },
          ],
        },
      ],
    });
  });

  it("una celda que no es de ninguna columna, o de otro tipo, invalida la tabla", () => {
    const row = (columnId: string, value: unknown) => [
      { rowId: "r1", cells: [{ columnId, value }] },
    ];
    expect(toStoredValue(tableField("a"), row("fantasma", "x"))).toBeNull();
    expect(
      toStoredValue(tableField("a"), row("cantidad", "muchos")),
    ).toBeNull();
  });
});

describe("fromStoredValue", () => {
  it("devuelve lo que el control y el motor esperan", () => {
    expect(fromStoredValue({ kind: "text", value: "SLP-835" })).toBe("SLP-835");
    expect(fromStoredValue({ kind: "number", value: 8 })).toBe(8);
    expect(fromStoredValue({ kind: "boolean", value: false })).toBe(false);
    expect(fromStoredValue({ kind: "list", value: ["a"] })).toEqual(["a"]);
    expect(fromStoredValue({ kind: "signature", ...signature })).toEqual(
      signature,
    );
    expect(fromStoredValue({ kind: "reference", ...vehicle })).toEqual(vehicle);
  });
});

describe("ida y vuelta", () => {
  const form = [
    section("datos", 1, [
      field("placa"),
      field("horas", { type: "number" }),
      field("casco", { type: "checkbox" }),
      field("cursos", { type: "multiSelect" }),
      referenceField("vehiculo", "f"),
    ]),
    section("inspeccion", 2, [
      checklistField("lista"),
      tableField("entregas"),
      signatureField("firma"),
    ]),
  ];
  const values = {
    placa: "SLP-835",
    horas: 8,
    casco: true,
    cursos: ["alturas"],
    vehiculo: vehicle,
    lista: [{ itemId: "aceite", value: "b" }],
    entregas: [
      { rowId: "r1", cells: [{ columnId: "elemento", value: "Casco" }] },
    ],
    firma: signature,
  };

  it("lo que se guarda se lee igual que se escribió", () => {
    const stored = toStoredValues(form, values);
    expect(stored.map((value) => value.fieldId)).toEqual(Object.keys(values));
    expect(fromStoredValues(stored)).toEqual(values);
  });

  it("no guarda lo vacío ni lo que no es de ningún campo", () => {
    expect(
      toStoredValues(oneSection(field("a"), field("b")), {
        a: "uno",
        b: "",
        suelto: "dos",
      }),
    ).toEqual([{ fieldId: "a", value: { kind: "text", value: "uno" } }]);
  });
});

describe("isEmptyValue", () => {
  it("una casilla sin marcar no está vacía; un cero tampoco", () => {
    expect(isEmptyValue(field("a", { type: "checkbox" }), false)).toBe(false);
    expect(isEmptyValue(field("a", { type: "number" }), 0)).toBe(false);
    expect(isEmptyValue(field("a", { type: "number" }), undefined)).toBe(true);
  });
});

describe("storedFileIds", () => {
  it("reúne los archivos de los campos y de las celdas, sin repetir", () => {
    const stored: StoredFieldValue[] = [
      {
        fieldId: "foto",
        value: { kind: "file", storageId: "a", name: "a.jpg" },
      },
      { fieldId: "firma", value: { kind: "signature", ...signature } },
      { fieldId: "placa", value: { kind: "text", value: "SLP-835" } },
      {
        fieldId: "entregas",
        value: {
          kind: "table",
          rows: [
            {
              rowId: "r1",
              cells: [
                {
                  columnId: "foto",
                  value: { kind: "file", storageId: "b", name: "b.jpg" },
                },
                {
                  columnId: "recibe",
                  value: { kind: "signature", ...signature },
                },
                {
                  columnId: "elemento",
                  value: { kind: "text", value: "Casco" },
                },
              ],
            },
          ],
        },
      },
    ];
    expect(storedFileIds(stored).sort()).toEqual(["a", "b", "kg2firma"]);
  });
});
