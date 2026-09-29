import { formContext } from "@/convex/lib/form_context";
import type {
  ChecklistConfig,
  FormField,
  FormSection,
} from "@/convex/lib/form_types";
import { describe, expect, it } from "vitest";
import {
  collectProblems,
  problemsBySection,
  problemsSummary,
  REQUIRED_MESSAGE,
} from "../submission-problems";

const field = (
  id: string,
  type: FormField["type"],
  extras: Partial<FormField> = {},
): FormField => ({
  id,
  type,
  label: id,
  required: false,
  size: "medium",
  showInTable: false,
  config: {},
  ...extras,
});

const CHECKLIST: ChecklistConfig = {
  note: "onFail",
  options: [
    { value: "b", label: "Bueno", short: "B", meaning: "ok" },
    { value: "m", label: "Malo", short: "M", meaning: "fail" },
  ],
  blocks: [
    {
      id: "niveles",
      label: "Niveles",
      items: [
        { id: "aceite", label: "Aceite" },
        { id: "agua", label: "Agua" },
        { id: "frenos", label: "Frenos" },
      ],
    },
  ],
};

const SECTIONS: FormSection[] = [
  {
    id: "identificacion",
    label: "Identificación",
    order: 1,
    fields: [
      field("placa", "text", { required: true }),
      field("correo", "email"),
      field("tiene-remolque", "checkbox"),
      field("remolque", "text", {
        required: true,
        config: {
          visibility: {
            match: "all",
            rules: [
              { fieldId: "tiene-remolque", operator: "isChecked", values: [] },
            ],
          },
        },
      }),
    ],
  },
  {
    id: "inspeccion",
    label: "Inspección",
    order: 2,
    fields: [
      field("estado", "checklist", {
        required: true,
        config: { checklist: CHECKLIST },
      }),
      field("foto", "image", { required: true }),
      field("elementos", "table", {
        config: {
          table: {
            rowLabel: "Elemento",
            minRows: 1,
            columns: [
              { id: "detalle", label: "Detalle", type: "text", required: true },
              {
                id: "cantidad",
                label: "Cantidad",
                type: "number",
                required: true,
              },
            ],
          },
        },
      }),
    ],
  },
];

const photo = { file: new File(["x"], "foto.png"), name: "foto.png" };

const complete = () => ({
  placa: "SLP-835",
  estado: [
    { itemId: "aceite", value: "b" },
    { itemId: "agua", value: "b" },
    { itemId: "frenos", value: "b" },
  ],
  foto: photo,
});

describe("lo que impide enviar", () => {
  it("nada, si todo lo obligatorio está y lo escrito vale", () => {
    expect(collectProblems(SECTIONS, complete())).toEqual([]);
  });

  it("los obligatorios vacíos, en el orden del formato", () => {
    const problems = collectProblems(SECTIONS, {});
    expect(problems.map((item) => item.fieldId)).toEqual([
      "placa",
      "estado",
      "foto",
    ]);
    expect(problems[0]).toEqual({
      fieldId: "placa",
      sectionId: "identificacion",
      kind: "missing",
      message: REQUIRED_MESSAGE,
    });
  });

  it("un obligatorio oculto no se exige; a la vista, sí", () => {
    expect(
      collectProblems(SECTIONS, complete()).map((item) => item.fieldId),
    ).not.toContain("remolque");
    expect(
      collectProblems(SECTIONS, { ...complete(), "tiene-remolque": true }).map(
        (item) => item.fieldId,
      ),
    ).toEqual(["remolque"]);
  });

  it("lo escrito en un campo oculto no se valida", () => {
    const hidden: FormSection[] = [
      {
        id: "s",
        label: "S",
        order: 1,
        fields: [
          field("con-correo", "checkbox"),
          field("correo", "email", {
            config: {
              visibility: {
                match: "all",
                rules: [
                  { fieldId: "con-correo", operator: "isChecked", values: [] },
                ],
              },
            },
          }),
        ],
      },
    ];
    expect(collectProblems(hidden, { correo: "no-es-correo" })).toEqual([]);
  });

  it("un valor que no vale es un problema aunque el campo no sea obligatorio", () => {
    const problems = collectProblems(SECTIONS, {
      ...complete(),
      correo: "sin-arroba",
    });
    expect(problems).toEqual([
      {
        fieldId: "correo",
        sectionId: "identificacion",
        kind: "invalid",
        message: "No es un correo válido",
      },
    ]);
  });

  it("un archivo todavía sin subir cuenta como respondido y no como inválido", () => {
    expect(
      collectProblems(SECTIONS, complete()).some(
        (item) => item.fieldId === "foto",
      ),
    ).toBe(false);
  });

  it("un derivado ni falta ni está mal", () => {
    const computed: FormSection[] = [
      {
        id: "s",
        label: "S",
        order: 1,
        fields: [
          field("horas", "number"),
          field("total", "number", {
            required: true,
            config: {
              computed: { kind: "arithmetic", operands: ["horas"], op: "+" },
            },
          }),
        ],
      },
    ];
    expect(collectProblems(computed, {})).toEqual([]);
  });

  it("usa el contexto de la respuesta para decidir qué se ve", () => {
    const byAuthor: FormSection[] = [
      {
        id: "s",
        label: "S",
        order: 1,
        fields: [
          field("motivo", "text", {
            required: true,
            config: {
              visibility: {
                match: "all",
                rules: [{ fieldId: "@autor", operator: "eq", values: ["u1"] }],
              },
            },
          }),
        ],
      },
    ];
    const context = (authorId: string) =>
      formContext({ date: "2026-09-29", authorId });
    expect(collectProblems(byAuthor, {}, context("u1"))).toHaveLength(1);
    expect(collectProblems(byAuthor, {}, context("u2"))).toEqual([]);
  });
});

