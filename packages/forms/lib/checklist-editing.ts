import type {
  ChecklistBlock,
  ChecklistConfig,
  ChecklistItem,
} from "@/convex/lib/form_types";

import { newChecklistBlock, newChecklistItem } from "./field-defaults";

/**
 * Lo que el editor de una lista de chequeo le hace a su configuración, sin
 * pintar nada: añadir, renombrar, mover y borrar bloques e ítems, convertir un
 * ítem en fila que agrupa o en subítem, y pegar una lista.
 *
 * Todo devuelve una configuración nueva y deja los subítems siempre colgando
 * de algo: borrar o convertir la fila que agrupa no puede dejar huérfanos, que
 * es justo lo que `validateChecklistConfig` rechaza al guardar.
 */

/** Un elemento movido de `from` a `to`, corriendo a los demás. Fuera de rango
 *  no mueve nada. */
export const moveItem = <T>(items: readonly T[], from: number, to: number) => {
  if (
    from === to ||
    from < 0 ||
    to < 0 ||
    from >= items.length ||
    to >= items.length
  ) {
    return [...items];
  }
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
};

/**
 * Los ítems de un bloque con los subítems que ya no cuelgan de nada
 * convertidos en ítems normales. Un subítem cuelga de una fila que agrupa, o
 * de otro subítem que a su vez cuelga de ella.
 */
export const normalizeIndents = (
  items: readonly ChecklistItem[],
): ChecklistItem[] => {
  let underHeading = false;
  return items.map((item) => {
    if (item.heading) {
      underHeading = true;
      // Una fila que agrupa no es a la vez subítem.
      return item.indented ? { ...item, indented: undefined } : item;
    }
    if (item.indented) {
      if (underHeading) return item;
      return { id: item.id, label: item.label };
    }
    underHeading = false;
    return item;
  });
};

/** Si el ítem de `index` puede pasar a ser subítem: tiene encima una fila que
 *  agrupa o un subítem. */
export const canIndent = (
  items: readonly ChecklistItem[],
  index: number,
): boolean => {
  const previous = items[index - 1];
  return !!previous && (!!previous.heading || !!previous.indented);
};

const mapBlock = (
  config: ChecklistConfig,
  blockId: string,
  change: (block: ChecklistBlock) => ChecklistBlock,
): ChecklistConfig => ({
  ...config,
  blocks: config.blocks.map((block) =>
    block.id === blockId ? change(block) : block,
  ),
});

const withItems = (
  block: ChecklistBlock,
  items: readonly ChecklistItem[],
): ChecklistBlock => ({ ...block, items: normalizeIndents(items) });

/* ──────────────────────────────── Bloques ───────────────────────────────── */

export const addBlock = (
  config: ChecklistConfig,
  label = "",
): ChecklistConfig => ({
  ...config,
  blocks: [...config.blocks, newChecklistBlock(label, [newChecklistItem("")])],
});

export const renameBlock = (
  config: ChecklistConfig,
  blockId: string,
  label: string,
): ChecklistConfig =>
  mapBlock(config, blockId, (block) => ({ ...block, label }));

/** Quita un bloque. El último no se quita: una lista sin bloques no tiene
 *  dónde añadir ítems. */
export const removeBlock = (
  config: ChecklistConfig,
  blockId: string,
): ChecklistConfig =>
  config.blocks.length <= 1
    ? config
    : {
        ...config,
        blocks: config.blocks.filter((block) => block.id !== blockId),
      };

export const moveBlock = (
  config: ChecklistConfig,
  blockId: string,
  offset: -1 | 1,
): ChecklistConfig => {
  const index = config.blocks.findIndex((block) => block.id === blockId);
  return { ...config, blocks: moveItem(config.blocks, index, index + offset) };
};

/* ───────────────────────────────── Ítems ────────────────────────────────── */

/**
 * Un ítem nuevo detrás de `afterItemId`, o al final. Debajo de una fila que
 * agrupa o de un subítem nace como subítem: es lo que se está escribiendo.
 */
export const addItem = (
  config: ChecklistConfig,
  blockId: string,
  afterItemId?: string,
): { config: ChecklistConfig; itemId: string } => {
  const block = config.blocks.find((candidate) => candidate.id === blockId);
  if (!block) return { config, itemId: "" };
  const index = afterItemId
    ? block.items.findIndex((item) => item.id === afterItemId)
    : block.items.length - 1;
  const at = index < 0 ? block.items.length : index + 1;
  const previous = block.items[at - 1];
  const item = newChecklistItem(
    "",
    previous && (previous.heading || previous.indented)
      ? { indented: true }
      : {},
  );
  const items = [...block.items.slice(0, at), item, ...block.items.slice(at)];
  return {
    config: mapBlock(config, blockId, (current) => withItems(current, items)),
    itemId: item.id,
  };
};

