"use client";

import { PageLoading } from "@/components/harmony/page-loading";
import {
  PageHeader,
  PageMain,
  PageShell,
} from "@/components/harmony/page-shell";
import { TrackingsTable } from "@/packages/forms/components/trackings-table";
import { useGetProject } from "@/packages/projects/api";
import { useProjectId } from "@/packages/projects/store/use-project-id";
import { usePermissions } from "@/packages/roles/store/use-permissions";
import { Lock } from "lucide-react";

/**
 * La bandeja de seguimientos del proyecto: los asuntos de todos sus
 * formatos de seguimiento, los abiertos y vencidos primero.
 *
 * La tabla **lanza** sin `viewResponses` ni `fillForms`, así que sólo se
 * monta para quien tiene alguna: a quien no, se le dice por qué no ve nada.
 */
export default function TrackingsPage() {
  const projectId = useProjectId();
  const { data: project } = useGetProject({ id: projectId });
  const { can, isLoading } = usePermissions();
  const canList = can(["viewResponses", "fillForms"]);

  return (
    <PageShell>
      <PageHeader
        breadcrumb={
          project
            ? [
                { label: project.name, href: `/projects/${projectId}` },
                { label: "Seguimientos" },
              ]
            : []
        }
      />
      <PageMain
        variant="listado"
        isLoading={isLoading}
        loadingText="Se están cargando los asuntos."
      >
        {isLoading ? null : canList ? (
          <TrackingsTable />
        ) : (
          <PageLoading
            icon={Lock}
            text="No tienes permiso para ver los seguimientos. Pídeselo a quien administra el proyecto."
          />
        )}
      </PageMain>
    </PageShell>
  );
}
