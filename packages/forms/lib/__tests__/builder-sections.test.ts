import { describe, expect, it } from "vitest";

import type {
  ChecklistConfig,
  FormField,
  FormSection,
} from "@/convex/lib/form_types";
import { validateForm } from "@/convex/lib/form_validation";

import {
  appendSection,
  duplicateFieldInPlace,
  findSectionOfField,
  insertField,
  locateProblems,
  moveField,
  moveSection,
  previewChecklist,
  removeField,
  removeSection,
  reorderField,
  sectionsFingerprint,
  summarizeSections,
  titleFieldCandidates,
  updateField,
} from "../builder-sections";

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

const section = (
  id: string,
  order: number,
  fields: FormField[],
  extra: Partial<FormSection> = {},
): FormSection => ({ id, label: id, order, fields, ...extra });

const ids = (sections: FormSection[]) =>
  sections.map((item) => item.fields.map((entry) => entry.id));

const base = [
  section("uno", 1, [field("a"), field("b"), field("c")]),
  section("dos", 2, [field("d")]),
];

describe("insertField", () => {
  it("pone el campo delante del que tenía debajo al soltarlo", () => {
    expect(
      ids(
        insertField(base, field("x"), { sectionId: "uno", beforeFieldId: "b" }),
      ),
    ).toEqual([["a", "x", "b", "c"], ["d"]]);
  });

  it("sin posición, lo deja al final de la sección", () => {
    expect(ids(insertField(base, field("x"), { sectionId: "dos" }))).toEqual([
      ["a", "b", "c"],
      ["d", "x"],
    ]);
  });

  it("si el campo de referencia ya no está, lo deja al final", () => {
    expect(
      ids(
        insertField(base, field("x"), {
          sectionId: "uno",
          beforeFieldId: "fantasma",
        }),
      ),
    ).toEqual([["a", "b", "c", "x"], ["d"]]);
  });
});

describe("moveField", () => {
  it("lleva un campo a otra sección sin duplicarlo ni perderlo", () => {
    const moved = moveField(base, "b", { sectionId: "dos" });
    expect(ids(moved)).toEqual([
      ["a", "c"],
      ["d", "b"],
    ]);
  });

  it("lo deja en una posición concreta de la otra sección", () => {
    expect(
      ids(moveField(base, "a", { sectionId: "dos", beforeFieldId: "d" })),
    ).toEqual([
      ["b", "c"],
      ["a", "d"],
    ]);
  });

  it("no mueve nada si la sección de destino no existe", () => {
    expect(ids(moveField(base, "a", { sectionId: "fantasma" }))).toEqual(
      ids(base),
    );
  });

  it("soltarlo sobre sí mismo no lo mueve", () => {
    expect(
      ids(moveField(base, "b", { sectionId: "uno", beforeFieldId: "b" })),
    ).toEqual(ids(base));
  });

  it("conserva el campo entero, con su configuración", () => {
    const withRule = [
      section("uno", 1, [
        field("a", { required: true, config: { maxLength: 10 } }),
      ]),
      section("dos", 2, []),
    ];
    const moved = moveField(withRule, "a", { sectionId: "dos" });
    expect(moved[1].fields[0]).toEqual(withRule[0].fields[0]);
  });
});

describe("reorderField", () => {
  it("hacia abajo queda detrás del campo sobre el que se soltó", () => {
    expect(ids(reorderField(base, "uno", "a", "c"))).toEqual([
      ["b", "c", "a"],
      ["d"],
    ]);
  });

  it("hacia arriba queda delante", () => {
    expect(ids(reorderField(base, "uno", "c", "a"))).toEqual([
      ["c", "a", "b"],
      ["d"],
    ]);
  });

  it("no toca nada si alguno de los dos no es de la sección", () => {
    expect(ids(reorderField(base, "uno", "a", "d"))).toEqual(ids(base));
  });
});

