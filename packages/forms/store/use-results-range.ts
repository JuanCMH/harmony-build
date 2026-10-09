import { parseAsString, useQueryStates } from "nuqs";

/**
 * El rango de fechas de los resultados, en la dirección (`02 §8`): un enlace
 * al tablero de septiembre abre septiembre. Qué se hace con un valor que no
 * es una fecha lo decide `resolveRange`.
 */
export const useResultsRange = () =>
  useQueryStates(
    { from: parseAsString, to: parseAsString },
    { urlKeys: { from: "desde", to: "hasta" } },
  );
