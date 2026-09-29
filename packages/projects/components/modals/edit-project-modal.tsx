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
import { Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { useUpdateProject } from "../../api";
import { useLogoUpload } from "../../store/use-logo-upload";
import type { Project } from "../../types";
import { ProjectForm, type ProjectFormValues } from "../project-form";

const FORM_ID = "edit-project-form";

interface EditProjectModalProps {
  project: Project;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Se monta al abrir: el formulario arranca con los datos del proyecto y no
 *  vuelve a sincronizarse con ellos (`ProjectForm`). */
export const EditProjectModal = ({
  project,
  open,
  onOpenChange,
}: EditProjectModalProps) => {
  const { mutate: updateProject, isPending } = useUpdateProject();
  const { upload, isUploading } = useLogoUpload();
  const isBusy = isPending || isUploading;

  const handleSubmit = async (values: ProjectFormValues) => {
    const logo = values.logoFile ? await upload(values.logoFile) : project.logo;
    // La subida ya avisó de su fallo: no se guarda a medias.
    if (logo === null) return;

    updateProject(
      {
        id: project._id,
        name: values.name,
        code: values.code || undefined,
        active: project.active,
        primaryColor: values.primaryColor,
        secondaryColor: values.secondaryColor,
        logo,
      },
      {
        onSuccess: () => {
          toast.success("Proyecto actualizado correctamente");
          onOpenChange(false);
        },
        onError: (error) => handleConvexErrorCallback(error),
      },
    );
  };

  return (
    <HarmonyModal open={open} onOpenChange={onOpenChange}>
      <HarmonyModalHeader
        icon={Pencil}
        title="Editar proyecto"
        description="Cambia el logo, el nombre, el código o los colores."
      />
      <HarmonyModalContent>
        <ProjectForm
          id={FORM_ID}
          initial={project}
          disabled={isBusy}
          onSubmit={handleSubmit}
        />
      </HarmonyModalContent>
      <HarmonyModalFooter>
        <DialogClose asChild>
          <Button variant="outline" disabled={isBusy}>
            Cancelar
          </Button>
        </DialogClose>
        <Button type="submit" form={FORM_ID} disabled={isBusy}>
          {isBusy ? <Loader2 className="size-4 animate-spin" /> : null}
          Guardar
        </Button>
      </HarmonyModalFooter>
    </HarmonyModal>
  );
};
