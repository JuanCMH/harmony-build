import type { Id } from "@/convex/_generated/dataModel";
import { collectFormReferences } from "@/convex/lib/form_references";
import type { FormSection } from "@/convex/lib/form_types";
import { isRealDate } from "@/convex/lib/value_validation";

/**
 * De los filtros de la pantalla a los argumentos de la consulta.
 *
 * Los filtros viven en la dirección (`02 §8`), y la dirección la escribe
 * cualquiera: lo que no se reconoce se ignora, no rompe el listado.
 */

export interface ResponseFilters {
  /** `YYYY-MM-DD`, las dos incluidas. */
  from: string | null;
  to: string | null;
  /** «Sólo las mías». */
  mine: boolean;
  /** El elemento de un listado que la respuesta eligió. */
  entryId: string | null;
}

export interface ResponsesQueryArgs {
  formId: Id<"forms">;
  mine?: boolean;
  from?: string;
  to?: string;
  targetResponseId?: Id<"formResponses">;
}

/** Un id de Convex tiene esta forma. No dice que el documento exista, pero
 *  evita mandar al servidor lo que alguien tecleó en la dirección. */
const looksLikeId = (value: string): boolean => /^[a-z0-9]{32}$/.test(value);

const validDate = (value: string | null): string | undefined =>
  value !== null && isRealDate(value) ? value : undefined;

/**
 * Los argumentos de `formResponses.list`.
 *
 * Un rango al revés se endereza: quien escribe «del 30 al 1» quiere ese mes,
 * no una lista vacía. `mine` sólo se manda a quien puede ver las de todos: a
 * los demás el servidor ya les da sólo las suyas.
 */
export function responsesQueryArgs(
  formId: Id<"forms">,
  filters: ResponseFilters,
  canViewAll: boolean,
): ResponsesQueryArgs {
  const first = validDate(filters.from);
  const second = validDate(filters.to);
  const [from, to] =
    first !== undefined && second !== undefined && first > second
      ? [second, first]
      : [first, second];

  return {
    formId,
    ...(canViewAll && filters.mine ? { mine: true } : {}),
    ...(from !== undefined ? { from } : {}),
    ...(to !== undefined ? { to } : {}),
    ...(filters.entryId !== null && looksLikeId(filters.entryId)
      ? { targetResponseId: filters.entryId as Id<"formResponses"> }
      : {}),
  };
}

/** Si la consulta lleva algún filtro: decide qué dice el estado vacío y si se
 *  enseña «Quitar filtros». */
export const hasResponseFilters = (args: ResponsesQueryArgs): boolean =>
  args.mine === true ||
  args.from !== undefined ||
  args.to !== undefined ||
  args.targetResponseId !== undefined;

export interface EntryFilters {
  search: string;
  includeInactive: boolean;
}

export interface EntriesQueryArgs {
  formId: Id<"forms">;
  search?: string;
  includeInactive?: boolean;
}

/** Los argumentos de `formEntries.listEntries`. */
export function entriesQueryArgs(
  formId: Id<"forms">,
  filters: EntryFilters,
): EntriesQueryArgs {
  const search = filters.search.trim();
  return {
    formId,
    ...(search !== "" ? { search } : {}),
    ...(filters.includeInactive ? { includeInactive: true } : {}),
  };
}

export interface RelatedCatalog {
  /** El listado del que se eligen los elementos. */
  formId: Id<"forms">;
  /** Cómo lo llama el formato: la etiqueta de su campo («Vehículo»). */
  label: string;
}

/**
 * Los listados que un formato relaciona, uno por listado: lo que ofrece el
 * filtro «por elemento».
 *
 * Dos campos que apuntan al mismo listado —«Conductor» y «Ayudante», los dos
 * de Personal— son una sola entrada con las dos etiquetas: el filtro busca la
 * respuesta que eligió a esa persona, en el campo que sea.
 */
export function relatedCatalogs(
  sections: readonly FormSection[],
): RelatedCatalog[] {
  const labels = new Map<string, string[]>();
  for (const reference of collectFormReferences(sections)) {
    const formId = reference.config.formId;
    if (!looksLikeId(formId)) continue;
    const known = labels.get(formId) ?? [];
    if (!known.includes(reference.label)) known.push(reference.label);
    labels.set(formId, known);
  }
  return [...labels].map(([formId, names]) => ({
    formId: formId as Id<"forms">,
    label: names.join(" / "),
  }));
}
