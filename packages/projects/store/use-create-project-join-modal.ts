import { atom, useAtom } from "jotai";

const modalState = atom(false);
const isLoggingOutState = atom(false);

/** La bienvenida: lo que ve quien entra sin pertenecer a ningún proyecto. */
export const useCreateProjectJoinModal = () => {
  return useAtom(modalState);
};

/** Verdadero desde que se pide cerrar sesión hasta que la sesión se va. Sin
 *  él, `/projects` —que abre la bienvenida en cuanto la ve cerrada— la
 *  reabriría en ese intervalo. */
export const useIsLoggingOut = () => {
  return useAtom(isLoggingOutState);
};
