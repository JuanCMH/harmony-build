/** Las reglas que la definición de un formato tiene que cumplir para poder
 *  guardarse.
 *
 *  Portado de `validateTemplate` (`convex/lib/template_validation.ts` de
 *  Harmony) y generalizado: sin ámbitos ni ramas de novedades, con los techos
 *  de `FORM_LIMITS`, los tipos admitidos por clase y las reglas de los cuatro
 *  tipos nuevos.
 *
 *  Pura, como `field_logic.ts`, y por el mismo motivo: la comprueba el
 *  constructor mientras se edita y la vuelve a comprobar el servidor al
 *  guardar. Lo segundo es lo que manda. Lo que exige leer la base —que el
 *  listado de una relación exista, que no haya ciclos entre formatos— no está
 *  aquí: lo comprueba `formVersions.publish`.
 */

import { type FormProblemCode, formProblems } from "./error_messages";
import {
  createIdRegistry,
  validateOptions,
  validateTypeConfig,
} from "./field_config_validation";
import {
  type LogicField,
  computedReferences,
  hasDependencyCycle,
  isTodayDependent,
} from "./field_logic";
import { FORM_CONTEXT_FIELDS, isReservedFieldId } from "./form_context";
import { flattenFields, sortSections } from "./form_evaluation";
import {
  FIELD_TYPE_KINDS,
  type FieldType,
  FORM_LIMITS,
  type FormField,
  type FormKind,
  type FormSection,
  FULL_WIDTH_TYPES,
  MAX_FILE_SIZE_MB,
  NEVER_CONTROLLERS,
  RECIPES_BY_TYPE,
  UNARY_ONLY_CONTROLLERS,
  UNARY_OPERATORS,
  type VisibilityOperator,
  type VisibilityRule,
} from "./form_types";

/** Un problema de la definición: un código estable, para que la interfaz
 *  decida cómo enseñarlo, y el mensaje en español, para quien no decida nada. */
export interface FormProblem {
  code: FormProblemCode;
  message: string;
  sectionId?: string;
  fieldId?: string;
}

export interface ValidateFormOptions {
  kind: FormKind;
  /** Sólo en listados: el campo que titula cada elemento, si ya se eligió. */
  titleFieldId?: string;
}

/** Los tipos nuevos: ni operandos de una receta ni controladores de un valor
 *  sugerido (diseño §4.5). */
const NEW_TYPES: readonly FieldType[] = [
  "reference",
  "checklist",
  "signature",
  "table",
];

/** Los tipos que admiten un valor sugerido. */
const AUTO_VALUE_TYPES: readonly FieldType[] = [
  "select",
  "checkbox",
  "text",
  "date",
];

/** De un archivo, una firma o una tabla sólo se pregunta si están. */
const PRESENCE_OPERATORS: readonly VisibilityOperator[] = [
  "isEmpty",
  "isNotEmpty",
];

/** De una relación, además, cuál elemento es. */
const REFERENCE_OPERATORS: readonly VisibilityOperator[] = [
  ...PRESENCE_OPERATORS,
  "eq",
  "neq",
  "anyOf",
];

/**
 * Si cada valor no vacío es una opción de la lista del campo. Un campo que no
 * es lista admite cualquier valor.
 */
export function optionsExist(
  field: FormField | undefined,
  values: readonly string[],
): boolean {
  if (!field || (field.type !== "select" && field.type !== "multiSelect")) {
    return true;
  }
  const options = new Set(
    (field.config.options ?? []).map((option) => option.value),
  );
  return values.every((value) => value === "" || options.has(value));
}

