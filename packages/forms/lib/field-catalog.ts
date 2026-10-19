import type { FormKind } from "@/convex/lib/form_types";
import {
  type ComputedKind,
  type ComputedOperator,
  type DateAddUnit,
  type FieldType,
  type VisibilityOperator,
} from "@/convex/lib/form_types";
import {
  AlignLeft,
  Archive,
  ArchiveRestore,
  AtSign,
  Ban,
  Box,
  Cake,
  Calendar,
  CalendarPlus,
  CheckSquare,
  ClipboardCheck,
  ClipboardList,
  ClipboardPen,
  Clock,
  Combine,
  CopyPlus,
  DollarSign,
  Equal,
  Eraser,
  Hash,
  Image,
  Flag,
  LibraryBig,
  Milestone,
  Lightbulb,
  Link,
  List,
  ListChecks,
  ListTodo,
  type LucideIcon,
  Network,
  Paperclip,
  PenLine,
  Percent,
  Phone,
  Rocket,
  Sigma,
  Signature,
  Split,
  Table,
  Tag,
  Tally5,
  Timer,
  TimerReset,
  Type,
  Undo2,
  Variable,
} from "lucide-react";

/**
 * Los glifos del módulo de formatos, en un solo sitio (`03 §5.5`).
 *
 * Son cinco listas cerradas —entidades, acciones, tipos de campo, marcas de
 * comportamiento y recetas— y dentro de cada una ningún glifo se repite: dos
 * entradas iguales en una paleta de dieciocho no distinguen ninguna. Lo vigila
 * `__tests__/field-catalog.test.ts`.
 */

/** Las entidades del módulo (`03 §5.2`). */
export const ENTITY_ICONS = {
  form: ClipboardList,
  catalog: LibraryBig,
  response: ClipboardPen,
  entry: Box,
  category: Tag,
  tracking: Milestone,
  issue: Flag,
} as const satisfies Record<string, LucideIcon>;

/** El icono de un formato, según su clase. */
export const KIND_ICON = {
  record: ENTITY_ICONS.form,
  catalog: ENTITY_ICONS.catalog,
  tracking: ENTITY_ICONS.tracking,
} as const satisfies Record<FormKind, LucideIcon>;

/** Las acciones propias del módulo (`03 §5.3`). */
export const FORM_ACTION_ICONS = {
  fill: PenLine,
  publish: Rocket,
  discardDraft: Undo2,
  duplicate: CopyPlus,
  archive: Archive,
  unarchive: ArchiveRestore,
  voidResponse: Ban,
  clearSignature: Eraser,
  markAll: ListChecks,
} as const satisfies Record<string, LucideIcon>;

/** Cómo se presenta cada tipo de campo en la paleta del constructor. */
export const FIELD_CATALOG: Record<
  FieldType,
  { label: string; icon: LucideIcon; description: string }
> = {
  text: { label: "Texto corto", icon: Type, description: "Una línea." },
  textarea: {
    label: "Texto largo",
    icon: AlignLeft,
    description: "Varias líneas.",
  },
  email: {
    label: "Correo",
    icon: AtSign,
    description: "Con formato de correo.",
  },
  phone: { label: "Teléfono", icon: Phone, description: "Número de contacto." },
  url: { label: "Enlace", icon: Link, description: "Una dirección web." },
  number: { label: "Número", icon: Hash, description: "Entero o decimal." },
  currency: {
    label: "Moneda",
    icon: DollarSign,
    description: "Importe en pesos.",
  },
  date: {
    label: "Fecha",
    icon: Calendar,
    description: "Un día del calendario.",
  },
  time: { label: "Hora", icon: Clock, description: "Una hora del día." },
  select: { label: "Lista", icon: List, description: "Una opción de varias." },
  multiSelect: {
    label: "Lista múltiple",
    icon: ListTodo,
    description: "Varias opciones.",
  },
  checkbox: { label: "Casilla", icon: CheckSquare, description: "Sí o no." },
  file: {
    label: "Archivo",
    icon: Paperclip,
    description: "Un documento adjunto.",
  },
  image: { label: "Imagen", icon: Image, description: "Una foto." },
  reference: {
    label: "Relación",
    icon: Network,
    description: "Un elemento de un listado: un vehículo, un equipo.",
  },
  checklist: {
    label: "Lista de chequeo",
    icon: ClipboardCheck,
    description: "Ítems que se responden con una escala: B/M/N.A, Sí/No.",
  },
  signature: {
    label: "Firma",
    icon: Signature,
    description: "Un trazo, con el nombre de quien firma.",
  },
  table: {
    label: "Tabla",
    icon: Table,
    description: "Filas que se añaden al diligenciar.",
  },
};

/**
 * Lo que un campo **hace** y no se ve en su control, con su marca. Un
 * calculado, uno condicional y uno con valor sugerido se distinguen en el
 * lienzo por estos tres glifos.
 */
export const BEHAVIOR_CATALOG = {
  visibility: { label: "Visibilidad", mark: "Campo condicional", icon: Split },
  value: { label: "Valor", mark: "Campo calculado", icon: Sigma },
  autoValue: {
    label: "Valor sugerido",
    mark: "Con valor sugerido",
    icon: Lightbulb,
  },
} as const satisfies Record<
  string,
  { label: string; mark: string; icon: LucideIcon }
