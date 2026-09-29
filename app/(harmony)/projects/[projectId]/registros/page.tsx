"use client";

import { PageLoading } from "@/components/harmony/page-loading";
import {
  PageHeader,
  PageMain,
  PageShell,
} from "@/components/harmony/page-shell";
import { useGetLogsByProject } from "@/packages/logs/api";
import { RegistrosView } from "@/packages/logs/components/registros-view";
import { dayRange, monthRange } from "@/packages/logs/lib/log-ranges";
import { useRegistrosView } from "@/packages/logs/store/use-registros-view";
import { useGetProject } from "@/packages/projects/api";
import { useProjectId } from "@/packages/projects/store/use-project-id";
import { RoleGate } from "@/packages/roles/components/role-gate";
import { Lock } from "lucide-react";
import { useState } from "react";

/**
 * La lista se monta sólo con la llave `viewLogs`: su consulta **lanza** sin
 * ella, y quien llegara por la dirección tumbaría la pantalla.
 */
const ProjectLogs = () => {
  const projectId = useProjectId();
  const [{ rango }] = useRegistrosView();
  const [fecha, setFecha] = useState<Date>(() => new Date());

  // El intervalo se calcula en el navegador, que es quien sabe en qué huso
  // está quien mira (`packages/logs/lib/log-ranges.ts`).
  const { data: logs, isLoading } = useGetLogsByProject({
    projectId,
    ...(rango === "dia" ? dayRange(fecha) : monthRange(fecha)),
  });

  return (
    <RegistrosView
      logs={logs}
      isLoading={isLoading}
      fecha={fecha}
      onFechaChange={setFecha}
    />
  );
};

/** La auditoría del proyecto. El rango vive en la URL, así que la pantalla es
 *  enlazable. */
export default function ProjectLogsPage() {
  const projectId = useProjectId();
  const { data: project } = useGetProject({ id: projectId });

  return (
    <PageShell>
      <PageHeader
        breadcrumb={
          project
            ? [
                { label: project.name, href: `/projects/${projectId}` },
                { label: "Registros" },
              ]
            : []
        }
      />
      <PageMain variant="compuesta">
        <RoleGate
          permissions={["viewLogs"]}
          fallback={
            <PageLoading
              icon={Lock}
              text="No tienes permiso para ver los registros de este proyecto. Pídeselo a quien lo administra."
            />
          }
        >
          <ProjectLogs />
        </RoleGate>
      </PageMain>
    </PageShell>
  );
}
