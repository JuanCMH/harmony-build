"use client";

import {
  DialogClose,
  HarmonyModal,
  HarmonyModalContent,
  HarmonyModalFooter,
  HarmonyModalHeader,
} from "@/components/harmony/harmony-modal";
import { SearchableSelect } from "@/components/harmony/searchable-select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { Id } from "@/convex/_generated/dataModel";
import { useConfirm } from "@/hooks/use-confirm";
import { handleConvexErrorCallback } from "@/lib/convex-error-handler";
import { useGetMembers } from "@/packages/members/api";
import { ArrowLeftRight } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useTransferProject } from "../../api";
import type { Project } from "../../types";

interface TransferProjectModalProps {
  project: Project;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Cambia de manos la propiedad del proyecto. Los candidatos son sus otros
 * miembros: el servidor rechaza cualquier otro destinatario, para que el
 * proyecto no quede a nombre de quien no puede entrar en él.
 */
export const TransferProjectModal = ({
  project,
  open,
  onOpenChange,
}: TransferProjectModalProps) => {
  const { data: members, isLoading } = useGetMembers({
    projectId: project._id,
  });
  const { mutate: transferProject, isPending } = useTransferProject();

  const [newOwnerId, setNewOwnerId] = useState<Id<"members"> | undefined>();

  const candidates = members?.filter((member) => member.role !== "owner") ?? [];
  const newOwner = candidates.find((member) => member._id === newOwnerId);

  const [ConfirmDialog, confirm] = useConfirm({
    title: "Transferir proyecto",
    message: `${newOwner?.user.name ?? "Esta persona"} pasará a ser la propietaria de ${project.name}. Tú conservas tu acceso como administrador.`,
    type: "warning",
    confirmText: "Transferir",
  });

  const handleTransfer = async () => {
    if (!newOwnerId) return;
    if (!(await confirm())) return;

    transferProject(
      { id: project._id, memberId: newOwnerId },
      {
        onSuccess: () => {
          toast.success("Proyecto transferido correctamente");
          onOpenChange(false);
        },
        onError: (error) => handleConvexErrorCallback(error),
      },
    );
  };

  const hasNoCandidates = !isLoading && candidates.length === 0;

  return (
    <>
      <ConfirmDialog />
      <HarmonyModal
        open={open}
        onOpenChange={onOpenChange}
        maxWidth="sm:max-w-md"
      >
        <HarmonyModalHeader
          icon={ArrowLeftRight}
          title="Transferir proyecto"
          description="La propiedad pasa a otro miembro del proyecto."
        />
        <HarmonyModalContent className="space-y-1.5">
          <Label htmlFor="new-owner">Nueva propietaria o propietario</Label>
          <SearchableSelect
            id="new-owner"
            value={newOwnerId}
            disabled={isPending || candidates.length === 0}
            onValueChange={(value) => setNewOwnerId(value as Id<"members">)}
            className="w-full"
            placeholder="Elige un miembro"
            searchPlaceholder="Buscar un miembro…"
            options={candidates.map((candidate) => ({
              value: candidate._id,
              label: candidate.user.name ?? "Sin nombre",
              description: candidate.user.email,
            }))}
          />
          {hasNoCandidates ? (
            <p className="text-xs text-muted-foreground">
              No hay a quién transferirlo: invita antes a otra persona al
              proyecto.
            </p>
          ) : null}
        </HarmonyModalContent>
        <HarmonyModalFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={isPending}>
              Cancelar
            </Button>
          </DialogClose>
          <Button disabled={isPending || !newOwnerId} onClick={handleTransfer}>
            Transferir
          </Button>
        </HarmonyModalFooter>
      </HarmonyModal>
    </>
  );
};