>;

export type BehaviorKind = keyof typeof BEHAVIOR_CATALOG;

/**
 * Qué operadores admite una condición según el tipo del campo que la controla.
 *
 * Ofrecer «anterior a» sobre una casilla, o «mayor que» sobre un texto, produce
 * reglas que no se cumplen nunca y campos que desaparecen sin motivo visible.
 *
 * De un archivo, una imagen, una firma o una tabla sólo se sabe si están; de
 * una relación, además, cuál elemento es. Una lista de chequeo no condiciona a
 * nadie: su lista vacía es lo que la saca de los candidatos (diseño §4.5).
 */
export const OPERATORS_BY_TYPE: Record<FieldType, VisibilityOperator[]> = {
  text: ["eq", "neq", "anyOf", "isEmpty", "isNotEmpty"],
  textarea: ["isEmpty", "isNotEmpty"],
  email: ["eq", "neq", "isEmpty", "isNotEmpty"],
  phone: ["eq", "neq", "isEmpty", "isNotEmpty"],
  url: ["eq", "neq", "isEmpty", "isNotEmpty"],
  number: ["eq", "neq", "gt", "gte", "lt", "lte", "isEmpty", "isNotEmpty"],
  currency: ["eq", "neq", "gt", "gte", "lt", "lte", "isEmpty", "isNotEmpty"],
  date: ["before", "after", "isEmpty", "isNotEmpty"],
  time: ["before", "after", "isEmpty", "isNotEmpty"],
  select: ["eq", "neq", "anyOf", "isEmpty", "isNotEmpty"],
  multiSelect: ["anyOf", "isEmpty", "isNotEmpty"],
  checkbox: ["isChecked", "isNotChecked"],
  file: ["isEmpty", "isNotEmpty"],
  image: ["isEmpty", "isNotEmpty"],
  reference: ["eq", "neq", "anyOf", "isEmpty", "isNotEmpty"],
  checklist: [],
  signature: ["isEmpty", "isNotEmpty"],
  table: ["isEmpty", "isNotEmpty"],
};

export const OPERATOR_LABEL: Record<VisibilityOperator, string> = {
  eq: "es igual a",
  neq: "es distinto de",
  anyOf: "es alguno de",
  gt: "es mayor que",
  gte: "es mayor o igual que",
  lt: "es menor que",
  lte: "es menor o igual que",
  before: "es anterior a",
  after: "es posterior a",
  isEmpty: "está vacío",
  isNotEmpty: "tiene algún valor",
  isChecked: "está marcada",
  isNotChecked: "no está marcada",
};

/** Sólo estos tipos pueden llevar un valor sugerido. */
export const AUTO_VALUE_TYPES: FieldType[] = [
  "select",
  "checkbox",
  "text",
  "date",
];

/**
 * Las recetas de un valor derivado, como se presentan en el sheet. Sus glifos
 * son los de `03 §5.5` y no se repiten entre ellas.
 */
export const RECIPE_CATALOG: Record<
  ComputedKind,
  { label: string; description: string; icon: LucideIcon; needs: string }
> = {
  percent: {
    label: "Porcentaje de un campo",
    description:
      "Un porcentaje de un número o un importe: el IVA de un contrato.",
    icon: Percent,
    needs: "un número o un importe",
  },
  arithmetic: {
    label: "Operación entre campos",
    description: "Suma, resta, multiplica o divide dos o más campos.",
    icon: Equal,
    needs: "un número o un importe",
  },
  daysUntil: {
    label: "Días hasta una fecha",
    description: "Cuántos días faltan. Cambia cada día, así que no se guarda.",
    icon: Timer,
    needs: "una fecha",
  },
  daysSince: {
    label: "Días desde una fecha",
    description:
      "Cuántos días han pasado. Cambia cada día, así que no se guarda.",
    icon: TimerReset,
    needs: "una fecha",
  },
  yearsSince: {
    label: "Años desde una fecha",
    description: "Edad o antigüedad, en años cumplidos.",
    icon: Cake,
    needs: "una fecha",
  },
  dateAdd: {
    label: "Fecha más un plazo",
    description: "Una fecha a partir de otra: la expedición más dos años.",
    icon: CalendarPlus,
    needs: "una fecha",
  },
  count: {
    label: "Conteo de marcadas",
    description: "Cuántas opciones de una lista múltiple están marcadas.",
    icon: Tally5,
    needs: "una lista múltiple",
  },
  concat: {
    label: "Texto compuesto",
    description: "Une campos y texto fijo: «Marca - Referencia».",
    icon: Combine,
    needs: "otro campo",
  },
  formula: {
    label: "Fórmula",
    description: "Campos, números y operadores, con × y ÷ antes de + y −.",
    icon: Variable,
    needs: "",
  },
};

export const OPERATION_LABEL: Record<ComputedOperator, string> = {
  "+": "Sumar",
  "-": "Restar",
  "*": "Multiplicar",
  "/": "Dividir",
};

export const DATE_ADD_UNIT_LABEL: Record<DateAddUnit, string> = {
  days: "días",
  months: "meses",
  years: "años",
};
