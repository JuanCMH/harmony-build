/** Las piezas con que las pruebas de `convex/lib/` y de `convex/__tests__/`
 *  arman un formato: un campo, una sección y las configuraciones de los tipos
 *  nuevos. Los datos son de la obra: una inspección, un vehículo, una entrega
 *  de dotación (`04 §6`).
 */

import type {
  ChecklistConfig,
  FieldVisibility,
  FormField,
  FormSection,
  TableConfig,
  VisibilityOperator,
} from "../form_types";

export const field = (
  id: string,
  extra: Partial<FormField> = {},
): FormField => ({
  id,
  type: "text",
  label: id,
  required: false,
  size: "medium",
  showInTable: false,
  config: {},
  ...extra,
});

export const section = (
  id: string,
  order: number,
  fields: FormField[],
  visibility?: FieldVisibility,
): FormSection => ({
  id,
  label: id,
  order,
  fields,
  ...(visibility ? { visibility } : {}),
});

/** Un formato de una sola sección. */
export const oneSection = (...fields: FormField[]): FormSection[] => [
  section("general", 1, fields),
];

export const rule = (
  fieldId: string,
  operator: VisibilityOperator,
  ...values: string[]
) => ({ fieldId, operator, values });

/** Se ve cuando todas las reglas se cumplen. */
export const when = (...rules: ReturnType<typeof rule>[]): FieldVisibility => ({
  match: "all",
  rules,
});

/** La escala B/M/N.A de las inspecciones preoperacionales. */
export const SCALE_BMNA: ChecklistConfig["options"] = [
  { value: "b", label: "Bueno", short: "B", meaning: "ok" },
  { value: "m", label: "Malo", short: "M", meaning: "fail" },
  { value: "na", label: "No aplica", short: "N.A", meaning: "na" },
];

/** Un trozo de la inspección preoperacional de vehículos: dos bloques, con un
 *  ítem que agrupa subítems. Cuatro ítems se responden. */
export const checklistConfig = (
  extra: Partial<ChecklistConfig> = {},
): ChecklistConfig => ({
  options: SCALE_BMNA,
  blocks: [
    {
      id: "niveles",
      label: "1. Niveles",
      items: [
        { id: "aceite", label: "Aceite de motor" },
        { id: "refrigerante", label: "Refrigerante" },
      ],
    },
    {
      id: "luces",
      label: "2. Luces",
      items: [
        { id: "frontales", label: "Luces frontales", heading: true },
        { id: "altas", label: "Altas", indented: true },
        { id: "medias", label: "Medias", indented: true },
      ],
    },
  ],
  note: "onFail",
  ...extra,
});

export const checklistField = (
  id: string,
  extra: Partial<FormField> = {},
  config: Partial<ChecklistConfig> = {},
): FormField =>
  field(id, {
    type: "checklist",
    size: "full",
    config: { checklist: checklistConfig(config) },
    ...extra,
  });

/** La entrega de dotación: elemento, cantidad, fecha y talla. */
export const tableConfig = (extra: Partial<TableConfig> = {}): TableConfig => ({
  rowLabel: "Elemento entregado",
  columns: [
    { id: "elemento", label: "Elemento", type: "text", required: true },
    { id: "cantidad", label: "Cantidad", type: "number", required: true },
    { id: "fecha", label: "Fecha", type: "date", required: false },
    {
      id: "talla",
      label: "Talla",
      type: "select",
      required: false,
      options: [
        { label: "M", value: "m" },
        { label: "L", value: "l" },
      ],
    },
  ],
  ...extra,
});

export const tableField = (
  id: string,
  extra: Partial<FormField> = {},
  config: Partial<TableConfig> = {},
): FormField =>
  field(id, {
    type: "table",
    size: "full",
    config: { table: tableConfig(config) },
    ...extra,
  });

export const referenceField = (
  id: string,
  formId: string,
  fill: string[] = [],
  extra: Partial<FormField> = {},
): FormField =>
  field(id, {
    type: "reference",
    config: { reference: { formId, fill } },
    ...extra,
  });

export const signatureField = (
  id: string,
  signer: "author" | "other" = "author",
  extra: Partial<FormField> = {},
): FormField =>
  field(id, { type: "signature", config: { signature: { signer } }, ...extra });

export const selectField = (
  id: string,
  values: string[],
  extra: Partial<FormField> = {},
): FormField =>
  field(id, {
    type: "select",
    config: { options: values.map((value) => ({ label: value, value })) },
    ...extra,
  });
