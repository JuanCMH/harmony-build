/** El modelo de un formato: sus secciones, sus campos y los valores con que se
 *  responde.
 *
 *  Portado de `convex/lib/template_types.ts` de Harmony y generalizado
 *  (`docs/plans/2026-09-28-modulo-de-formatos-design.md`): sin ámbitos, con
 *  cuatro tipos de campo nuevos y con valores tipados.
 *
 *  Vive en `convex/lib/` y no en `packages/` porque la dirección de
 *  dependencia es `packages/` → `convex/lib/`: el backend nunca importa de la
 *  aplicación. Es puro: ni React ni `ctx`. Los validadores de Convex de estas
 *  mismas formas están en `form_validators.ts`.
 */

/* ───────────────────────────── Clases de formato ────────────────────────── */

/** `record` es lo que la obra **hace** —una inspección, una entrega—: sus
 *  respuestas no se editan. `catalog` es lo que la obra **tiene** —equipos,
 *  vehículos—: sus elementos se mantienen al día y otros formatos los eligen
 *  (diseño §1). `tracking` es lo que la empresa **debe resolver** —una acción
 *  correctiva, un reporte de condición insegura—: un asunto que se abre,
 *  avanza por etapas y se cierra
 *  (`docs/plans/2026-10-10-seguimiento-de-hallazgos-design.md`). */
export const FORM_KINDS = ["record", "catalog", "tracking"] as const;
export type FormKind = (typeof FORM_KINDS)[number];

export const FORM_STATUSES = ["draft", "published", "archived"] as const;
export type FormStatus = (typeof FORM_STATUSES)[number];

/** Quién diligencia un formato: cualquiera con la llave, o sólo unos roles. */
export const FORM_AUDIENCES = ["all", "roles"] as const;
export type FormAudience = (typeof FORM_AUDIENCES)[number];

/** `submitted` y `voided` son de una respuesta y de un elemento. Un asunto de
 *  seguimiento está `open` hasta que se completa su última etapa, y entonces
 *  `closed`; anulado, también es `voided`. */
export const RESPONSE_STATUSES = [
  "submitted",
  "voided",
  "open",
  "closed",
] as const;
export type ResponseStatus = (typeof RESPONSE_STATUSES)[number];

/* ───────────────────────────── Tipos de campo ───────────────────────────── */

export const FIELD_TYPES = [
  "text",
  "textarea",
  "email",
  "phone",
  "url",
  "number",
  "currency",
  "date",
  "time",
  "select",
  "multiSelect",
  "checkbox",
  "file",
  "image",
  "reference",
  "checklist",
  "signature",
  "table",
] as const;

export type FieldType = (typeof FIELD_TYPES)[number];

/** Los tipos que sólo caben en una clase de formato. Una firma sobre algo que
 *  se edita no firma nada (diseño §1). Un tipo que no está aquí vale en las
 *  dos. */
export const FIELD_TYPE_KINDS: Partial<Record<FieldType, readonly FormKind[]>> =
  {
    signature: ["record", "tracking"],
  };

/** Los tipos de campo que admite un formato de esta clase, en el orden de la
 *  paleta. */
export const fieldTypesFor = (kind: FormKind): FieldType[] =>
  FIELD_TYPES.filter((type) => FIELD_TYPE_KINDS[type]?.includes(kind) ?? true);

/** El ancho que ocupa un campo en la retícula. */
export const FIELD_SIZES = ["small", "medium", "large", "full"] as const;
export type FieldSize = (typeof FIELD_SIZES)[number];

/** Los tipos que ocupan siempre la fila entera: su contenido no cabe en menos. */
export const FULL_WIDTH_TYPES: readonly FieldType[] = [
  "textarea",
  "checklist",
  "table",
];

/* ───────────────────────────────── Reglas ───────────────────────────────── */

/**
 * Operadores de una condición.
 *
 * Están discriminados por el tipo del campo controlador: cada tipo admite un
 * subconjunto. Los unarios —`isEmpty`, `isChecked`…— ignoran `values`.
 */
export const VISIBILITY_OPERATORS = [
  "eq",
  "neq",
  "anyOf",
  "gt",
  "gte",
  "lt",
  "lte",
  "before",
  "after",
  "isEmpty",
  "isNotEmpty",
  "isChecked",
  "isNotChecked",
] as const;

export type VisibilityOperator = (typeof VISIBILITY_OPERATORS)[number];

