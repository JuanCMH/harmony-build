/** La configuración propia de los cuatro tipos nuevos —lista de chequeo,
 *  tabla, relación y firma—, contra sus reglas.
 *
 *  Es la parte de `validateForm` que no existía en Harmony. Va aparte porque
 *  cada tipo trae su propio catálogo de reglas y ninguna depende del resto del
 *  formato, salvo los identificadores, que son únicos en el formato entero y
 *  por eso llegan en un registro compartido (`IdRegistry`).
 *
 *  Puro: devuelve códigos, no lanza.
 */

import type { FormProblemCode } from "./error_messages";
import {
  type ChecklistConfig,
  type FieldOption,
  type FieldType,
  FIELD_TYPE_KINDS,
  FORM_LIMITS,
  type FormField,
  type FormKind,
  type ReferenceConfig,
  type TableConfig,
} from "./form_types";

/** Los tipos que traen configuración propia, con la clave donde la llevan. */
export const CONFIG_KEY_BY_TYPE = {
  checklist: "checklist",
  table: "table",
  reference: "reference",
  signature: "signature",
} as const satisfies Partial<Record<FieldType, keyof FormField["config"]>>;

/**
 * Los identificadores ya vistos en el formato, por clase. Un bloque, un ítem o
 * una columna no pueden repetir id en **todo el formato**, no sólo en su
 * campo: es lo que permite nombrar un ítem sin decir de qué lista es.
 */
export interface IdRegistry {
  blocks: Set<string>;
  items: Set<string>;
  columns: Set<string>;
}

export const createIdRegistry = (): IdRegistry => ({
  blocks: new Set(),
  items: new Set(),
  columns: new Set(),
});

/** Apunta `id` en `seen`; `true` si ya estaba. */
const isRepeated = (seen: Set<string>, id: string): boolean => {
  if (seen.has(id)) return true;
  seen.add(id);
  return false;
};

const isBlank = (text: string) => text.trim() === "";

const labelProblem = (label: string): FormProblemCode | null => {
  if (isBlank(label)) return "labelRequired";
  if (label.length > FORM_LIMITS.maxLabelLength) return "labelTooLong";
  return null;
};

/** Las opciones de una lista: al menos una, con nombre y sin valores
 *  repetidos. */
export function validateOptions(
  options: readonly FieldOption[] | undefined,
  missing: FormProblemCode,
): FormProblemCode[] {
  if (!options || options.length === 0) return [missing];
  const problems: FormProblemCode[] = [];
  if (options.length > FORM_LIMITS.maxOptions) problems.push("tooManyOptions");

  const values = new Set<string>();
  for (const option of options) {
    const label = labelProblem(option.label);
    if (label) problems.push(label);
    if (isBlank(option.value) || isRepeated(values, option.value)) {
      problems.push("duplicateOption");
    }
  }
  return problems;
}

export function validateChecklistConfig(
  config: ChecklistConfig,
  ids: IdRegistry,
): FormProblemCode[] {
  const problems: FormProblemCode[] = [];

  if (
    config.options.length < FORM_LIMITS.minChecklistOptions ||
    config.options.length > FORM_LIMITS.maxChecklistOptions
  ) {
    problems.push("checklistOptionsCount");
  }
  const values = new Set<string>();
  for (const option of config.options) {
    const label = labelProblem(option.label);
    if (label) problems.push(label);
    const short = option.short.trim();
    if (short.length < 1 || short.length > FORM_LIMITS.maxChecklistShort) {
      problems.push("checklistShort");
    }
    if (isBlank(option.value) || isRepeated(values, option.value)) {
      problems.push("duplicateOption");
    }
  }
  if (
    config.note === "onFail" &&
    !config.options.some((option) => option.meaning === "fail")
  ) {
    problems.push("checklistNoteNeedsFail");
  }

  let answerable = 0;
  let total = 0;
  for (const block of config.blocks) {
    if (isRepeated(ids.blocks, block.id)) problems.push("duplicateBlockId");
    // Un bloque puede no tener título: una lista sin bloques es un solo
    // bloque con el título vacío.
    if (block.label.length > FORM_LIMITS.maxLabelLength) {
      problems.push("labelTooLong");
    }

    // Un subítem cuelga de un encabezado, directamente o tras otro subítem.
    // Al cambiar de bloque la cadena se corta.
    let underHeading = false;
    for (const item of block.items) {
      total += 1;
      if (isRepeated(ids.items, item.id)) problems.push("duplicateItemId");
      const label = labelProblem(item.label);
      if (label) problems.push(label);

      if (item.heading) {
        underHeading = true;
        continue;
      }
      answerable += 1;
      if (item.indented) {
        if (!underHeading) problems.push("checklistIndentedOrphan");
      } else {
        underHeading = false;
      }
    }
  }

  if (answerable === 0) problems.push("checklistNoItems");
  if (total > FORM_LIMITS.maxChecklistItems) {
    problems.push("checklistTooManyItems");
  }
  for (const extra of [config.quantity, config.date]) {
    const label = extra ? labelProblem(extra.label) : null;
    if (label) problems.push(label);
  }

  return problems;
}

