import { atom, useAtom } from "jotai";

const modalState = atom(false);

export const useJoinProjectModal = () => {
  return useAtom(modalState);
};
