import { describe, expect, it } from "vitest";

import {
  createIdRegistry,
  validateChecklistConfig,
} from "@/convex/lib/field_config_validation";
import type {
  ChecklistBlock,
  ChecklistConfig,
  ChecklistItem,
} from "@/convex/lib/form_types";

import {
  addBlock,
  addItem,
  appendPasted,
  canIndent,
  countChecklistItems,
  describePaste,
  moveBlock,
  moveChecklistItem,
  moveItem,
  normalizeIndents,
  removeBlock,
  removeItem,
  renameBlock,
  renameItem,
  toggleHeading,
  toggleIndented,
} from "../checklist-editing";
import { scaleOptions } from "../checklist-scales";

const item = (
  id: string,
  flags: Partial<ChecklistItem> = {},
): ChecklistItem => ({ id, label: id, ...flags });

const block = (
  id: string,
  items: ChecklistItem[],
  label = id,
): ChecklistBlock => ({
  id,
  label,
  items,
});

const config = (blocks: ChecklistBlock[]): ChecklistConfig => ({
  options: scaleOptions("bmna"),
  blocks,
  note: "onFail",
});

const ids = (value: ChecklistConfig, blockIndex = 0) =>
  value.blocks[blockIndex].items.map((current) => current.id);

const isValid = (value: ChecklistConfig) =>
  !validateChecklistConfig(value, createIdRegistry()).includes(
    "checklistIndentedOrphan",
  );

describe("moveItem", () => {
  it("mueve y corre a los demás", () => {
    expect(moveItem(["a", "b", "c"], 0, 2)).toEqual(["b", "c", "a"]);
    expect(moveItem(["a", "b", "c"], 2, 0)).toEqual(["c", "a", "b"]);
  });

  it("fuera de rango no mueve nada", () => {
    expect(moveItem(["a", "b"], 0, -1)).toEqual(["a", "b"]);
    expect(moveItem(["a", "b"], 1, 2)).toEqual(["a", "b"]);
  });
});

describe("normalizeIndents", () => {
  it("convierte en ítem el subítem que no cuelga de nada", () => {
    const items = normalizeIndents([item("a"), item("b", { indented: true })]);
    expect(items[1]).toEqual({ id: "b", label: "b" });
  });

  it("conserva la cadena de subítems bajo una fila que agrupa", () => {
    const items = [
      item("g", { heading: true }),
      item("a", { indented: true }),
      item("b", { indented: true }),
    ];
    expect(normalizeIndents(items)).toEqual(items);
  });

  it("un ítem normal corta la cadena", () => {
    const items = normalizeIndents([
      item("g", { heading: true }),
      item("x"),
      item("a", { indented: true }),
    ]);
    expect(items[2].indented).toBeUndefined();
  });
});

describe("canIndent", () => {
  const items = [item("g", { heading: true }), item("a"), item("b")];
  it("sólo con una fila que agrupa o un subítem encima", () => {
    expect(canIndent(items, 0)).toBe(false);
    expect(canIndent(items, 1)).toBe(true);
    expect(canIndent(items, 2)).toBe(false);
  });
});

describe("bloques", () => {
  it("añade un bloque con un ítem para escribir", () => {
    const next = addBlock(config([block("b1", [item("a")])]), "Mecánico");
    expect(next.blocks).toHaveLength(2);
    expect(next.blocks[1].label).toBe("Mecánico");
    expect(next.blocks[1].items).toHaveLength(1);
  });

  it("renombra, mueve y quita, pero nunca el último", () => {
    let value = config([block("b1", [item("a")]), block("b2", [item("b")])]);
    value = renameBlock(value, "b1", "Niveles");
    expect(value.blocks[0].label).toBe("Niveles");
    value = moveBlock(value, "b1", 1);
    expect(value.blocks.map((current) => current.id)).toEqual(["b2", "b1"]);
    value = removeBlock(value, "b2");
    expect(value.blocks.map((current) => current.id)).toEqual(["b1"]);
    expect(removeBlock(value, "b1")).toBe(value);
  });
});

