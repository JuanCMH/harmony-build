/** Los validadores de Convex de las formas de `form_types.ts`.
 *
 *  Van aparte porque `form_types.ts` es puro y lo importa el navegador sin
 *  arrastrar nada; estos sólo los necesitan el schema y las funciones. Cada
 *  validador lleva al lado el tipo que valida: si uno cambia y el otro no, las
 *  comprobaciones del final de este archivo dejan de compilar.
 */

import { type Infer, v } from "convex/values";
import {
  CHECKLIST_MEANINGS,
  CHECKLIST_NOTE_MODES,
  COMPUTED_OPERATORS,
  DATE_ADD_UNITS,
  FIELD_SIZES,
  FIELD_TYPES,
  FORM_AUDIENCES,
  FORM_KINDS,
  FORM_STATUSES,
  type FormSection,
  RESPONSE_STATUSES,
  type StoredFieldValue,
  TABLE_COLUMN_TYPES,
  VISIBILITY_OPERATORS,
} from "./form_types";

const literals = <T extends string>(values: readonly T[]) =>
  v.union(...values.map((value) => v.literal(value)));

export const formKind = literals(FORM_KINDS);
export const formStatus = literals(FORM_STATUSES);
export const formAudience = literals(FORM_AUDIENCES);
export const responseStatus = literals(RESPONSE_STATUSES);

/* ───────────────────────────── Definición ───────────────────────────────── */

const visibilityOperator = literals(VISIBILITY_OPERATORS);

const visibilityRule = v.object({
  fieldId: v.string(),
  operator: visibilityOperator,
  values: v.array(v.string()),
});

const visibilityConfig = v.object({
  match: v.union(v.literal("all"), v.literal("any")),
  rules: v.array(visibilityRule),
});

const computedOperator = literals(COMPUTED_OPERATORS);

const numericOptions = {
  emptyAs: v.optional(v.number()),
  rounding: v.optional(v.number()),
};

const fieldComputed = v.union(
  v.object({
    kind: v.literal("formula"),
    terms: v.array(
      v.union(
        v.object({ type: v.literal("field"), fieldId: v.string() }),
        v.object({ type: v.literal("const"), value: v.number() }),
        v.object({ type: v.literal("op"), op: computedOperator }),
      ),
    ),
    ...numericOptions,
  }),
  v.object({
    kind: v.literal("percent"),
    of: v.string(),
    percent: v.number(),
    ...numericOptions,
  }),
  v.object({
    kind: v.literal("arithmetic"),
    operands: v.array(v.string()),
    op: computedOperator,
    ...numericOptions,
  }),
  v.object({
    kind: v.union(
      v.literal("daysUntil"),
      v.literal("daysSince"),
      v.literal("yearsSince"),
    ),
    of: v.string(),
  }),
  v.object({
    kind: v.literal("dateAdd"),
    of: v.string(),
    amount: v.number(),
    unit: literals(DATE_ADD_UNITS),
  }),
  v.object({ kind: v.literal("count"), of: v.string() }),
  v.object({
    kind: v.literal("concat"),
    parts: v.array(
      v.union(
        v.object({ type: v.literal("field"), fieldId: v.string() }),
        v.object({ type: v.literal("text"), text: v.string() }),
      ),
    ),
  }),
);

const fieldAutoValue = v.object({
  rules: v.array(
    v.object({
      fieldId: v.string(),
      operator: visibilityOperator,
      values: v.array(v.string()),
      set: v.string(),
    }),
  ),
});

const fieldOption = v.object({ label: v.string(), value: v.string() });

const referenceConfig = v.object({
  formId: v.string(),
  fill: v.array(v.string()),
});

const checklistConfig = v.object({
  options: v.array(
    v.object({
      value: v.string(),
      label: v.string(),
      short: v.string(),
      meaning: literals(CHECKLIST_MEANINGS),
    }),
  ),
  blocks: v.array(
    v.object({
      id: v.string(),
      label: v.string(),
      items: v.array(
        v.object({
          id: v.string(),
          label: v.string(),
          heading: v.optional(v.boolean()),
          indented: v.optional(v.boolean()),
        }),
      ),
    }),
  ),
  note: literals(CHECKLIST_NOTE_MODES),
  quantity: v.optional(v.object({ label: v.string() })),
  date: v.optional(v.object({ label: v.string() })),
});

