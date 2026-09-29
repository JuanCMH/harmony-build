import { useQuery } from "convex/react";
import { FunctionReference } from "convex/server";

/** `args` acepta `"skip"` —el centinela de Convex— para no suscribirse.
 *  Sirve para las consultas que sólo hacen falta cuando algo está abierto: un
 *  modal montado pero cerrado no debe pagar su coste ni arrastrar su fallo. */
export const useFetch = <T extends FunctionReference<"query">>(
  endpoint: T,
  args: T["_args"] | "skip",
) => {
  const data: T["_returnType"] | undefined = useQuery(endpoint, args);
  const isLoading = data === undefined;

  return { data, isLoading };
};
