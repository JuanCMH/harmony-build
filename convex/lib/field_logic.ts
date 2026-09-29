/** El motor de lógica condicional de un formato.
 *
 *  Portado de `convex/lib/field_logic.ts` de Harmony. Es **puro**: no importa
 *  React ni nada de Convex, y corre en los dos lados con el mismo resultado.
 *
 *   - En el cliente, el formulario oculta campos y la validación se salta los
 *     ocultos.
 *   - En el servidor, al guardar, se recalcula la visibilidad y **se podan los
 *     valores de los campos ocultos antes de escribir**. El servidor manda.
 *
 *  Las reglas de negocio, en una frase cada una:
 *
 *   - Un campo se muestra cuando su `visibility.match` se cumple.
 *   - La visibilidad es **transitiva**: si el campo del que dependes está
 *     oculto, tu regla sobre él no se cumple — no se evalúa contra el valor
 *     residual que le quedara.
 *   - Los ciclos se rechazan al guardar el formato (`hasDependencyCycle`), y
 *     aun así el evaluador los tolera y deja el campo **visible**: ante la
 *     duda, enseñar el dato, nunca esconderlo.
 *   - Un campo derivado no lo edita nadie; lo recalcula el servidor, salvo
 *     las recetas de hoy, que se evalúan al leer y no se guardan.
 *   - Una auto-asignación es un valor **sugerido**: se aplica al cambiar el
 *     controlador y el usuario puede corregirlo.
 *   - De una firma, una tabla, un archivo o una relación sólo se sabe si están
 *     respondidos; de una relación, además, **cuál** elemento es. Una lista de
 *     chequeo no condiciona a nadie (diseño §4.5).
 */

import type {
  FieldComputed,
  FieldConfig,
  FormValues,
  VisibilityRule,
} from "./form_types";
import {
  isBlank,
  toMinutes,
  toNumber,
  toText,
  toTimestamp,
} from "./value_coercion";

/**
 * Lo mínimo que el motor necesita de un campo.
 *
 * `FormField` lo cumple, y también cualquier otra forma con `id` y `config`,
 * así que el motor sirve a los dos lados sin conversiones.
 */
export interface LogicField {
  id: string;
  config: FieldConfig;
}

/* ──────────────────────────── Una sola regla ────────────────────────────── */

/** Evalúa una regla contra el valor de su controlador. No sabe de
 *  transitividad: de eso se encarga `computeVisibility`. */
export function evaluateRule(
  rule: VisibilityRule,
  controllerValue: unknown,
): boolean {
  const target = rule.values[0] ?? "";

  switch (rule.operator) {
    case "isEmpty":
      return isBlank(controllerValue);
    case "isNotEmpty":
      return !isBlank(controllerValue);
    case "isChecked":
      return controllerValue === true || controllerValue === "true";
    case "isNotChecked":
      return !(controllerValue === true || controllerValue === "true");
    // Sobre un conjunto —una lista múltiple—, «es igual a» es pertenencia.
    case "eq":
      if (Array.isArray(controllerValue)) {
        return controllerValue.some((value) => toText(value) === target);
      }
      return toText(controllerValue) === target;
    case "neq":
      if (Array.isArray(controllerValue)) {
        return !controllerValue.some((value) => toText(value) === target);
      }
      return toText(controllerValue) !== target;
    case "anyOf":
      // Una lista múltiple guarda un arreglo, y como texto sería «a,b»: con
      // dos marcadas no coincidiría nunca. Basta con que una esté en el
      // conjunto.
      if (Array.isArray(controllerValue)) {
        return controllerValue.some((value) =>
          rule.values.includes(toText(value)),
        );
      }
      return rule.values.includes(toText(controllerValue));
    case "gt":
    case "gte":
    case "lt":
    case "lte": {
      const left = toNumber(controllerValue);
      const right = toNumber(target);
      if (left === null || right === null) return false;
      if (rule.operator === "gt") return left > right;
      if (rule.operator === "gte") return left >= right;
      if (rule.operator === "lt") return left < right;
      return left <= right;
    }
    case "before":
    case "after": {
      // Dos horas se comparan como horas; cualquier otra cosa, como fechas.
      const leftTime = toMinutes(controllerValue);
      const rightTime = toMinutes(target);
      const areTimes = leftTime !== null && rightTime !== null;
      const left = areTimes ? leftTime : toTimestamp(controllerValue);
      const right = areTimes ? rightTime : toTimestamp(target);
      if (left === null || right === null) return false;
      return rule.operator === "before" ? left < right : left > right;
    }
    default:
      return false;
  }
}

