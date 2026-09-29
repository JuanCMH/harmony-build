"use client";

import {
  HarmonyModalContent,
  HarmonyModalFooter,
} from "@/components/harmony/harmony-modal";
import { Button } from "@/components/ui/button";
import type { Id } from "@/convex/_generated/dataModel";
import { handleConvexErrorCallback } from "@/lib/convex-error-handler";
import { Loader2 } from "lucide-react";
import { useId, type ReactNode } from "react";
import { toast } from "sonner";
import { useCreateProject } from "../api";
import { useLogoUpload } from "../store/use-logo-upload";
import { ProjectForm, type ProjectFormValues } from "./project-form";

interface CreateProjectViewProps {
  /** El botón que acompaña al de crear: «Cancelar» en el modal, «Volver» en
   *  la bienvenida. */
  secondaryAction: ReactNode;
  onCreated: (projectId: Id<"projects">) => void;
}

/** El cuerpo y el pie de crear un proyecto. Lo montan el modal de crear y la
 *  bienvenida, cada uno con su cabecera. */
export const CreateProjectView = ({
  secondaryAction,
  onCreated,
}: CreateProjectViewProps) => {
  const formId = useId();
  const { mutate: createProject, isPending } = useCreateProject();
  const { upload, isUploading } = useLogoUpload();
  const isBusy = isPending || isUploading;

  const handleSubmit = async (values: ProjectFormValues) => {
    const logo = values.logoFile ? await upload(values.logoFile) : undefined;
    // La subida ya avisó de su fallo: no se crea un proyecto sin el logo que
    // se había elegido.
    if (logo === null) return;

    createProject(
      {
        name: values.name,
        code: values.code || undefined,
        primaryColor: values.primaryColor,
        secondaryColor: values.secondaryColor,
        logo,
      },
      {
        onSuccess: (projectId) => {
          toast.success("Proyecto creado correctamente");
          onCreated(projectId);
        },
        onError: (error) => handleConvexErrorCallback(error),
      },
    );
  };

  return (
    <>
      <HarmonyModalContent>
        <ProjectForm id={formId} disabled={isBusy} onSubmit={handleSubmit} />
      </HarmonyModalContent>
      <HarmonyModalFooter>
        {secondaryAction}
        <Button type="submit" form={formId} disabled={isBusy}>
          {isBusy ? <Loader2 className="size-4 animate-spin" /> : null}
          Crear proyecto
        </Button>
      </HarmonyModalFooter>
    </>
  );
};
