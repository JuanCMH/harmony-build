import { describe, expect, it } from "vitest";

import {
  createIdRegistry,
  validateChecklistConfig,
} from "@/convex/lib/field_config_validation";

import {
  CHECKLIST_SCALES,
  matchScale,
  newScaleOption,
  parseChecklistItems,
  scaleOptions,
} from "../checklist-scales";

/** Lo que importa de un ítem al comprobar la forma: todo menos su id. */
const shape = (blocks: ReturnType<typeof parseChecklistItems>) =>
  blocks.map((block) => block.map(({ id: _id, ...rest }) => rest));

describe("CHECKLIST_SCALES", () => {
  it("trae las cinco escalas del cliente", () => {
    expect(CHECKLIST_SCALES.map((scale) => scale.label)).toEqual([
      "B / M / N.A",
      "Sí / No",
      "Sí / No / N.A",
      "C / NC",
      "B / M",
    ]);
  });

  it("cada plantilla es una escala que el formato acepta", () => {
    for (const scale of CHECKLIST_SCALES) {
      const problems = validateChecklistConfig(
        {
          options: scaleOptions(scale.id),
          blocks: [{ id: "b", label: "", items: [{ id: "i", label: "Ítem" }] }],
          note: "onFail",
        },
        createIdRegistry(),
      );
      expect(problems).toEqual([]);
    }
  });

  it("toda escala tiene una opción conforme y una no conforme", () => {
    for (const scale of CHECKLIST_SCALES) {
      const meanings = scale.options.map((option) => option.meaning);
      expect(meanings).toContain("ok");
      expect(meanings).toContain("fail");
    }
  });
});

describe("scaleOptions y matchScale", () => {
  it("entrega una copia: cambiarla no toca la plantilla", () => {
    const options = scaleOptions("bmna");
    options[0].label = "Excelente";
    expect(scaleOptions("bmna")[0].label).toBe("Bueno");
  });

  it("reconoce una plantilla sin tocar, y deja de reconocerla al cambiarla", () => {
    expect(matchScale(scaleOptions("cnc"))).toBe("cnc");
    const edited = scaleOptions("cnc");
    edited[1].short = "X";
    expect(matchScale(edited)).toBeNull();
  });

  it("distingue B/M de B/M/N.A", () => {
    expect(matchScale(scaleOptions("bm"))).toBe("bm");
    expect(matchScale(scaleOptions("bmna"))).toBe("bmna");
  });
});

describe("newScaleOption", () => {
  it("no repite el valor de ninguna opción de la escala", () => {
    const options = scaleOptions("bmna");
    const added = newScaleOption(options);
    expect(options.map((option) => option.value)).not.toContain(added.value);
    expect(added.short.length).toBeLessThanOrEqual(4);
  });
});

describe("parseChecklistItems", () => {
  it("una línea es un ítem, y las vacías se ignoran", () => {
    expect(shape(parseChecklistItems("Aceite motor\n\n  \nRefrigerante\n"))).toEqual(
      [[{ label: "Aceite motor" }, { label: "Refrigerante" }]],
    );
  });

  it("una línea que acaba en «:» agrupa a las que siguen con sangría o guion", () => {
    const text = [
      "Luces frontales:",
      "  Altas",
      "- Medias",
      "\tDireccionales",
      "Pito",
    ].join("\n");
    expect(shape(parseChecklistItems(text))).toEqual([
      [
        { label: "Luces frontales", heading: true },
        { label: "Altas", indented: true },
        { label: "Medias", indented: true },
        { label: "Direccionales", indented: true },
        { label: "Pito" },
      ],
    ]);
  });

  it("una línea con sangría que no cuelga de nadie es un ítem normal", () => {
    expect(shape(parseChecklistItems("  Frenos\n- Llantas"))).toEqual([
      [{ label: "Frenos" }, { label: "Llantas" }],
    ]);
  });

  it("un grupo sin subítems pasa a ser un ítem normal", () => {
    expect(shape(parseChecklistItems("Luces:\nPito\nEspejos:"))).toEqual([
      [{ label: "Luces" }, { label: "Pito" }, { label: "Espejos" }],
    ]);
  });

  it("las líneas vacías separan bloques sólo si se pide", () => {
    const text = "Aceite\nRefrigerante\n\n\nFrenos\nDirección";
    expect(parseChecklistItems(text)).toHaveLength(1);
    expect(shape(parseChecklistItems(text, { splitBlocks: true }))).toEqual([
      [{ label: "Aceite" }, { label: "Refrigerante" }],
      [{ label: "Frenos" }, { label: "Dirección" }],
    ]);
  });

  it("un bloque nuevo corta el grupo: el subítem no hereda el del anterior", () => {
    const text = "Luces:\n- Altas\n\n- Pito";
    expect(shape(parseChecklistItems(text, { splitBlocks: true }))).toEqual([
      [{ label: "Luces", heading: true }, { label: "Altas", indented: true }],
      [{ label: "Pito" }],
    ]);
  });

  it("de una fila copiada de una hoja de cálculo toma la primera celda", () => {
    expect(shape(parseChecklistItems("Aceite motor\tB\tM\tN.A\r\nFrenos\t\t"))).toEqual(
      [[{ label: "Aceite motor" }, { label: "Frenos" }]],
    );
  });

  it("da un id distinto a cada ítem", () => {
    const [items] = parseChecklistItems("Uno\nDos\nTres");
    expect(new Set(items.map((item) => item.id)).size).toBe(3);
  });

  it("lo que devuelve lo acepta la validación del formato", () => {
    const blocks = parseChecklistItems(
      "Luces:\n- Altas\n- Bajas\nPito\n\n- Suelto\nGrupo vacío:",
      { splitBlocks: true },
    );
    const problems = validateChecklistConfig(
      {
        options: scaleOptions("bmna"),
        blocks: blocks.map((items, index) => ({
          id: `b${index}`,
          label: "",
          items,
        })),
        note: "onFail",
      },
      createIdRegistry(),
    );
    expect(problems).toEqual([]);
  });

  it("un texto sin nada que leer no da bloques", () => {
    expect(parseChecklistItems(" \n\n-\n:\n")).toEqual([]);
  });
});
