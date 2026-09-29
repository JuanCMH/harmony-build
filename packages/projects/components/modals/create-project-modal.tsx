"use client";

import {
  DialogClose,
  HarmonyModal,
  HarmonyModalHeader,
} from "@/components/harmony/harmony-modal";
import { Button } from "@/components/ui/button";
import { HardHat } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCreateProjectModal } from "../../store/use-create-project-modal";
import { CreateProjectView } from "../create-project-view";

export const CreateProjectModal = () => {
  const router = useRouter();
  const [open, setOpen] = useCreateProjectModal();

  return (
    <HarmonyModal open={open} onOpenChange={setOpen}>
      <HarmonyModalHeader
        icon={HardHat}
        title="Crear proyecto"
        description="Un proyecto reúne a su equipo, sus roles y sus registros."
      />
      <CreateProjectView
        secondaryAction={
          <DialogClose asChild>
            <Button variant="outline">Cancelar</Button>
          </DialogClose>
        }
        onCreated={(projectId) => {
          setOpen(false);
          router.push(`/projects/${projectId}`);
        }}
      />
    </HarmonyModal>
  );
};
