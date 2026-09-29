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
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useRemoveFormCategory, useUpdateFormCategory } from "../../api";
import { ENTITY_ICONS } from "../../lib/field-catalog";
import { CategoryForm } from "../category-form";

const FORM_ID = "selected-category-form";

interface SelectedCategoryModalProps {
  category: Doc<"formCategories">;
  onClose: () => void;
}

/**
 * Una categoría abierta: renombrarla o eliminarla.
 *
 * Se monta con `key={category._id}` al elegirla: el formulario arranca con su
 * nombre y no vuelve a sincronizarse. No pregunta por la llave: el área entera
 * sólo la ve quien tiene `editForms`, que es la que exigen las dos escrituras.
 */
export const SelectedCategoryModal = ({
  category,
  onClose,
}: SelectedCategoryModalProps) => {
  const { mutate: updateCategory, isPending: isUpdating } =
    useUpdateFormCategory();
  const { mutate: removeCategory, isPending: isRemoving } =
    useRemoveFormCategory();
  const isBusy = isUpdating || isRemoving;

  // Una categoría en uso no se elimina: el servidor se niega y dice cuántos
  // formatos la usan. Aquí se avisa de lo que pasa cuando sí se puede.
  const [ConfirmDialog, confirm] = useConfirm({
    title: "Eliminar categoría",
    message: `Se eliminará la categoría «${category.name}». Si algún formato la usa, no se podrá eliminar hasta que se le cambie. Esta acción no se puede deshacer.`,
    type: "critical",
    confirmText: "Eliminar",
  });

  const handleSubmit = (name: string) => {
    updateCategory(
      { id: category._id, name },
      {
        onSuccess: () => {
          toast.success("Categoría actualizada correctamente");
          onClose();
        },
        onError: (error) => handleConvexErrorCallback(error),
      },
    );
  };

  const handleRemove = async () => {
    if (!(await confirm())) return;

    removeCategory(
      { id: category._id },
      {
        onSuccess: () => {
          toast.success("Categoría eliminada correctamente");
          onClose();
        },
        onError: (error) => handleConvexErrorCallback(error),
      },
    );
  };

  return (
    <>
      <ConfirmDialog />
      <HarmonyModal
        open
        onOpenChange={(open) => !open && onClose()}
        maxWidth="sm:max-w-md"
      >
        <HarmonyModalHeader
          icon={ENTITY_ICONS.category}
          title={category.name}
          description="Cambia su nombre, o elimínala si ya no se usa."
        />
        <HarmonyModalContent>
          <CategoryForm
            id={FORM_ID}
            initialName={category.name}
            disabled={isBusy}
            onSubmit={handleSubmit}
          />
        </HarmonyModalContent>
        <HarmonyModalFooter>
          <Button
            variant="outline"
            disabled={isBusy}
            className="mr-auto text-destructive hover:text-destructive"
            onClick={handleRemove}
          >
            <Trash2 className="size-4" />
            Eliminar
          </Button>
          <DialogClose asChild>
            <Button variant="outline" disabled={isBusy}>
              Cancelar
            </Button>
          </DialogClose>
          <Button type="submit" form={FORM_ID} disabled={isBusy}>
            Guardar
          </Button>
        </HarmonyModalFooter>
      </HarmonyModal>
    </>
  );
};
