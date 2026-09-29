/**
 * La lógica de `SearchableMultiSelect`, pura para probarla sin montar React.
 *
 * Un grupo puede tener una opción de «todo el grupo» (`all`): «Todas las de
 * Falta». Marcarla guarda **sólo** ese valor y deja sus opciones marcadas por
 * implicación, sin guardarlas: así una opción que se cree mañana entra sola
 * (`2026-09-16-formulario-de-novedades-design`, revisión del 17-sep §5).
 */

export interface MultiSelectOption {
  value: string;
  label: string;
}

export interface MultiSelectGroup<O extends MultiSelectOption = MultiSelectOption> {
  /** El encabezado. Vacío, el grupo va sin título. */
  label: string;
  /** La opción que marca el grupo entero. */
  all?: MultiSelectOption;
  options: readonly O[];
}

/** Las opciones marcadas por implicación: las de un grupo cuyo «todo» está
 *  marcado. */
export function impliedValues(
  value: readonly string[],
  groups: readonly MultiSelectGroup[],
): Set<string> {
  const implicitas = new Set<string>();
  for (const grupo of groups) {
    if (grupo.all && value.includes(grupo.all.value)) {
      for (const o of grupo.options) implicitas.add(o.value);
    }
  }
  return implicitas;
}

/** Los valores en el orden de los grupos; lo desconocido —una opción que ya
 *  no existe— se conserva al final, para que no desaparezca sin que nadie lo
 *  decida. */
export function orderValues(
  value: readonly string[],
  groups: readonly MultiSelectGroup[],
): string[] {
  const conocidos = groups.flatMap((g) => [
    ...(g.all ? [g.all.value] : []),
    ...g.options.map((o) => o.value),
  ]);
  const elegidos = new Set(value);
  const ordenados = conocidos.filter((v) => elegidos.has(v));
  const desconocidos = [...elegidos].filter((v) => !conocidos.includes(v));
  return [...new Set([...ordenados, ...desconocidos])];
}

/**
 * Marca o desmarca una opción.
 *
 *  - Marcar el «todo» de un grupo quita del valor sus opciones sueltas: quedan
 *    implícitas.
 *  - Una opción implícita no se puede desmarcar sola: se desmarca el «todo».
 */
export function toggleValue(
  value: readonly string[],
  groups: readonly MultiSelectGroup[],
  target: string,
): string[] {
  if (value.includes(target)) {
    return orderValues(
      value.filter((v) => v !== target),
      groups,
    );
  }
  if (impliedValues(value, groups).has(target)) return orderValues(value, groups);

  const grupo = groups.find((g) => g.all?.value === target);
  const sueltas = new Set(grupo ? grupo.options.map((o) => o.value) : []);
  return orderValues(
    [...value.filter((v) => !sueltas.has(v)), target],
    groups,
  );
}

/** «A», «A y B», «A, B y 3 más». */
const resumir = (etiquetas: readonly string[]): string => {
  if (etiquetas.length <= 1) return etiquetas[0] ?? "";
  if (etiquetas.length === 2) return `${etiquetas[0]} y ${etiquetas[1]}`;
  return `${etiquetas[0]}, ${etiquetas[1]} y ${etiquetas.length - 2} más`;
};

/**
 * Lo que dice el disparador: «Incapacidad médica, Vacaciones y 2 más», «Todas
 * las de Falta». `null` sin nada marcado, para enseñar el marcador.
 */
export function summarize(
  value: readonly string[],
  groups: readonly MultiSelectGroup[],
): string | null {
  if (value.length === 0) return null;
  const etiquetas: string[] = [];
  for (const grupo of groups) {
    if (grupo.all && value.includes(grupo.all.value)) {
      etiquetas.push(grupo.all.label);
      continue;
    }
    for (const o of grupo.options) {
      if (value.includes(o.value)) etiquetas.push(o.label);
    }
  }
  const conocidos = new Set(
    groups.flatMap((g) => [...(g.all ? [g.all.value] : []), ...g.options.map((o) => o.value)]),
  );
  const eliminadas = value.filter((v) => !conocidos.has(v)).length;
  if (eliminadas > 0) {
    etiquetas.push(eliminadas === 1 ? "una opción eliminada" : `${eliminadas} opciones eliminadas`);
  }
  return resumir(etiquetas);
}
