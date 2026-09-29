import { useCurrentMember } from "@/packages/members/api";
import { useProjectId } from "@/packages/projects/store/use-project-id";
import { validatePermissions } from "../lib/validate-permissions";
import type { PermissionValue } from "../lib/permissions";

/**
 * Lo que quien mira puede hacer en el proyecto de la ruta.
 *
 * Cada pantalla repetía la misma consulta y el mismo objeto de cuatro campos
 * para preguntar por una llave. Aquí se pregunta por la llave y nada más.
 */
export const usePermissions = () => {
  const projectId = useProjectId();
  const { data: member, isLoading } = useCurrentMember({ projectId });

  const can = (
    permissions?: PermissionValue[],
    validationType: "all" | "any" = "any",
  ) =>
    !!member &&
    validatePermissions({
      role: member.role,
      customRole: member.customRole,
      permissions,
      validationType,
    });

  return {
    member,
    isLoading,
    can,
    isOwner: member?.role === "owner",
    /** Propietario o administrador: los dos niveles que un rol personalizado
     *  no alcanza (`01 §5.1`). */
    isElevated: member?.role === "owner" || member?.role === "admin",
  };
};
