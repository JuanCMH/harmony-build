import { parseAsBoolean, parseAsString, useQueryStates } from "nuqs";

/** La búsqueda y el filtro de inactivos del listado de elementos, en la
 *  dirección (`02 §8`). */
export const useEntriesFilters = () =>
  useQueryStates(
    {
      search: parseAsString.withDefault(""),
      includeInactive: parseAsBoolean.withDefault(false),
    },
    { urlKeys: { search: "buscar", includeInactive: "inactivos" } },
  );
