/** La ÚNICA conversión entre el valor de un campo en memoria (`FieldValue`) y
 *  el que se guarda (`StoredValue`).
 *
 *  En memoria un valor es lo que sale de su control —una cadena, un número, un
 *  arreglo de filas— y lo que lee el motor de reglas. Guardado, lleva delante
 *  su `kind`, para que una respuesta se entienda sin cargar la definición del
 *  formato (diseño §3). Las dos formas se cruzan aquí y en ningún otro sitio:
 *  el formulario al enviar, el servidor al recibir y al escribir, y quien lee
 *  una respuesta para pintarla.
 *
 *  Puro. Un valor vacío **no se guarda**: `toStoredValue` devuelve `null`.
 */

import {
  type CellValue,
  type ChecklistAnswer,
  type FieldValue,
  type FileValue,
  type FormField,
  type FormSection,
  type FormValues,
  type ReferenceValue,
  type SignatureValue,
  STORED_KIND_BY_TYPE,
  type StoredCellValue,
  type StoredFieldValue,
  type StoredValue,
  type TableColumn,
  type TableColumnType,
  type TableRow,
} from "./form_types";

/* ───────────────────────────── Reconocer formas ─────────────────────────── */

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const isFileValue = (value: unknown): value is FileValue =>
  isRecord(value) &&
  typeof value.storageId === "string" &&
  typeof value.name === "string";

export const isSignatureValue = (value: unknown): value is SignatureValue =>
  isFileValue(value) &&
  typeof (value as Partial<SignatureValue>).signerName === "string";

export const isReferenceValue = (value: unknown): value is ReferenceValue =>
  isRecord(value) && typeof value.responseId === "string";

const isChecklistAnswer = (value: unknown): value is ChecklistAnswer =>
  isRecord(value) && typeof value.itemId === "string";

const isTableRow = (value: unknown): value is TableRow =>
  isRecord(value) &&
  typeof value.rowId === "string" &&
  Array.isArray(value.cells);

/** ¿Dice algo este ítem? Un ítem sin opción, sin observación, sin cantidad y
 *  sin fecha es una fila que nadie tocó. */
export const isAnsweredItem = (item: ChecklistAnswer): boolean =>
  (item.value !== undefined && item.value !== "") ||
  (item.note !== undefined && item.note.trim() !== "") ||
  item.quantity !== undefined ||
  (item.date !== undefined && item.date !== "");

/* ──────────────────────────────── Vacío ─────────────────────────────────── */

const isBlankScalar = (value: unknown): boolean => {
  if (value === undefined || value === null) return true;
  if (typeof value === "string") return value.trim() === "";
  if (typeof value === "number") return !Number.isFinite(value);
  return false;
};

/** Una celda sin responder: no se guarda ni se valida. */
export const isBlankCell = (value: unknown): boolean =>
  isBlankScalar(value) ||
  (isFileValue(value) && value.storageId === "") ||
  (isReferenceValue(value) && value.responseId === "");

/**
 * ¿Está sin responder?
 *
 * Una casilla sin marcar **no** está vacía: `false` es una respuesta. Una
 * lista de chequeo lo está si ningún ítem dice nada; una tabla, si ninguna
 * fila tiene una celda respondida.
 */
export function isEmptyValue(field: FormField, value: unknown): boolean {
  if (isBlankScalar(value)) return true;
  switch (STORED_KIND_BY_TYPE[field.type]) {
    case "list":
      return Array.isArray(value) && value.length === 0;
    case "file":
    case "signature":
      return isFileValue(value) && value.storageId === "";
    case "reference":
      return isReferenceValue(value) && value.responseId === "";
    // Lo que no tiene la forma de su campo no está vacío: está mal, y eso lo
    // dice `validateValues`.
    case "checklist":
      return (
        Array.isArray(value) &&
        value.every(isChecklistAnswer) &&
        !value.some(isAnsweredItem)
      );
    case "table":
      // Una fila sin ninguna celda respondida es una fila que nadie llenó.
      return (
        Array.isArray(value) &&
        value.every(isTableRow) &&
        !value.some((row) => row.cells.some((cell) => !isBlankCell(cell.value)))
      );
    default:
      return false;
  }
}

