"use client";

import { CollectionItem } from "@/components/harmony/collection";
import { CatalogSection } from "@/components/harmony/settings-section";
import type { Id } from "@/convex/_generated/dataModel";
import { useProjectId } from "@/packages/projects/store/use-project-id";
import { ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useGetRoles } from "../api";
import { listOfPermissions, permissionsGroups } from "../lib/permissions";
import { usePermissions } from "../store/use-permissions";
import { CreateRoleModal } from "./modals/create-role-modal";
import { SelectedRoleModal } from "./modals/selected-role-modal";

export function RolesSection() {
  const projectId = useProjectId();
  const { data: roles, isLoading } = useGetRoles({ projectId });
  const { can } = usePermissions();

  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<Id<"roles"> | undefined>();
  const selected = roles?.find((role) => role._id === selectedId);

  return (
    <>
      <CatalogSection
        icon={ShieldCheck}
        title="Roles"
        description="Los permisos que puede tener una persona en este proyecto."
        items={roles}
        isLoading={isLoading}
        emptyTitle="No hay roles personalizados"
        emptyHint="Sin un rol, un miembro sólo puede ver el proyecto."
        onCreate={can(["createRoles"]) ? () => setCreateOpen(true) : undefined}
        createLabel="Crear rol"
        countLabel={(n) => `${n} rol${n !== 1 ? "es" : ""}`}
        searchText={(role) => role.name}
        searchPlaceholder="Buscar un rol"
        renderItem={(role) => {
          const granted = listOfPermissions.filter(
            (permission) => role[permission.value],
          );
          const groups = permissionsGroups.filter((group) =>
            granted.some((permission) => permission.group === group),
          );

          return (
            <CollectionItem
              key={role._id}
              icon={ShieldCheck}
              title={role.name}
              description={
                groups.length > 0
                  ? `Permisos en ${groups.join(", ")}`
                  : "Sin permisos activos"
              }
              onSelect={() => setSelectedId(role._id)}
              trailing={
                // Un dato, no un estado: va como texto y no como `Badge`
                // (`03 §2.3`).
                <span className="text-ui tabular-nums text-muted-foreground">
                  <span aria-hidden>
                    {granted.length}/{listOfPermissions.length}
                  </span>
                  <span className="sr-only">
                    {granted.length} de {listOfPermissions.length} permisos
                  </span>
                </span>
              }
            />
          );
        }}
      />
      {createOpen ? (
        <CreateRoleModal open={createOpen} onOpenChange={setCreateOpen} />
      ) : null}
      {selected ? (
        <SelectedRoleModal
          key={selected._id}
          role={selected}
          onClose={() => setSelectedId(undefined)}
        />
      ) : null}
    </>
  );
}
