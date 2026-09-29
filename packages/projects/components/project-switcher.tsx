"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown, LogIn, Plus } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { useGetProject, useGetProjects } from "../api";
import { useCreateProjectModal } from "../store/use-create-project-modal";
import { useJoinProjectModal } from "../store/use-join-project-modal";
import { useProjectId } from "../store/use-project-id";
import type { ProjectListItem } from "../types";
import { ProjectAvatar } from "./project-avatar";
import { ProjectColors } from "./project-colors";

const ProjectOption = ({
  project,
  isCurrent,
}: {
  project: ProjectListItem;
  isCurrent: boolean;
}) => (
  // Lo que navega es un enlace: se abre en otra pestaña y se precarga.
  <DropdownMenuItem asChild className="gap-2 p-2">
    <Link href={`/projects/${project._id}`}>
      <ProjectAvatar
        name={project.name}
        logoImage={project.logoImage}
        className={cn("size-6", !project.active && "opacity-60")}
        fallbackClassName="text-xs"
      />
      <span
        className={cn(
          "min-w-0 flex-1 truncate",
          isCurrent && "font-medium",
          !project.active && "text-muted-foreground",
        )}
      >
        {project.name}
      </span>
      {isCurrent ? (
        <>
          <Check className="size-4 shrink-0" aria-hidden />
          <span className="sr-only">Proyecto actual</span>
        </>
      ) : null}
    </Link>
  </DropdownMenuItem>
);

/** El conmutador de proyecto: en cuál se está, a cuáles se puede ir y las dos
 *  formas de sumar uno más. */
export const ProjectSwitcher = () => {
  const projectId = useProjectId();
  const { isMobile } = useSidebar();

  const { data: project } = useGetProject({ id: projectId });
  const { data: projects } = useGetProjects();

  const [, setCreateOpen] = useCreateProjectModal();
  const [, setJoinOpen] = useJoinProjectModal();

  // Los archivados van aparte y atenuados: se conservan y se pueden abrir,
  // pero no compiten con las obras en curso.
  const { active, archived } = useMemo(
    () => ({
      active: projects?.filter((item) => item.active) ?? [],
      archived: projects?.filter((item) => !item.active) ?? [],
    }),
    [projects],
  );

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <ProjectAvatar
                name={project?.name}
                logoImage={project?.logoImage}
                className="size-8"
              />
              {/* Mientras no hay nombre, un esqueleto de su tamaño. Dejar el
                  hueco vacío hacía leer el rótulo de la segunda línea como si
                  fuera el nombre. */}
              <div className="grid flex-1 text-left text-sm leading-tight">
                {project ? (
                  <span className="truncate font-semibold">{project.name}</span>
                ) : (
                  <Skeleton className="my-0.5 h-3.5 w-32" />
                )}
                <span className="truncate text-xs text-muted-foreground">
                  {project && !project.active
                    ? "Proyecto archivado"
                    : (project?.code ?? "Proyecto actual")}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
          >
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
              Proyectos
            </DropdownMenuLabel>
            <div className="max-h-60 overflow-x-hidden overflow-y-auto">
              {active.map((item) => (
                <ProjectOption
                  key={item._id}
                  project={item}
                  isCurrent={item._id === projectId}
                />
              ))}
              {projects && active.length === 0 ? (
                <p className="px-2 py-1.5 text-xs text-muted-foreground">
                  No tienes proyectos activos.
                </p>
              ) : null}
              {archived.length > 0 ? (
                <>
                  <DropdownMenuLabel className="mt-1 text-xs font-normal text-muted-foreground">
                    Archivados
                  </DropdownMenuLabel>
                  {archived.map((item) => (
                    <ProjectOption
                      key={item._id}
                      project={item}
                      isCurrent={item._id === projectId}
                    />
                  ))}
                </>
              ) : null}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="gap-2 p-2"
              onSelect={() => setCreateOpen(true)}
            >
              <Plus className="size-4" />
              Crear proyecto
            </DropdownMenuItem>
            <DropdownMenuItem
              className="gap-2 p-2"
              onSelect={() => setJoinOpen(true)}
            >
              <LogIn className="size-4" />
              Unirse con código
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {project ? (
          <ProjectColors
            primaryColor={project.primaryColor}
            secondaryColor={project.secondaryColor}
            className="mt-1 h-1 w-full group-data-[collapsible=icon]:hidden"
          />
        ) : null}
      </SidebarMenuItem>
    </SidebarMenu>
  );
};
