/** Las piezas con que se escriben los formatos de la biblioteca.
 *
 *  Todo lo de aquí es puro y determinista: la biblioteca tiene que dar **los
 *  mismos ids cada vez que se instala**, así que ningún id sale del azar ni
 *  del reloj. Un id sale de un texto (`slugify`) o se escribe a mano.
 *
 *  Los ids de un formato comparten un solo espacio de nombres —secciones,
 *  campos, bloques, ítems, columnas y opciones—, y por eso:
 *   - una sección se llama `seccion-<clave>`;
 *   - un ítem se llama `<bloque>-<clave>` (`niveles-aceite`);
 *   - una opción puede llevar prefijo cuando su texto choca con otro id.
 *
 *  Un id derivado de una etiqueta queda fijado por el texto con que nació. Si
 *  después se corrige la etiqueta, hay que pasarle la clave anterior a mano:
 *  el id es lo que une las respuestas de una versión con las de la siguiente.
 */

import type {
  ChecklistBlock,
  ChecklistItem,
  ChecklistNoteMode,
  ChecklistOption,
  ComputedTerm,
  FieldConfig,
  FieldOption,
  FieldSize,
  FieldType,
  FieldVisibility,
  FormField,
  FormSection,
  SignatureConfig,
  TableColumn,
  TableColumnType,
} from "../lib/form_types";
import { LIBRARY_REFERENCE_PREFIX } from "./types";

/* ────────────────────────────────── Ids ─────────────────────────────────── */

/** Las tildes y la virgulilla, una vez separadas de su letra (`NFD`). */
const isCombiningMark = (char: string): boolean => {
  const code = char.charCodeAt(0);
  return code >= 0x0300 && code <= 0x036f;
};

/** Un texto como id: sin tildes, en minúsculas, y sólo `a-z`, `0-9` y
 *  guiones. «Niveles de aceite» → `niveles-de-aceite`. */
export const slugify = (text: string): string =>
  Array.from(text.normalize("NFD"))
    .filter((char) => !isCombiningMark(char))
    .join("")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/* ──────────────────────────────── Escalas ───────────────────────────────── */

const GOOD: ChecklistOption = {
  value: "b",
  short: "B",
  label: "Bueno",
  meaning: "ok",
};
const BAD: ChecklistOption = {
  value: "m",
  short: "M",
  label: "Malo",
  meaning: "fail",
};
const YES: ChecklistOption = {
  value: "si",
  short: "Sí",
  label: "Sí",
  meaning: "ok",
};
const NO: ChecklistOption = {
  value: "no",
  short: "No",
  label: "No",
  meaning: "fail",
};
const COMPLIES: ChecklistOption = {
  value: "c",
  short: "C",
  label: "Conforme",
  meaning: "ok",
};
const FAILS: ChecklistOption = {
  value: "nc",
  short: "NC",
  label: "No conforme",
  meaning: "fail",
};
const NOT_APPLICABLE: ChecklistOption = {
  value: "na",
  short: "N.A",
  label: "No aplica",
  meaning: "na",
};

/** Las cinco escalas de los formatos del cliente. */
export const SCALE_BMNA: readonly ChecklistOption[] = [
  GOOD,
  BAD,
  NOT_APPLICABLE,
];
export const SCALE_BM: readonly ChecklistOption[] = [GOOD, BAD];
export const SCALE_SN: readonly ChecklistOption[] = [YES, NO];
export const SCALE_SNNA: readonly ChecklistOption[] = [YES, NO, NOT_APPLICABLE];
export const SCALE_CNC: readonly ChecklistOption[] = [COMPLIES, FAILS];

/* ──────────────────────────────── Opciones ──────────────────────────────── */

/** Una opción con su valor escrito a mano: `choice("CO₂", "co2")`. */
export const choice = (label: string, value?: string): FieldOption => ({
  label,
  value: value ?? slugify(label),
});

/** Opciones a partir de sus etiquetas. El prefijo las separa de otro id del
 *  mismo formato: `choices(["Bolso"], "presentacion")` → `presentacion-bolso`. */
