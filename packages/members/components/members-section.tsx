"use client";

import {
  CollectionEmpty,
  CollectionLoading,
  useCollectionRowClassName,
} from "@/components/harmony/collection";
import { SettingsCard } from "@/components/harmony/settings-area";
import { SettingsSection } from "@/components/harmony/settings-section";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Id } from "@/convex/_generated/dataModel";
import { useGetMembers } from "@/packages/members/api";
import { useProjectId } from "@/packages/projects/store/use-project-id";
import { usePermissions } from "@/packages/roles/store/use-permissions";
import { User, UserPlus } from "lucide-react";
import type { ReactNode } from "react";
import { MEMBER_ROLE_LABELS } from "../lib/member-roles";

export function MembersSection({
  onSelectMember,
  onInvite,
  beforeList,
}: {
  onSelectMember: (memberId: Id<"members">) => void;
  onInvite: () => void;
  /** Lo que el área pone entre su cabecera y la lista: el rol por defecto.
   *  Va dentro de la sección para quedar debajo del título de la pantalla. */
  beforeList?: ReactNode;
}) {
  const projectId = useProjectId();
  const { data: members, isLoading } = useGetMembers({ projectId });
  const { can } = usePermissions();

  const total = members?.length ?? 0;
  const rowClassName = useCollectionRowClassName();

  return (
    <SettingsSection
      icon={User}
      title="Usuarios"
      count={total > 0 ? total : undefined}
      countLabel={`${total} miembro${total !== 1 ? "s" : ""}`}
      description="Quién tiene acceso a este proyecto y con qué rol."
      actions={
        can(["inviteUsers"]) ? (
          <Button size="sm" variant="outline" onClick={onInvite}>
            <UserPlus className="size-4" />
            Invitar
          </Button>
        ) : null
      }
    >
      {beforeList}
      {isLoading ? (
        <CollectionLoading />
      ) : total === 0 ? (
        <CollectionEmpty icon={User} title="No hay miembros en este proyecto" />
      ) : (
        <SettingsCard>
          {members?.map((member) => (
            <button
              key={member._id}
              type="button"
              onClick={() => onSelectMember(member._id)}
              className={rowClassName}
            >
              <div className="flex items-center justify-between gap-3 p-3">
                <div className="flex min-w-0 items-center gap-2">
                  <Avatar className="size-8 shrink-0">
                    <AvatarImage
                      src={member.user.userImage}
                      alt=""
                      className="object-cover"
                    />
                    <AvatarFallback className="text-xs">
                      {(member.user.name || "U").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <h3 className="truncate text-sm leading-tight font-medium">
                      {member.user.name || "Sin nombre"}
                    </h3>
                    <p className="mt-1 truncate text-xs leading-tight text-muted-foreground">
                      {member.user.email || "Sin correo"}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {/* El rol personalizado es un dato; el nivel, un estado. */}
                  {member.role === "member" && member.customRole ? (
                    <span className="hidden max-w-40 truncate text-ui text-muted-foreground sm:inline">
                      {member.customRole.name}
                    </span>
                  ) : null}
                  <Badge variant="secondary">
                    {MEMBER_ROLE_LABELS[member.role]}
                  </Badge>
                </div>
              </div>
            </button>
          ))}
        </SettingsCard>
      )}
    </SettingsSection>
  );
}
