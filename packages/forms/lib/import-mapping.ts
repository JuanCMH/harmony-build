/** A dónde va cada columna de un archivo, y a qué opción cada valor.
 *
 *  Son los pasos 2 y 3 de una importación
 *  (`docs/plans/2026-10-10-importacion-de-registros-design.md §1`): la
 *  plataforma propone por nombre —sin mayúsculas ni tildes— y quien importa
 *  corrige. Puro.
 */

import { answerableItems } from "@/convex/lib/checklist_summary";
import { flattenFields } from "@/convex/lib/form_evaluation";
import type {
  ChecklistMeaning,
  FormField,
  FormSection,
} from "@/convex/lib/form_types";
import { IMPORT_LIMITS, isImportExempt } from "@/convex/lib/import_types";
import { searchableText } from "@/convex/lib/text";

import { type ImportCell, cellText, isBlankCell } from "./import-cells";
import type { ImportRow } from "./import-sheet";

/* ──────────────────────────────── Destinos ──────────────────────────────── */

/** Un sitio del formato al que puede ir una columna: un campo, o un ítem de
 *  una lista de chequeo —una exportación de formulario trae una columna por
 *  pregunta—. */
export type ImportTarget =
  | { key: string; kind: "field"; field: FormField; label: string }
  | {
      key: string;
      kind: "item";
      field: FormField;
      itemId: string;
      /** El ítem solo, sin su lista: es lo que suele decir el encabezado. */
      itemLabel: string;
      label: string;
    };

const itemKey = (fieldId: string, itemId: string) => `${fieldId}::${itemId}`;

/**
 * Los destinos que ofrece un formato, en su orden.
 *
 * No salen los tipos que un archivo no puede traer ni los calculados, que
 * rellena el servidor. Una lista de chequeo no es un destino: lo son sus
 * ítems.
 */
export function targetsOf(sections: readonly FormSection[]): ImportTarget[] {
  const targets: ImportTarget[] = [];
  for (const field of flattenFields(sections)) {
    if (isImportExempt(field) || field.config.computed) continue;
    if (field.type !== "checklist") {
      targets.push({ key: field.id, kind: "field", field, label: field.label });
      continue;
    }
    const config = field.config.checklist;
    if (!config) continue;
    for (const item of answerableItems(config)) {
      targets.push({
        key: itemKey(field.id, item.id),
        kind: "item",
        field,
        itemId: item.id,
        itemLabel: item.label,
        label: `${field.label} › ${item.label}`,
      });
    }
  }
  return targets;
}

/** `índice de columna → clave del destino`. Una columna va a un solo destino
 *  y un destino recibe una sola columna. */
export type ColumnMapping = Record<number, string>;

/** Asigna una columna a un destino —o la suelta, con `null`—, quitándoselo a
 *  la columna que lo tuviera. */
export function assignColumn(
  mapping: ColumnMapping,
  column: number,
  targetKey: string | null,
): ColumnMapping {
  const next: ColumnMapping = {};
  for (const [index, key] of Object.entries(mapping)) {
    if (Number(index) !== column && key !== targetKey)
      next[Number(index)] = key;
  }
  if (targetKey !== null) next[column] = targetKey;
  return next;
}

/**
 * La asignación que se propone: cada encabezado al destino que se llama igual.
 *
 * Un ítem responde por su nombre completo («Revisión › Aceite») y por el suyo
 * solo («Aceite»), si ningún otro destino se llama así. Un nombre que
 * comparten dos destinos no se propone: se elige a mano.
 */
export function suggestMapping(
  headers: readonly string[],
  targets: readonly ImportTarget[],
): ColumnMapping {
  const byName = new Map<string, string | null>();
  const offer = (name: string, key: string) => {
    const normalized = searchableText(name);
    if (normalized === "") return;
    byName.set(normalized, byName.has(normalized) ? null : key);
  };
  for (const target of targets) {
    offer(target.label, target.key);
    if (target.kind === "item") offer(target.itemLabel, target.key);
  }

  const mapping: ColumnMapping = {};
  const taken = new Set<string>();
  headers.forEach((header, column) => {
    const key = byName.get(searchableText(header));
    if (!key || taken.has(key)) return;
    mapping[column] = key;
    taken.add(key);
  });
  return mapping;
}

const DATE_HEADERS = [
  "fecha del hecho",
  "fecha",
  "marca temporal",
  "fecha de registro",
  "fecha de inspeccion",
  "fecha de la inspeccion",
  "timestamp",
  "dia",
];

/** La columna que parece traer la fecha del hecho: la de nombre más
 *  reconocible, o la primera que diga «fecha». `null` si ninguna. */
export function suggestDateColumn(headers: readonly string[]): number | null {
  const names = headers.map(searchableText);
  for (const candidate of DATE_HEADERS) {
    const index = names.indexOf(candidate);
    if (index !== -1) return index;
  }
  const index = names.findIndex((name) => name.includes("fecha"));
  return index === -1 ? null : index;
}

