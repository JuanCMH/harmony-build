import { parseAsStringLiteral, useQueryState } from "nuqs";

export const TRACKING_STATES = ["abiertos", "cerrados"] as const;

/** Qué asuntos enseña la bandeja, en la dirección (`02 §8`): los abiertos,
 *  que es lo que hay que mirar, o los cerrados. */
export const useTrackingsView = () =>
  useQueryState(
    "estado",
    parseAsStringLiteral(TRACKING_STATES).withDefault("abiertos"),
  );
