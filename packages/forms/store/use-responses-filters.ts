import { parseAsBoolean, parseAsString, useQueryStates } from "nuqs";

/**
 * Los filtros del listado de respuestas, en la dirección (`02 §8`): un enlace
 * a «las inspecciones de SLP-835 de septiembre» abre eso mismo.
 *
 * Aquí sólo se leen. Qué se hace con un valor que no es una fecha o no es un
 * id lo decide `responsesQueryArgs`, que es quien se puede probar.
 */
export const useResponsesFilters = () =>
  useQueryStates(
    {
      from: parseAsString,
      to: parseAsString,
      mine: parseAsBoolean.withDefault(false),
      entryId: parseAsString,
    },
    {
      urlKeys: {
        from: "desde",
        to: "hasta",
        mine: "mias",
        entryId: "elemento",
      },
    },
  );
