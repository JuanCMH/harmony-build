"use client";

import { CollectionItem } from "@/components/harmony/collection";
import { CatalogSection } from "@/components/harmony/settings-section";
import type { Id } from "@/convex/_generated/dataModel";
import { useProjectId } from "@/packages/projects/store/use-project-id";
import { usePermissions } from "@/packages/roles/store/use-permissions";
import { useState } from "react";
import { useGetFormCategories } from "../api";
import { ENTITY_ICONS } from "../lib/field-catalog";
import { CreateCategoryModal } from "./modals/create-category-modal";
import { SelectedCategoryModal } from "./modals/selected-category-modal";

/**
 * Las categorías de formatos del proyecto: la lista corta —SST, Calidad,
 * Ambiental— con la que se filtran formatos y listados (diseño §7).
 */
export function CategoriesSection() {
  const projectId = useProjectId();
  const { data: categories, isLoading } = useGetFormCategories({ projectId });
  const { can } = usePermissions();
  const canEdit = can(["editForms"]);

  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<
    Id<"formCategories"> | undefined
  >();
  const selected = categories?.find((category) => category._id === selectedId);

  return (
    <>
      <CatalogSection
        icon={ENTITY_ICONS.category}
        title="Categorías"
        description="Los grupos con los que se ordenan y se filtran los formatos y los listados."
        items={categories}
        isLoading={isLoading}
        emptyTitle="Todavía no hay categorías"
        emptyHint="Crea la primera para agrupar los formatos: SST, Calidad, Ambiental."
        onCreate={canEdit ? () => setCreateOpen(true) : undefined}
        // «Crear», sin más: el título de la pantalla ya dice qué, y con el
        // nombre entero el botón pisaba al título a 390px de ancho.
        createLabel="Crear"
        countLabel={(n) => `${n} categoría${n !== 1 ? "s" : ""}`}
        searchText={(category) => category.name}
        searchPlaceholder="Buscar una categoría"
        renderItem={(category) => (
          <CollectionItem
            key={category._id}
            icon={ENTITY_ICONS.category}
            title={category.name}
            onSelect={() => setSelectedId(category._id)}
          />
        )}
      />
      {createOpen ? (
        <CreateCategoryModal open={createOpen} onOpenChange={setCreateOpen} />
      ) : null}
      {selected && canEdit ? (
        <SelectedCategoryModal
          key={selected._id}
          category={selected}
          onClose={() => setSelectedId(undefined)}
        />
      ) : null}
    </>
  );
}
