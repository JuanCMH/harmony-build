"use client";

import {
  PageHeader,
  PageMain,
  PageShell,
} from "@/components/harmony/page-shell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetDashboard } from "@/packages/dashboard/api";
import { DashboardView } from "@/packages/dashboard/components/dashboard-view";
import { FillableFormsPanel } from "@/packages/forms/components/fillable-forms-panel";
import { RecentActivity } from "@/packages/logs/components/recent-activity";
import { TeamSummary } from "@/packages/members/components/team-summary";
import { useGetProject } from "@/packages/projects/api";
import { ProjectHeader } from "@/packages/projects/components/project-header";
import { useProjectId } from "@/packages/projects/store/use-project-id";
import { RoleGate } from "@/packages/roles/components/role-gate";
import { Pencil } from "lucide-react";
import { useState } from "react";

/**
 * Inicio del proyecto: lo que cada quien viene a hacer.
 *
 * Quien ve las respuestas de todos encuentra **el tablero y nada más**: bajo
 * la barra van sus pestañas. Quien sólo diligencia no tiene tablero —son
 * agregados de respuestas que no ve—, y encuentra sus formatos, el equipo y
 * la actividad.
 */
export default function ProjectHomePage() {
  const projectId = useProjectId();
  const { data: project } = useGetProject({ id: projectId });
  const { data: dashboard } = useGetDashboard({ projectId });
  const [editing, setEditing] = useState(false);

  return (
    <PageShell>
      <PageHeader
        breadcrumb={project ? [{ label: project.name }] : []}
        actions={
          dashboard?.canEdit && dashboard.tabs.length > 0 && !editing ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setEditing(true)}
            >
              <Pencil />
              Editar tablero
            </Button>
          ) : null
        }
      />
      <PageMain variant="compuesta" className="overflow-y-auto">
        {/* `shrink-0`: dentro de una compuesta, un contenedor se encoge al
            alto disponible y una tarjeta `h-full` lo llena entero
            (`03 §2.3`). */}
        <div className="shrink-0 space-y-4">
          {dashboard === undefined ? (
            <div className="space-y-4" aria-busy="true">
              <span className="sr-only">Cargando el tablero…</span>
              <div className="flex items-center justify-between gap-2">
                <Skeleton className="h-9 w-80 max-w-full" />
                <Skeleton className="hidden h-9 w-72 sm:block" />
              </div>
              <div className="grid gap-4 lg:grid-cols-12">
                <Skeleton className="h-64 rounded-lg lg:col-span-4" />
                <Skeleton className="h-64 rounded-lg lg:col-span-8" />
                <Skeleton className="h-48 rounded-lg lg:col-span-12" />
              </div>
            </div>
          ) : dashboard ? (
            <DashboardView
              dashboard={dashboard}
              editing={editing}
              onEditingChange={setEditing}
            />
          ) : (
            <>
              <ProjectHeader />
              <FillableFormsPanel className="h-auto" />
              <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
                <TeamSummary className="h-auto" />
                {/* La actividad se monta sólo con la llave `viewLogs`: su
                    consulta lanza sin ella. */}
                <RoleGate permissions={["viewLogs"]}>
                  <RecentActivity className="h-auto" />
                </RoleGate>
              </div>
            </>
          )}
        </div>
      </PageMain>
    </PageShell>
  );
}
