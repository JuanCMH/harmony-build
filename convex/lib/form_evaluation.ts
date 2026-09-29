/** Un formato evaluado frente a unos valores: qué secciones y qué campos se
 *  ven, qué se poda y qué obligatorios faltan.
 *
 *  Portado de `convex/lib/template_validation.ts` de Harmony (la mitad que
 *  evalúa; la que valida la definición está en `form_validation.ts`). Puro,
 *  como `field_logic.ts`, y por el mismo motivo: lo usa el formulario mientras
 *  se diligencia y lo vuelve a usar el servidor al guardar. Lo segundo es lo
 *  que manda.
 */

import {
  type LogicField,
  computeVisibility,
  evaluateRule,
} from "./field_logic";
import { type FormContext, withFormContext } from "./form_context";
import type { FormField, FormSection, FormValues } from "./form_types";
import { isEmptyValue } from "./stored_values";

/** Las secciones en el orden en que se recorren. */
export const sortSections = <S extends { order: number }>(
  sections: readonly S[],
): S[] => [...sections].sort((a, b) => a.order - b.order);

/** Todos los campos del formato, en orden de sección. */
export const flattenFields = (sections: readonly FormSection[]): FormField[] =>
  sortSections(sections).flatMap((section) => section.fields);

/**
 * Qué secciones se ven, frente a estos valores.
 *
 * Una sección sin condición se ve siempre. Sus reglas se evalúan con el mismo
 * `evaluateRule` que las de un campo, y si su controlador está oculto la regla
 * no se cumple, como en `computeVisibility`.
 *
 * A diferencia de Harmony, una sección puede depender de un campo, siempre que
 * sea de una sección **anterior** (diseño §4.5; lo garantiza `validateForm`).
 * Por eso se recorren en orden y el controlador cuenta como oculto cuando lo
 * está **su propia sección**: «si el equipo es eléctrico» no se cumple si la
 * sección donde se pregunta por el equipo no aplica.
 */
export function sectionVisibility(
  sections: readonly FormSection[],
  fields: ReadonlyArray<LogicField>,
  values: FormValues,
): Map<string, boolean> {
  const own = computeVisibility(fields, values);
  const sectionOf = new Map(
    sections.flatMap((section) =>
      section.fields.map((field) => [field.id, section.id] as const),
    ),
  );
  const visible = new Map<string, boolean>();

  const controllerIsHidden = (fieldId: string): boolean => {
    if (own.get(fieldId) === false) return true;
    const sectionId = sectionOf.get(fieldId);
    return sectionId !== undefined && visible.get(sectionId) === false;
  };

  for (const section of sortSections(sections)) {
    const visibility = section.visibility;
    if (!visibility || visibility.rules.length === 0) {
      visible.set(section.id, true);
      continue;
    }
    const results = visibility.rules.map((rule) =>
      controllerIsHidden(rule.fieldId)
        ? false
        : evaluateRule(rule, values[rule.fieldId]),
    );
    visible.set(
      section.id,
      visibility.match === "any"
        ? results.some(Boolean)
        : results.every(Boolean),
    );
  }
  return visible;
}

/** Un formato evaluado: lo que ve el motor y lo que se ve en pantalla. */
export interface EvaluatedForm {
  /** Los campos que evalúa el motor: los de contexto delante. */
  fields: LogicField[];
  /** Las respuestas junto a los valores de contexto. */
  values: FormValues;
  /** `fieldId → visible`, con la sección ya aplicada. */
  visibility: Map<string, boolean>;
  /** `sectionId → visible`. */
  sections: Map<string, boolean>;
}

/**
 * El formato entero evaluado frente a unos valores: el contexto puesto
 * delante, la visibilidad de cada sección y la de cada campo ya combinadas.
 *
 * ```
 * se_ve(campo) = se_ve(su sección) ∧ se_ve(campo)
 * ```
 *
 * El `Y` es **externo** al mapa que devuelve `computeVisibility`, no una regla
 * más dentro del campo: meterla dentro rompería un campo con `match: "any"`,
 * cuya semántica es «cualquiera de estas», y la de la sección no se negocia.
 *
 * Un campo cuyo controlador quedó oculto **por su sección** también se oculta:
 * se repasa hasta que nada cambia, porque la cadena puede tener varios
 * eslabones.
 *
 * Es la puerta única: quien tenga las secciones a mano entra por aquí y no por
 * `computeVisibility`, para que la poda del servidor, los obligatorios, el
 * formulario y la vista de una respuesta no puedan discrepar.
 */
