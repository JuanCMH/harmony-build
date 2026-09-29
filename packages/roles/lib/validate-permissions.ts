import type { PermissionValue } from "./permissions";

type ValidatePermissionsArgs = {
  role: string;
  customRole?: Partial<Record<PermissionValue, boolean>> | null;
  permissions?: PermissionValue[];
  validationType?: "all" | "any";
};

/** El espejo en el navegador de `checkPermission` (`convex/roles.ts`):
 *  propietario y administrador pasan siempre; el resto, sólo con la llave de
 *  su rol personalizado. Decide qué se **enseña**; quien autoriza es el
 *  servidor. */
export const validatePermissions = ({
  role,
  customRole,
  permissions,
  validationType = "any",
}: ValidatePermissionsArgs): boolean => {
  if (role === "owner" || role === "admin") return true;
  if (!permissions?.length || !customRole) return false;

  const checks = permissions.map((permission) =>
    Boolean(customRole[permission]),
  );

  return validationType === "all"
    ? checks.every(Boolean)
    : checks.some(Boolean);
};
