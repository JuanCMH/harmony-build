import { parseAsString, useQueryState } from "nuqs";

/** La pestaña del tablero que se mira, en la dirección (`02 §8`). */
export const useDashboardTab = () => useQueryState("pestana", parseAsString);