describe("secciones", () => {
  it("quitar una sección vuelve a numerar las que quedan", () => {
    const three = [...base, section("tres", 3, [])];
    expect(
      removeSection(three, "dos").map((item) => [item.id, item.order]),
    ).toEqual([
      ["uno", 1],
      ["tres", 2],
    ]);
  });

  it("una sección nueva entra al final", () => {
    const added = appendSection(base, section("nueva", 99, []));
    expect(added.map((item) => [item.id, item.order])).toEqual([
      ["uno", 1],
      ["dos", 2],
      ["nueva", 3],
    ]);
  });

  it("quitar y cambiar un campo no tocan a los demás", () => {
    expect(ids(removeField(base, "b"))).toEqual([["a", "c"], ["d"]]);
    const renamed = updateField(base, field("d", { label: "Placa" }));
    expect(renamed[1].fields[0].label).toBe("Placa");
    expect(renamed[0]).toEqual(base[0]);
  });

  it("sabe en qué sección vive un campo", () => {
    expect(findSectionOfField(base, "d")?.id).toBe("dos");
    expect(findSectionOfField(base, "fantasma")).toBeUndefined();
  });

  it("resume el formato en singular y en plural", () => {
    expect(summarizeSections(base)).toBe("4 campos · 2 secciones");
    expect(summarizeSections([section("s", 1, [field("a")])])).toBe(
      "1 campo · 1 sección",
    );
  });
});

describe("titleFieldCandidates", () => {
  const plate = field("placa", { required: true });
  const optional = field("marca");
  const conditional = field("serie", {
    required: true,
    config: {
      visibility: {
        match: "all",
        rules: [{ fieldId: "placa", operator: "isNotEmpty", values: [] }],
      },
    },
  });
  const computed = field("nombre", {
    required: true,
    config: {
      computed: {
        kind: "concat",
        parts: [{ type: "field", fieldId: "placa" }],
      },
    },
  });
  const number = field("modelo", { type: "number", required: true });
  const draft = [
    section("s", 1, [plate, optional, conditional, computed, number]),
  ];

  it("sólo ofrece textos cortos, obligatorios, sin condición ni cálculo", () => {
    expect(titleFieldCandidates(draft, null).map((item) => item.id)).toEqual([
      "placa",
    ]);
  });

  it("no ofrece los campos de una sección condicional", () => {
    const hidden = section("s", 1, [plate], {
      visibility: {
        match: "all",
        rules: [{ fieldId: "@fecha", operator: "isNotEmpty", values: [] }],
      },
    });
    expect(titleFieldCandidates([hidden], null)).toEqual([]);
  });

  it("en un listado publicado, un campo recién añadido todavía no se ofrece", () => {
    const added = field("codigo", { required: true });
    const next = [section("s", 1, [plate, added])];
    expect(titleFieldCandidates(next, draft).map((item) => item.id)).toEqual([
      "placa",
    ]);
  });

  it("tampoco uno que en la versión publicada no era obligatorio", () => {
    const published = [section("s", 1, [field("placa")])];
    expect(titleFieldCandidates(draft, published)).toEqual([]);
  });

  it("lo que ofrece lo acepta la validación del formato", () => {
    for (const candidate of titleFieldCandidates(draft, null)) {
      const codes = validateForm(draft, {
        kind: "catalog",
        titleFieldId: candidate.id,
      }).map((problem) => problem.code);
      expect(codes).not.toContain("titleFieldInvalid");
      expect(codes).not.toContain("titleFieldMissing");
    }
  });
});

describe("locateProblems", () => {
  it("dice en qué sección y en qué campo está cada problema", () => {
    const broken = [
      section("General", 1, [field("a", { label: "Placa" })]),
      section("Datos", 2, [field("b", { label: "" })]),
    ];
    const located = locateProblems(
      validateForm(broken, { kind: "record" }),
      broken,
    );
    expect(located).toHaveLength(1);
    expect(located[0]).toMatchObject({
      code: "labelRequired",
      sectionId: "Datos",
      fieldId: "b",
      location: "Datos",
    });
  });

  it("nombra el campo cuando tiene nombre", () => {
    const broken = [
      section("General", 1, [
        field("a", { label: "Tipo", type: "select", config: { options: [] } }),
      ]),
    ];
    const [problem] = locateProblems(
      validateForm(broken, { kind: "record" }),
      broken,
    );
    expect(problem.location).toBe("General › Tipo");
  });

  it("un problema del formato entero no tiene sitio", () => {
    const [problem] = locateProblems(
      [{ code: "dependencyCycle", message: "…" }],
      base,
    );
    expect(problem.location).toBeNull();
  });
});

