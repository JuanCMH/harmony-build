import { sortSections } from "@/convex/lib/form_evaluation";
import type { FormProblem } from "@/convex/lib/form_validation";
import type {
  ChecklistConfig,
  FormField,
  FormSection,
} from "@/convex/lib/form_types";

import { duplicateField } from "./field-defaults";

/**
 * Lo que el constructor le hace al borrador, sin pintar nada.
 *
 * El borrador es un arreglo de secciones que vive en memoria hasta «Guardar»:
 * aquí está cada movimiento —añadir en una posición, mover a otra sección,
 * quitar— como función pura, que es lo que permite probar que arrastrar un
 * campo no lo duplica ni lo pierde.
 */

/** Las secciones en su orden, numeradas de uno en uno. */
const renumber = (sections: readonly FormSection[]): FormSection[] =>
  sortSections(sections).map((section, index) => ({
    ...section,
    order: index + 1,
  }));

export const findSectionOfField = (
  sections: readonly FormSection[],
  fieldId: string,
): FormSection | undefined =>
  sections.find((section) =>
    section.fields.some((field) => field.id === fieldId),
  );

export const updateField = (
  sections: readonly FormSection[],
  next: FormField,
): FormSection[] =>
  sections.map((section) => ({
    ...section,
    fields: section.fields.map((field) =>
      field.id === next.id ? next : field,
    ),
  }));

export const updateSection = (
  sections: readonly FormSection[],
  sectionId: string,
  patch: Partial<FormSection>,
): FormSection[] =>
  sections.map((section) =>
    section.id === sectionId ? { ...section, ...patch } : section,
  );

export const removeField = (
  sections: readonly FormSection[],
  fieldId: string,
): FormSection[] =>
  sections.map((section) => ({
    ...section,
    fields: section.fields.filter((field) => field.id !== fieldId),
  }));

export const removeSection = (
  sections: readonly FormSection[],
  sectionId: string,
): FormSection[] =>
  renumber(sections.filter((section) => section.id !== sectionId));

export const appendSection = (
  sections: readonly FormSection[],
  section: FormSection,
): FormSection[] => renumber([...sections, section]);

/** Una sección una posición antes o después, renumerando todas. La condición
 *  de una sección sólo mira a las anteriores: si al moverla deja de cumplirse,
 *  lo dice `validateForm`, no un movimiento que se niega sin explicar. */
export const moveSection = (
  sections: readonly FormSection[],
  sectionId: string,
  offset: -1 | 1,
): FormSection[] => {
  const ordered = sortSections(sections);
  const from = ordered.findIndex((section) => section.id === sectionId);
  const to = from + offset;
  if (from < 0 || to < 0 || to >= ordered.length) return renumber(ordered);
  const next = [...ordered];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  // Numeradas por su nueva posición: `renumber` ordena por el `order` viejo y
  // desharía el movimiento.
  return next.map((section, index) => ({ ...section, order: index + 1 }));
};

/** Dónde cae un campo: en una sección, delante de otro campo o al final. */
export interface FieldTarget {
  sectionId: string;
  /** Sin él, al final de la sección. */
  beforeFieldId?: string;
}

const insertAt = (
  fields: readonly FormField[],
  field: FormField,
  beforeFieldId: string | undefined,
): FormField[] => {
  const index = beforeFieldId
    ? fields.findIndex((candidate) => candidate.id === beforeFieldId)
    : -1;
  if (index < 0) return [...fields, field];
  return [...fields.slice(0, index), field, ...fields.slice(index)];
};

/** Un campo nuevo, en el sitio donde se soltó. */
export const insertField = (
  sections: readonly FormSection[],
  field: FormField,
  target: FieldTarget,
): FormSection[] =>
  sections.map((section) =>
    section.id === target.sectionId
      ? {
          ...section,
          fields: insertAt(section.fields, field, target.beforeFieldId),
        }
      : section,
  );

/**
 * Un campo que ya existe, a otro sitio: de su sección a otra, o a otra
 * posición de la suya. Si el destino no existe, no se mueve nada: un campo no
 * se pierde por soltarlo mal.
 */
export const moveField = (
  sections: readonly FormSection[],
  fieldId: string,
  target: FieldTarget,
): FormSection[] => {
  const field = findSectionOfField(sections, fieldId)?.fields.find(
    (candidate) => candidate.id === fieldId,
  );
  const exists = sections.some((section) => section.id === target.sectionId);
  if (!field || !exists || target.beforeFieldId === fieldId) {
    return [...sections];
  }
  return insertField(removeField(sections, fieldId), field, target);
};

/** Una copia del campo justo detrás de él, en su sección. `null` si el campo
 *  no está en el borrador. */
export const duplicateFieldInPlace = (
  sections: readonly FormSection[],
  fieldId: string,
): { sections: FormSection[]; copyId: string } | null => {
  const section = findSectionOfField(sections, fieldId);
  const index =
    section?.fields.findIndex((field) => field.id === fieldId) ?? -1;
  if (!section || index < 0) return null;
  const copy = duplicateField(section.fields[index]);
  return {
    sections: insertField(sections, copy, {
      sectionId: section.id,
      beforeFieldId: section.fields[index + 1]?.id,
    }),
    copyId: copy.id,
  };
};

/**
 * Reordenar dentro de la sección, como lo hace una lista que se arrastra: el
 * campo ocupa **el sitio** del que tenía debajo al soltarlo, y los demás se
 * corren. Hacia abajo queda detrás de él; hacia arriba, delante.
 */
