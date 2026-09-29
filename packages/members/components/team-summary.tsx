"use client";

import { PanelCard } from "@/components/harmony/panel-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getSettingsArea } from "@/packages/projects/lib/settings-areas";
import { useProjectId } from "@/packages/projects/store/use-project-id";
import { usePermissions } from "@/packages/roles/store/use-permissions";
import { Users } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { useGetMembers } from "../api";
import { MEMBER_ROLE_LABELS, type MemberRole } from "../lib/member-roles";

const ROLE_ORDER: MemberRole[] = ["owner", "admin", "member"];

/** «Administradores», «Miembros». Propietario hay uno solo. */
const ROLE_PLURALS: Record<MemberRole, string> = {
  owner: "Propietarios",
  admin: "Administradores",
  member: "Miembros",
};

/**
 * El equipo del proyecto, en una cifra: cuántas personas tienen acceso y con
 * qué nivel. El enlace a su gestión sólo lo ve quien puede entrar en ella.
 */
export const TeamSummary = ({ className }: { className?: string }) => {
  const projectId = useProjectId();
  const { data: members, isLoading } = useGetMembers({ projectId });
  const { can } = usePermissions();

  const canManage = can(getSettingsArea("users").permissions);
  const total = members?.length ?? 0;

  const byRole = useMemo(() => {
    const counts: Record<MemberRole, number> = {
      owner: 0,
      admin: 0,
      member: 0,
    };
    for (const member of members ?? []) counts[member.role] += 1;
    return ROLE_ORDER.map((role) => ({ role, count: counts[role] })).filter(
      ({ count }) => count > 0,
    );
  }, [members]);

  return (
    <PanelCard
      icon={Users}
      title="Equipo"
      description="Quién tiene acceso al proyecto"
      className={className}
      actions={
        canManage ? (
          <Button asChild variant="ghost" size="sm">
            <Link href={`/projects/${projectId}/ajustes/usuarios`}>
              Gestionar
            </Link>
          </Button>
        ) : null
      }
    >
      {isLoading ? (
        <div className="space-y-3 p-4" aria-busy="true" aria-live="polite">
          <span className="sr-only">Cargando el equipo…</span>
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-4 w-40" />
        </div>
      ) : (
        <div className="p-4">
          <p className="flex items-baseline gap-2">
            <span className="font-space-grotesk text-3xl font-medium tracking-tight tabular-nums">
              {total}
            </span>
            <span className="text-sm text-muted-foreground">
              {total === 1 ? "miembro" : "miembros"}
            </span>
          </p>
          <dl className="mt-4 divide-y divide-border/60 border-t border-border/60">
            {byRole.map(({ role, count }) => (
              <div
                key={role}
                className="flex items-center justify-between gap-3 py-2 text-ui"
              >
                <dt className="text-muted-foreground">
                  {count === 1 ? MEMBER_ROLE_LABELS[role] : ROLE_PLURALS[role]}
                </dt>
                <dd className="tabular-nums">{count}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </PanelCard>
  );
};