/* ───────────────────── Visibilidad efectiva, transitiva ─────────────────── */

/**
 * Qué campos se ven, frente a estos valores. Devuelve `fieldId → visible`.
 *
 * Memoizado y transitivo. Un campo sin `visibility` siempre se ve.
 */
export function computeVisibility(
  fields: ReadonlyArray<LogicField>,
  values: FormValues,
): Map<string, boolean> {
  const byId = new Map(fields.map((field) => [field.id, field]));
  const memo = new Map<string, boolean>();
  const visiting = new Set<string>();

  const isVisible = (id: string): boolean => {
    const cached = memo.get(id);
    if (cached !== undefined) return cached;

    const field = byId.get(id);
    // Controlador que no existe: se enseña. La validación al guardar el
    // formato impide llegar aquí.
    if (!field) return true;

    const visibility = field.config.visibility;
    if (!visibility || visibility.rules.length === 0) {
      memo.set(id, true);
      return true;
    }

    // Ciclo en ejecución: no debería existir, y si existe se enseña.
    if (visiting.has(id)) return true;
    visiting.add(id);

    const results = visibility.rules.map((rule) => {
      const controller = byId.get(rule.fieldId);
      // Transitividad: si el controlador está oculto, la regla no se cumple.
      if (controller && !isVisible(controller.id)) return false;
      return evaluateRule(rule, values[rule.fieldId]);
    });

    visiting.delete(id);
    const result =
      visibility.match === "any"
        ? results.some(Boolean)
        : results.every(Boolean);
    memo.set(id, result);
    return result;
  };

  for (const field of fields) isVisible(field.id);
  return memo;
}

/**
 * Quita de `values` lo que quede oculto frente a esos mismos valores.
 *
 * Es el corazón de la poda del servidor: sin esto, una rama que el usuario
 * rellenó y luego ocultó al cambiar de opción dejaría su respuesta guardada, y
 * nadie volvería a verla ni a saber que está.
 */
export function pruneHiddenValues(
  fields: ReadonlyArray<LogicField>,
  values: FormValues,
): FormValues {
  const visibility = computeVisibility(fields, values);
  const next: FormValues = {};
  for (const [key, value] of Object.entries(values)) {
    if (visibility.get(key) === false) continue;
    next[key] = value;
  }
  return next;
}

/* ───────────────────────── Recetas: qué referencian ─────────────────────── */

/** Lo que cambia con el día: no se guarda nunca, se evalúa al leer. */
export const isTodayDependent = (computed: FieldComputed): boolean =>
  computed.kind === "daysUntil" ||
  computed.kind === "daysSince" ||
  computed.kind === "yearsSince";

/** Los campos de los que una receta toma sus operandos. */
export function computedReferences(computed: FieldComputed): string[] {
  switch (computed.kind) {
    case "formula":
      return computed.terms
        .filter(
          (term): term is { type: "field"; fieldId: string } =>
            term.type === "field",
        )
        .map((term) => term.fieldId);
    case "arithmetic":
      return [...computed.operands];
    case "concat":
      return computed.parts
        .filter(
          (part): part is { type: "field"; fieldId: string } =>
            part.type === "field",
        )
        .map((part) => part.fieldId);
    default:
      return [computed.of];
  }
}