export const choices = (labels: string[], prefix?: string): FieldOption[] =>
  labels.map((label) =>
    choice(label, prefix ? `${prefix}-${slugify(label)}` : undefined),
  );

/* ───────────────────────────────── Campos ───────────────────────────────── */

export interface FieldExtras {
  /** Por omisión, el de la etiqueta. */
  id?: string;
  description?: string;
  placeholder?: string;
  required?: boolean;
  size?: FieldSize;
  showInTable?: boolean;
  visibility?: FieldVisibility;
}

const field = (
  type: FieldType,
  label: string,
  defaultSize: FieldSize,
  extras: FieldExtras,
  config: FieldConfig = {},
): FormField => {
  const result: FormField = {
    id: extras.id ?? slugify(label),
    type,
    label,
    required: extras.required ?? false,
    size: extras.size ?? defaultSize,
    showInTable: extras.showInTable ?? false,
    config: extras.visibility
      ? { ...config, visibility: extras.visibility }
      : config,
  };
  if (extras.description) result.description = extras.description;
  if (extras.placeholder) result.placeholder = extras.placeholder;
  return result;
};

export const text = (label: string, extras: FieldExtras = {}): FormField =>
  field("text", label, "medium", extras);

export const textarea = (label: string, extras: FieldExtras = {}): FormField =>
  field("textarea", label, "full", { ...extras, size: "full" });

export const phone = (label: string, extras: FieldExtras = {}): FormField =>
  field("phone", label, "small", extras);

export const date = (label: string, extras: FieldExtras = {}): FormField =>
  field("date", label, "small", extras);

export const checkbox = (label: string, extras: FieldExtras = {}): FormField =>
  field("checkbox", label, "small", extras);

/** Un número que no baja de cero: ninguna medida de estos formatos lo hace. */
export const number = (label: string, extras: FieldExtras = {}): FormField =>
  field("number", label, "small", extras, { minValue: 0 });

export const select = (
  label: string,
  options: FieldOption[],
  extras: FieldExtras = {},
): FormField => field("select", label, "medium", extras, { options });

/** Un número derivado con la receta `formula`. Los términos se escriben en
 *  orden de lectura: `[ref("a"), times, ref("b"), plus, ref("c")]`. */
export const formula = (
  label: string,
  terms: ComputedTerm[],
  extras: FieldExtras & { rounding?: number } = {},
): FormField => {
  const { rounding, ...rest } = extras;
  return field("number", label, "small", rest, {
    computed: { kind: "formula", terms, rounding: rounding ?? 0 },
  });
};

export const operand = (fieldId: string): ComputedTerm => ({
  type: "field",
  fieldId,
});
export const TIMES: ComputedTerm = { type: "op", op: "*" };
export const PLUS: ComputedTerm = { type: "op", op: "+" };

/** Una relación a un listado de la biblioteca, por su clave, con los campos
 *  del listado que se traen al elegir. */
export const reference = (
  label: string,
  catalogKey: string,
  fill: string[],
  extras: FieldExtras = {},
): FormField =>
  field("reference", label, "medium", extras, {
    reference: { formId: `${LIBRARY_REFERENCE_PREFIX}${catalogKey}`, fill },
  });

/** Una fotografía. A fila entera: en el teléfono es un botón del ancho de la
 *  pantalla. */
export const image = (label: string, extras: FieldExtras = {}): FormField =>
  field("image", label, "full", { ...extras, size: "full" });

export const signature = (
  label: string,
  signer: SignatureConfig["signer"],
  extras: FieldExtras = {},
): FormField =>
  // A fila entera: es lo último del formato y el recuadro donde se firma con
  // el dedo agradece el ancho. A media fila dejaba la otra mitad vacía.
  field("signature", label, "full", extras, { signature: { signer } });

/** El campo sólo se pide cuando `fieldId` vale `value`. */
export const onlyWhen = (fieldId: string, value: string): FieldVisibility => ({
  match: "all",
  rules: [{ fieldId, operator: "eq", values: [value] }],
});

/* ──────────────────────────── Lista de chequeo ──────────────────────────── */

