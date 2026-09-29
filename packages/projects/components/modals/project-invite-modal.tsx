"use client";

import {
  DialogClose,
  HarmonyModal,
  HarmonyModalContent,
  HarmonyModalFooter,
  HarmonyModalHeader,
} from "@/components/harmony/harmony-modal";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useConfirm } from "@/hooks/use-confirm";
import { handleConvexErrorCallback } from "@/lib/convex-error-handler";
import { Copy, Link, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import {
  useGetProject,
  useGetProjectJoinCode,
  useNewJoinCode,
} from "../../api";
import { useProjectId } from "../../store/use-project-id";

interface ProjectInviteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * El código de unión del proyecto: verlo, copiarlo y renovarlo.
 *
 * Se monta al abrir. El código no viaja con el proyecto: se pide aparte y
 * sólo lo recibe quien tiene la llave `inviteUsers`.
 */
export const ProjectInviteModal = ({
  open,
  onOpenChange,
}: ProjectInviteModalProps) => {
  const projectId = useProjectId();
  const { data: project } = useGetProject({ id: projectId });
  const { data: joinCode, isLoading } = useGetProjectJoinCode({
    id: projectId,
  });
  const { mutate: renewJoinCode, isPending } = useNewJoinCode();

  const [ConfirmDialog, confirm] = useConfirm({
    title: "Renovar el código",
    message:
      "El código actual dejará de servir: quien lo tenga y todavía no se haya unido necesitará el nuevo.",
    type: "warning",
    confirmText: "Renovar",
  });

  const handleRenew = async () => {
    if (!(await confirm())) return;

    renewJoinCode(
      { id: projectId },
      {
        onSuccess: () => toast.success("Código renovado correctamente"),
        onError: (error) => handleConvexErrorCallback(error),
      },
    );
  };

  const handleCopy = async () => {
    if (!joinCode) return;
    try {
      await navigator.clipboard.writeText(joinCode);
      toast.success("Código copiado al portapapeles");
    } catch {
      toast.error("No se pudo copiar. Selecciona el código y cópialo a mano");
    }
  };

  return (
    <>
      <ConfirmDialog />
      <HarmonyModal
        open={open}
        onOpenChange={onOpenChange}
        maxWidth="sm:max-w-md"
      >
        <HarmonyModalHeader
          icon={Link}
          title={project ? `Invitar a ${project.name}` : "Invitar al proyecto"}
          description="Comparte este código con quien quieras sumar al proyecto."
        />
        <HarmonyModalContent className="space-y-4">
          {isLoading ? (
            <Skeleton className="h-16 w-full rounded-lg" />
          ) : joinCode ? (
            <p className="rounded-lg border bg-muted/40 px-4 py-5 text-center font-mono text-xl font-semibold tracking-[0.2em] break-all select-all">
              {joinCode}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              No tienes permiso para ver el código de unión de este proyecto.
            </p>
          )}
          <p className="text-ui text-muted-foreground">
            Quien lo use entra como miembro, sin permisos: asígnale un rol desde
            esta misma pantalla cuando se haya unido.
          </p>
        </HarmonyModalContent>
        <HarmonyModalFooter>
          <DialogClose asChild>
            <Button variant="outline">Cerrar</Button>
          </DialogClose>
          <Button
            variant="outline"
            disabled={isPending || !joinCode}
            onClick={handleRenew}
          >
            <RefreshCw className="size-4" />
            Renovar
          </Button>
          <Button disabled={!joinCode} onClick={handleCopy}>
            <Copy className="size-4" />
            Copiar
          </Button>
        </HarmonyModalFooter>
      </HarmonyModal>
    </>
  );
};
