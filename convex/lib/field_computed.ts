/** Las recetas de un campo derivado: cómo se calcula su valor.
 *
 *  Es la mitad de `convex/lib/field_logic.ts` de Harmony que evalúa los
 *  derivados; la otra mitad —reglas, visibilidad y referencias— sigue en
 *  `field_logic.ts`. Se separaron al portar para que ninguno de los dos
 *  archivos cruzara el umbral de `06 §3`. Puro, como el resto del motor.
 */

import {
  type LogicField,
  computeVisibility,
  computedReferences,
} from "./field_logic";
import type {
  ComputedOperator,
  DateAddUnit,
  FieldComputed,
  FormulaComputed,
  FormValues,
} from "./form_types";
import { dateParts, isBlank, toNumber, toText } from "./value_coercion";

const precedence = (op: ComputedOperator): number =>
  op === "+" || op === "-" ? 1 : 2;

const round = (value: number, decimals = 0): number | null => {
  if (!Number.isFinite(value)) return null;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

const DAY_MS = 24 * 60 * 60 * 1000;

const toIsoDay = (year: number, monthIndex: number, day: number): string => {
  const date = new Date(Date.UTC(year, monthIndex, day));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
};

/** Una receta que de verdad calcula algo: una fórmula sin términos no. */
const hasRecipe = (
  computed: FieldComputed | undefined,
): computed is FieldComputed =>
  !!computed && (computed.kind !== "formula" || computed.terms.length > 0);

/**
 * Suma un plazo a una fecha `YYYY-MM-DD`.
 *
 * Un mes o un año que caen en un día que no existe se quedan en el último del
 * mes: 31 de enero más un mes es 28 o 29 de febrero, no 3 de marzo.
 */
export function addToDate(
  date: string,
  amount: number,
  unit: DateAddUnit,
): string | null {
  const parts = dateParts(date);
  if (!parts || !Number.isInteger(amount)) return null;
  if (unit === "days") return toIsoDay(parts.y, parts.m - 1, parts.d + amount);
  const total = parts.m - 1 + (unit === "months" ? amount : amount * 12);
  const year = parts.y + Math.floor(total / 12);
  const month = ((total % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return toIsoDay(year, month, Math.min(parts.d, lastDay));
}

/** Lo que necesita una receta además de los valores. */
export interface ComputeContext {
  /** Los campos del formato: un texto compuesto nombra la opción de una
   *  lista por su etiqueta, no por su valor. */
  fields?: ReadonlyArray<LogicField>;
  /** Hoy, `YYYY-MM-DD` en Colombia (`todayInColombia`). Sin él las recetas de
   *  hoy no se evalúan, que es lo que hace el servidor al guardar. */
  today?: string;
}

/** Un valor como pieza de un texto compuesto. */
const asPiece = (value: unknown, field: LogicField | undefined): string => {
  const label = (raw: unknown) =>
    field?.config.options?.find((option) => option.value === toText(raw))
      ?.label ?? toText(raw);
  if (Array.isArray(value)) return value.map(label).join(", ");
  if (value === true || value === "true") return "Sí";
  if (value === false || value === "false") return "No";
  return label(value);
};

/**
 * La fórmula libre, con precedencia estándar —× y ÷ antes de + y −— por
 * notación polaca inversa. Sin `eval`: determinista y con el mismo resultado en
 * cliente y servidor.
 */
function evaluateFormula(
  computed: FormulaComputed,
  values: FormValues,
): number | null {
  if (computed.terms.length === 0) return null;
  const references = computedReferences(computed);
  if (references.length > 0 && references.every((id) => isBlank(values[id]))) {
    return null;
  }
  const emptyAs = computed.emptyAs ?? 0;

  const output: Array<
    { type: "num"; value: number } | { type: "op"; op: ComputedOperator }
  > = [];
  const operators: ComputedOperator[] = [];

  for (const term of computed.terms) {
    if (term.type === "op") {
      while (
        operators.length > 0 &&
        precedence(operators[operators.length - 1]) >= precedence(term.op)
      ) {
        output.push({ type: "op", op: operators.pop() as ComputedOperator });
      }
      operators.push(term.op);
    } else if (term.type === "const") {
      if (!Number.isFinite(term.value)) return null;
      output.push({ type: "num", value: term.value });
    } else {
      const operand = toNumber(values[term.fieldId]);
      output.push({ type: "num", value: operand === null ? emptyAs : operand });
    }
  }
  while (operators.length > 0) {
    output.push({ type: "op", op: operators.pop() as ComputedOperator });
  }

  const stack: number[] = [];
  for (const token of output) {
    if (token.type === "num") {
      stack.push(token.value);
      continue;
    }
    const right = stack.pop();
    const left = stack.pop();
    if (left === undefined || right === undefined) return null;
    if (token.op === "+") stack.push(left + right);
    else if (token.op === "-") stack.push(left - right);
    else if (token.op === "*") stack.push(left * right);
    else {
      if (right === 0) return null;
      stack.push(left / right);
    }
  }

  if (stack.length !== 1) return null;
  return round(stack[0], computed.rounding ?? 0);
}

/**
 * El valor de un derivado: un número, una fecha `YYYY-MM-DD` o un texto.
 *
 *  - **Con todos los operandos de campo vacíos, vacío**: un IVA de 0 sobre un
 *    contrato que nadie ha escrito es un dato falso. Con alguno lleno, el vacío
 *    vale `emptyAs` (0).
 *  - División por cero, fecha inválida o resultado no finito → `null`.
 *  - Una receta de hoy sin `context.today` → `null`.
 */
export function evaluateComputed(
  computed: FieldComputed,
  values: FormValues,
  context: ComputeContext = {},
): number | string | null {
  switch (computed.kind) {
    case "formula":
      return evaluateFormula(computed, values);

    case "percent": {
      const base = toNumber(values[computed.of]);
      if (base === null || !Number.isFinite(computed.percent)) return null;
      return round((base * computed.percent) / 100, computed.rounding ?? 0);
    }

    case "arithmetic": {
      if (computed.operands.length < 2) return null;
      if (computed.operands.every((id) => isBlank(values[id]))) return null;
      const emptyAs = computed.emptyAs ?? 0;
      const [first, ...rest] = computed.operands.map(
        (id) => toNumber(values[id]) ?? emptyAs,
      );
      let total = first;
      for (const operand of rest) {
        if (computed.op === "+") total += operand;
        else if (computed.op === "-") total -= operand;
        else if (computed.op === "*") total *= operand;
        else {
          if (operand === 0) return null;
          total /= operand;
        }
      }
      return round(total, computed.rounding ?? 0);
    }

    case "daysUntil":
    case "daysSince":
    case "yearsSince": {
      const date = dateParts(values[computed.of]);
      const today = dateParts(context.today);
      if (!date || !today) return null;
      if (computed.kind === "yearsSince") {
        const beforeBirthday =
          today.m < date.m || (today.m === date.m && today.d < date.d);
        const years = today.y - date.y - (beforeBirthday ? 1 : 0);
        return years < 0 ? null : years;
      }
      const days =
        (Date.UTC(date.y, date.m - 1, date.d) -
          Date.UTC(today.y, today.m - 1, today.d)) /
        DAY_MS;
      return computed.kind === "daysUntil" ? days : -days;
    }

    case "dateAdd": {
      const date = values[computed.of];
      return typeof date === "string"
        ? addToDate(date, computed.amount, computed.unit)
        : null;
    }

    case "count": {
      const checked = values[computed.of];
      return Array.isArray(checked) && checked.length > 0
        ? checked.length
        : null;
    }

    case "concat": {
      const references = computedReferences(computed);
      if (
        references.length > 0 &&
        references.every((id) => isBlank(values[id]))
      ) {
        return null;
      }
      const byId = new Map(
        (context.fields ?? []).map((field) => [field.id, field]),
      );
      const text = computed.parts
        .map((part) =>
          part.type === "text"
            ? part.text
            : asPiece(values[part.fieldId], byId.get(part.fieldId)),
        )
        .join("")
        .trim();
      return text === "" ? null : text;
    }
  }
  return null;
}

/**
 * El valor de todos los derivados **visibles**.
 *
 * Los ocultos no se calculan, y como operandos cuentan como vacíos. Varias
 * pasadas para resolver un derivado que se alimenta de otro —«vencimiento =
 * expedición + 1 año» y «días hasta el vencimiento»—; el grafo es acíclico
 * porque se valida al guardar. Sin `today`, las recetas de hoy se saltan.
 */
export function computeComputedValues(
  fields: ReadonlyArray<LogicField>,
  values: FormValues,
  visibility?: Map<string, boolean>,
  today?: string,
): Map<string, number | string> {
  const visible = visibility ?? computeVisibility(fields, values);
  const computedFields = fields.filter((field) =>
    hasRecipe(field.config.computed),
  );
  const results = new Map<string, number | string>();
  if (computedFields.length === 0) return results;

  const base: FormValues = {};
  for (const field of fields) {
    if (visible.get(field.id) !== false) base[field.id] = values[field.id];
  }

  for (let pass = 0; pass <= computedFields.length; pass++) {
    let changed = false;
    for (const field of computedFields) {
      if (visible.get(field.id) === false) continue;
      const merged: FormValues = { ...base };
      for (const [id, value] of results) merged[id] = value;
      const value = evaluateComputed(
        field.config.computed as FieldComputed,
        merged,
        { fields, today },
      );
      if (value !== null && results.get(field.id) !== value) {
        results.set(field.id, value);
        changed = true;
      }
    }
    if (!changed) break;
  }

  return results;
}
