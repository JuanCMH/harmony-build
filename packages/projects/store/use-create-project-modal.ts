import { atom, useAtom } from "jotai";

const modalState = atom(false);

export const useCreateProjectModal = () => {
  return useAtom(modalState);
};
