"use client";

import {
  DialogClose,
  HarmonyModal,
  HarmonyModalHeader,
} from "@/components/harmony/harmony-modal";
import { Button } from "@/components/ui/button";
import { LogIn } from "lucide-react";
import { useRouter } from "next/navigation";
import { useJoinProjectModal } from "../../store/use-join-project-modal";
import { JoinProjectView } from "../join-project-view";

export const JoinProjectModal = () => {
  const router = useRouter();
  const [open, setOpen] = useJoinProjectModal();

  return (
    <HarmonyModal open={open} onOpenChange={setOpen} maxWidth="sm:max-w-md">
      <HarmonyModalHeader
        icon={LogIn}
        title="Unirse con código"
        description="Entra a un proyecto que ya existe."
      />
      <JoinProjectView
        secondaryAction={
          <DialogClose asChild>
            <Button variant="outline">Cancelar</Button>
          </DialogClose>
        }
        onJoined={(projectId) => {
          setOpen(false);
          router.push(`/projects/${projectId}`);
        }}
      />
    </HarmonyModal>
  );
};
