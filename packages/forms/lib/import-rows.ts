/** De las filas de un archivo a lo que se envía, con el motivo de lo que se
 *  queda fuera.
 *
 *  Es el paso 4 de una importación: nada se escribe hasta confirmar, y lo que
 *  se confirma se revisó con **las mismas reglas del servidor**
 *  —`importSections`, `missingRequired`, `validateValues`—. El servidor las
 *  vuelve a aplicar: esto existe para decirlo antes, fila por fila. Puro.
 */

import { formContext } from "@/convex/lib/form_context";
import {
  flattenFields,
  missingRequired,
  pruneFormValues,
} from "@/convex/lib/form_evaluation";
import type {
  ChecklistAnswer,
  FormKind,
  FormSection,
  FormValues,
  StoredFieldValue,
} from "@/convex/lib/form_types";
import { importSections } from "@/convex/lib/import_types";
import { toStoredValues } from "@/convex/lib/stored_values";
import { normalizeText, searchableText } from "@/convex/lib/text";
import { validateValues } from "@/convex/lib/value_validation";

import {
  type ImportCell,
  cellText,
  isBlankCell,
  parseBoolean,
  parseDate,
  parseNumber,
  parseTime,
} from "./import-cells";
import {
  BLANK_CHOICE,
  type ColumnMapping,
  type ImportTarget,
  type ValueMap,
  cellParts,
  targetsOf,
  valueKey,
} from "./import-mapping";
import type { ImportSheet } from "./import-sheet";

export interface ImportPlan {
  kind: FormKind;
  /** Las secciones de la versión publicada, tal cual. */
  sections: readonly FormSection[];
  /** Sólo en un listado: el campo que titula cada elemento. */
  titleFieldId?: string;
  /** Sólo en un formato: la columna de la fecha del hecho. */
  dateColumn: number | null;
  mapping: ColumnMapping;
  /** Por clave de destino. */
  valueMaps: Record<string, ValueMap>;
}

export interface BuiltRow {
  /** La línea en el archivo. */
  line: number;
  date?: string;
  values: StoredFieldValue[];
  /** Por qué no entra. Vacío si entra. */
  problems: string[];
  /** Lo que conviene mirar, aunque entre. */
  warnings: string[];
}

const quoted = (text: string) =>
  `«${text.length > 40 ? `${text.slice(0, 40)}…` : text}»`;

/** El valor de un campo a partir de una celda, o el motivo por el que no
 *  vale. `undefined` cuando la celda se deja vacía a propósito. */
function fieldValue(
  target: ImportTarget,
  cell: ImportCell,
  map: ValueMap | undefined,
): { value?: unknown; problem?: string } {
  const raw = cellText(cell);
  const wrong = (what: string) => ({
    problem: `«${target.label}»: ${quoted(raw)} no es ${what}`,
  });
  const mapped = (part: string) => map?.[valueKey(part)];
  const unmatched = (part: string, what: string) => ({
    problem: `«${target.label}»: ${quoted(part)} no corresponde a ${what}`,
  });

  if (target.kind === "item") {
    const choice = mapped(raw);
    if (choice === undefined) return unmatched(raw, "ninguna opción");
    return choice === BLANK_CHOICE ? {} : { value: choice };
  }

  switch (target.field.type) {
    case "number":
    case "currency": {
      const number = parseNumber(cell);
      return number === null ? wrong("un número") : { value: number };
    }
    case "date": {
      const date = parseDate(cell);
      return date === null ? wrong("una fecha") : { value: date };
    }
    case "time": {
      const time = parseTime(cell);
      return time === null ? wrong("una hora") : { value: time };
    }
    case "checkbox": {
      const checked = parseBoolean(cell);
      return checked === null ? wrong("un sí o un no") : { value: checked };
    }
    case "select": {
      const choice = mapped(raw);
      if (choice === undefined) return unmatched(raw, "ninguna opción");
      return choice === BLANK_CHOICE ? {} : { value: choice };
    }
    case "multiSelect": {
      const chosen: string[] = [];
      for (const part of cellParts(target, cell)) {
        const choice = mapped(part);
        if (choice === undefined) return unmatched(part, "ninguna opción");
        if (choice !== BLANK_CHOICE && !chosen.includes(choice)) {
          chosen.push(choice);
        }
      }
      return chosen.length > 0 ? { value: chosen } : {};
    }
    case "reference": {
      const choice = mapped(raw);
      if (choice === undefined) {
        return unmatched(raw, "ningún elemento del listado");
      }
      return choice === BLANK_CHOICE
        ? {}
        : { value: { responseId: choice, label: "", snapshot: [] } };
    }
    default:
      return { value: raw };
  }
}

/** Lo que identifica a una fila para saber si otra dice lo mismo. */
const signature = (date: string | undefined, values: StoredFieldValue[]) =>
  JSON.stringify([date ?? "", values]);

/**
 * Cada fila del archivo, con lo que se enviaría de ella o con sus motivos.
 *
 * Una fila con algún motivo **no se envía**. En un formato, dos filas
 * idénticas entran las dos, con aviso: dos inspecciones del mismo vehículo el
 * mismo día son dos hechos. En un listado, un título repetido es un error del
 * archivo: entra la primera y las demás se dicen.
 */