/**
 * Los operadores que se bastan solos: preguntan por el estado del campo, no lo
 * comparan contra nada. Todos los demás necesitan al menos un valor con el que
 * comparar, y sin él la regla no significa nada.
 */
export const UNARY_OPERATORS: readonly VisibilityOperator[] = [
  "isEmpty",
  "isNotEmpty",
  "isChecked",
  "isNotChecked",
];

/**
 * Condición atómica: el valor de `fieldId` comparado con `values` mediante
 * `operator`.
 *
 * `values` es **siempre** un arreglo, por uniformidad con el validador de
 * Convex: los operadores escalares usan `values[0]`, `anyOf` usa todo el
 * arreglo, y los unarios lo ignoran.
 */
export interface VisibilityRule {
  fieldId: string;
  operator: VisibilityOperator;
  values: string[];
}

/** El campo se muestra si se cumplen todas las reglas (`all`) o alguna (`any`). */
export interface FieldVisibility {
  match: "all" | "any";
  rules: VisibilityRule[];
}

/**
 * Los tipos que **no** pueden ser el controlador de una regla con valor: sólo
 * se les pregunta si están respondidos (`isEmpty`, `isNotEmpty`). Una lista de
 * chequeo no condiciona a nadie, ni siquiera así (diseño §4.5).
 */
export const UNARY_ONLY_CONTROLLERS: readonly FieldType[] = [
  "file",
  "image",
  "signature",
  "table",
];
export const NEVER_CONTROLLERS: readonly FieldType[] = ["checklist"];

/* ─────────────────────────────── Derivados ──────────────────────────────── */

export const COMPUTED_OPERATORS = ["+", "-", "*", "/"] as const;
export type ComputedOperator = (typeof COMPUTED_OPERATORS)[number];

/** Un término de la fórmula: operando, constante u operador. */
export type ComputedTerm =
  | { type: "field"; fieldId: string }
  | { type: "const"; value: number }
  | { type: "op"; op: ComputedOperator };

/** Las recetas de un valor derivado. */
export const COMPUTED_KINDS = [
  "formula",
  "percent",
  "arithmetic",
  "daysUntil",
  "daysSince",
  "yearsSince",
  "dateAdd",
  "count",
  "concat",
] as const;
export type ComputedKind = (typeof COMPUTED_KINDS)[number];

/**
 * Qué recetas caben en cada tipo de campo. Un tipo que no está aquí no puede
 * ser derivado. Lo usan la validación y la lista de recetas del constructor.
 */
export const RECIPES_BY_TYPE: Partial<
  Record<FieldType, readonly ComputedKind[]>
> = {
  number: [
    "percent",
    "arithmetic",
    "daysUntil",
    "daysSince",
    "yearsSince",
    "count",
    "formula",
  ],
  currency: ["percent", "arithmetic", "formula"],
  date: ["dateAdd"],
  text: ["concat"],
};

export const DATE_ADD_UNITS = ["days", "months", "years"] as const;
export type DateAddUnit = (typeof DATE_ADD_UNITS)[number];

/** Lo que comparten las recetas que dan un número. */
interface NumericOptions {
  /** Qué vale un operando vacío u oculto, **si alguno está lleno**. Por
   *  omisión, 0. Con todos vacíos, el derivado queda vacío. */
  emptyAs?: number;
  /** Decimales del resultado. Por omisión 0: el peso colombiano no usa. */
  rounding?: number;
}

/** La fórmula libre: operandos, constantes y operadores con precedencia. */
export interface FormulaComputed extends NumericOptions {
  kind: "formula";
  terms: ComputedTerm[];
}

/** `[19] % de [Valor del contrato]`. */
export interface PercentComputed extends NumericOptions {
  kind: "percent";
  of: string;
  percent: number;
}

/** `[Personas] × [Horas]`: dos o más operandos con un mismo operador. */
export interface ArithmeticComputed extends NumericOptions {
  kind: "arithmetic";
  operands: string[];
  op: ComputedOperator;
}

/** Días hasta o desde una fecha, y años cumplidos desde ella. **Dependen de
 *  hoy**: no se guardan nunca, se evalúan al leer. */
export interface TodayComputed {
  kind: "daysUntil" | "daysSince" | "yearsSince";
  of: string;
}

