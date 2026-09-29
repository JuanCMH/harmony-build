/** Cada valor de una respuesta, contra el campo que lo pide.
 *
 *  En Harmony esto sólo lo hacía el navegador: el servidor guardaba lo que
 *  llegara, y un correo sin arroba o una opción que ya no existía entraban sin
 *  que nadie lo supiera (diseño §8). Aquí la regla es una sola y vive en los
 *  dos lados: el formulario la usa para avisar junto al campo, y el servidor
 *  para no escribir lo que el cliente se saltó.
 *
 *  Puro: **no conoce la base**. Lo que exige leerla —que un archivo exista y
 *  sea reciente, que el elemento de una relación sea de su listado y esté
 *  activo— lo comprueba `resolveValues` (`convex/lib/form_values.ts`).
 *
 *  No mira visibilidad ni obligatorios: recibe los valores ya podados, y los
 *  obligatorios vacíos los dice `missingRequired`. Un valor vacío no se
 *  valida, porque no se guarda.
 */

import { answerableItems } from "./checklist_summary";
import { type ValueProblemCode, valueProblems } from "./error_messages";
import { flattenFields } from "./form_evaluation";
import {
  type ChecklistAnswer,
  FORM_LIMITS,
  type FormField,
  type FormSection,
  type FormValues,
  type TableColumn,
  type TableRow,
} from "./form_types";
import {
  isAnsweredItem,
  isBlankCell,
  isEmptyValue,
  toStoredCell,
  toStoredValue,
} from "./stored_values";

/** Un problema en el valor de un campo, con lo que haga falta para señalarlo:
 *  el ítem de la lista de chequeo, o la fila y la columna de la tabla. */
export interface ValueProblem {
  fieldId: string;
  code: ValueProblemCode;
  message: string;
  itemId?: string;
  rowId?: string;
  columnId?: string;
}

type Where = Pick<ValueProblem, "itemId" | "rowId" | "columnId">;
type Report = (code: ValueProblemCode, where?: Where) => void;

/* ──────────────────────────── Formatos de texto ─────────────────────────── */

/** Una fecha `YYYY-MM-DD` que existe: el 30 de febrero no. */
export function isRealDate(text: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!match) return false;
  const [year, month, day] = [
    Number(match[1]),
    Number(match[2]),
    Number(match[3]),
  ];
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/** Una hora `HH:mm`, de 00:00 a 23:59. */
export const isTime = (text: string): boolean =>
  /^([01]\d|2[0-3]):[0-5]\d$/.test(text);

export const isEmail = (text: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text);

/** Un enlace que se puede abrir: con su protocolo y sin espacios. */
export const isUrl = (text: string): boolean =>
  /^https?:\/\/[^\s/?#]+\.[^\s]+$/i.test(text);

/** Un teléfono: de 7 a 15 dígitos, con los separadores que la gente escribe. */
export function isPhone(text: string): boolean {
  if (!/^\+?[\d\s().-]+$/.test(text)) return false;
  const digits = text.replace(/\D/g, "").length;
  return digits >= 7 && digits <= 15;
}

const FORMAT_BY_TYPE: Partial<
  Record<FormField["type"], [(text: string) => boolean, ValueProblemCode]>
> = {
  email: [isEmail, "invalidEmail"],
  url: [isUrl, "invalidUrl"],
  phone: [isPhone, "invalidPhone"],
  date: [isRealDate, "invalidDate"],
  time: [isTime, "invalidTime"],
};

/* ─────────────────────────────── Por forma ──────────────────────────────── */

function validateText(field: FormField, text: string, report: Report) {
  const format = FORMAT_BY_TYPE[field.type];
  if (format && !format[0](text.trim())) report(format[1]);

  if (field.type === "select") {
    const exists = (field.config.options ?? []).some(
      (option) => option.value === text,
    );
    if (!exists) report("optionMissing");
    return;
  }

  const { minLength, maxLength } = field.config;
  const length = text.trim().length;
  if (minLength !== undefined && length < minLength) report("tooShort");
  if (length > Math.min(maxLength ?? Infinity, FORM_LIMITS.maxTextLength)) {
    report("tooLong");
  }
}

function validateNumber(field: FormField, value: number, report: Report) {
  const { minValue, maxValue } = field.config;
  if (minValue !== undefined && value < minValue) report("belowMin");
  if (maxValue !== undefined && value > maxValue) report("aboveMax");
}

function validateList(field: FormField, values: string[], report: Report) {
  const options = new Set(
    (field.config.options ?? []).map((option) => option.value),
  );
  if (values.some((value) => !options.has(value))) report("optionMissing");
}

function validateChecklist(
  field: FormField,
  answers: ChecklistAnswer[],
  report: Report,
) {
  const config = field.config.checklist;
  if (!config) return;

  const items = new Set(answerableItems(config).map((item) => item.id));
  const meaningOf = new Map(
    config.options.map((option) => [option.value, option.meaning]),
  );
  const chosen = new Map<string, string>();
  const seen = new Set<string>();

  for (const answer of answers) {
    if (!isAnsweredItem(answer)) continue;
    const where = { itemId: answer.itemId };

    // Un encabezado agrupa, no se responde: cuenta como un ítem que no existe.
    if (!items.has(answer.itemId)) {
      report("checklistUnknownItem", where);
      continue;
    }
    if (seen.has(answer.itemId)) report("checklistDuplicateItem", where);
    seen.add(answer.itemId);

    const meaning = answer.value ? meaningOf.get(answer.value) : undefined;
    if (answer.value) {
      if (meaning) chosen.set(answer.itemId, answer.value);
      else report("checklistOptionMissing", where);
    }

    const note = answer.note?.trim() ?? "";
    if (
      (note !== "" && config.note === "never") ||
      (answer.quantity !== undefined && !config.quantity) ||
      (answer.date !== undefined && answer.date !== "" && !config.date)
    ) {
      report("checklistExtraNotAllowed", where);
    }
    if (config.note === "onFail" && meaning === "fail" && note === "") {
      report("checklistNoteRequired", where);
    }
    if (note.length > FORM_LIMITS.maxNoteLength) {
      report("checklistNoteTooLong", where);
    }
    if (
      answer.quantity !== undefined &&
      !(Number.isFinite(answer.quantity) && answer.quantity >= 0)
    ) {
      report("checklistInvalidQuantity", where);
    }
    if (answer.date && !isRealDate(answer.date)) {
      report("checklistInvalidDate", where);
    }
  }

  // Obligatoria significa todos los ítems respondidos (diseño §4.1).
  if (field.required) {
    const missing = [...items].find((id) => !chosen.has(id));
    if (missing !== undefined)
      report("checklistIncomplete", { itemId: missing });
  }
}

/** Lo que una celda tiene que cumplir además de ser del tipo de su columna. */
function validateCell(
  column: TableColumn,
  value: unknown,
  report: Report,
  where: Where,
) {
  const stored = toStoredCell(column, value);
  if (!stored) {
    report("tableCellInvalid", where);
    return;
  }
  if (stored.kind === "text") {
    const text = stored.value;
    const valid =
      column.type === "date"
        ? isRealDate(text)
        : column.type === "select"
          ? (column.options ?? []).some((option) => option.value === text)
          : text.length <= FORM_LIMITS.maxTextLength;
    if (!valid) report("tableCellInvalid", where);
  }
  if (stored.kind === "signature" && stored.signerName === "") {
    report("signerNameRequired", where);
  }
}

const isRow = (value: unknown): value is TableRow =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as TableRow).rowId === "string" &&
  Array.isArray((value as TableRow).cells);