const tableConfig = v.object({
  columns: v.array(
    v.object({
      id: v.string(),
      label: v.string(),
      type: literals(TABLE_COLUMN_TYPES),
      required: v.boolean(),
      options: v.optional(v.array(fieldOption)),
      reference: v.optional(referenceConfig),
    }),
  ),
  rowLabel: v.string(),
  minRows: v.optional(v.number()),
  maxRows: v.optional(v.number()),
});

const signatureConfig = v.object({
  signer: v.union(v.literal("author"), v.literal("other")),
});

const fieldConfig = v.object({
  minLength: v.optional(v.number()),
  maxLength: v.optional(v.number()),
  minValue: v.optional(v.number()),
  maxValue: v.optional(v.number()),
  options: v.optional(v.array(fieldOption)),
  acceptedFormats: v.optional(v.array(v.string())),
  maxFileSize: v.optional(v.number()),
  visibility: v.optional(visibilityConfig),
  computed: v.optional(fieldComputed),
  autoValue: v.optional(fieldAutoValue),
  checklist: v.optional(checklistConfig),
  table: v.optional(tableConfig),
  reference: v.optional(referenceConfig),
  signature: v.optional(signatureConfig),
});

const formField = v.object({
  id: v.string(),
  type: literals(FIELD_TYPES),
  label: v.string(),
  description: v.optional(v.string()),
  placeholder: v.optional(v.string()),
  required: v.boolean(),
  size: literals(FIELD_SIZES),
  showInTable: v.boolean(),
  config: fieldConfig,
});

export const formSection = v.object({
  id: v.string(),
  label: v.string(),
  description: v.optional(v.string()),
  order: v.number(),
  visibility: v.optional(visibilityConfig),
  fields: v.array(formField),
});

export const formSections = v.array(formSection);

/* ───────────────────────────────── Valores ──────────────────────────────── */

const fileValue = { storageId: v.id("_storage"), name: v.string() };

const signatureValue = {
  ...fileValue,
  signerName: v.string(),
  signerDocument: v.optional(v.string()),
};

const referenceValue = {
  responseId: v.id("formResponses"),
  label: v.string(),
  snapshot: v.array(
    v.object({ fieldId: v.string(), label: v.string(), text: v.string() }),
  ),
};

const storedCellValue = v.union(
  v.object({ kind: v.literal("text"), value: v.string() }),
  v.object({ kind: v.literal("number"), value: v.number() }),
  v.object({ kind: v.literal("boolean"), value: v.boolean() }),
  v.object({ kind: v.literal("file"), ...fileValue }),
  v.object({ kind: v.literal("signature"), ...signatureValue }),
  v.object({ kind: v.literal("reference"), ...referenceValue }),
);

export const storedValue = v.union(
  v.object({ kind: v.literal("text"), value: v.string() }),
  v.object({ kind: v.literal("number"), value: v.number() }),
  v.object({ kind: v.literal("boolean"), value: v.boolean() }),
  v.object({ kind: v.literal("file"), ...fileValue }),
  v.object({ kind: v.literal("signature"), ...signatureValue }),
  v.object({ kind: v.literal("reference"), ...referenceValue }),
  v.object({ kind: v.literal("list"), value: v.array(v.string()) }),
  v.object({
    kind: v.literal("checklist"),
    items: v.array(
      v.object({
        itemId: v.string(),
        value: v.optional(v.string()),
        note: v.optional(v.string()),
        quantity: v.optional(v.number()),
        date: v.optional(v.string()),
      }),
    ),
  }),
  v.object({
    kind: v.literal("table"),
    rows: v.array(
      v.object({
        rowId: v.string(),
        cells: v.array(
          v.object({ columnId: v.string(), value: storedCellValue }),
        ),
      }),
    ),
  }),
);

export const storedFieldValue = v.object({
  fieldId: v.string(),
  value: storedValue,
});

export const storedFieldValues = v.array(storedFieldValue);

/* ─────────────── El validador y el tipo dicen lo mismo, o no compila ─────── */

/** Un id de Convex es una cadena con marca: para comparar las dos formas se
 *  le quita la marca al lado del validador. */
type Unbranded<T> = T extends { __tableName: string }
  ? string
  : T extends (infer U)[]
    ? Unbranded<U>[]
    : T extends object
      ? { [K in keyof T]: Unbranded<T[K]> }
      : T;

type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never;

const _sectionMatches: Same<Unbranded<Infer<typeof formSection>>, FormSection> =
  true;
const _valueMatches: Same<
  Unbranded<Infer<typeof storedFieldValue>>,
  StoredFieldValue
> = true;
void _sectionMatches;
void _valueMatches;