describe("previewChecklist", () => {
  const items = (prefix: string, count: number) =>
    Array.from({ length: count }, (_, index) => ({
      id: `${prefix}${index}`,
      label: `Ítem ${index}`,
    }));

  const config: ChecklistConfig = {
    options: [],
    note: "never",
    blocks: [
      { id: "b1", label: "Niveles", items: items("n", 40) },
      { id: "b2", label: "Luces", items: items("l", 23) },
      { id: "b3", label: "Corto", items: items("c", 2) },
    ],
  };

  it("enseña los primeros de cada bloque y cuenta el resto", () => {
    const preview = previewChecklist(config, 2);
    expect(preview.config.blocks.map((block) => block.items.length)).toEqual([
      2, 2, 2,
    ]);
    expect(preview.hidden).toBe(59);
  });

  it("una lista corta sale entera", () => {
    const short: ChecklistConfig = { ...config, blocks: [config.blocks[2]] };
    expect(previewChecklist(short)).toEqual({ config: short, hidden: 0 });
  });

  it("no corta entre una fila que agrupa y su primer subítem", () => {
    const grouped: ChecklistConfig = {
      ...config,
      blocks: [
        {
          id: "b",
          label: "",
          items: [
            { id: "1", label: "Pito" },
            { id: "2", label: "Luces", heading: true },
            { id: "3", label: "Altas", indented: true },
            { id: "4", label: "Bajas", indented: true },
          ],
        },
      ],
    };
    const preview = previewChecklist(grouped, 2);
    expect(preview.config.blocks[0].items.map((item) => item.id)).toEqual([
      "1",
      "2",
      "3",
    ]);
    expect(preview.hidden).toBe(1);
  });

  it("no toca la configuración original", () => {
    previewChecklist(config, 1);
    expect(config.blocks[0].items).toHaveLength(40);
  });
});

describe("moveSection", () => {
  const sections = [
    section("a", 1, []),
    section("b", 2, []),
    section("c", 3, []),
  ];

  it("mueve y renumera", () => {
    const moved = moveSection(sections, "c", -1);
    expect(moved.map((current) => [current.id, current.order])).toEqual([
      ["a", 1],
      ["c", 2],
      ["b", 3],
    ]);
  });

  it("en el borde no mueve nada", () => {
    expect(moveSection(sections, "a", -1).map((current) => current.id)).toEqual(
      ["a", "b", "c"],
    );
    expect(moveSection(sections, "c", 1).map((current) => current.id)).toEqual([
      "a",
      "b",
      "c",
    ]);
  });
});

describe("sectionsFingerprint", () => {
  it("no distingue el orden de las claves ni las vacías", () => {
    const local: FormSection = {
      id: "s",
      label: "General",
      order: 1,
      description: undefined,
      fields: [field("a", { config: { minLength: undefined, maxLength: 5 } })],
    };
    const server = {
      fields: [
        {
          config: { maxLength: 5 },
          showInTable: false,
          size: "medium",
          required: false,
          label: "a",
          type: "text",
          id: "a",
        },
      ],
      order: 1,
      label: "General",
      id: "s",
    } as FormSection;
    expect(sectionsFingerprint([local])).toBe(sectionsFingerprint([server]));
  });

  it("sí distingue un cambio de verdad", () => {
    expect(sectionsFingerprint([section("s", 1, [field("a")])])).not.toBe(
      sectionsFingerprint([section("s", 1, [field("a", { required: true })])]),
    );
  });
});

describe("duplicateFieldInPlace", () => {
  it("pone la copia justo detrás, con otro id", () => {
    const result = duplicateFieldInPlace(base, "a");
    if (!result) throw new Error("sin copia");
    expect(ids(result.sections)).toEqual([
      ["a", result.copyId, "b", "c"],
      ["d"],
    ]);
    expect(result.copyId).not.toBe("a");
  });

  it("al final de la sección, queda la última", () => {
    const result = duplicateFieldInPlace(base, "d");
    expect(result && ids(result.sections)[1]).toEqual(["d", result?.copyId]);
  });

  it("un campo que no está no se copia", () => {
    expect(duplicateFieldInPlace(base, "zz")).toBeNull();
  });
});