export function validateReferenceConfig(
  config: ReferenceConfig,
): FormProblemCode[] {
  const problems: FormProblemCode[] = [];
  if (isBlank(config.formId)) problems.push("referenceFormRequired");
  if (
    config.fill.length > FORM_LIMITS.maxReferenceFill ||
    new Set(config.fill).size !== config.fill.length ||
    config.fill.some(isBlank)
  ) {
    problems.push("referenceFillInvalid");
  }
  return problems;
}

const isRowCount = (value: number) =>
  Number.isInteger(value) && value >= 0 && value <= FORM_LIMITS.maxTableRows;

export function validateTableConfig(
  config: TableConfig,
  kind: FormKind,
  ids: IdRegistry,
): FormProblemCode[] {
  const problems: FormProblemCode[] = [];

  if (
    config.columns.length < 1 ||
    config.columns.length > FORM_LIMITS.maxTableColumns
  ) {
    problems.push("tableColumnsCount");
  }
  const rowLabel = labelProblem(config.rowLabel);
  if (rowLabel) problems.push(rowLabel);

  for (const column of config.columns) {
    if (isRepeated(ids.columns, column.id)) problems.push("duplicateColumnId");
    const label = labelProblem(column.label);
    if (label) problems.push(label);

    // Una firma por fila es una firma: tampoco cabe en un listado.
    if (FIELD_TYPE_KINDS[column.type]?.includes(kind) === false) {
      problems.push("typeNotAllowed");
    }

    if (column.type === "select") {
      problems.push(...validateOptions(column.options, "tableColumnOptions"));
    } else if (column.options !== undefined) {
      problems.push("tableColumnConfigNotAllowed");
    }

    if (column.type === "reference") {
      if (column.reference) {
        problems.push(...validateReferenceConfig(column.reference));
      } else {
        problems.push("tableColumnReference");
      }
    } else if (column.reference !== undefined) {
      problems.push("tableColumnConfigNotAllowed");
    }
  }

  const { minRows, maxRows } = config;
  if (
    (minRows !== undefined && !isRowCount(minRows)) ||
    (maxRows !== undefined && (!isRowCount(maxRows) || maxRows < 1)) ||
    (minRows !== undefined && maxRows !== undefined && minRows > maxRows)
  ) {
    problems.push("tableRowsRange");
  }

  return problems;
}

/**
 * La configuración propia del tipo de un campo: obligatoria en su tipo,
 * prohibida en los demás, y válida cuando está.
 */
export function validateTypeConfig(
  field: FormField,
  kind: FormKind,
  ids: IdRegistry,
): FormProblemCode[] {
  const problems: FormProblemCode[] = [];
  const { checklist, table, reference, signature } = field.config;

  const present = { checklist, table, reference, signature };
  for (const [type, key] of Object.entries(CONFIG_KEY_BY_TYPE)) {
    const has = present[key] !== undefined;
    if (field.type === type && !has) problems.push("configRequired");
    if (field.type !== type && has) problems.push("configNotAllowed");
  }

  if (field.type === "checklist" && checklist) {
    problems.push(...validateChecklistConfig(checklist, ids));
  }
  if (field.type === "table" && table) {
    problems.push(...validateTableConfig(table, kind, ids));
  }
  if (field.type === "reference" && reference) {
    problems.push(...validateReferenceConfig(reference));
  }
  return problems;
}