/** `[Fecha de expedición] + [2] [años]`. */
export interface DateAddComputed {
  kind: "dateAdd";
  of: string;
  amount: number;
  unit: DateAddUnit;
}

/** Cuántas opciones de una lista múltiple están marcadas. */
export interface CountComputed {
  kind: "count";
  of: string;
}

export type ConcatPart =
  | { type: "field"; fieldId: string }
  | { type: "text"; text: string };

/** `[Marca] - [Referencia]`: piezas de campo y de texto fijo. */
export interface ConcatComputed {
  kind: "concat";
  parts: ConcatPart[];
}

/**
 * Campo derivado: su valor sale de otros campos y **no es editable**.
 *
 * El servidor es la fuente de verdad —recalcula al guardar— salvo en las
 * recetas de hoy, que no se guardan; el cliente enseña una vista previa.
 */
export type FieldComputed =
  | FormulaComputed
  | PercentComputed
  | ArithmeticComputed
  | TodayComputed
  | DateAddComputed
  | CountComputed
  | ConcatComputed;

/**
 * Regla de auto-asignación: cuando `fieldId` cumple la condición, este campo
 * toma `set`. Es un **valor sugerido**: se aplica al cambiar el controlador, y
 * quien diligencia puede corregirlo después.
 */
export interface AutoValueRule extends VisibilityRule {
  set: string;
}

export interface FieldAutoValue {
  rules: AutoValueRule[];
}

/* ─────────────────────── Configuración de los tipos nuevos ───────────────── */

/** Una opción de lista, con su `value` fijado al crearla: renombrar la
 *  etiqueta no rompe ni las reglas ni las respuestas. */
export interface FieldOption {
  label: string;
  value: string;
}

/**
 * Qué dice una opción de la escala sobre lo inspeccionado. Es lo que pinta el
 * color, lo que dispara la observación obligatoria y lo que permitirá contar
 * «ítems no conformes» sin saber si el formato dice «M», «No» o «NC»
 * (diseño §4.1).
 */
export const CHECKLIST_MEANINGS = ["ok", "fail", "na"] as const;
export type ChecklistMeaning = (typeof CHECKLIST_MEANINGS)[number];

export interface ChecklistOption {
  value: string;
  /** «Bueno», «No cumple». */
  label: string;
  /** Lo que se lee en el botón: «B», «NC». Hasta cuatro caracteres. */
  short: string;
  meaning: ChecklistMeaning;
}

/**
 * Una fila de la lista. `heading` es la fila que agrupa subítems —«Luces
 * frontales»— y no se responde; `indented` es el subítem que cuelga de ella.
 */
export interface ChecklistItem {
  id: string;
  label: string;
  heading?: boolean;
  indented?: boolean;
}

/** Un bloque de ítems con su título: «1. Niveles», «2. Mecánico». Una lista
 *  sin bloques es un solo bloque con el título vacío. */
export interface ChecklistBlock {
  id: string;
  label: string;
  items: ChecklistItem[];
}

/** Cuándo se pide la observación de un ítem. `onFail`: obligatoria cuando la
 *  respuesta es no conforme, opcional en el resto. */
export const CHECKLIST_NOTE_MODES = ["never", "optional", "onFail"] as const;
export type ChecklistNoteMode = (typeof CHECKLIST_NOTE_MODES)[number];

export interface ChecklistConfig {
  /** La escala, de opción única. Entre dos y cinco opciones. */
  options: ChecklistOption[];
  blocks: ChecklistBlock[];
  note: ChecklistNoteMode;
  /** Pide además una cantidad por ítem («Cant. actual» del botiquín). */
  quantity?: { label: string };
  /** Pide además una fecha por ítem («Fecha de vencimiento»). */
  date?: { label: string };
}

/** Los tipos que puede tener la columna de una tabla: los escalares. Sin
 *  tablas ni listas de chequeo dentro de una tabla (diseño §4.3). */
export const TABLE_COLUMN_TYPES = [
  "text",
  "number",
  "date",
  "select",
  "checkbox",
  "reference",
  "image",
  "signature",
] as const;
export type TableColumnType = (typeof TABLE_COLUMN_TYPES)[number];

/** De qué listado salen las opciones de una relación, y qué campos suyos se
 *  traen al elegir un elemento (diseño §5). */
