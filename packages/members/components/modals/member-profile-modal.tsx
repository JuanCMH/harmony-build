"use client";

import {
  DialogClose,
  HarmonyModal,
  HarmonyModalContent,
  HarmonyModalFooter,
  HarmonyModalHeader,
} from "@/components/harmony/harmony-modal";
import { SearchableSelect } from "@/components/harmony/searchable-select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useConfirm } from "@/hooks/use-confirm";
import { handleConvexErrorCallback } from "@/lib/convex-error-handler";
import { fullDate } from "@/lib/date-formats";
import { useProjectId } from "@/packages/projects/store/use-project-id";
import { useGetRoles } from "@/packages/roles/api";
import { usePermissions } from "@/packages/roles/store/use-permissions";
import { User, UserMinus } from "lucide-react";
import { toast } from "sonner";
import { useGetMembers, useRemoveMember, useUpdateMember } from "../../api";
import { MEMBER_ROLE_LABELS, describeMemberRole } from "../../lib/member-roles";

interface MemberProfileModalProps {
  /** Llega de la URL: puede ser de alguien que ya no está en el proyecto. */
  memberId: string;
  handleCloseMember: () => void;
}

/** Los dos niveles que se pueden asignar desde aquí. El tercero, propietario,
 *  sólo cambia transfiriendo el proyecto. */
const BASE_ROLES = ["admin", "member"] as const;
type BaseRole = (typeof BASE_ROLES)[number];

const isBaseRole = (value: string): value is BaseRole =>
  BASE_ROLES.some((role) => role === value);

/**
 * La ficha de un miembro: quién es, qué rol tiene y, para quien puede, cambiar
 * ese rol o expulsarlo.
 *
 * Las reglas son las del servidor (`convex/members.ts`), repetidas aquí sólo
 * para no ofrecer lo que se va a rechazar:
 * - al propietario no se le cambia el rol ni se le expulsa;
 * - asignar un rol personalizado pide la llave `assignRoles`;
 * - mover a alguien entre administrador y miembro, o tocar a un
 *   administrador, pide ser propietario o administrador.
 */
