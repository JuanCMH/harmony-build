import type {
  ChecklistItem,
  ChecklistMeaning,
  ChecklistOption,
} from "@/convex/lib/form_types";

import { newId } from "./new-id";

/**
 * Las escalas de una lista de chequeo y el texto pegado que se convierte en
 * sus ítems. Puro: lo usa el editor de la lista y se prueba sin montarlo.
 */

const GOOD: ChecklistOption = {
  value: "b",
  label: "Bueno",
  short: "B",
  meaning: "ok",
};
const BAD: ChecklistOption = {
  value: "m",
  label: "Malo",
  short: "M",
  meaning: "fail",
};
const YES: ChecklistOption = {
  value: "si",
  label: "Sí",
  short: "Sí",
  meaning: "ok",
};
const NO: ChecklistOption = {
  value: "no",
  label: "No",
  short: "No",
  meaning: "fail",
};
const COMPLIES: ChecklistOption = {
  value: "c",
  label: "Conforme",
  short: "C",
  meaning: "ok",
};
const FAILS: ChecklistOption = {
  value: "nc",
  label: "No conforme",
  short: "NC",
  meaning: "fail",
};
const NOT_APPLICABLE: ChecklistOption = {
  value: "na",
  label: "No aplica",
  short: "N.A",
  meaning: "na",
};

export interface ChecklistScale {
  id: string;
  /** Como se lee en el selector: las abreviaturas, que es como la nombra quien
   *  viene del papel. */
  label: string;
  options: readonly ChecklistOption[];
}

/**
 * Las cinco escalas de los formatos del cliente. Sus valores son los de la
 * biblioteca SST (`convex/sst_library/builders.ts`): una lista instalada desde
 * allí se reconoce aquí como su plantilla.
 */
export const CHECKLIST_SCALES = [
  { id: "bmna", label: "B / M / N.A", options: [GOOD, BAD, NOT_APPLICABLE] },
  { id: "sn", label: "Sí / No", options: [YES, NO] },
  { id: "snna", label: "Sí / No / N.A", options: [YES, NO, NOT_APPLICABLE] },
  { id: "cnc", label: "C / NC", options: [COMPLIES, FAILS] },
  { id: "bm", label: "B / M", options: [GOOD, BAD] },
] as const satisfies readonly ChecklistScale[];

export type ChecklistScaleId = (typeof CHECKLIST_SCALES)[number]["id"];

/** La escala con la que nace una lista de chequeo: es la de ocho de las diez
 *  inspecciones del cliente. */
export const DEFAULT_CHECKLIST_SCALE: ChecklistScaleId = "bmna";

/** Las opciones de una plantilla, como copia: el editor las cambia después sin
 *  tocar la plantilla. */
export const scaleOptions = (id: ChecklistScaleId): ChecklistOption[] =>
  (CHECKLIST_SCALES.find((scale) => scale.id === id)?.options ?? []).map(
    (option) => ({ ...option }),
  );

const isSameOption = (a: ChecklistOption, b: ChecklistOption) =>
  a.value === b.value &&
  a.label === b.label &&
  a.short === b.short &&
  a.meaning === b.meaning;

/** Qué plantilla es esta escala, o `null` si alguien la cambió a mano. */
export const matchScale = (
  options: readonly ChecklistOption[],
): ChecklistScaleId | null =>
  CHECKLIST_SCALES.find(
    (scale) =>
      scale.options.length === options.length &&
      scale.options.every((option, index) =>
        isSameOption(option, options[index]),
      ),
  )?.id ?? null;

export const MEANING_OPTION_LABEL: Record<ChecklistMeaning, string> = {
  ok: "Conforme",
  fail: "No conforme",
  na: "No aplica",
};

/** Una opción más para la escala, con un valor que ninguna otra ha tenido:
 *  como en una lista, reutilizar el de una borrada le pasaría sus respuestas. */
