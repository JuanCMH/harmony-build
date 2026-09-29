"use client";

import { PageLoading } from "@/components/harmony/page-loading";
import {
  PageHeader,
  PageMain,
  PageShell,
} from "@/components/harmony/page-shell";
import { Button } from "@/components/ui/button";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { useCurrentMember } from "@/packages/members/api";
import { ProjectSidebar } from "@/packages/projects/components/project-sidebar";
import { SettingsSidebar } from "@/packages/projects/components/settings-sidebar";
import { useIsLeavingProject } from "@/packages/projects/store/use-is-leaving-project";
import { useProjectId } from "@/packages/projects/store/use-project-id";
import { Lock } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * El armazón del proyecto: comprueba la pertenencia y pone el menú.
 *
 * Ajustes **sustituye** el sidebar en vez de añadir uno: es lo que evita la
 * tercera columna de navegación (`03 §2.2`).
 */
const ProjectLayout = ({ children }: { children: React.ReactNode }) => {
  const projectId = useProjectId();
  const pathname = usePathname();
  const [isLeaving] = useIsLeavingProject();
  const { data: currentMember, isLoading } = useCurrentMember({ projectId });

  const inSettings = pathname.startsWith(`/projects/${projectId}/ajustes`);

  // El armazón se monta siempre, también mientras se comprueba la pertenencia:
  // devolver el estado de carga en su lugar dejaba la ventana en blanco —sin
  // sidebar y sin barra superior—, y al ser el layout eso tapaba todas las
  // pantallas del proyecto (`03 §2.4`). Los dos sidebars resuelven su propia
  // carga, así que montarlos antes de tiempo es seguro.
  const content =
    isLoading || (isLeaving && !currentMember) ? (
      <PageShell>
        <PageHeader />
        <PageMain
          variant="listado"
          isLoading
          loadingText={
            isLeaving
              ? "Se está cerrando el proyecto."
              : "Se está cargando el proyecto."
          }
        />
      </PageShell>
    ) : !currentMember ? (
      <PageShell>
        <PageHeader />
        <PageMain variant="listado">
          <div className="flex h-full flex-col items-center justify-center gap-3">
            <PageLoading
              icon={Lock}
              text="No tienes acceso a este proyecto, o ya no existe."
              className="h-auto flex-none"
            />
            <Button asChild>
              <Link href="/projects">Ir a mis proyectos</Link>
            </Button>
          </div>
        </PageMain>
      </PageShell>
    ) : (
      children
    );

  return (
    <SidebarProvider>
      {inSettings ? <SettingsSidebar /> : <ProjectSidebar />}
      <SidebarInset>{content}</SidebarInset>
    </SidebarProvider>
  );
};

export default ProjectLayout;
