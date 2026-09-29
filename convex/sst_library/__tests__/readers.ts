/** Los lectores con que las pruebas recorren un formato de la biblioteca. */

import type {
  ChecklistConfig,
  FieldOption,
  FieldSize,
  FormField,
} from "../../lib/form_types";
import { SST_LIBRARY } from "../index";
import type { LibraryForm } from "../types";

export const ID_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const COLUMNS: Record<FieldSize, number> = {
  small: 3,
  medium: 6,
  large: 9,
  full: 12,
};

export const fieldsOf = (form: LibraryForm): FormField[] =>
  form.sections.flatMap((section) => section.fields);

export const fieldOf = (form: LibraryForm, id: string): FormField | undefined =>
  fieldsOf(form).find((field) => field.id === id);

export const checklistsOf = (form: LibraryForm) =>
  fieldsOf(form).flatMap((field) =>
    field.config.checklist
      ? [{ field, checklist: field.config.checklist }]
      : [],
  );

/** Las filas que se responden: todas menos las que sólo agrupan. */
export const answerable = (checklist: ChecklistConfig) =>
  checklist.blocks.flatMap((block) =>
    block.items.filter((item) => !item.heading),
  );

export interface Reference {
  where: string;
  formId: string;
  fill: string[];
}

export const referencesOf = (form: LibraryForm): Reference[] =>
  fieldsOf(form).flatMap((field) => [
    ...(field.config.reference
      ? [{ where: field.id, ...field.config.reference }]
      : []),
    ...(field.config.table?.columns ?? []).flatMap((column) =>
      column.reference
        ? [{ where: `${field.id}.${column.id}`, ...column.reference }]
        : [],
    ),
  ]);

/** Todos los ids del formato, con repetidos: comparten espacio de nombres. */
export const idsOf = (form: LibraryForm): string[] => {
  const optionValues = (options?: FieldOption[]) =>
    (options ?? []).map((option) => option.value);
  return form.sections.flatMap((section) => [
    section.id,
    ...section.fields.flatMap((field) => [
      field.id,
      ...optionValues(field.config.options),
      ...(field.config.checklist?.options ?? []).map((option) => option.value),
      ...(field.config.checklist?.blocks ?? []).flatMap((block) => [
        block.id,
        ...block.items.map((item) => item.id),
      ]),
      ...(field.config.table?.columns ?? []).flatMap((column) => [
        column.id,
        ...optionValues(column.options),
      ]),
    ]),
  ]);
};

/** Todo texto que ve quien diligencia y tiene tope de longitud. */
export const labelsOf = (form: LibraryForm): string[] =>
  form.sections.flatMap((section) => [
    section.label,
    ...section.fields.flatMap((field) => [
      field.label,
      ...(field.config.options ?? []).map((option) => option.label),
      ...(field.config.checklist?.options ?? []).map((option) => option.label),
      ...(field.config.checklist?.blocks ?? []).flatMap((block) => [
        block.label,
        ...block.items.map((item) => item.label),
      ]),
      ...(field.config.table?.columns ?? []).flatMap((column) => [
        column.label,
        ...(column.options ?? []).map((option) => option.label),
      ]),
    ]),
  ]);

export const duplicates = (values: string[]): string[] => [
  ...new Set(values.filter((value, index) => values.indexOf(value) !== index)),
];

/** Las filas de una sección en escritorio: los anchos de cada una, en orden. */
export const rowsOf = (fields: FormField[]): number[] => {
  const rows: number[] = [];
  let open = 0;
  for (const field of fields) {
    const width = COLUMNS[field.size];
    if (open + width > 12) {
      rows.push(open);
      open = 0;
    }
    open += width;
    if (open === 12) {
      rows.push(open);
      open = 0;
    }
  }
  if (open > 0) rows.push(open);
  return rows;
};

export const catalogs = SST_LIBRARY.filter((form) => form.kind === "catalog");
export const records = SST_LIBRARY.filter((form) => form.kind === "record");
export const indexOfKey = (key: string) =>
  SST_LIBRARY.findIndex((form) => form.key === key);

/** Cada formato con su clave, para `describe.each`. */
export const EACH_FORM = SST_LIBRARY.map((form) => [form.key, form] as const);