export function evaluateForm(
  sections: readonly FormSection[],
  values: FormValues,
  context?: FormContext,
): EvaluatedForm {
  const evaluated = withFormContext(flattenFields(sections), values, context);
  const sectionMap = sectionVisibility(
    sections,
    evaluated.fields,
    evaluated.values,
  );

  // Lo escrito en una sección que no aplica no existe para las reglas de los
  // demás: se evalúa sin ello, como hará la poda.
  const effective: FormValues = { ...evaluated.values };
  for (const section of sections) {
    if (sectionMap.get(section.id) !== false) continue;
    for (const field of section.fields) delete effective[field.id];
  }

  const visibility = computeVisibility(evaluated.fields, effective);
  const byId = new Map(evaluated.fields.map((field) => [field.id, field]));
  for (const section of sections) {
    if (sectionMap.get(section.id) !== false) continue;
    for (const field of section.fields) visibility.set(field.id, false);
  }

  // Transitividad a través de la sección: quien depende de un campo oculto
  // por su sección tampoco se ve.
  let changed = true;
  while (changed) {
    changed = false;
    for (const field of evaluated.fields) {
      if (visibility.get(field.id) === false) continue;
      const rules = byId.get(field.id)?.config.visibility;
      if (!rules || rules.rules.length === 0) continue;
      const results = rules.rules.map((rule) =>
        visibility.get(rule.fieldId) === false
          ? false
          : evaluateRule(rule, effective[rule.fieldId]),
      );
      const visible =
        rules.match === "any" ? results.some(Boolean) : results.every(Boolean);
      if (!visible) {
        visibility.set(field.id, false);
        changed = true;
      }
    }
  }

  return {
    fields: evaluated.fields,
    values: evaluated.values,
    visibility,
    sections: sectionMap,
  };
}

/** Los campos que se ven, en el orden del formato. Lo que se pinta. */
export function visibleFields(
  sections: readonly FormSection[],
  values: FormValues,
  context?: FormContext,
): FormField[] {
  const { visibility } = evaluateForm(sections, values, context);
  return flattenFields(sections).filter(
    (field) => visibility.get(field.id) !== false,
  );
}

/** Una sección que se ve, con los campos suyos que se ven. */
export interface VisibleSection {
  section: FormSection;
  fields: FormField[];
}

/**
 * Las secciones que se ven, en su orden, cada una con sus campos visibles.
 *
 * Una sección **sin ningún campo a la vista no sale**, aunque su condición se
 * cumpla: sería una pestaña vacía. Es lo que decide las pestañas del
 * formulario y los subtítulos de una respuesta, y por eso vive en un solo
 * sitio.
 */
export function visibleSections(
  sections: readonly FormSection[],
  values: FormValues,
  context?: FormContext,
): VisibleSection[] {
  const { visibility } = evaluateForm(sections, values, context);
  return sortSections(sections)
    .map((section) => ({
      section,
      fields: section.fields.filter(
        (field) => visibility.get(field.id) !== false,
      ),
    }))
    .filter((visible) => visible.fields.length > 0);
}

/**
 * Quita de `values` lo que quede oculto, **sección incluida**. Es la poda del
 * servidor: lo que se escribió en una sección que luego dejó de aplicar no se
 * guarda, igual que pasa con un campo (`pruneHiddenValues`).
 */
export function pruneFormValues(
  sections: readonly FormSection[],
  values: FormValues,
  context?: FormContext,
): FormValues {
  const { visibility } = evaluateForm(sections, values, context);
  const next: FormValues = {};
  for (const [key, value] of Object.entries(values)) {
    if (visibility.get(key) === false) continue;
    next[key] = value;
  }
  return next;
}

/** Un obligatorio visible sin rellenar, con la sección donde está. */
export interface MissingRequired {
  id: string;
  label: string;
  sectionId: string;
}

/**
 * Qué campos obligatorios están sin rellenar, **contando sólo los visibles**.
 *
 * Un campo oculto no se exige —nadie puede verlo— y un calculado tampoco: no lo
 * rellena nadie. Por eso un campo condicional sí puede ser obligatorio: se
 * exige cuando se muestra.
 *
 * Una lista de chequeo obligatoria a medio responder **no** sale aquí: no está
 * vacía, está incompleta, y eso lo dice `validateValues` nombrando el campo.
 *
 * Vive aquí, pura, porque la regla tiene que ser una sola en los dos lados: el
 * formulario la usa para avisar con los nombres antes de enviar —y para contar
 * los que faltan en cada pestaña—, y el servidor para no escribir lo que el
 * cliente se saltó.
 */
export function missingRequired(
  sections: readonly FormSection[],
  values: FormValues,
  context?: FormContext,
): MissingRequired[] {
  const { visibility } = evaluateForm(sections, values, context);
  return sortSections(sections).flatMap((section) =>
    section.fields
      .filter(
        (field) =>
          field.required &&
          visibility.get(field.id) !== false &&
          !field.config.computed &&
          isEmptyValue(field, values[field.id]),
      )
      .map((field) => ({
        id: field.id,
        label: field.label,
        sectionId: section.id,
      })),
  );
}

export function missingRequiredFields(
  sections: readonly FormSection[],
  values: FormValues,
  context?: FormContext,
): string[] {
  return missingRequired(sections, values, context).map((field) => field.label);
}