/* ──────────────────────── Auto-asignación de valor ──────────────────────── */

/** El valor que este campo debería tomar, o `null` si ninguna regla se cumple.
 *  Se evalúan en orden y gana la primera. */
export function evaluateAutoValue(
  field: LogicField,
  values: FormValues,
): string | null {
  for (const rule of field.config.autoValue?.rules ?? []) {
    if (evaluateRule(rule, values[rule.fieldId])) return rule.set;
  }
  return null;
}

/**
 * Ante un cambio en `changedFieldId`, qué auto-asignaciones se disparan en
 * cascada. Devuelve `fieldId → valor` con lo que hay que aplicar, sin mutar la
 * entrada. El número de pasos está acotado por seguridad.
 */
export function cascadeAutoValues(
  fields: ReadonlyArray<LogicField>,
  values: FormValues,
  changedFieldId: string,
): Map<string, string> {
  const dependentsOf = new Map<string, LogicField[]>();
  for (const field of fields) {
    for (const reference of autoValueReferences(field)) {
      const list = dependentsOf.get(reference) ?? [];
      list.push(field);
      dependentsOf.set(reference, list);
    }
  }

  const working: FormValues = { ...values };
  const applied = new Map<string, string>();
  const queue: string[] = [changedFieldId];
  let steps = 0;
  const maxSteps = fields.length * fields.length + 1;

  while (queue.length > 0 && steps < maxSteps) {
    steps++;
    const changed = queue.shift() as string;
    for (const field of dependentsOf.get(changed) ?? []) {
      const next = evaluateAutoValue(field, working);
      if (next !== null && working[field.id] !== next) {
        working[field.id] = next;
        applied.set(field.id, next);
        queue.push(field.id);
      }
    }
  }

  return applied;
}

/* ─────────────────────── Integridad de referencias ──────────────────────── */

/** Los campos a los que apuntan las reglas de auto-asignación de `field`. */
export function autoValueReferences(field: LogicField): string[] {
  return [
    ...new Set(
      (field.config.autoValue?.rules ?? []).map((rule) => rule.fieldId),
    ),
  ];
}

/**
 * De qué campos depende `field`: controladores de su visibilidad, operandos de
 * su receta y controladores de sus auto-asignaciones. Alimenta el bloqueo de
 * borrado y la detección de ciclos.
 */
export function collectReferences(field: LogicField): string[] {
  const fromVisibility = (field.config.visibility?.rules ?? []).map(
    (rule) => rule.fieldId,
  );
  const fromComputed = field.config.computed
    ? computedReferences(field.config.computed)
    : [];
  return [
    ...new Set([
      ...fromVisibility,
      ...fromComputed,
      ...autoValueReferences(field),
    ]),
  ];
}

/** Quién depende de `targetId`. Un campo referenciado no se puede borrar. */
export function findDependents<T extends LogicField>(
  fields: ReadonlyArray<T>,
  targetId: string,
): T[] {
  return fields.filter((field) => collectReferences(field).includes(targetId));
}

/**
 * ¿Hay un ciclo en el grafo de dependencias —visibilidad, recetas y valores
 * sugeridos—, incluida la auto-referencia? Recorrido en profundidad con tres
 * estados: sin visitar, en la pila, terminado.
 */
export function hasDependencyCycle(fields: ReadonlyArray<LogicField>): boolean {
  const byId = new Map(fields.map((field) => [field.id, field]));
  const state = new Map<string, 0 | 1 | 2>();

  const visit = (id: string): boolean => {
    const current = state.get(id) ?? 0;
    if (current === 1) return true; // arista hacia atrás
    if (current === 2) return false;

    const field = byId.get(id);
    if (!field) return false;

    state.set(id, 1);
    for (const reference of collectReferences(field)) {
      if (byId.has(reference) && visit(reference)) return true;
    }
    state.set(id, 2);
    return false;
  };

  return fields.some((field) => visit(field.id));
}
