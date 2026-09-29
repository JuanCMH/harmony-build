"use client";

import {
  SettingsActionRow,
  SettingsCard,
} from "@/components/harmony/settings-area";
import { Button } from "@/components/ui/button";
import type { Id } from "@/convex/_generated/dataModel";
import { useConfirm } from "@/hooks/use-confirm";
import { handleConvexErrorCallback } from "@/lib/convex-error-handler";
import { useRemoveMember } from "@/packages/members/api";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useIsLeavingProject } from "../store/use-is-leaving-project";
import type { Project } from "../types";

/**
 * Salir del proyecto por cuenta propia.
 *
 * Vive en General, que ve todo miembro, y no en la lista de usuarios: esa
 * lista pide una llave, y quien no la tiene también tiene que poder irse. El
 * propietario no lo ve: antes tiene que transferir el proyecto.
 */
export const ProjectMembership = ({
  project,
  memberId,
}: {
  project: Project;
  memberId: Id<"members">;
}) => {
  const router = useRouter();
  const { mutate: removeMember, isPending } = useRemoveMember();
  const [, setIsLeaving] = useIsLeavingProject();

  const [ConfirmDialog, confirm] = useConfirm({
    title: "Salir del proyecto",
    message: `Dejarás de ver ${project.name}. Para volver necesitarás su código de unión.`,
    type: "warning",
    confirmText: "Salir",
  });

  const handleLeave = async () => {
    if (!(await confirm())) return;

    setIsLeaving(true);
    removeMember(
      { id: memberId },
      {
        onSuccess: () => {
          toast.success("Has salido del proyecto correctamente");
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
            Tu participación
          </h3>
          <p className="mt-1 text-ui text-muted-foreground">
            Tu acceso a este proyecto.
          </p>
        </div>
        <SettingsCard>
          <SettingsActionRow
            title="Salir del proyecto"
            description="Pierdes el acceso al proyecto y a todo lo que contiene."
            action={
              <Button
                variant="outline"
                size="sm"
                disabled={isPending}
                className="text-destructive hover:text-destructive"
                onClick={handleLeave}
              >
                <LogOut className="size-4" />
                Salir
              </Button>
            }
          />
        </SettingsCard>
      </div>
    </>
  );
};
