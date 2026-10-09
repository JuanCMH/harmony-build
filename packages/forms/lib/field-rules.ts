import { CONFIG_KEY_BY_TYPE } from "@/convex/lib/field_config_validation";
import { hasDependencyCycle, isTodayDependent } from "@/convex/lib/field_logic";
import { dateText, groupThousands } from "@/convex/lib/field_text";
import { FORM_CONTEXT_IDS, isReservedFieldId } from "@/convex/lib/form_context";
import {
  type AutoValueRule,
  type ComputedKind,
  type ComputedOperator,
  type DateAddUnit,
  type FieldComputed,
  type FieldOption,
  type FieldType,
  type FieldVisibility,
  type FormField,
  type FormSection,
  UNARY_OPERATORS,
  type VisibilityRule,
} from "@/convex/lib/form_types";

import { OPERATORS_BY_TYPE, OPERATOR_LABEL } from "./field-catalog";

/**
 * Las reglas de un campo como las lee una persona, y los campos que pueden
 * gobernarlo.
 *
 * Todo puro: lo usan el panel del campo, el sheet de comportamiento y el
 * resumen del formato, y se prueba sin montar React. La forma de la frase es
 * campo, operador, valor.
 */

/** Los nombres que el formato no guarda: el título de un elemento de un
 *  listado, por su id. Sin él, la frase no inventa uno. */
export type EntryTitles = ReadonlyMap<string, string>;

/** «A», «A o B», «A, B o C». */
const joinWithOr = (parts: string[]): string =>
  parts.length <= 1
    ? (parts[0] ?? "")
    : `${parts.slice(0, -1).join(", ")} o ${parts[parts.length - 1]}`;

/** Un valor guardado tal como se enseña: la etiqueta de la opción, la fecha
 *  en `dd/MM/yyyy`, el importe en pesos, la casilla en palabras. */
export function describeValue(
  field: FormField | undefined,
  value: string,
  titles?: EntryTitles,
): string {
  if (!field) return value;
  switch (field.type) {
    case "select":
    case "multiSelect":
      return (
        field.config.options?.find((option) => option.value === value)?.label ??
        value
      );
    case "date":
      return dateText(value);
    case "currency": {
      const amount = Number(value);
      return value !== "" && Number.isFinite(amount)
        ? `$ ${groupThousands(amount, 0)}`
        : value;
    }
    case "checkbox":
      return value === "true" ? "marcada" : "sin marcar";
    case "reference":
      // Lo guardado es el id del elemento, que no se le enseña a nadie.
      return titles?.get(value) ?? "un elemento del listado";
    default:
      return value;
  }
}

/** «Tipo de vehículo» es igual a «Moto». */
export function describeRule(
  rule: VisibilityRule,
  fields: readonly FormField[],
  titles?: EntryTitles,
): string {
  if (rule.fieldId === "") return "una condición sin completar";
  const controller = fields.find((field) => field.id === rule.fieldId);
  // Un controlador que ya no existe no se puede guardar, pero el borrador
  // puede tenerlo un instante: la frase no inventa un nombre.
  const name = controller ? `«${controller.label}»` : "un campo eliminado";
  const operator = OPERATOR_LABEL[rule.operator];
  if (UNARY_OPERATORS.includes(rule.operator)) return `${name} ${operator}`;

  const values = rule.values
    .filter((value) => value !== "")
    .map((value) => {
      const text = describeValue(controller, value, titles);
      // Lo que no es un nombre propio no va entre comillas.
      return controller?.type === "reference" && !titles?.has(value)
        ? text
        : `«${text}»`;
    });
  if (values.length === 0) return `${name} ${operator} …`;
  return `${name} ${operator} ${joinWithOr(values)}`;
}

/** «Cuando «A» es igual a «X» y «B» está marcada», o `null` sin reglas. */
export function describeCondition(
  visibility: FieldVisibility | undefined,
  fields: readonly FormField[],
  titles?: EntryTitles,
): string | null {
  const rules = visibility?.rules ?? [];
  if (rules.length === 0) return null;
  const joiner = visibility?.match === "any" ? " o " : " y ";
  return `Cuando ${rules.map((rule) => describeRule(rule, fields, titles)).join(joiner)}`;
}

/** La condición de un campo, o `null` si se ve siempre. */
export const describeVisibility = (
  field: FormField,
  fields: readonly FormField[],
  titles?: EntryTitles,
): string | null => describeCondition(field.config.visibility, fields, titles);

