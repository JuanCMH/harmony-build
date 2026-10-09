import {
  type ChecklistBlock,
  type ChecklistItem,
  type FieldComputed,
  type FieldConfig,
  type FieldOption,
  type FieldType,
  type FormField,
  type FormSection,
  FULL_WIDTH_TYPES,
  type TableColumn,
  type TableColumnType,
  type VisibilityRule,
} from "@/convex/lib/form_types";

import { DEFAULT_CHECKLIST_SCALE, scaleOptions } from "./checklist-scales";
import { newId } from "./new-id";

export const newChecklistItem = (
  label: string,
  flags: Pick<ChecklistItem, "heading" | "indented"> = {},
): ChecklistItem => ({ id: newId(), label, ...flags });

export const newChecklistBlock = (
  label = "",
  items: ChecklistItem[] = [],
): ChecklistBlock => ({ id: newId(), label, items });

/** Una columna nace de texto y sin exigirse. `label` es su nombre a la vista. */
export const newTableColumn = (
  label: string,
  type: TableColumnType = "text",
): TableColumn => ({
  id: newId(),
  label,
  type,
  required: false,
  ...columnTypeConfig(type),
});

/** Lo que una columna necesita por ser de su tipo: opciones si es lista, la
 *  relación si es relación, y nada en las demás (`validateTableConfig` rechaza
 *  lo que sobra tanto como lo que falta). */
export const columnTypeConfig = (
  type: TableColumnType,
): Pick<TableColumn, "options" | "reference"> => {
  if (type === "select") return { options: [newOption([])] };
  if (type === "reference") return { reference: { formId: "", fill: [] } };
  return {};
};

/** La configuración con la que nace un campo de cada tipo: la mínima con la
 *  que se puede ver en el lienzo. */
const initialConfig = (type: FieldType): FieldConfig => {
  switch (type) {
    case "select":
    case "multiSelect":
      return { options: [newOption([])] };
    case "checklist":
      return {
        checklist: {
          options: scaleOptions(DEFAULT_CHECKLIST_SCALE),
          blocks: [newChecklistBlock()],
          note: "onFail",
        },
      };
    case "table":
      return {
        table: { rowLabel: "Fila", columns: [newTableColumn("Columna 1")] },
      };
    case "signature":
      return { signature: { signer: "author" } };
    case "reference":
      return { reference: { formId: "", fill: [] } };
    default:
      return {};
  }
};

export const newField = (type: FieldType, label: string): FormField => ({
  id: newId(),
  type,
  label,
  required: false,
  // Un texto largo, una lista de chequeo y una tabla no caben en menos. Una
  // firma nace también a fila entera, pero se puede estrechar.
  size:
    FULL_WIDTH_TYPES.includes(type) || type === "signature" ? "full" : "medium",
  showInTable: false,
  config: initialConfig(type),
});

export const newSection = (order: number): FormSection => ({
  id: newId(),
  label: `Sección ${order}`,
  order,
  fields: [],
});

const repointRules = <T extends VisibilityRule>(
  rules: readonly T[],
  repoint: (id: string) => string,
): T[] => rules.map((rule) => ({ ...rule, fieldId: repoint(rule.fieldId) }));

/** Las referencias de una receta, reapuntadas a los ids de la copia. */
const repointComputed = (
  computed: FieldComputed,
  repoint: (id: string) => string,
): FieldComputed => {
  switch (computed.kind) {
    case "formula":
      return {
        ...computed,
        terms: computed.terms.map((term) =>
          term.type === "field"
            ? { ...term, fieldId: repoint(term.fieldId) }
            : term,
        ),
      };
    case "arithmetic":
      return { ...computed, operands: computed.operands.map(repoint) };
    case "concat":
      return {
        ...computed,
        parts: computed.parts.map((part) =>
          part.type === "field"
            ? { ...part, fieldId: repoint(part.fieldId) }
            : part,
        ),
      };
    default:
      return { ...computed, of: repoint(computed.of) };
  }
};

/** La configuración de un campo copiado: reglas reapuntadas, e ids nuevos en
 *  todo lo que los lleva dentro. Bloques, ítems y columnas son únicos en el
 *  formato entero, no en su campo (`validateForm`). */
const copyConfig = (
  config: FieldConfig,
  repoint: (id: string) => string,
): FieldConfig => ({
  ...config,
  visibility: config.visibility && {
    ...config.visibility,
    rules: repointRules(config.visibility.rules, repoint),
  },
  autoValue: config.autoValue && {
    rules: repointRules(config.autoValue.rules, repoint),
  },
  computed: config.computed && repointComputed(config.computed, repoint),
  checklist: config.checklist && {
    ...config.checklist,
    blocks: config.checklist.blocks.map((block) => ({
      ...block,
      id: newId(),
      items: block.items.map((item) => ({ ...item, id: newId() })),
    })),
  },
  table: config.table && {
    ...config.table,
    columns: config.table.columns.map((column) => ({
      ...column,
      id: newId(),
    })),
  },
});

/**
 * Una copia de la sección, con ids nuevos y las referencias internas
 * reapuntadas.
 *
 * Copiarla con los ids tal cual dejaría dos campos con el mismo id en el
 * formato: sus respuestas serían el mismo valor. Una regla que apunta a un
 * campo **de la sección** pasa a apuntar a su copia; una que apunta a un campo
 * de fuera —o a un dato de la respuesta, `@…`— se deja como está.
 */
export const duplicateSection = (
  section: FormSection,
  order: number,
): FormSection => {
  const copies = new Map(section.fields.map((field) => [field.id, newId()]));
  const repoint = (id: string) => copies.get(id) ?? id;

  return {
    ...section,
    id: newId(),
    label: `${section.label} (copia)`,
    order,
    fields: section.fields.map((field) => ({
      ...field,
      id: repoint(field.id),
      config: copyConfig(field.config, repoint),
    })),
  };
};

/** Una copia del campo, en la misma sección: ids nuevos, y sus reglas siguen
 *  mirando a los mismos campos. */
export const duplicateField = (field: FormField): FormField => ({
  ...field,
  id: newId(),
  label: `${field.label} (copia)`,
  config: copyConfig(field.config, (id) => id),
});

/** `Opción 1` → `opcion-1`, para que el valor guardado no lleve acentos. */
export const toOptionValue = (label: string): string =>
  label
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "opcion";

/**
 * Una opción más para la lista, con un valor que no ha tenido **ninguna**
 * opción de esta lista.
 *
 * Si el valor saliera del número de opciones, borrar «Opción 3» y añadir otra
 * devolvería `opcion-3`, y las reglas y las respuestas que nombraban la opción
 * borrada pasarían en silencio a la nueva. Con un sufijo aleatorio la regla
 * rota sigue rota hasta que alguien elige otra opción. El valor no cambia
 * después, aunque se renombre la opción.
 */
export const newOption = (
  options: readonly { label: string; value: string }[],
): FieldOption => {
  const used = new Set(options.map((option) => option.value));
  const position = options.length + 1;
  let value: string;
  do {
    value = `opcion-${position}-${Math.random().toString(36).slice(2, 7)}`;
  } while (used.has(value));
  return { label: `Opción ${position}`, value };
};