/* ─────────────────────────── De memoria a guardado ──────────────────────── */

const textOf = (value: unknown): string | null =>
  typeof value === "string" ? value : null;

/** Un número, o la cadena que lo escribe: un control de texto entrega «12». */
const numberOf = (value: unknown): number | null => {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

/** Un booleano, o el texto con que lo escribe un valor sugerido (`"true"`). */
const booleanOf = (value: unknown): boolean | null => {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
};

const storedFile = (value: unknown): StoredCellValue | null =>
  isFileValue(value)
    ? { kind: "file", storageId: value.storageId, name: value.name }
    : null;

const storedSignature = (value: unknown): StoredCellValue | null => {
  if (!isSignatureValue(value)) return null;
  const signerDocument = value.signerDocument?.trim();
  return {
    kind: "signature",
    storageId: value.storageId,
    name: value.name,
    signerName: value.signerName.trim(),
    ...(signerDocument ? { signerDocument } : {}),
  };
};

const storedReference = (value: unknown): StoredCellValue | null =>
  isReferenceValue(value)
    ? {
        kind: "reference",
        responseId: value.responseId,
        label: typeof value.label === "string" ? value.label : "",
        snapshot: Array.isArray(value.snapshot) ? value.snapshot : [],
      }
    : null;

/** Qué `kind` guarda la celda de cada tipo de columna. */
const CELL_KIND_BY_TYPE: Record<TableColumnType, StoredCellValue["kind"]> = {
  text: "text",
  date: "text",
  select: "text",
  number: "number",
  checkbox: "boolean",
  reference: "reference",
  image: "file",
  signature: "signature",
};

function toStoredScalar(
  kind: StoredCellValue["kind"],
  value: unknown,
): StoredCellValue | null {
  switch (kind) {
    case "text": {
      const text = textOf(value);
      return text === null ? null : { kind, value: text };
    }
    case "number": {
      const number = numberOf(value);
      return number === null ? null : { kind, value: number };
    }
    case "boolean": {
      const boolean = booleanOf(value);
      return boolean === null ? null : { kind, value: boolean };
    }
    case "file":
      return storedFile(value);
    case "signature":
      return storedSignature(value);
    case "reference":
      return storedReference(value);
  }
}

/** El valor de una celda, como se guarda; `null` si está vacía o si su forma
 *  no es la de su columna. */
export function toStoredCell(
  column: TableColumn,
  value: unknown,
): StoredCellValue | null {
  if (isBlankCell(value)) return null;
  return toStoredScalar(CELL_KIND_BY_TYPE[column.type], value);
}

const cleanAnswer = (item: ChecklistAnswer): ChecklistAnswer => {
  const note = item.note?.trim();
  return {
    itemId: item.itemId,
    ...(item.value ? { value: item.value } : {}),
    ...(note ? { note } : {}),
    ...(item.quantity !== undefined ? { quantity: item.quantity } : {}),
    ...(item.date ? { date: item.date } : {}),
  };
};

function toStoredTable(field: FormField, value: unknown): StoredValue | null {
  if (!Array.isArray(value) || !value.every(isTableRow)) return null;
  const columns = new Map(
    (field.config.table?.columns ?? []).map((column) => [column.id, column]),
  );
  const rows = [];
  for (const row of value) {
    const cells = [];
    for (const cell of row.cells) {
      if (isBlankCell(cell.value)) continue;
      const column = columns.get(cell.columnId);
      const stored = column ? toStoredCell(column, cell.value) : null;
      // Una celda que no se puede guardar invalida la tabla entera: callarla
      // dejaría pasar una fila a medias como si estuviera completa.
      if (!stored) return null;
      cells.push({ columnId: cell.columnId, value: stored });
    }
    // Una fila sin ninguna celda respondida es una fila que nadie llenó.
    if (cells.length > 0) rows.push({ rowId: row.rowId, cells });
  }
  return rows.length > 0 ? { kind: "table", rows } : null;
}

/**
 * El valor de un campo, como se guarda.
 *
 * Devuelve `null` en dos casos: el valor está vacío —y entonces no se
 * guarda—, o su forma no es la del tipo del campo —y entonces lo rechaza
 * `validateValues`, que distingue los dos con `isEmptyValue`—.
 */
export function toStoredValue(
  field: FormField,
  value: unknown,
): StoredValue | null {
  if (isEmptyValue(field, value)) return null;
  const kind = STORED_KIND_BY_TYPE[field.type];
  switch (kind) {
    case "list":
      return Array.isArray(value) &&
        value.every((item) => typeof item === "string")
        ? { kind, value: value as string[] }
        : null;
    case "checklist":
      return Array.isArray(value) && value.every(isChecklistAnswer)
        ? { kind, items: value.filter(isAnsweredItem).map(cleanAnswer) }
        : null;
    case "table":
      return toStoredTable(field, value);
    default:
      return toStoredScalar(kind, value);
  }
}

/** Todos los valores de un formato, como se guardan, en el orden de sus
 *  campos. Lo vacío y lo que no es de ningún campo no entra. */
export function toStoredValues(
  sections: readonly FormSection[],
  values: FormValues,
): StoredFieldValue[] {
  const stored: StoredFieldValue[] = [];
  for (const section of [...sections].sort((a, b) => a.order - b.order)) {
    for (const field of section.fields) {
      const value = toStoredValue(field, values[field.id]);
      if (value) stored.push({ fieldId: field.id, value });
    }
  }
  return stored;
}

/* ─────────────────────────── De guardado a memoria ──────────────────────── */

function fromStoredCell(stored: StoredCellValue): CellValue {
  switch (stored.kind) {
    case "text":
    case "number":
    case "boolean":
      return stored.value;
    case "file":
      return { storageId: stored.storageId, name: stored.name };
    case "signature":
      return {
        storageId: stored.storageId,
        name: stored.name,
        signerName: stored.signerName,
        ...(stored.signerDocument
          ? { signerDocument: stored.signerDocument }
          : {}),
      };
    case "reference":
      return {
        responseId: stored.responseId,
        label: stored.label,
        snapshot: stored.snapshot,
      };
  }
}

/** El valor guardado de un campo, como lo espera su control y el motor. */
export function fromStoredValue(stored: StoredValue): FieldValue {
  switch (stored.kind) {
    case "list":
      return stored.value;
    case "checklist":
      return stored.items;
    case "table":
      return stored.rows.map((row) => ({
        rowId: row.rowId,
        cells: row.cells.map((cell) => ({
          columnId: cell.columnId,
          value: fromStoredCell(cell.value),
        })),
      }));
    default:
      return fromStoredCell(stored);
  }
}

/** Los valores guardados de una respuesta, como el mapa `fieldId → valor` que
 *  el motor espera. */
export function fromStoredValues(
  stored: readonly StoredFieldValue[],
): FormValues {
  const values: FormValues = {};
  for (const { fieldId, value } of stored) {
    values[fieldId] = fromStoredValue(value);
  }
  return values;
}

/**
 * Los archivos que nombra un conjunto de valores guardados: los de sus campos
 * de archivo, imagen y firma, y los de las celdas de sus tablas.
 *
 * Es lo que hay que borrar del almacenamiento cuando desaparece la respuesta,
 * y lo que se compara para soltar el archivo que un elemento reemplazó.
 */
export function storedFileIds(stored: readonly StoredFieldValue[]): string[] {
  const ids = new Set<string>();
  const collect = (value: StoredCellValue) => {
    if (value.kind === "file" || value.kind === "signature") {
      ids.add(value.storageId);
    }
  };
  for (const { value } of stored) {
    if (value.kind === "table") {
      for (const row of value.rows) {
        for (const cell of row.cells) collect(cell.value);
      }
    } else if (value.kind !== "list" && value.kind !== "checklist") {
      collect(value);
    }
  }
  return [...ids];
}