describe("una lista de chequeo a medias", () => {
  it("señala el primer ítem sin responder, en el orden de la lista", () => {
    const problems = collectProblems(SECTIONS, {
      ...complete(),
      // Respondida al revés: primero el último.
      estado: [{ itemId: "frenos", value: "b" }],
    });
    expect(problems).toEqual([
      {
        fieldId: "estado",
        sectionId: "inspeccion",
        kind: "missing",
        message: "Faltan ítems por responder",
        itemId: "aceite",
      },
    ]);
  });

  it("señala el ítem no conforme al que le falta la observación", () => {
    const problems = collectProblems(SECTIONS, {
      ...complete(),
      estado: [
        { itemId: "aceite", value: "b" },
        { itemId: "agua", value: "m" },
        { itemId: "frenos", value: "b" },
      ],
    });
    expect(problems).toEqual([
      {
        fieldId: "estado",
        sectionId: "inspeccion",
        kind: "missing",
        message: "Falta la observación de un ítem no conforme",
        itemId: "agua",
      },
    ]);
  });

  it("con la observación escrita, el no conforme no impide enviar", () => {
    expect(
      collectProblems(SECTIONS, {
        ...complete(),
        estado: [
          { itemId: "aceite", value: "b" },
          { itemId: "agua", value: "m", note: "Fuga en la manguera" },
          { itemId: "frenos", value: "b" },
        ],
      }),
    ).toEqual([]);
  });
});

describe("una tabla", () => {
  it("señala la celda obligatoria sin llenar, con su fila y su columna", () => {
    const problems = collectProblems(SECTIONS, {
      ...complete(),
      elementos: [
        { rowId: "fila-1", cells: [{ columnId: "detalle", value: "Casco" }] },
      ],
    });
    expect(problems).toEqual([
      {
        fieldId: "elementos",
        sectionId: "inspeccion",
        kind: "missing",
        message: "Hay una fila con una celda obligatoria sin llenar",
        rowId: "fila-1",
        columnId: "cantidad",
      },
    ]);
  });

  it("una fila que nadie llenó no cuenta", () => {
    expect(
      collectProblems(SECTIONS, {
        ...complete(),
        elementos: [
          {
            rowId: "fila-1",
            cells: [
              { columnId: "detalle", value: "Casco" },
              { columnId: "cantidad", value: 2 },
            ],
          },
          { rowId: "fila-2", cells: [] },
        ],
      }),
    ).toEqual([]);
  });
});

describe("lo que dice la barra de envío", () => {
  it("nada, si no falta nada", () => {
    expect(problemsSummary([])).toBeNull();
  });

  it("cuenta los obligatorios, en singular y en plural", () => {
    expect(problemsSummary(collectProblems(SECTIONS, {}))).toBe(
      "Faltan 3 obligatorios",
    );
    expect(
      problemsSummary(collectProblems(SECTIONS, { ...complete(), placa: "" })),
    ).toBe("Falta 1 obligatorio");
  });

  it("separa lo que falta de lo que hay que corregir", () => {
    expect(
      problemsSummary(
        collectProblems(SECTIONS, { correo: "sin-arroba", foto: photo }),
      ),
    ).toBe("Faltan 2 obligatorios · 1 por corregir");
    expect(
      problemsSummary(
        collectProblems(SECTIONS, { ...complete(), correo: "sin-arroba" }),
      ),
    ).toBe("1 por corregir");
  });

  it("cuenta por sección", () => {
    expect(problemsBySection(collectProblems(SECTIONS, {}))).toEqual(
      new Map([
        ["identificacion", 1],
        ["inspeccion", 2],
      ]),
    );
  });
});