/* ───────────────────────────────── Valores ──────────────────────────────── */

/** Si los valores de este destino se asignan uno a uno: una lista, una
 *  relación o la escala de un ítem. */
export const needsValueMap = (target: ImportTarget): boolean =>
  target.kind === "item" ||
  target.field.type === "select" ||
  target.field.type === "multiSelect" ||
  target.field.type === "reference";

/** Las partes de una celda de lista múltiple: una exportación las separa con
 *  coma o con punto y coma. */
export const splitParts = (text: string): string[] =>
  text
    .split(/[;,]/)
    .map((part) => part.trim())
    .filter((part) => part !== "");

/** La clave con que se agrupa un valor escrito: «SLP835» y «slp835 » son el
 *  mismo. */
export const valueKey = (text: string): string => searchableText(text);

/** Las partes de una celda para un destino, ya como claves de valor. */
export function cellParts(target: ImportTarget, cell: ImportCell): string[] {
  const text = cellText(cell);
  if (text === "") return [];
  return target.kind === "field" && target.field.type === "multiSelect"
    ? splitParts(text)
    : [text];
}

export interface DistinctValue {
  key: string;
  /** Como lo escribió el archivo la primera vez. */
  text: string;
  /** En cuántas filas aparece. */
  count: number;
}

/** Los valores distintos que trae una columna para su destino, el más
 *  frecuente primero. */
export function distinctValues(
  rows: readonly ImportRow[],
  column: number,
  target: ImportTarget,
): DistinctValue[] {
  const found = new Map<string, DistinctValue>();
  for (const row of rows) {
    const cell = row.cells[column] ?? null;
    if (isBlankCell(cell)) continue;
    for (const part of cellParts(target, cell)) {
      const key = valueKey(part);
      if (key === "") continue;
      const known = found.get(key);
      if (known) known.count += 1;
      else found.set(key, { key, text: part, count: 1 });
    }
  }
  return [...found.values()].sort(
    (a, b) => b.count - a.count || a.text.localeCompare(b.text, "es"),
  );
}

/** Si los valores de un campo son demasiados para asignarlos a mano: se
 *  resuelven sólo por coincidencia, y la pantalla lo dice. */
export const isTooManyValues = (values: readonly DistinctValue[]): boolean =>
  values.length > IMPORT_LIMITS.maxDistinctValues;

/** Una opción a la que se puede asignar un valor del archivo. */
export interface ValueChoice {
  value: string;
  label: string;
  /** Otros textos por los que se reconoce: la letra de una escala, o las
   *  formas corrientes de decir su sentido. */
  aliases?: string[];
}

/** «Dejar vacío»: el valor se ignora a propósito y la fila entra sin él. */
export const BLANK_CHOICE = "@blank";

/** Las formas corrientes de decir cada sentido de una escala. Sólo se usan
 *  cuando la escala tiene **una** opción con ese sentido. */
const MEANING_WORDS: Record<ChecklistMeaning, string[]> = {
  ok: ["si", "cumple", "conforme", "bueno", "bien", "ok", "c", "b"],
  fail: ["no", "no cumple", "no conforme", "malo", "mal", "nc", "m"],
  na: ["no aplica", "n/a", "na", "n.a", "n.a."],
};

/** Las opciones de un destino. Las de una relación no salen de aquí: son los
 *  elementos de su listado, que se leen de la base. */
export function choicesOf(target: ImportTarget): ValueChoice[] {
  if (target.kind === "field") {
    return (target.field.config.options ?? []).map((option) => ({
      value: option.value,
      label: option.label,
    }));
  }
  const options = target.field.config.checklist?.options ?? [];
  const perMeaning = new Map<ChecklistMeaning, number>();
  for (const option of options) {
    perMeaning.set(option.meaning, (perMeaning.get(option.meaning) ?? 0) + 1);
  }
  return options.map((option) => ({
    value: option.value,
    label: option.label,
    aliases: [
      option.short,
      ...(perMeaning.get(option.meaning) === 1
        ? MEANING_WORDS[option.meaning]
        : []),
    ],
  }));
}

/** Los elementos de un listado, como opciones de una relación. */
export const entryChoices = (
  entries: readonly { _id: string; title: string }[],
): ValueChoice[] =>
  entries.map((entry) => ({ value: entry._id, label: entry.title }));

/** Sin espacios ni signos: «SLP-835» y «slp 835» coinciden. */
const loose = (text: string) => valueKey(text).replace(/[^a-z0-9]/g, "");

/** `clave del valor → opción`, o `BLANK_CHOICE`. Lo que no está no tiene
 *  correspondencia, y deja fuera a las filas que lo traen. */
export type ValueMap = Record<string, string>;