/** Una frase por regla de valor sugerido: «Si «A» es igual a «X», toma «Y»». */
export function describeAutoValue(
  field: FormField,
  fields: readonly FormField[],
  titles?: EntryTitles,
): string[] {
  return (field.config.autoValue?.rules ?? []).map(
    (rule: AutoValueRule) =>
      `Si ${describeRule(rule, fields, titles)}, toma «${describeValue(field, rule.set)}»`,
  );
}

/** Si de este campo se puede depender: una lista de chequeo no condiciona a
 *  nadie, y su lista de operadores vacía es lo que lo dice. */
const canControl = (field: FormField) =>
  OPERATORS_BY_TYPE[field.type].length > 0;

/**
 * Los campos que pueden gobernar a `field`: todos menos él mismo, menos los
 * que no condicionan a nadie y menos los que crearían un ciclo.
 *
 * Se comprueba **antes** de ofrecerlos, con una regla provisional sobre el
 * borrador: ofrecer un campo que depende de éste sería ofrecer un formato que
 * después no deja guardar.
 */
export function controllerCandidates(
  field: FormField,
  fields: readonly FormField[],
): FormField[] {
  return fields.filter((candidate) => {
    if (candidate.id === field.id || !canControl(candidate)) return false;
    const provisional = fields.map((current) =>
      current.id === field.id
        ? {
            ...current,
            config: {
              ...current.config,
              visibility: {
                match: "all" as const,
                rules: [
                  ...(current.config.visibility?.rules ?? []),
                  {
                    fieldId: candidate.id,
                    operator: "isNotEmpty" as const,
                    values: [],
                  },
                ],
              },
            },
          }
        : current,
    );
    return !hasDependencyCycle(provisional);
  });
}

/** Los tipos con configuración propia —relación, firma, tabla, lista de
 *  chequeo—: ni sugieren un valor ni entran en una receta (diseño §4.5). */
const isNewType = (type: FieldType) => type in CONFIG_KEY_BY_TYPE;

/** Los campos de los que puede depender un **valor sugerido**: los de una
 *  condición, menos los tipos nuevos. */
export const autoValueCandidates = (
  field: FormField,
  fields: readonly FormField[],
): FormField[] =>
  controllerCandidates(field, fields).filter(
    (candidate) => !isNewType(candidate.type),
  );

/**
 * Los campos de los que puede depender la condición de una **sección**: los
 * datos de la respuesta y los campos de las secciones anteriores. Mirar sólo
 * hacia atrás es lo que impide que dos secciones se esperen la una a la otra.
 */
export function sectionControllerCandidates(
  section: FormSection,
  sections: readonly FormSection[],
  contextFields: readonly FormField[],
): FormField[] {
  const earlier = [...sections]
    .sort((a, b) => a.order - b.order)
    .filter((candidate) => candidate.order < section.order)
    .flatMap((candidate) => candidate.fields);
  return [...contextFields, ...earlier].filter(
    (field) =>
      canControl(field) &&
      !(field.config.computed && isTodayDependent(field.config.computed)),
  );
}

/** Una regla nueva. Sin controlador empieza vacía: quien la añade elige el
 *  campo, en vez de heredar el primero de la lista y verla ya en error. */
export const newRule = (controller?: FormField): VisibilityRule =>
  controller
    ? {
        fieldId: controller.id,
        operator: OPERATORS_BY_TYPE[controller.type][0] ?? "isNotEmpty",
        values: [],
      }
    : { fieldId: "", operator: "eq", values: [] };

/** Cómo se lee un operador en una frase. */
export const OPERATOR_SYMBOL: Record<ComputedOperator, string> = {
  "+": "+",
  "-": "−",
  "*": "×",
  "/": "÷",
};

const UNIT: Record<DateAddUnit, [string, string]> = {
  days: ["día", "días"],
  months: ["mes", "meses"],
  years: ["año", "años"],
};

/**
 * La receta de un derivado como la lee una persona: «19 % de «Valor del
 * contrato»», «Días hasta «Vencimiento»». `null` si el campo no es derivado.
 */