describe("ítems", () => {
  it("añade detrás del ítem indicado", () => {
    const { config: next, itemId } = addItem(
      config([block("b1", [item("a"), item("b")])]),
      "b1",
      "a",
    );
    expect(ids(next)).toEqual(["a", itemId, "b"]);
  });

  it("debajo de una fila que agrupa nace como subítem", () => {
    const { config: next, itemId } = addItem(
      config([block("b1", [item("g", { heading: true })])]),
      "b1",
      "g",
    );
    const added = next.blocks[0].items.find((current) => current.id === itemId);
    expect(added?.indented).toBe(true);
  });

  it("renombra y mueve", () => {
    let value = config([block("b1", [item("a"), item("b")])]);
    value = renameItem(value, "b1", "a", "Aceite");
    expect(value.blocks[0].items[0].label).toBe("Aceite");
    value = moveChecklistItem(value, "b1", "a", 1);
    expect(ids(value)).toEqual(["b", "a"]);
  });

  it("quitar la fila que agrupa no deja subítems huérfanos", () => {
    const value = removeItem(
      config([
        block("b1", [
          item("g", { heading: true }),
          item("a", { indented: true }),
        ]),
      ]),
      "b1",
      "g",
    );
    expect(value.blocks[0].items).toEqual([{ id: "a", label: "a" }]);
    expect(isValid(value)).toBe(true);
  });

  it("subir un subítem por encima de su grupo lo saca del grupo", () => {
    const value = moveChecklistItem(
      config([
        block("b1", [
          item("g", { heading: true }),
          item("a", { indented: true }),
        ]),
      ]),
      "b1",
      "a",
      -1,
    );
    expect(value.blocks[0].items[0]).toEqual({ id: "a", label: "a" });
    expect(isValid(value)).toBe(true);
  });

  it("dejar de agrupar suelta a los subítems", () => {
    const value = toggleHeading(
      config([
        block("b1", [
          item("g", { heading: true }),
          item("a", { indented: true }),
        ]),
      ]),
      "b1",
      "g",
    );
    expect(value.blocks[0].items).toEqual([
      { id: "g", label: "g" },
      { id: "a", label: "a" },
    ]);
  });

  it("convertir en fila que agrupa quita la sangría", () => {
    const value = toggleHeading(
      config([
        block("b1", [
          item("g", { heading: true }),
          item("a", { indented: true }),
        ]),
      ]),
      "b1",
      "a",
    );
    expect(value.blocks[0].items[1]).toEqual({
      id: "a",
      label: "a",
      heading: true,
    });
  });

  it("sólo sangra lo que tiene de qué colgar", () => {
    const start = config([
      block("b1", [item("a"), item("g", { heading: true }), item("b")]),
    ]);
    expect(toggleIndented(start, "b1", "a")).toEqual(start);
    const indented = toggleIndented(start, "b1", "b");
    expect(indented.blocks[0].items[2].indented).toBe(true);
    expect(toggleIndented(indented, "b1", "b").blocks[0].items[2]).toEqual({
      id: "b",
      label: "b",
    });
  });
});

describe("appendPasted", () => {
  const pasted = [[item("x"), item("y")], [item("z")]];

  it("sustituye el bloque recién creado en vez de dejarlo vacío", () => {
    const value = appendPasted(
      config([block("b1", [item("", { label: "" })], "")]),
      pasted,
      false,
    );
    expect(value.blocks).toHaveLength(1);
    expect(ids(value)).toEqual(["x", "y", "z"]);
  });

  it("sin partir, añade al final del último bloque", () => {
    const value = appendPasted(
      config([block("b1", [item("a")]), block("b2", [item("b")])]),
      pasted,
      false,
    );
    expect(ids(value, 1)).toEqual(["b", "x", "y", "z"]);
  });

  it("partiendo, cada grupo es un bloque nuevo", () => {
    const value = appendPasted(
      config([block("b1", [item("a")])]),
      pasted,
      true,
    );
    expect(value.blocks).toHaveLength(3);
    expect(ids(value, 2)).toEqual(["z"]);
  });

  it("sin nada pegado no cambia", () => {
    const value = config([block("b1", [item("a")])]);
    expect(appendPasted(value, [], true)).toBe(value);
  });

  it("cuenta los ítems de todos los bloques", () => {
    expect(
      countChecklistItems(
        config([block("b1", [item("a"), item("b")]), block("b2", [item("c")])]),
      ),
    ).toBe(3);
  });
});

describe("describePaste", () => {
  it("dice qué se va a añadir", () => {
    expect(describePaste([], false)).toBe("Pega una lista: un ítem por línea.");
    expect(
      describePaste(
        [
          [item("g", { heading: true }), item("a", { indented: true })],
          [item("b")],
        ],
        true,
      ),
    ).toBe("Se añadirán 2 ítems, 1 fila que agrupa, en 2 bloques.");
    expect(describePaste([[item("a")]], false)).toBe("Se añadirán 1 ítem.");
  });
});