export interface ReferenceConfig {
  /** El id del listado, como cadena: la definición de un formato se escribe
   *  entera y un listado borrado no debe invalidar el documento. Que exista,
   *  sea un listado y sea de este proyecto lo comprueba `forms.publish`. */
  formId: string;
  /** Ids de campos del listado que se copian a la respuesta, en este orden. */
  fill: string[];
}

export interface TableColumn {
  id: string;
  label: string;
  type: TableColumnType;
  required: boolean;
  /** Sólo en `select`. */
  options?: FieldOption[];
  /** Sólo en `reference`. */
  reference?: ReferenceConfig;
}

export interface TableConfig {
  columns: TableColumn[];
  /** Cómo se llama una fila: «Elemento entregado», «Fotografía». Se lee en
   *  «Añadir …» y en el título de cada tarjeta en teléfono. */
  rowLabel: string;
  minRows?: number;
  maxRows?: number;
}

/** Quién firma. `author`: quien diligencia, y su nombre sale de la sesión.
 *  `other`: otra persona —quien recibe la dotación—, y el campo pide su
 *  nombre y su documento (diseño §4.2). */
export interface SignatureConfig {
  signer: "author" | "other";
}

/* ──────────────────────────── Campos y secciones ─────────────────────────── */

/** Megabytes que admite un archivo si el formato no dice otra cosa. */
export const DEFAULT_FILE_SIZE_MB = 10;
/** El tope que puede fijar el formato. */
export const MAX_FILE_SIZE_MB = 50;

/**
 * La configuración de un campo.
 *
 * Es un objeto plano y no una unión por tipo porque lo que un campo **hace**
 * —visibilidad, derivado, valor sugerido— es común a casi todos, y el motor y
 * los editores portados de Harmony lo leen así. Lo que es propio de un tipo
 * nuevo va en **su** clave (`checklist`, `table`, `reference`, `signature`),
 * no suelto: cuatro claves con nombre, no veinte opcionales. Qué clave cabe
 * en qué tipo lo decide `validateForm`.
 */
export interface FieldConfig {
  minLength?: number;
  maxLength?: number;
  minValue?: number;
  maxValue?: number;
  /** Sólo en `select` y `multiSelect`. */
  options?: FieldOption[];
  /** Tipos MIME (`application/pdf`) o extensiones (`.pdf`) que admite un
   *  archivo. Sin lista, cualquiera; una imagen siempre exige `image/*`. */
  acceptedFormats?: string[];
  /** Megabytes. Por omisión, 10. */
  maxFileSize?: number;
  /**
   * Visibilidad condicional. Si está, el campo sólo se pinta y se valida
   * cuando sus reglas se cumplen. Un campo oculto no exige `required` y **su
   * valor se descarta al guardar**.
   */
  visibility?: FieldVisibility;
  /** Valor derivado. Qué receta cabe en qué tipo lo decide `validateForm`. */
  computed?: FieldComputed;
  /** Valor sugerido y editable. Sólo en `select`, `checkbox`, `text` y `date`. */
  autoValue?: FieldAutoValue;
  checklist?: ChecklistConfig;
  table?: TableConfig;
  reference?: ReferenceConfig;
  signature?: SignatureConfig;
}

export interface FormField {
  /** Generado en el navegador, y **estable entre versiones**: el campo «Placa»
   *  es el mismo en la versión 1 y en la 4 aunque cambie de etiqueta. Se
   *  repite entre formatos, así que nunca identifica nada sin su `formId`. */
  id: string;
  type: FieldType;
  label: string;
  description?: string;
  placeholder?: string;
  required: boolean;
  size: FieldSize;
  /** Se muestra como columna en el listado de respuestas. */
  showInTable: boolean;
  config: FieldConfig;
}

export interface FormSection {
  id: string;
  label: string;
  description?: string;
  order: number;
  /**
   * La condición de la sección entera. Sus campos la heredan: un campo de una
   * sección oculta no se pinta, no se exige y su valor no se guarda, tenga las
   * reglas que tenga. Sólo puede mirar campos de secciones **anteriores**: es
   * lo que impide los ciclos entre secciones (diseño §4.5).
   */
  visibility?: FieldVisibility;
  fields: FormField[];
}

/* ───────────────────────────────── Valores ──────────────────────────────── */

export interface FileValue {
  storageId: string;
  name: string;
}

export interface SignatureValue extends FileValue {
  signerName: string;
  signerDocument?: string;
}

