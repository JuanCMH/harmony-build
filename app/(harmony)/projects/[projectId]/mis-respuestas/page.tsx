"use client";

import { PageLoading } from "@/components/harmony/page-loading";
import {
  PageHeader,
  PageMain,
  PageShell,
} from "@/components/harmony/page-shell";
import { MyResponsesList } from "@/packages/forms/components/my-responses-list";
import { useGetProject } from "@/packages/projects/api";
import { useProjectId } from "@/packages/projects/store/use-project-id";
import { usePermissions } from "@/packages/roles/store/use-permissions";
import { Lock } from "lucide-react";

/**
 * Lo que quien mira ha diligenciado en el proyecto, en todos sus formatos.
 *
 * La lista **lanza** sin `fillForms`, así que sólo se monta para quien la
 * tiene: a quien no, se le dice por qué no ve nada.
 */
export default function MyResponsesPage() {
  const projectId = useProjectId();
  const { data: project } = useGetProject({ id: projectId });
  const { can, isLoading } = usePermissions();
  const canFill = can(["fillForms"]);

  return (
    <PageShell>
      <PageHeader
        breadcrumb={
          project
            ? [
                { label: project.name, href: `/projects/${projectId}` },
                { label: "Mis respuestas" },
              ]
            : []
        }
      />
      <PageMain
        variant="listado"
        isLoading={isLoading}
        loadingText="Se están cargando tus respuestas."
      >
        {isLoading ? null : canFill ? (
          <MyResponsesList />
        ) : (
          <PageLoading
            icon={Lock}
            text="No tienes permiso para diligenciar formatos en este proyecto. Pídeselo a quien administra el proyecto."
          />
        )}
      </PageMain>
    </PageShell>
  );
}