export const reorderField = (
  sections: readonly FormSection[],
  sectionId: string,
  activeId: string,
  overId: string,
): FormSection[] =>
  sections.map((section) => {
    if (section.id !== sectionId) return section;
    const from = section.fields.findIndex((field) => field.id === activeId);
    const to = section.fields.findIndex((field) => field.id === overId);
    if (from < 0 || to < 0 || from === to) return section;
    const fields = [...section.fields];
    const [moved] = fields.splice(from, 1);
    fields.splice(to, 0, moved);
    return { ...section, fields };
  });

const plural = (count: number, one: string, many: string) =>
  `${count} ${count === 1 ? one : many}`;

/** «12 campos · 3 secciones». */
export const summarizeSections = (sections: readonly FormSection[]): string => {
  const fields = sections.reduce(
    (total, section) => total + section.fields.length,
    0,
  );
  return `${plural(fields, "campo", "campos")} · ${plural(sections.length, "sección", "secciones")}`;
};

/* ─────────────────────── El título de un elemento ───────────────────────── */

/** Si un campo puede titular los elementos de un listado: un texto corto que
 *  siempre está. Es la regla de `validateForm`, leída campo a campo. */
const canBeTitle = (section: FormSection, field: FormField) =>
  field.type === "text" &&
  field.required &&
  !field.config.computed &&
  (field.config.visibility?.rules.length ?? 0) === 0 &&
  (section.visibility?.rules.length ?? 0) === 0;

const titleFieldsOf = (sections: readonly FormSection[]): FormField[] =>
  sortSections(sections).flatMap((section) =>
    section.fields.filter((field) => canBeTitle(section, field)),
  );

/**
 * Los campos que se pueden elegir como título.
 *
 * Tienen que valer en el borrador **y** en la versión publicada, si la hay: el
 * servidor reconstruye el título de los elementos que ya existen con la
 * versión con la que se guardaron, y un campo que todavía no está publicado no
 * tiene de dónde leerse. Un listado sin publicar sólo mira el borrador.
 */
export const titleFieldCandidates = (
  draft: readonly FormSection[],
  published: readonly FormSection[] | null,
): FormField[] => {
  const inDraft = titleFieldsOf(draft);
  if (published === null) return inDraft;
  const inPublished = new Set(
    titleFieldsOf(published).map((field) => field.id),
  );
  return inDraft.filter((field) => inPublished.has(field.id));
};

/* ─────────────────────────────── Problemas ──────────────────────────────── */

export interface LocatedProblem extends FormProblem {
  /** «General › Placa», o sólo la sección, o nada si es del formato entero. */
  location: string | null;
}

/** Cada problema con el sitio donde está, para poder ir a él. */
export const locateProblems = (
  problems: readonly FormProblem[],
  sections: readonly FormSection[],
): LocatedProblem[] =>
  problems.map((problem) => {
    const section = problem.fieldId
      ? findSectionOfField(sections, problem.fieldId)
      : sections.find((candidate) => candidate.id === problem.sectionId);
    const field = section?.fields.find(
      (candidate) => candidate.id === problem.fieldId,
    );
    const parts = [section?.label, field?.label].filter(
      (part): part is string => !!part && part.trim() !== "",
    );
    return {
      ...problem,
      sectionId: section?.id ?? problem.sectionId,
      location: parts.length > 0 ? parts.join(" › ") : null,
    };
  });

/* ─────────────────────── La vista previa del lienzo ─────────────────────── */

/** Cuántos ítems de cada bloque enseña el lienzo. */
export const CANVAS_ITEMS_PER_BLOCK = 3;

export interface ChecklistPreview {
  config: ChecklistConfig;
  /** Los ítems que no se pintan: «… y 58 más». */
  hidden: number;
}

/**
 * La lista de chequeo como la enseña el lienzo: los primeros ítems de cada
 * bloque. Sesenta y tres ítems pintados enteros convierten el lienzo en la
 * lista, y el resto del formato deja de verse.
 *
 * Un subítem no se queda sin la fila que lo agrupa: el corte no separa a un
 * grupo de su primer subítem.
 */
export const previewChecklist = (
  config: ChecklistConfig,
  perBlock = CANVAS_ITEMS_PER_BLOCK,
): ChecklistPreview => {
  let hidden = 0;
  const blocks = config.blocks.map((block) => {
    let cut = Math.min(perBlock, block.items.length);
    // Una fila que agrupa, sola al final, no dice nada: entra con su primer
    // subítem.
    if (cut < block.items.length && block.items[cut - 1]?.heading) cut += 1;
    hidden += block.items.length - cut;
    return { ...block, items: block.items.slice(0, cut) };
  });
  return { config: { ...config, blocks }, hidden };
};

/* ──────────────────────────── Cambios sin guardar ──────────────────────── */

/** Un valor con las claves en orden y sin las `undefined`: es como lo
 *  devuelve Convex, que no guarda un campo vacío ni promete el orden. */
const canonical = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entry]) => entry !== undefined)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([key, entry]) => [key, canonical(entry)]),
    );
  }
  return value;
};

/** La huella de un borrador: dos borradores iguales dan la misma aunque uno
 *  venga del servidor y otro de la memoria. Es lo que dice si hay cambios sin
 *  guardar. */
export const sectionsFingerprint = (sections: readonly FormSection[]): string =>
  JSON.stringify(canonical(sortSections(sections)));
