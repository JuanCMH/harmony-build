"use client";

import { CreateProjectJoinModal } from "@/packages/projects/components/modals/create-project-join-modal";
import { CreateProjectModal } from "@/packages/projects/components/modals/create-project-modal";
import { JoinProjectModal } from "@/packages/projects/components/modals/join-project-modal";
import { useEffect, useState } from "react";

export const ModalProvider = () => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

  return (
    <>
      <CreateProjectModal />
      <JoinProjectModal />
      <CreateProjectJoinModal />
    </>
  );
};