/**
 * La correspondencia que se propone: cada valor a la opción que se llama
 * igual —por su etiqueta, su valor o un alias—, y si ninguna, a la única que
 * coincide sin espacios ni signos.
 */
export function suggestValueMap(
  values: readonly DistinctValue[],
  choices: readonly ValueChoice[],
): ValueMap {
  const exact = new Map<string, string | null>();
  const fuzzy = new Map<string, string | null>();
  const offer = (
    index: Map<string, string | null>,
    name: string,
    to: string,
  ) => {
    if (name === "") return;
    const known = index.get(name);
    index.set(name, known === undefined || known === to ? to : null);
  };
  for (const choice of choices) {
    for (const name of [choice.label, choice.value]) {
      offer(exact, valueKey(name), choice.value);
      offer(fuzzy, loose(name), choice.value);
    }
  }
  // Un alias no desplaza a una etiqueta: «No» es una opción antes que una
  // forma de decir «no conforme».
  for (const choice of choices) {
    for (const alias of choice.aliases ?? []) {
      const key = valueKey(alias);
      if (!exact.has(key)) exact.set(key, choice.value);
    }
  }

  const map: ValueMap = {};
  for (const value of values) {
    const found = exact.get(value.key) ?? fuzzy.get(loose(value.text));
    if (found) map[value.key] = found;
  }
  return map;
}

/* ───────────────────────── Grupos de valores (paso 3) ───────────────────── */

export interface MappedColumn {
  column: number;
  target: ImportTarget;
}

/** Las columnas asignadas, con su destino, en el orden del archivo. */
export function mappedColumns(
  mapping: ColumnMapping,
  targets: readonly ImportTarget[],
): MappedColumn[] {
  const byKey = new Map(targets.map((target) => [target.key, target]));
  return Object.entries(mapping)
    .map(([column, key]) => ({
      column: Number(column),
      target: byKey.get(key),
    }))
    .filter((entry): entry is MappedColumn => entry.target !== undefined)
    .sort((a, b) => a.column - b.column);
}

/**
 * Lo que se asigna de una vez en el paso de valores.
 *
 * Los ítems de una misma lista de chequeo comparten escala, así que forman un
 * solo grupo: «Sí», «No» y «N/A» se asignan una vez, no una por pregunta.
 */
export interface ValueGroup {
  key: string;
  label: string;
  columns: MappedColumn[];
  /** El listado del que salen las opciones, si es una relación. */
  catalogId: string | null;
}

export function valueGroups(mapped: readonly MappedColumn[]): ValueGroup[] {
  const groups = new Map<string, ValueGroup>();
  for (const entry of mapped) {
    const { target } = entry;
    if (!needsValueMap(target)) continue;
    const key = target.kind === "item" ? target.field.id : target.key;
    const group = groups.get(key);
    if (group) group.columns.push(entry);
    else {
      groups.set(key, {
        key,
        label: target.field.label,
        columns: [entry],
        catalogId:
          target.kind === "field" && target.field.type === "reference"
            ? (target.field.config.reference?.formId ?? null)
            : null,
      });
    }
  }
  return [...groups.values()];
}

/** Los valores distintos de un grupo, sumando sus columnas. */
export function groupValues(
  rows: readonly ImportRow[],
  group: ValueGroup,
): DistinctValue[] {
  const merged = new Map<string, DistinctValue>();
  for (const { column, target } of group.columns) {
    for (const value of distinctValues(rows, column, target)) {
      const known = merged.get(value.key);
      if (known) known.count += value.count;
      else merged.set(value.key, { ...value });
    }
  }
  return [...merged.values()].sort(
    (a, b) => b.count - a.count || a.text.localeCompare(b.text, "es"),
  );
}

/** Las opciones de un grupo que no es una relación. */
export const groupChoices = (group: ValueGroup): ValueChoice[] =>
  choicesOf(group.columns[0].target);

/**
 * La correspondencia de un grupo: lo propuesto, con lo que quien importa
 * corrigió encima. Una corrección vacía quita la propuesta: el valor queda
 * sin correspondencia.
 */
export function resolveValueMap(
  suggested: ValueMap,
  overrides: ValueMap | undefined,
): ValueMap {
  const map: ValueMap = { ...suggested };
  for (const [key, choice] of Object.entries(overrides ?? {})) {
    if (choice === "") delete map[key];
    else map[key] = choice;
  }
  return map;
}

/** `clave de destino → correspondencia`, como la pide `buildRows`: cada
 *  destino usa la de su grupo. */
export function valueMapsByTarget(
  groups: readonly ValueGroup[],
  maps: Record<string, ValueMap>,
): Record<string, ValueMap> {
  const byTarget: Record<string, ValueMap> = {};
  for (const group of groups) {
    for (const { target } of group.columns) {
      byTarget[target.key] = maps[group.key] ?? {};
    }
  }
  return byTarget;
}
