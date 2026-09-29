"use client";

import {
  PageHeader,
  PageMain,
  PageShell,
} from "@/components/harmony/page-shell";
import { RecentActivity } from "@/packages/logs/components/recent-activity";
import { TeamSummary } from "@/packages/members/components/team-summary";
import { useGetProject } from "@/packages/projects/api";
import { ProjectHeader } from "@/packages/projects/components/project-header";
import { useProjectId } from "@/packages/projects/store/use-project-id";
import { RoleGate } from "@/packages/roles/components/role-gate";

/**
 * Inicio del proyecto: qué proyecto es, quién está en él y qué se ha hecho
 * hoy. Sólo enseña lo que ya existe.
 */
export default function ProjectHomePage() {
  const projectId = useProjectId();
  const { data: project } = useGetProject({ id: projectId });

  return (
    <PageShell>
      <PageHeader breadcrumb={project ? [{ label: project.name }] : []} />
      <PageMain variant="compuesta" className="overflow-y-auto">
        {/* `shrink-0` y `h-auto`: dentro de una compuesta, un contenedor se
            encoge al alto disponible y una tarjeta `h-full` lo llena entero
            (`03 §2.3`). `items-start` evita que la tarjeta corta se estire a
            la altura de la larga. */}
        <div className="shrink-0 space-y-4">
          <ProjectHeader />
          <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
            <TeamSummary className="h-auto" />
            {/* La actividad se monta sólo con la llave `viewLogs`: su consulta
                lanza sin ella. */}
            <RoleGate permissions={["viewLogs"]}>
              <RecentActivity className="h-auto" />
            </RoleGate>
          </div>
        </div>
      </PageMain>
    </PageShell>
  );
}
