"use client";

import { SearchableSelect } from "@/components/harmony/searchable-select";
import { SettingsCard } from "@/components/harmony/settings-area";
import { handleConvexErrorCallback } from "@/lib/convex-error-handler";
import { useGetRoles } from "@/packages/roles/api";
import { usePermissions } from "@/packages/roles/store/use-permissions";
import { useMemo } from "react";
import { toast } from "sonner";
import { useGetProject, useSetProjectDefaultRole } from "../api";
import { useProjectId } from "../store/use-project-id";

/** El valor de «Ninguno» en el selector: un id de Convex nunca es esta
 *  cadena, y un `Select` no admite el valor vacío. */
const NO_ROLE = "none";

/**
 * El rol por defecto del proyecto: el que recibe quien entra con el código.
 *
 * Sin él, quien entra queda como miembro sin rol y no puede hacer nada hasta
 * que alguien se lo asigne; con cuarenta conductores, son cuarenta
 * asignaciones a mano (diseño §9). Sólo cambia a quien **entra**: quien ya
 * era miembro conserva el rol que tenía.
 *
 * Se pinta sólo con la llave `assignRoles`, que es la que exige el servidor.
 */
export const ProjectDefaultRole = () => {
  const projectId = useProjectId();
  const { can } = usePermissions();
  const canAssign = can(["assignRoles"]);

  const { data: project } = useGetProject({ id: projectId });
  const { data: roles, isLoading } = useGetRoles({ projectId });
  const { mutate: setDefaultRole, isPending } = useSetProjectDefaultRole();

  const options = useMemo(
    () => [
      {
        value: NO_ROLE,
        label: "Ninguno",
        description: "Quien entra queda sin rol",
      },
      ...(roles ?? []).map((role) => ({ value: role._id, label: role.name })),
    ],
    [roles],
  );

  if (!canAssign || !project) return null;

  const hasRoles = (roles?.length ?? 0) > 0;
  const current = project.defaultRoleId ?? NO_ROLE;

  const handleChange = (value: string) => {
    if (value === current) return;
    const role = roles?.find((candidate) => candidate._id === value);

    setDefaultRole(
      { id: projectId, roleId: role?._id },
      {
        onSuccess: () =>
          toast.success(
            role
              ? "Rol por defecto actualizado correctamente"
              : "Rol por defecto retirado correctamente",
          ),
        onError: (error) => handleConvexErrorCallback(error),
      },
    );
  };

  return (
    <SettingsCard>
      {/* La forma de `SettingsActionRow`, pero apilada en teléfono: allí el
          selector a la derecha dejaba la explicación en una columna de 70px. */}
      <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">
            Rol por defecto
          </p>
          <p className="mt-1 text-ui leading-relaxed text-muted-foreground">
            {hasRoles || isLoading
              ? "Quien entre con el código recibe este rol, y puede trabajar sin esperar a que alguien se lo asigne. No cambia a quienes ya son miembros."
              : "Quien entre con el código recibe este rol. Todavía no hay roles en el proyecto: crea uno en Ajustes › Roles para poder elegirlo."}
          </p>
        </div>
        <SearchableSelect
          aria-label="Rol por defecto"
          className="w-full shrink-0 sm:w-56"
          align="end"
          placeholder="Ninguno"
          searchPlaceholder="Buscar un rol…"
          value={current}
          options={options}
          disabled={isLoading || isPending || !hasRoles}
          onValueChange={handleChange}
        />
      </div>
    </SettingsCard>
  );
};