/** La receta de un campo derivado, contra su tipo y el de sus operandos. */
function validateComputed(
  field: FormField,
  byId: Map<string, FormField>,
): FormProblemCode | null {
  const recipe = field.config.computed;
  if (!recipe) return null;
  if (!RECIPES_BY_TYPE[field.type]?.includes(recipe.kind)) {
    return "computedTypeMismatch";
  }

  const typeOf = (id: string) => byId.get(id)?.type;
  const isNumeric = (id: string) => {
    const type = typeOf(id);
    return type === "number" || type === "currency";
  };

  switch (recipe.kind) {
    case "formula":
      if (recipe.terms.length === 0) return "computedIncomplete";
      if (!computedReferences(recipe).every(isNumeric)) {
        return "computedOperandType";
      }
      break;
    case "percent":
      if (!Number.isFinite(recipe.percent)) return "computedIncomplete";
      if (!isNumeric(recipe.of)) return "computedOperandType";
      break;
    case "arithmetic":
      if (recipe.operands.length < 2) return "computedIncomplete";
      if (!recipe.operands.every(isNumeric)) return "computedOperandType";
      break;
    case "dateAdd":
      if (!Number.isInteger(recipe.amount)) return "computedIncomplete";
      if (typeOf(recipe.of) !== "date") return "computedOperandType";
      break;
    case "daysUntil":
    case "daysSince":
    case "yearsSince":
      if (typeOf(recipe.of) !== "date") return "computedOperandType";
      break;
    case "count":
      if (typeOf(recipe.of) !== "multiSelect") return "computedOperandType";
      break;
    case "concat": {
      const references = computedReferences(recipe);
      if (references.length === 0) return "computedIncomplete";
      // Un archivo no tiene texto que componer, y los tipos nuevos no entran
      // en ninguna receta.
      const unusable = (id: string) => {
        const type = typeOf(id);
        return (
          type === "file" ||
          type === "image" ||
          (type !== undefined && NEW_TYPES.includes(type))
        );
      };
      if (references.some(unusable)) return "computedOperandType";
      break;
    }
  }

  const rounding = "rounding" in recipe ? recipe.rounding : undefined;
  if (
    rounding !== undefined &&
    (!Number.isInteger(rounding) ||
      rounding < 0 ||
      rounding > 2 ||
      (field.type === "currency" && rounding !== 0))
  ) {
    return "computedRounding";
  }
  return null;
}

/** Una condición —de campo, de sección o de valor sugerido—, contra el campo
 *  del que depende. Devuelve el primer problema: los siguientes serían
 *  consecuencia suya. */
function validateRule(
  rule: VisibilityRule,
  byId: Map<string, FormField>,
): FormProblemCode | null {
  // Una condición recién añadida empieza sin campo: se pide elegirlo antes de
  // guardar, con un mensaje propio y no como referencia rota.
  if (rule.fieldId === "") return "ruleWithoutField";

  // Una regla que apunta a un campo inexistente no falla: simplemente nunca
  // se cumple, y el campo desaparece sin motivo visible. Mejor no dejar
  // guardarla.
  const controller = byId.get(rule.fieldId);
  if (!controller) return "unknownReference";

  if (NEVER_CONTROLLERS.includes(controller.type))
    return "controllerNotAllowed";
  if (
    UNARY_ONLY_CONTROLLERS.includes(controller.type) &&
    !PRESENCE_OPERATORS.includes(rule.operator)
  ) {
    return "operatorNotAllowed";
  }
  if (
    controller.type === "reference" &&
    !REFERENCE_OPERATORS.includes(rule.operator)
  ) {
    return "operatorNotAllowed";
  }

  // Lo que cambia con el día no se guarda: el servidor no lo tiene al podar
  // ni al calcular, y el formulario y lo guardado divergirían.
  if (
    controller.config.computed &&
    isTodayDependent(controller.config.computed)
  ) {
    return "todayDerivedReferenced";
  }

  if (UNARY_OPERATORS.includes(rule.operator)) return null;

  // «Igual a nada» se cumple sólo mientras el controlador esté vacío, que es
  // justo lo contrario de lo que quien la escribió quería decir.
  if (!rule.values.some((value) => value !== "")) return "ruleWithoutValue";

  // Una regla que compara con una opción borrada nunca se cumple: el campo
  // que depende de ella desaparece para siempre sin aviso.
  if (!optionsExist(controller, rule.values)) return "ruleOptionMissing";

  return null;
}

const labelProblem = (label: string): FormProblemCode | null => {
  if (label.trim() === "") return "labelRequired";
  if (label.length > FORM_LIMITS.maxLabelLength) return "labelTooLong";
  return null;
};

const isLength = (value: number) => Number.isInteger(value) && value >= 0;

