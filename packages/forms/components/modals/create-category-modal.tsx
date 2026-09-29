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
import { toast } from "sonner";
import { useCreateFormCategory } from "../../api";
import { ENTITY_ICONS } from "../../lib/field-catalog";
import { CategoryForm } from "../category-form";

const FORM_ID = "create-category-form";

interface CreateCategoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateCategoryModal = ({
  open,
  onOpenChange,
}: CreateCategoryModalProps) => {
  const projectId = useProjectId();
  const { mutate: createCategory, isPending } = useCreateFormCategory();

  const handleSubmit = (name: string) => {
    createCategory(
      { projectId, name },
      {
        onSuccess: () => {
          toast.success("Categoría creada correctamente");
          onOpenChange(false);
        },
        onError: (error) => handleConvexErrorCallback(error),
      },
    );
  };

  return (
    <HarmonyModal open={open} onOpenChange={onOpenChange} maxWidth="sm:max-w-md">
      <HarmonyModalHeader
        icon={ENTITY_ICONS.category}
        title="Crear categoría"
        description="Una categoría agrupa formatos y listados para encontrarlos."
      />
      <HarmonyModalContent>
        <CategoryForm
          id={FORM_ID}
          disabled={isPending}
          onSubmit={handleSubmit}
        />
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
