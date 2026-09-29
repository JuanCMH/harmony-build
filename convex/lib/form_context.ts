/** Los datos de una respuesta que no son de ningún campo, como controladores
 *  de su formato.
 *
 *  Una respuesta sabe dos cosas que nadie escribe: qué día es —la fecha de
 *  negocio, que pone el servidor— y quién la diligencia. Se presentan al motor
 *  como dos campos más, `@fecha` y `@autor`, para que una regla o una receta
 *  puedan usarlos: «vence = @fecha + 30 días», «muestra la sección si @fecha
 *  es posterior a…».
 *
 *  Portado de `convex/lib/incident_context.ts` de Harmony, **sólo el
 *  mecanismo**. `field_logic.ts` no sabe nada de esto, y a propósito: quien
 *  evalúa pone estos campos delante de los del formato y sus valores junto a
 *  las respuestas. Son de **sólo lectura** y nunca se guardan como respuesta.
 *
 *  Puro, como el motor: lo usan el formulario que diligencia y el servidor que
 *  guarda, y la regla tiene que ser una sola en los dos.
 */

import type { FormField, FormValues } from "./form_types";

/** Los ids de los controladores. Empiezan por `@`, que un campo de formato no
 *  puede usar (`validateForm`): así no hay choque posible con un id generado
 *  en el constructor. */
export const FORM_CONTEXT_IDS = {
  date: "@fecha",
  author: "@autor",
} as const;

export type FormContextId =
  (typeof FORM_CONTEXT_IDS)[keyof typeof FORM_CONTEXT_IDS];

/** ¿Es un id reservado a un controlador de contexto? */
export const isReservedFieldId = (id: string): boolean => id.startsWith("@");

const contextField = (
  id: FormContextId,
  type: FormField["type"],
  label: string,
): FormField => ({
  id,
  type,
  label,
  required: false,
  size: "medium",
  showInTable: false,
  config: {},
});

/** Los dos controladores, como campos: es lo que `validateForm` admite como
 *  referencia además de los campos del formato. */
export const FORM_CONTEXT_FIELDS: readonly FormField[] = [
  contextField(FORM_CONTEXT_IDS.date, "date", "Fecha de la respuesta"),
  contextField(FORM_CONTEXT_IDS.author, "text", "Quien diligencia"),
];

/** Controladores externos al formato: sus campos y sus valores. */
export interface FormContext {
  fields: readonly FormField[];
  values: FormValues;
}

/** Lo que se sabe de una respuesta antes de leer ninguno de sus campos. */
export interface FormContextSource {
  /** La fecha de negocio, `YYYY-MM-DD` en Colombia. */
  date: string;
  /** El id del usuario que diligencia. */
  authorId: string;
}

/** El contexto de una respuesta, listo para `evaluateForm`. */
export const formContext = (source: FormContextSource): FormContext => ({
  fields: FORM_CONTEXT_FIELDS,
  values: {
    [FORM_CONTEXT_IDS.date]: source.date,
    [FORM_CONTEXT_IDS.author]: source.authorId,
  },
});

/**
 * Lo que el motor evalúa: los controladores delante de los campos del formato,
 * y sus valores junto a las respuestas.
 *
 * Las respuestas **no pueden traer** un id reservado: se quitan antes de
 * mezclar. Si no, bastaría mandar `@autor` en los valores para hacerse pasar
 * por otra persona y saltarse un obligatorio.
 */
export function withFormContext<F extends { id: string }>(
  fields: readonly F[],
  values: FormValues,
  context?: FormContext,
): { fields: (F | FormField)[]; values: FormValues } {
  const answers: FormValues = {};
  for (const [id, value] of Object.entries(values)) {
    if (!isReservedFieldId(id)) answers[id] = value;
  }
  if (!context) return { fields: [...fields], values: answers };
  return {
    fields: [...context.fields, ...fields],
    values: { ...context.values, ...answers },
  };
}