/** Los límites que el formato le pone a lo que se escribe en un campo. */
function validateRanges(field: FormField): FormProblemCode | null {
  const { minLength, maxLength, minValue, maxValue } = field.config;
  if (
    (minLength !== undefined && !isLength(minLength)) ||
    (maxLength !== undefined && !isLength(maxLength)) ||
    (minLength !== undefined &&
      maxLength !== undefined &&
      minLength > maxLength)
  ) {
    return "rangeInvalid";
  }
  if (
    (minValue !== undefined && !Number.isFinite(minValue)) ||
    (maxValue !== undefined && !Number.isFinite(maxValue)) ||
    (minValue !== undefined && maxValue !== undefined && minValue > maxValue)
  ) {
    return "rangeInvalid";
  }
  return null;
}

/** El campo que titula cada elemento de un listado: un texto corto que
 *  siempre está. Un título que a veces no existe deja elementos sin nombre en
 *  el selector de quien los elige. */
function validateTitleField(
  sections: readonly FormSection[],
  titleFieldId: string,
): FormProblemCode | null {
  const section = sections.find((candidate) =>
    candidate.fields.some((field) => field.id === titleFieldId),
  );
  const field = section?.fields.find(
    (candidate) => candidate.id === titleFieldId,
  );
  if (!section || !field) return "titleFieldMissing";

  const isConditional =
    (field.config.visibility?.rules.length ?? 0) > 0 ||
    (section.visibility?.rules.length ?? 0) > 0;
  if (
    field.type !== "text" ||
    !field.required ||
    isConditional ||
    field.config.computed
  ) {
    return "titleFieldInvalid";
  }
  return null;
}

/**
 * Comprueba la definición entera de un formato. Devuelve **todos** sus
 * problemas, en el orden del formato; una lista vacía si está bien.
 *
 * Se devuelve una lista en vez de lanzar para que el constructor pueda
 * enseñarla mientras se edita, sin tratar un formato a medio hacer como un
 * error del sistema. El servidor lanza con el mensaje del primero.
 */