/** Un dato del elemento elegido, copiado a la respuesta tal como estaba. */
export interface ReferenceSnapshotEntry {
  fieldId: string;
  label: string;
  /** El valor ya como texto legible: una instantánea se lee, no se opera. */
  text: string;
}

/**
 * Una relación respondida. El `responseId` sirve para el historial; `label` y
 * `snapshot`, para la evidencia: dicen cómo era el elemento **al responder**
 * (diseño §5). Los compone el servidor; del navegador sólo llega el id.
 */
export interface ReferenceValue {
  responseId: string;
  label: string;
  snapshot: ReferenceSnapshotEntry[];
}

export interface ChecklistAnswer {
  itemId: string;
  /** El `value` de la opción elegida. */
  value?: string;
  note?: string;
  quantity?: number;
  /** `YYYY-MM-DD`. */
  date?: string;
}

/** Lo que cabe en la celda de una tabla. */
export type CellValue =
  | string
  | number
  | boolean
  | FileValue
  | SignatureValue
  | ReferenceValue;

export interface TableCell {
  columnId: string;
  value: CellValue;
}

export interface TableRow {
  /** Generado en el navegador al añadir la fila. */
  rowId: string;
  cells: TableCell[];
}

/** El valor de un campo **en memoria**: lo que sale de su control y lo que lee
 *  el motor de reglas. */
export type FieldValue =
  | string
  | number
  | boolean
  | string[]
  | FileValue
  | SignatureValue
  | ReferenceValue
  | ChecklistAnswer[]
  | TableRow[];

/** Un mapa `fieldId → valor`, en memoria. */
export type FormValues = Record<string, unknown>;

/**
 * El valor de un campo **como se guarda**: una unión discriminada por `kind`
 * (diseño §3). El `kind` hace que una respuesta se entienda sin cargar la
 * definición del formato, que es lo que necesitarán las gráficas.
 *
 * La conversión entre las dos formas vive en `stored_values.ts` y en ningún
 * otro sitio.
 */
export type StoredCellValue =
  | { kind: "text"; value: string }
  | { kind: "number"; value: number }
  | { kind: "boolean"; value: boolean }
  | ({ kind: "file" } & FileValue)
  | ({ kind: "signature" } & SignatureValue)
  | ({ kind: "reference" } & ReferenceValue);

export type StoredValue =
  | StoredCellValue
  | { kind: "list"; value: string[] }
  | { kind: "checklist"; items: ChecklistAnswer[] }
  | {
      kind: "table";
      rows: {
        rowId: string;
        cells: { columnId: string; value: StoredCellValue }[];
      }[];
    };

export type StoredValueKind = StoredValue["kind"];

/** Qué `kind` guarda cada tipo de campo. */
export const STORED_KIND_BY_TYPE: Record<FieldType, StoredValueKind> = {
  text: "text",
  textarea: "text",
  email: "text",
  phone: "text",
  url: "text",
  date: "text",
  time: "text",
  select: "text",
  number: "number",
  currency: "number",
  checkbox: "boolean",
  multiSelect: "list",
  file: "file",
  image: "file",
  signature: "signature",
  reference: "reference",
  checklist: "checklist",
  table: "table",
};

/** Una respuesta guarda sus valores como **arreglo**, no como objeto: un
 *  objeto de Convex no admite más de 1.024 claves. */
export interface StoredFieldValue {
  fieldId: string;
  value: StoredValue;
}

/* ───────────────────────────────── Límites ──────────────────────────────── */

/**
 * Los techos de un formato, que el servidor valida al guardar el borrador.
 * Holgados frente a los de Convex —1 MiB por documento, 8.192 elementos por
 * arreglo—, y cada uno con su porqué en el diseño §3.
 */
export const FORM_LIMITS = {
  maxSections: 20,
  maxFields: 200,
  maxOptions: 100,
  maxChecklistItems: 150,
  minChecklistOptions: 2,
  maxChecklistOptions: 5,
  maxChecklistShort: 4,
  maxTableColumns: 12,
  maxTableRows: 100,
  maxReferenceFill: 12,
  maxLabelLength: 200,
  maxNoteLength: 500,
  maxTextLength: 5000,
} as const;

export const FORM_NAME_MIN = 3;
export const FORM_NAME_MAX = 80;
export const FORM_CODE_MAX = 20;
export const FORM_DESCRIPTION_MAX = 300;
export const VOID_REASON_MIN = 5;
export const VOID_REASON_MAX = 300;
