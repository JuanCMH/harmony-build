"use client";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetProject } from "../api";
import { useProjectId } from "../store/use-project-id";
import { ProjectAvatar } from "./project-avatar";
import { ProjectColors } from "./project-colors";

/**
 * La identidad del proyecto, en la cabecera de su inicio: logo, nombre, código
 * y sus dos colores.
 *
 * No lleva `h1`: el de la pantalla lo emite `PageHeader` con la última miga
 * (`03 §2.2`).
 */
export const ProjectHeader = () => {
  const projectId = useProjectId();
  const { data: project, isLoading } = useGetProject({ id: projectId });

  if (isLoading) {
    return (
      <div className="flex items-center gap-4" aria-busy="true">
        <span className="sr-only">Cargando el proyecto…</span>
        <Skeleton className="size-14 shrink-0 rounded-lg" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
    );
  }

  if (!project) return null;

  return (
    <div className="flex items-center gap-4">
      <ProjectAvatar
        name={project.name}
        logoImage={project.logoImage}
        className="size-14 shrink-0 rounded-lg"
        fallbackClassName="rounded-lg text-lg"
      />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate font-space-grotesk text-xl font-semibold tracking-tight">
            {project.name}
          </p>
          {project.active ? null : <Badge variant="secondary">Archivado</Badge>}
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {project.code ?? "Sin código"}
        </p>
        <ProjectColors
          primaryColor={project.primaryColor}
          secondaryColor={project.secondaryColor}
          className="mt-2 w-16"
        />
      </div>
    </div>
  );
};