export function buildRows(
  sheet: ImportSheet,
  plan: ImportPlan,
  today: string,
): BuiltRow[] {
  const relaxed = importSections(plan.sections);
  const targets = new Map(
    targetsOf(plan.sections).map((target) => [target.key, target]),
  );
  const columns = Object.entries(plan.mapping)
    .map(([column, key]) => ({
      column: Number(column),
      target: targets.get(key),
    }))
    .filter(
      (entry): entry is { column: number; target: ImportTarget } =>
        entry.target !== undefined,
    );
  const labels = new Map(
    flattenFields(plan.sections).map((field) => [field.id, field.label]),
  );
  const titleField = flattenFields(plan.sections).find(
    (field) => field.id === plan.titleFieldId,
  );

  const seen = new Map<string, number>();
  const titles = new Map<string, number>();

  return sheet.rows.map((row) => {
    const problems: string[] = [];
    const warnings: string[] = [];
    const values: FormValues = {};
    /** Los campos cuya celda traía algo que no valió. */
    const failed = new Set<string>();

    let date: string | undefined;
    if (plan.kind === "record") {
      const cell =
        plan.dateColumn === null ? null : (row.cells[plan.dateColumn] ?? null);
      const parsed = parseDate(cell);
      if (parsed === null) {
        problems.push(
          isBlankCell(cell)
            ? "Falta la fecha del hecho"
            : `La fecha del hecho ${quoted(cellText(cell))} no es una fecha`,
        );
      } else if (parsed > today) {
        problems.push("La fecha del hecho es posterior a hoy");
      } else date = parsed;
    }

    for (const { column, target } of columns) {
      const cell = row.cells[column] ?? null;
      if (isBlankCell(cell)) continue;
      const { value, problem } = fieldValue(
        target,
        cell,
        plan.valueMaps[target.key],
      );
      if (problem) {
        problems.push(problem);
        failed.add(target.field.id);
      }
      if (value === undefined) continue;

      if (target.kind === "item") {
        const answers = (values[target.field.id] ?? []) as ChecklistAnswer[];
        answers.push({ itemId: target.itemId, value: value as string });
        values[target.field.id] = answers;
      } else values[target.field.id] = value;
    }

    // Las reglas del servidor, sobre lo que quedará tras la poda. El autor
    // no se conoce aquí y casi ninguna regla lo mira: basta la fecha.
    const context = formContext({ date: date ?? today, authorId: "" });
    const kept = pruneFormValues(relaxed, values, context);
    // Un obligatorio cuya celda no valió no «falta» además: ya se dijo por
    // qué, y arreglar eso lo arregla.
    const missing = missingRequired(relaxed, kept, context).filter(
      (field) => !failed.has(field.id),
    );
    if (missing.length > 0) {
      problems.push(
        `Falta ${missing.map((field) => `«${field.label}»`).join(", ")}`,
      );
    }
    for (const problem of validateValues(relaxed, kept)) {
      problems.push(
        `«${labels.get(problem.fieldId) ?? problem.fieldId}»: ${problem.message}`,
      );
    }

    const stored = toStoredValues(plan.sections, kept);
    if (stored.length === 0 && problems.length === 0) {
      problems.push("La fila no trae ningún dato de las columnas asignadas");
    }

    if (plan.kind === "catalog" && titleField) {
      const title = searchableText(
        normalizeText(String(kept[titleField.id] ?? "")),
      );
      const first = title === "" ? undefined : titles.get(title);
      if (first !== undefined) {
        problems.push(
          `«${titleField.label}» repite el de la fila ${first}: cada elemento va una vez`,
        );
      } else if (title !== "") titles.set(title, row.line);
    }

    if (plan.kind === "record" && problems.length === 0) {
      const key = signature(date, stored);
      const first = seen.get(key);
      if (first !== undefined) warnings.push(`Es idéntica a la fila ${first}`);
      else seen.set(key, row.line);
    }

    return {
      line: row.line,
      ...(date ? { date } : {}),
      values: stored,
      problems,
      warnings,
    };
  });
}

export interface ImportSummary {
  /** Las filas que se enviarían. */
  ready: number;
  /** Las que se quedan fuera. */
  rejected: number;
  /** De las que entran, las que llevan un aviso. */
  warned: number;
}

export function summarizeRows(rows: readonly BuiltRow[]): ImportSummary {
  let ready = 0;
  let warned = 0;
  for (const row of rows) {
    if (row.problems.length > 0) continue;
    ready += 1;
    if (row.warnings.length > 0) warned += 1;
  }
  return { ready, rejected: rows.length - ready, warned };
}

/** Los motivos de lo que se queda fuera, agrupados: «12 filas · Falta la
 *  fecha del hecho». El más frecuente primero. */
export function groupProblems(
  rows: readonly BuiltRow[],
): { message: string; lines: number[] }[] {
  const groups = new Map<string, number[]>();
  for (const row of rows) {
    for (const problem of row.problems) {
      const lines = groups.get(problem);
      if (lines) lines.push(row.line);
      else groups.set(problem, [row.line]);
    }
  }
  return [...groups.entries()]
    .map(([message, lines]) => ({ message, lines }))
    .sort((a, b) => b.lines.length - a.lines.length);
}

/** Las filas que se envían, en lotes. */
export function batchesOf<T>(rows: readonly T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let index = 0; index < rows.length; index += size) {
    batches.push(rows.slice(index, index + size));
  }
  return batches;
}