export const newScaleOption = (
  options: readonly ChecklistOption[],
): ChecklistOption => {
  const used = new Set(options.map((option) => option.value));
  let value: string;
  do {
    value = `opcion-${Math.random().toString(36).slice(2, 7)}`;
  } while (used.has(value));
  const position = options.length + 1;
  return {
    value,
    label: `Opción ${position}`,
    short: String(position),
    meaning: "ok",
  };
};

/* ─────────────────────────────── Pegar lista ────────────────────────────── */

export interface ParseChecklistOptions {
  /** Una línea vacía empieza un bloque nuevo. Sin esto, se ignora. */
  splitBlocks?: boolean;
}

/** Lo que marca una línea como subítem: un guion, un punto de lista o un
 *  asterisco, con o sin sangría delante. */
const BULLET = /^[-–—•·*]\s*/;
/** Sangría: un tabulador o dos espacios, que es lo que deja una lista copiada
 *  de Word o de una hoja de cálculo. Un solo espacio es un descuido. */
const INDENT = /^(\t| {2,})/;
const GROUP_SUFFIX = /[:：]\s*$/;

interface ParsedLine {
  label: string;
  isNested: boolean;
  isGroup: boolean;
}

const parseLine = (raw: string): ParsedLine | null => {
  const hasIndent = INDENT.test(raw);
  // De una fila copiada de una hoja de cálculo sólo interesa la primera celda
  // con texto: las demás son las casillas de la escala.
  const cell =
    raw
      .split("\t")
      .map((part) => part.trim())
      .find((part) => part !== "") ?? "";
  if (cell === "") return null;

  const hasBullet = BULLET.test(cell);
  const text = cell.replace(BULLET, "").trim();
  if (text === "") return null;

  const isGroup = GROUP_SUFFIX.test(text);
  const label = isGroup ? text.replace(GROUP_SUFFIX, "").trim() : text;
  if (label === "") return null;

  return { label, isNested: hasIndent || hasBullet, isGroup };
};

/**
 * Un texto pegado, convertido en los ítems de una lista de chequeo, con ids
 * nuevos. Devuelve **un arreglo por bloque**: uno solo si no se pide partir.
 *
 *  - Una línea es un ítem.
 *  - Una línea que acaba en «:» es una fila que agrupa —«Luces frontales:»— y
 *    no se responde; las siguientes con sangría o guion son sus subítems.
 *  - La primera línea sin sangría cierra el grupo.
 *  - Una línea con sangría que no cuelga de ningún grupo es un ítem normal:
 *    un subítem huérfano no se puede guardar.
 *  - Un grupo que se queda sin subítems pasa a ser un ítem normal: una fila
 *    que agrupa nada no se respondería nunca.
 *
 * Nadie va a teclear sesenta y tres ítems uno a uno.
 */
export const parseChecklistItems = (
  text: string,
  { splitBlocks = false }: ParseChecklistOptions = {},
): ChecklistItem[][] => {
  const blocks: ChecklistItem[][] = [[]];
  let current = blocks[0];
  let underGroup = false;

  /** Al cerrar un grupo sin subítems, deja de ser grupo. */
  const closeGroup = () => {
    const last = current[current.length - 1];
    if (last?.heading) current[current.length - 1] = toPlainItem(last);
    underGroup = false;
  };

  for (const raw of text.split(/\r?\n/)) {
    const line = parseLine(raw);

    if (!line) {
      if (splitBlocks && current.length > 0) {
        closeGroup();
        current = [];
        blocks.push(current);
      }
      continue;
    }

    if (line.isGroup && !line.isNested) {
      closeGroup();
      current.push({ id: newId(), label: line.label, heading: true });
      underGroup = true;
      continue;
    }

    if (line.isNested && underGroup) {
      current.push({ id: newId(), label: line.label, indented: true });
      continue;
    }

    closeGroup();
    current.push({ id: newId(), label: line.label });
  }

  closeGroup();
  return blocks.filter((block) => block.length > 0);
};

const toPlainItem = ({ id, label }: ChecklistItem): ChecklistItem => ({
  id,
  label,
});
