import { parseAsStringLiteral, useQueryStates } from "nuqs";

/**
 * Estado de la pantalla de registros, en la URL.
 *
 * La auditoría se mira con dos granularidades: un día o un mes. Con el rango
 * en la URL la pantalla es enlazable, que es lo que pide `02 §8` de cualquier
 * filtro de un listado.
 */
export const RANGOS = ["dia", "mes"] as const;

export type RangoRegistros = (typeof RANGOS)[number];

export const useRegistrosView = () =>
  useQueryStates({
    rango: parseAsStringLiteral(RANGOS).withDefault("dia"),
  });