export function validateForm(
  sections: readonly FormSection[],
  options: ValidateFormOptions,
): FormProblem[] {
  const problems: FormProblem[] = [];
  const report = (
    code: FormProblemCode | null,
    where: { sectionId?: string; fieldId?: string } = {},
  ) => {
    if (code) problems.push({ code, message: formProblems[code], ...where });
  };

  const ordered = sortSections(sections);
  const fields = flattenFields(sections);

  // Los techos van primero: un formato que no cabe no cabe, esté como esté
  // cada campo.
  if (sections.length > FORM_LIMITS.maxSections) report("tooManySections");
  if (fields.length > FORM_LIMITS.maxFields) report("tooManyFields");

  const sectionIds = new Set<string>();
  for (const section of ordered) {
    const where = { sectionId: section.id };
    if (sectionIds.has(section.id)) report("duplicateSectionId", where);
    sectionIds.add(section.id);
    report(labelProblem(section.label), where);
  }

  const fieldIds = new Set<string>();
  for (const section of ordered) {
    for (const field of section.fields) {
      const where = { sectionId: section.id, fieldId: field.id };
      // `@` es de los datos de la respuesta: un campo con ese id se
      // confundiría con un controlador de sólo lectura.
      if (isReservedFieldId(field.id)) report("reservedFieldId", where);
      if (fieldIds.has(field.id)) report("duplicateFieldId", where);
      fieldIds.add(field.id);
    }
  }

  // Las reglas pueden apuntar también a los datos de la respuesta —`@fecha`,
  // `@autor`—, que el motor pone delante de los campos.
  const byId = new Map(
    [...FORM_CONTEXT_FIELDS, ...fields].map((field) => [field.id, field]),
  );
  const ids = createIdRegistry();

  // Una sección sólo mira hacia atrás: así dos secciones no pueden esperarse
  // la una a la otra (diseño §4.5).
  const earlier = new Set(FORM_CONTEXT_FIELDS.map((field) => field.id));
  for (const section of ordered) {
    const where = { sectionId: section.id };
    for (const rule of section.visibility?.rules ?? []) {
      const problem = validateRule(rule, byId);
      if (problem) report(problem, where);
      else if (!earlier.has(rule.fieldId))
        report("sectionRuleNotEarlier", where);
    }
    for (const field of section.fields) earlier.add(field.id);
  }

  for (const section of ordered) {
    for (const field of section.fields) {
      const where = { sectionId: section.id, fieldId: field.id };
      const { config } = field;

      report(labelProblem(field.label), where);
      if (FIELD_TYPE_KINDS[field.type]?.includes(options.kind) === false) {
        report("typeNotAllowed", where);
      }
      if (FULL_WIDTH_TYPES.includes(field.type) && field.size !== "full") {
        report("sizeNotFull", where);
      }

      if (field.type === "select" || field.type === "multiSelect") {
        for (const code of validateOptions(config.options, "optionsRequired")) {
          report(code, where);
        }
      }
      report(validateRanges(field), where);

      const maxFileSize = config.maxFileSize;
      if (
        maxFileSize !== undefined &&
        !(
          Number.isInteger(maxFileSize) &&
          maxFileSize >= 1 &&
          maxFileSize <= MAX_FILE_SIZE_MB
        )
      ) {
        report("fileSizeRange", where);
      }

      for (const code of validateTypeConfig(field, options.kind, ids)) {
        report(code, where);
      }

      for (const rule of config.visibility?.rules ?? []) {
        report(validateRule(rule, byId), where);
      }

      if (config.computed) {
        // Nadie puede depender de lo que cambia con el día, tampoco otra
        // receta.
        const dependsOnToday = computedReferences(config.computed).some(
          (id) => {
            const referenced = byId.get(id)?.config.computed;
            return referenced !== undefined && isTodayDependent(referenced);
          },
        );
        const unknown = computedReferences(config.computed).some(
          (id) => !byId.has(id),
        );
        if (unknown) report("unknownReference", where);
        else if (dependsOnToday) report("todayDerivedReferenced", where);
        else report(validateComputed(field, byId), where);
        if (field.required) report("computedIsRequired", where);
      }

      if (config.autoValue) {
        if (!AUTO_VALUE_TYPES.includes(field.type)) {
          report("autoValueTypeMismatch", where);
        }
        for (const rule of config.autoValue.rules) {
          const problem = validateRule(rule, byId);
          const controller = byId.get(rule.fieldId);
          if (problem) report(problem, where);
          else if (controller && NEW_TYPES.includes(controller.type)) {
            report("autoValueControllerType", where);
          }
          // Un valor sugerido sin valor que asignar vaciaría el campo cada
          // vez que se cumpliera su condición.
          if (rule.set === "") report("autoValueWithoutValue", where);
          else if (!optionsExist(field, [rule.set])) {
            report("ruleOptionMissing", where);
          }
        }
      }
    }
  }

  if (hasDependencyCycle(withSectionRules(ordered))) report("dependencyCycle");

  if (options.kind !== "record" && options.titleFieldId !== undefined) {
    report(validateTitleField(sections, options.titleFieldId), {
      fieldId: options.titleFieldId,
    });
  }

  // En un seguimiento cada sección es una **etapa**: se completa una vez, en
  // orden. Por eso ninguna puede quedar oculta ni vacía, y el título tiene
  // que escribirse al abrir.
  if (options.kind === "tracking") {
    for (const section of ordered) {
      if ((section.visibility?.rules.length ?? 0) > 0) {
        report("stageConditional", { sectionId: section.id });
      }
      if (section.fields.length === 0) {
        report("stageEmpty", { sectionId: section.id });
      }
    }
    if (
      options.titleFieldId !== undefined &&
      ordered.some((section) =>
        section.fields.some((field) => field.id === options.titleFieldId),
      ) &&
      !ordered[0]?.fields.some((field) => field.id === options.titleFieldId)
    ) {
      report("titleFieldNotFirstStage", { fieldId: options.titleFieldId });
    }
  }

  return problems;
}

/**
 * Los campos como los ve la detección de ciclos: cada uno depende, además de
 * lo suyo, de lo que condiciona a **su sección**.
 *
 * Sin esto se escaparía el ciclo que pasa por una sección: un campo de la
 * primera que depende de uno de la segunda, y la segunda condicionada a ese
 * campo de la primera.
 */
function withSectionRules(sections: readonly FormSection[]): LogicField[] {
  return sections.flatMap((section): LogicField[] => {
    const inherited = section.visibility?.rules ?? [];
    if (inherited.length === 0) return section.fields;
    return section.fields.map((field) => ({
      id: field.id,
      config: {
        ...field.config,
        visibility: {
          match: "all" as const,
          rules: [...(field.config.visibility?.rules ?? []), ...inherited],
        },
      },
    }));
  });
}