export const MemberProfileModal = ({
  memberId,
  handleCloseMember,
}: MemberProfileModalProps) => {
  const projectId = useProjectId();

  // Se busca en la lista del proyecto, que la pantalla ya tiene suscrita, y no
  // con una consulta por id: esa **lanza** si el miembro no existe, y eso es
  // justo lo que pasa en el instante en que se le expulsa desde aquí.
  const { data: members, isLoading } = useGetMembers({ projectId });
  const member = members?.find((item) => item._id === memberId);
  const { data: roles } = useGetRoles({ projectId });
  const { member: currentMember, can, isElevated } = usePermissions();

  const { mutate: updateMember, isPending: isUpdating } = useUpdateMember();
  const { mutate: removeMember, isPending: isRemoving } = useRemoveMember();

  const [RoleDialog, confirmRole] = useConfirm({
    title: "Cambiar el rol",
    message: `Los permisos de ${member?.user.name ?? "esta persona"} en el proyecto cambian en cuanto confirmes.`,
    type: "warning",
    confirmText: "Cambiar",
  });

  const [RemoveDialog, confirmRemove] = useConfirm({
    title: "Expulsar del proyecto",
    message: `${member?.user.name ?? "Esta persona"} perderá el acceso al proyecto. Para volver necesitará su código de unión.`,
    type: "critical",
    confirmText: "Expulsar",
  });

  const isSelf = !!member && currentMember?._id === member._id;
  const isOwner = member?.role === "owner";
  // Tocar a un administrador es moverlo en la jerarquía: exige estar en ella.
  const isWithinReach =
    !!member && !isOwner && !isSelf && (member.role === "member" || isElevated);

  const canChangeRole = isWithinReach && can(["assignRoles"]);
  const canExpel = isWithinReach && can(["expelUsers"]);
  const isBusy = isUpdating || isRemoving;

  const roleOptions = [
    // Sin estar en la jerarquía sólo se reparten roles personalizados: el
    // nivel de la persona se queda como está.
    ...BASE_ROLES.filter((role) => isElevated || role === member?.role).map(
      (role) => ({
        value: role,
        label: MEMBER_ROLE_LABELS[role],
        description:
          role === "admin"
            ? "Todos los permisos del proyecto"
            : "Sin rol personalizado: sólo puede ver",
      }),
    ),
    ...(roles ?? []).map((role) => ({
      value: role._id,
      label: role.name,
      description: "Rol personalizado",
    })),
  ];

  const selectedRole =
    member?.role === "member" && member.customRoleId
      ? member.customRoleId
      : member?.role;

  const handleRoleChange = async (value: string) => {
    if (!member || value === selectedRole) return;
    if (!(await confirmRole())) return;

    const customRole = roles?.find((role) => role._id === value);
    if (!isBaseRole(value) && !customRole) return;

    updateMember(
      isBaseRole(value)
        ? { id: member._id, role: value }
        : { id: member._id, role: "member", customRoleId: customRole?._id },
      {
        onSuccess: () => toast.success("Rol actualizado correctamente"),
        onError: (error) => handleConvexErrorCallback(error),
      },
    );
  };

  const handleRemove = async () => {
    if (!member) return;
    if (!(await confirmRemove())) return;

    removeMember(
      { id: member._id },
      {
        onSuccess: () => {
          toast.success("Miembro expulsado correctamente");
          handleCloseMember();
        },
        onError: (error) => handleConvexErrorCallback(error),
      },
    );
  };

  return (
    <>
      <RoleDialog />
      <RemoveDialog />
      <HarmonyModal
        open
        onOpenChange={(open) => !open && handleCloseMember()}
        maxWidth="sm:max-w-md"
      >
        <HarmonyModalHeader
          icon={User}
          title={isSelf ? "Tu perfil en el proyecto" : "Perfil del miembro"}
          description="Quién es y qué puede hacer en este proyecto."
        />
        <HarmonyModalContent className="space-y-4">
          {!isLoading && !member ? (
            <p className="text-sm text-muted-foreground">
              Esta persona ya no es miembro del proyecto.
            </p>
          ) : !member ? (
            <div className="flex items-center gap-3" aria-busy="true">
              <span className="sr-only">Cargando el perfil…</span>
              <Skeleton className="size-12 shrink-0 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3.5 w-52" />
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <Avatar className="size-12 shrink-0">
                  <AvatarImage
                    src={member.user.userImage}
                    alt=""
                    className="object-cover"
                  />
                  <AvatarFallback>
                    {(member.user.name || "U").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {member.user.name || "Sin nombre"}
                  </p>
                  <p className="truncate text-ui text-muted-foreground">
                    {member.user.email || "Sin correo"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    En el proyecto desde el{" "}
                    {fullDate(new Date(member._creationTime))}
                  </p>
                </div>
                <Badge variant="secondary" className="shrink-0">
                  {MEMBER_ROLE_LABELS[member.role]}
                </Badge>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="member-role">Rol</Label>
                {canChangeRole ? (
                  <SearchableSelect
                    id="member-role"
                    value={selectedRole}
                    disabled={isBusy}
                    onValueChange={handleRoleChange}
                    className="w-full"
                    placeholder="Elige un rol"
                    searchPlaceholder="Buscar un rol…"
                    options={roleOptions}
                  />
                ) : null}
                <p className="text-ui text-muted-foreground">
                  {describeMemberRole(member.role, member.customRole?.name)}
                </p>
                {isOwner ? (
                  <p className="text-ui text-muted-foreground">
                    El propietario sólo cambia transfiriendo el proyecto desde
                    Ajustes → General.
                  </p>
                ) : null}
              </div>
            </>
          )}
        </HarmonyModalContent>
        <HarmonyModalFooter>
          <DialogClose asChild>
            <Button variant="outline">Cerrar</Button>
          </DialogClose>
          {canExpel ? (
            <Button
              variant="destructive"
              disabled={isBusy}
              onClick={handleRemove}
            >
              <UserMinus className="size-4" />
              Expulsar
            </Button>
          ) : null}
        </HarmonyModalFooter>
      </HarmonyModal>
    </>
  );
};
