import { atom, useAtom } from "jotai";

const isLeavingState = atom(false);

/**
 * Verdadero desde que se elimina o se abandona un proyecto hasta que se llega
 * a `/projects`.
 *
 * En ese intervalo la pertenencia ya no existe y la ruta sigue siendo la del
 * proyecto: sin esto, el armazón enseñaba «No tienes acceso a este proyecto»
 * un instante a quien acababa de irse por su propio pie.
 */
export const useIsLeavingProject = () => {
  return useAtom(isLeavingState);
};