export const renameItem = (
  config: ChecklistConfig,
  blockId: string,
  itemId: string,
  label: string,
): ChecklistConfig =>
  mapBlock(config, blockId, (block) => ({
    ...block,
    items: block.items.map((item) =>
      item.id === itemId ? { ...item, label } : item,
    ),
  }));

export const removeItem = (
  config: ChecklistConfig,
  blockId: string,
  itemId: string,
): ChecklistConfig =>
  mapBlock(config, blockId, (block) =>
    withItems(
      block,
      block.items.filter((item) => item.id !== itemId),
    ),
  );

export const moveChecklistItem = (
  config: ChecklistConfig,
  blockId: string,
  itemId: string,
  offset: -1 | 1,
): ChecklistConfig =>
  mapBlock(config, blockId, (block) => {
    const index = block.items.findIndex((item) => item.id === itemId);
    return withItems(block, moveItem(block.items, index, index + offset));
  });

/** Fila que agrupa ↔ ítem que se responde. Al dejar de agrupar, sus subítems
 *  pasan a ser ítems normales. */
export const toggleHeading = (
  config: ChecklistConfig,
  blockId: string,
  itemId: string,
): ChecklistConfig =>
  mapBlock(config, blockId, (block) =>
    withItems(
      block,
      block.items.map((item) =>
        item.id !== itemId
          ? item
          : item.heading
            ? { id: item.id, label: item.label }
            : { id: item.id, label: item.label, heading: true },
      ),
    ),
  );

/** Subítem ↔ ítem normal. Sólo se sangra lo que tiene de qué colgar. */
export const toggleIndented = (
  config: ChecklistConfig,
  blockId: string,
  itemId: string,
): ChecklistConfig =>
  mapBlock(config, blockId, (block) => {
    const index = block.items.findIndex((item) => item.id === itemId);
    const item = block.items[index];
    if (!item || item.heading) return block;
    if (!item.indented && !canIndent(block.items, index)) return block;
    const next = item.indented
      ? { id: item.id, label: item.label }
      : { id: item.id, label: item.label, indented: true };
    return withItems(
      block,
      block.items.map((current) => (current.id === itemId ? next : current)),
    );
  });

/* ─────────────────────────────── Pegar lista ────────────────────────────── */

/** Si el bloque sigue como nació: sin título y sin ítems escritos. */
const isPristine = (block: ChecklistBlock) =>
  block.label.trim() === "" &&
  block.items.every((item) => item.label.trim() === "");

/**
 * Lo pegado, añadido a la lista.
 *
 * Con `splitBlocks`, cada grupo de líneas es un bloque nuevo; sin él, los
 * ítems van al final del último bloque. Un bloque que sigue como nació —el de
 * una lista recién creada— se sustituye en vez de quedarse vacío delante.
 */
export const appendPasted = (
  config: ChecklistConfig,
  pasted: readonly ChecklistItem[][],
  splitBlocks: boolean,
): ChecklistConfig => {
  if (pasted.length === 0) return config;
  const kept = config.blocks.filter((block) => !isPristine(block));

  if (splitBlocks) {
    return {
      ...config,
      blocks: [
        ...kept,
        ...pasted.map((items) => newChecklistBlock("", [...items])),
      ],
    };
  }

  const items = pasted.flat();
  const last = kept[kept.length - 1];
  if (!last) {
    return { ...config, blocks: [newChecklistBlock("", items)] };
  }
  return {
    ...config,
    blocks: [...kept.slice(0, -1), withItems(last, [...last.items, ...items])],
  };
};

/** Cuántos ítems tiene la lista, contando las filas que agrupan: es lo que
 *  mide el tope de `FORM_LIMITS.maxChecklistItems`. */
export const countChecklistItems = (config: ChecklistConfig): number =>
  config.blocks.reduce((total, block) => total + block.items.length, 0);

const plural = (count: number, one: string, many: string) =>
  `${count} ${count === 1 ? one : many}`;

/** Lo que se va a añadir al pegar, dicho antes de añadirlo: «Se añadirán 12
 *  ítems, 2 filas que agrupan, en 3 bloques». */
export const describePaste = (
  blocks: readonly ChecklistItem[][],
  splitBlocks: boolean,
): string => {
  const items = blocks.flat();
  if (items.length === 0) return "Pega una lista: un ítem por línea.";
  const groups = items.filter((item) => item.heading).length;
  const parts = [plural(items.length - groups, "ítem", "ítems")];
  if (groups > 0) {
    parts.push(plural(groups, "fila que agrupa", "filas que agrupan"));
  }
  if (splitBlocks) {
    parts.push(`en ${plural(blocks.length, "bloque", "bloques")}`);
  }
  return `Se añadirán ${parts.join(", ")}.`;
};
