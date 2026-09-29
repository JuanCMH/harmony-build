"use client";

import {
  SettingsActionRow,
  SettingsCard,
} from "@/components/harmony/settings-area";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/hooks/use-confirm";
import { handleConvexErrorCallback } from "@/lib/convex-error-handler";
import { ArrowLeftRight, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { useGetProjectDeletionImpact, useRemoveProject } from "../api";
import { buildProjectDeletionMessage } from "../lib/deletion-impact-message";
import { useIsLeavingProject } from "../store/use-is-leaving-project";
import type { Project } from "../types";
import { TransferProjectModal } from "./modals/transfer-project-modal";

/**
 * Las dos decisiones que sólo toma quien es propietario: cambiar el proyecto
 * de manos y eliminarlo.
 *
 * Se monta **sólo** para el propietario: la consulta del impacto lanza para
 * cualquier otra persona, y montarla de más tumbaba la página entera de quien
 * sólo venía a leer los ajustes.
 */
export const ProjectDangerZone = ({ project }: { project: Project }) => {
  const router = useRouter();
  const [transferOpen, setTransferOpen] = useState(false);
  const [, setIsLeaving] = useIsLeavingProject();

  const { data: deletionImpact } = useGetProjectDeletionImpact({
    id: project._id,
  });
  const { mutate: removeProject, isPending: isRemoving } = useRemoveProject();

  const [ConfirmDialog, confirm] = useConfirm({
    title: `Eliminar ${project.name}`,
    message: buildProjectDeletionMessage(deletionImpact),
    type: "critical",
    confirmText: "Eliminar",
  });

  const handleRemove = async () => {
    if (!(await confirm())) return;

    setIsLeaving(true);
    removeProject(
      { id: project._id },
      {
        onSuccess: () => {
          toast.success("Proyecto eliminado correctamente");
          router.replace("/projects");
        },
        onError: (error) => {
          setIsLeaving(false);
          handleConvexErrorCallback(error);
        },
      },
    );
  };

  return (
    <>
      <ConfirmDialog />
      <div className="space-y-4">
        <div>
          <h3 className="text-base font-medium tracking-tight">
            Zona de peligro
          </h3>
          <p className="mt-1 text-ui text-muted-foreground">
            Lo que cambia el proyecto de manos o lo elimina. Sólo lo ve quien es
            propietario.
          </p>
        </div>
        <SettingsCard>
          <SettingsActionRow
            title="Transferir proyecto"
            description="Otro miembro pasa a ser el propietario. Tú quedas como administrador."
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTransferOpen(true)}
              >
                <ArrowLeftRight className="size-4" />
                Transferir
              </Button>
            }
          />
          <SettingsActionRow
            title="Eliminar proyecto"
            description="Se borra con sus miembros, sus roles y sus registros. No tiene vuelta atrás."
            action={
              <Button
                variant="outline"
                size="sm"
                disabled={isRemoving}
                className="text-destructive hover:text-destructive"
                onClick={handleRemove}
              >
                <Trash2 className="size-4" />
                Eliminar
              </Button>
            }
          />
        </SettingsCard>
      </div>

      {transferOpen ? (
        <TransferProjectModal
          project={project}
          open={transferOpen}
          onOpenChange={setTransferOpen}
        />
      ) : null}
    </>
  );
};
