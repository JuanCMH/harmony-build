import type { ReactNode } from "react";
import type { PermissionValue } from "../lib/permissions";
import { usePermissions } from "../store/use-permissions";

interface RoleGateProps {
  children: ReactNode;
  permissions?: PermissionValue[];
  validationType?: "all" | "any";
  inverse?: boolean;
  /** Lo que se pinta cuando no hay permiso. Sin él, nada. */
  fallback?: ReactNode;
}

export const RoleGate = ({
  children,
  permissions,
  validationType = "any",
  inverse = false,
  fallback = null,
}: RoleGateProps) => {
  const { member, can } = usePermissions();
  if (!member) return null;

  const hasPermission = can(permissions, validationType);

  return hasPermission !== inverse ? <>{children}</> : <>{fallback}</>;
};
