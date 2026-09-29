"use client";

import {
  DialogClose,
  HarmonyModal,
  HarmonyModalContent,
  HarmonyModalFooter,
  HarmonyModalHeader,
} from "@/components/harmony/harmony-modal";
import { Button } from "@/components/ui/button";
import { handleConvexErrorCallback } from "@/lib/convex-error-handler";
import { useProjectId } from "@/packages/projects/store/use-project-id";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useCreateRole } from "../../api";
import { RoleForm, type RoleFormValues } from "../role-form";

const FORM_ID = "create-role-form";

interface CreateRoleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateRoleModal = ({
  open,
  onOpenChange,
}: CreateRoleModalProps) => {
  const projectId = useProjectId();
  const { mutate: createRole, isPending } = useCreateRole();

  const handleSubmit = ({ name, permissions }: RoleFormValues) => {
    createRole(
      { ...permissions, name, projectId },
      {
        onSuccess: () => {
          toast.success("Rol creado correctamente");
          onOpenChange(false);
        },
        onError: (error) => handleConvexErrorCallback(error),
      },
    );
  };

  return (
    <HarmonyModal open={open} onOpenChange={onOpenChange}>
      <HarmonyModalHeader
        icon={ShieldCheck}
        title="Crear rol"
        description="Un rol reúne los permisos que después asignas a un miembro."
      />
      <HarmonyModalContent>
        <RoleForm id={FORM_ID} disabled={isPending} onSubmit={handleSubmit} />
      </HarmonyModalContent>
      <HarmonyModalFooter>
        <DialogClose asChild>
          <Button variant="outline" disabled={isPending}>
            Cancelar
          </Button>
        </DialogClose>
        <Button type="submit" form={FORM_ID} disabled={isPending}>
          Crear
        </Button>
      </HarmonyModalFooter>
    </HarmonyModal>
  );
};