/** Un ítem antes de entrar en su bloque: todavía con su clave, no con su id. */
export interface ItemDraft {
  key: string;
  label: string;
  heading?: true;
  indented?: true;
}

/** Un ítem. La clave, si no se da, sale de la etiqueta. */
export const item = (label: string, key?: string): ItemDraft => ({
  key: key ?? slugify(label),
  label,
});

/** Una fila que agrupa —«Luces frontales»— seguida de sus subítems, que son
 *  los que se responden. Las claves de los subítems cuelgan de la del grupo. */
export const group = (
  label: string,
  key: string,
  children: ItemDraft[],
): ItemDraft[] => [
  { key, label, heading: true },
  ...children.map(
    (child): ItemDraft => ({
      key: `${key}-${child.key}`,
      label: child.label,
      indented: true,
    }),
  ),
];

/** Un bloque con sus ítems; el id de cada ítem es `<bloque>-<clave>`. */
export const block = (
  id: string,
  label: string,
  items: (ItemDraft | ItemDraft[])[],
): ChecklistBlock => ({
  id,
  label,
  items: items.flat().map((draft): ChecklistItem => {
    const result: ChecklistItem = {
      id: `${id}-${draft.key}`,
      label: draft.label,
    };
    if (draft.heading) result.heading = true;
    if (draft.indented) result.indented = true;
    return result;
  }),
});

export interface ChecklistSpec {
  scale: readonly ChecklistOption[];
  blocks: ChecklistBlock[];
  /** Por omisión `onFail`: la observación es obligatoria al marcar no
   *  conforme, que es la regla de todas las inspecciones. */
  note?: ChecklistNoteMode;
  quantity?: string;
  date?: string;
}

/** Una lista de chequeo: obligatoria salvo que se diga otra cosa, porque una
 *  inspección a medias no es una inspección. */
export const checklist = (
  label: string,
  spec: ChecklistSpec,
  extras: FieldExtras = {},
): FormField =>
  field(
    "checklist",
    label,
    "full",
    { required: true, showInTable: true, ...extras, size: "full" },
    {
      checklist: {
        options: spec.scale.map((option) => ({ ...option })),
        blocks: spec.blocks,
        note: spec.note ?? "onFail",
        ...(spec.quantity ? { quantity: { label: spec.quantity } } : {}),
        ...(spec.date ? { date: { label: spec.date } } : {}),
      },
    },
  );

/* ───────────────────────────────── Tabla ────────────────────────────────── */

export const column = (
  label: string,
  type: TableColumnType,
  extras: { id?: string; required?: boolean; options?: FieldOption[] } = {},
): TableColumn => {
  const result: TableColumn = {
    id: extras.id ?? slugify(label),
    label,
    type,
    required: extras.required ?? false,
  };
  if (extras.options) result.options = extras.options;
  return result;
};

export const table = (
  label: string,
  spec: {
    rowLabel: string;
    columns: TableColumn[];
    minRows?: number;
    maxRows?: number;
  },
  extras: FieldExtras = {},
): FormField =>
  field(
    "table",
    label,
    "full",
    { ...extras, size: "full" },
    {
      table: {
        columns: spec.columns,
        rowLabel: spec.rowLabel,
        ...(spec.minRows === undefined ? {} : { minRows: spec.minRows }),
        ...(spec.maxRows === undefined ? {} : { maxRows: spec.maxRows }),
      },
    },
  );

/* ─────────────────────────────── Secciones ──────────────────────────────── */

/** Una sección sin su orden: se lo pone `sections`. */
export type SectionDraft = Omit<FormSection, "order">;

export const section = (
  key: string,
  label: string,
  fields: FormField[],
  description?: string,
): SectionDraft => {
  const result: SectionDraft = { id: `seccion-${key}`, label, fields };
  if (description) result.description = description;
  return result;
};

/** Las secciones de un formato, numeradas en el orden en que se escriben. */
export const sections = (...drafts: SectionDraft[]): FormSection[] =>
  drafts.map((draft, order) => ({ ...draft, order }));
