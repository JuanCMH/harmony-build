"use client";

import {
  DialogClose,
  HarmonyModal,
  HarmonyModalContent,
  HarmonyModalFooter,
  HarmonyModalHeader,
} from "@/components/harmony/harmony-modal";
import { Button } from "@/components/ui/button";
import type { Doc } from "@/convex/_generated/dataModel";
import { useConfirm } from "@/hooks/use-confirm";
import { handleConvexErrorCallback } from "@/lib/convex-error-handler";
import { ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useRemoveRole, useUpdateRole } from "../../api";
import { usePermissions } from "../../store/use-permissions";
import { RoleForm, type RoleFormValues } from "../role-form";

const FORM_ID = "selected-role-form";

interface SelectedRoleModalProps {
  role: Doc<"roles">;
  onClose: () => void;
}

/**
 * Un rol abierto: sus llaves, y editarlo o eliminarlo para quien puede.
 *
 * Se monta con `key={role._id}` al elegir un rol: el formulario arranca con
 * sus datos y no vuelve a sincronizarse (`RoleForm`). Sin la llave `editRoles`
 * se abre igual, en sólo lectura: ver qué permite un rol no es cambiarlo.
 */
export const SelectedRoleModal = ({
  role,
  onClose,
}: SelectedRoleModalProps) => {
  const { mutate: updateRole, isPending: isUpdating } = useUpdateRole();
  const { mutate: removeRole, isPending: isRemoving } = useRemoveRole();
  const { can } = usePermissions();

  const canEdit = can(["editRoles"]);
  const canDelete = can(["deleteRoles"]);
  const isBusy = isUpdating || isRemoving;

  const [ConfirmDialog, confirm] = useConfirm({
    title: "Eliminar rol",
    message: `Quienes tengan el rol «${role.name}» se quedan sin sus permisos. Esta acción no se puede deshacer.`,
    type: "critical",
    confirmText: "Eliminar",
  });

  const handleSubmit = ({ name, permissions }: RoleFormValues) => {
    updateRole(
      { ...permissions, name, id: role._id },
      {
        onSuccess: () => {
          toast.success("Rol actualizado correctamente");
          onClose();
        },
        onError: (error) => handleConvexErrorCallback(error),
      },
    );
  };

  const handleRemove = async () => {
    if (!(await confirm())) return;

    removeRole(
      { id: role._id },
      {
        onSuccess: () => {
          toast.success("Rol eliminado correctamente");
          onClose();
        },
        onError: (error) => handleConvexErrorCallback(error),
      },
    );
  };

  const { _id, _creationTime, projectId, name, ...permissions } = role;

  return (
    <>
      <ConfirmDialog />
      <HarmonyModal open onOpenChange={(open) => !open && onClose()}>
        <HarmonyModalHeader
          icon={ShieldCheck}
          title={role.name}
          description={
            canEdit
              ? "Cambia su nombre o los permisos que concede."
              : "Los permisos que concede este rol."
          }
        />
        <HarmonyModalContent>
          <RoleForm
            id={FORM_ID}
            initial={{ name, permissions }}
            disabled={!canEdit || isBusy}
            onSubmit={handleSubmit}
          />
        </HarmonyModalContent>
        <HarmonyModalFooter>
          {canDelete ? (
            <Button
              variant="outline"
              disabled={isBusy}
              className="mr-auto text-destructive hover:text-destructive"
              onClick={handleRemove}
            >
              <Trash2 className="size-4" />
              Eliminar
            </Button>
          ) : null}
          <DialogClose asChild>
            <Button variant="outline" disabled={isBusy}>
              {canEdit ? "Cancelar" : "Cerrar"}
            </Button>
          </DialogClose>
          {canEdit ? (
            <Button type="submit" form={FORM_ID} disabled={isBusy}>
              Guardar
            </Button>
          ) : null}
        </HarmonyModalFooter>
      </HarmonyModal>
    </>
  );
};