export function describeComputed(
  field: FormField,
  fields: readonly FormField[],
): string | null {
  const recipe = field.config.computed;
  if (!recipe) return null;
  const nameOf = (id: string) => {
    const found = fields.find((candidate) => candidate.id === id);
    return found ? `«${found.label}»` : "un campo eliminado";
  };
  const numberText = (value: number) => groupThousands(value, 3);

  switch (recipe.kind) {
    case "formula":
      return `Fórmula: ${recipe.terms
        .map((term) =>
          term.type === "field"
            ? nameOf(term.fieldId)
            : term.type === "const"
              ? numberText(term.value)
              : OPERATOR_SYMBOL[term.op],
        )
        .join(" ")}`;
    case "percent":
      return `${numberText(recipe.percent)} % de ${nameOf(recipe.of)}`;
    case "arithmetic":
      return recipe.operands
        .map(nameOf)
        .join(` ${OPERATOR_SYMBOL[recipe.op]} `);
    case "daysUntil":
      return `Días hasta ${nameOf(recipe.of)}`;
    case "daysSince":
      return `Días desde ${nameOf(recipe.of)}`;
    case "yearsSince":
      return `Años desde ${nameOf(recipe.of)}`;
    case "dateAdd": {
      const [one, many] = UNIT[recipe.unit];
      const amount = Math.abs(recipe.amount);
      return `${nameOf(recipe.of)} ${recipe.amount < 0 ? "−" : "+"} ${numberText(amount)} ${amount === 1 ? one : many}`;
    }
    case "count":
      return `Opciones marcadas de ${nameOf(recipe.of)}`;
    case "concat":
      return recipe.parts
        .map((part) =>
          part.type === "field" ? nameOf(part.fieldId) : part.text,
        )
        .join("");
  }
}

/** Qué tipos de campo sirven de operando a cada receta. */
const OPERAND_TYPES: Record<ComputedKind, readonly FieldType[]> = {
  formula: ["number", "currency"],
  percent: ["number", "currency"],
  arithmetic: ["number", "currency"],
  daysUntil: ["date"],
  daysSince: ["date"],
  yearsSince: ["date"],
  dateAdd: ["date"],
  count: ["multiSelect"],
  concat: [
    "text",
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
  ],
};

/**
 * Los campos que pueden ser operando de una receta de `field`: del tipo que la
 * receta pide, sin crear un ciclo y sin depender de hoy —lo que cambia con el
 * día no se guarda, y nada puede apoyarse en ello—.
 */
export function operandCandidates(
  field: FormField,
  fields: readonly FormField[],
  kind: ComputedKind,
): FormField[] {
  return controllerCandidates(field, fields).filter(
    (candidate) =>
      OPERAND_TYPES[kind].includes(candidate.type) &&
      !(
        candidate.config.computed && isTodayDependent(candidate.config.computed)
      ),
  );
}

/** La receta recién elegida, con los primeros operandos que le sirven. `null`
 *  si el formato no tiene ninguno. */
export function newComputed(
  kind: ComputedKind,
  field: FormField,
  fields: readonly FormField[],
): FieldComputed | null {
  // Primero los del mismo tipo que el campo: el porcentaje de un importe se
  // calcula sobre otro importe, no sobre un conteo de vehículos.
  const candidates = operandCandidates(field, fields, kind);
  const [first, second] = [
    ...candidates.filter((candidate) => candidate.type === field.type),
    ...candidates.filter((candidate) => candidate.type !== field.type),
  ];
  if (kind === "formula") {
    return {
      kind,
      terms: first
        ? [{ type: "field", fieldId: first.id }]
        : [{ type: "const", value: 0 }],
    };
  }
  if (!first) return null;
  switch (kind) {
    case "percent":
      return { kind, of: first.id, percent: 19 };
    case "arithmetic":
      return { kind, operands: [first.id, (second ?? first).id], op: "*" };
    case "dateAdd":
      return { kind, of: first.id, amount: 1, unit: "years" };
    case "concat":
      return { kind, parts: [{ type: "field", fieldId: first.id }] };
    default:
      return { kind, of: first.id };
  }
}

/* ─────────────────────── Los datos de la respuesta ──────────────────────── */

/** El grupo con que se enseña un dato de la respuesta en una lista de campos. */
export const CONTEXT_GROUP = "De la respuesta";

/** Un campo como opción de un `SearchableSelect`: los datos de la respuesta
 *  llevan su grupo debajo, para distinguirlos de los campos del formato. */
export const fieldOption = (field: Pick<FormField, "id" | "label">) => ({
  value: field.id,
  label: field.label,
  description: isReservedFieldId(field.id) ? CONTEXT_GROUP : undefined,
});

/**
 * Los datos de la respuesta como los ve el constructor.
 *
 * `@autor` guarda el id de un usuario, que nadie sabe escribir: aquí se
 * presenta como una lista con los miembros del proyecto. El servidor lo sigue
 * viendo como un texto, y los operadores de los dos tipos son los mismos, así
 * que la regla que sale de aquí es la que él valida.
 */
export function builderContextFields(
  contextFields: readonly FormField[],
  authors: readonly FieldOption[],
): FormField[] {
  return contextFields.map((field) =>
    field.id === FORM_CONTEXT_IDS.author
      ? { ...field, type: "select", config: { options: [...authors] } }
      : field,
  );
}
