import type { Doc } from "@/convex/_generated/dataModel";

export type MemberRole = Doc<"members">["role"];

/** El schema guarda `owner` | `admin` | `member`; la interfaz habla español. */
export const MEMBER_ROLE_LABELS: Record<MemberRole, string> = {
  owner: "Propietario",
  admin: "Administrador",
  member: "Miembro",
};

/** Lo que cada nivel puede hacer, dicho a quien mira la ficha de alguien. */
export const describeMemberRole = (
  role: MemberRole,
  customRoleName: string | undefined,
) => {
  if (role === "owner")
    return "Es quien tiene la propiedad del proyecto: puede hacerlo todo, incluido transferirlo y eliminarlo.";
  if (role === "admin")
    return "Administra el proyecto: tiene todos los permisos, salvo transferirlo y eliminarlo.";
  if (customRoleName)
    return `Tiene el rol «${customRoleName}», que le da los permisos que ese rol tenga activos.`;
  return "Es miembro sin rol asignado: puede ver el proyecto, pero no cambiar nada.";
};