function validateTable(field: FormField, rows: TableRow[], report: Report) {
  const config = field.config.table;
  if (!config) return;

  const columns = new Map(config.columns.map((column) => [column.id, column]));
  // Una fila sin ninguna celda respondida no se guarda, así que no cuenta.
  const filled = rows.filter((row) =>
    row.cells.some((cell) => {
      const column = columns.get(cell.columnId);
      return !column || toStoredCell(column, cell.value) !== null;
    }),
  );

  const maxRows = Math.min(
    config.maxRows ?? FORM_LIMITS.maxTableRows,
    FORM_LIMITS.maxTableRows,
  );
  if (filled.length < (config.minRows ?? 0)) report("tableTooFewRows");
  if (filled.length > maxRows) report("tableTooManyRows");

  const rowIds = new Set<string>();
  for (const row of filled) {
    if (rowIds.has(row.rowId))
      report("tableDuplicateRow", { rowId: row.rowId });
    rowIds.add(row.rowId);

    const answered = new Set<string>();
    for (const cell of row.cells) {
      const where = { rowId: row.rowId, columnId: cell.columnId };
      const column = columns.get(cell.columnId);
      if (!column) {
        report("tableUnknownColumn", where);
        continue;
      }
      if (isBlankCell(cell.value)) continue;
      answered.add(column.id);
      validateCell(column, cell.value, report, where);
    }

    for (const column of config.columns) {
      if (column.required && !answered.has(column.id)) {
        report("tableCellRequired", { rowId: row.rowId, columnId: column.id });
      }
    }
  }
}

/* ─────────────────────────────── La entrada ─────────────────────────────── */

function validateValue(field: FormField, value: unknown, report: Report) {
  // Las dos formas anidadas se revisan pieza a pieza: así el problema señala
  // el ítem o la celda, y no sólo el campo.
  if (field.type === "checklist") {
    if (Array.isArray(value) && toStoredValue(field, value)) {
      validateChecklist(field, value as ChecklistAnswer[], report);
    } else report("wrongKind");
    return;
  }
  if (field.type === "table") {
    if (Array.isArray(value) && value.every(isRow)) {
      validateTable(field, value, report);
    } else report("wrongKind");
    return;
  }

  const stored = toStoredValue(field, value);
  if (!stored) {
    report("wrongKind");
    return;
  }
  switch (stored.kind) {
    case "text":
      validateText(field, stored.value, report);
      break;
    case "number":
      validateNumber(field, stored.value, report);
      break;
    case "list":
      validateList(field, stored.value, report);
      break;
    case "signature":
      if (stored.signerName === "") report("signerNameRequired");
      break;
  }
}

/**
 * Los problemas de los valores de una respuesta, en el orden del formato.
 * Una lista vacía si todo está bien.
 *
 * Lo que no es de ningún campo del formato se ignora: no se va a guardar.
 */
export function validateValues(
  sections: readonly FormSection[],
  values: FormValues,
): ValueProblem[] {
  const problems: ValueProblem[] = [];
  for (const field of flattenFields(sections)) {
    const value = values[field.id];
    if (isEmptyValue(field, value)) continue;
    validateValue(field, value, (code, where = {}) =>
      problems.push({
        fieldId: field.id,
        code,
        message: valueProblems[code],
        ...where,
      }),
    );
  }
  return problems;
}
