"use client";

import {
  SettingsCard,
  SettingsField,
  SettingsFieldList,
} from "@/components/harmony/settings-area";
import { SettingsSection } from "@/components/harmony/settings-section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { handleConvexErrorCallback } from "@/lib/convex-error-handler";
import { customColors } from "@/lib/custom-colors";
import { fullDate } from "@/lib/date-formats";
import { usePermissions } from "@/packages/roles/store/use-permissions";
import { Archive, ArchiveRestore, Pencil } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useGetProject, useUpdateProject } from "../api";
import { useProjectId } from "../store/use-project-id";
import { EditProjectModal } from "./modals/edit-project-modal";
import { ProjectAvatar } from "./project-avatar";
import { ProjectColors } from "./project-colors";
import { ProjectDangerZone } from "./project-danger-zone";
import { ProjectMembership } from "./project-membership";

const TITLE = "General";
const DESCRIPTION =
  "Los datos con los que el proyecto se identifica en Harmony Build.";

/**
 * General: qué proyecto es este.
 *
 * Es el área a la que aterriza quien abre ajustes: los datos como lista y, al
 * pie, las decisiones que no son datos. Editar es un modal —una tarea corta y
 * finita (`03 §3.0`)—; archivar se hace aquí mismo, junto al estado que cambia.
 */
export const ProjectIdentity = () => {
  const projectId = useProjectId();
  const [editOpen, setEditOpen] = useState(false);

  const { data: project, isLoading } = useGetProject({ id: projectId });
  const { can, isOwner, member } = usePermissions();
  const { mutate: updateProject, isPending: isUpdating } = useUpdateProject();

  const canEdit = can(["editProject"]);

  if (isLoading) {
    return (
      <SettingsSection title={TITLE} description={DESCRIPTION}>
        <SettingsCard>
          <div className="flex items-center gap-4 p-4">
            <Skeleton className="size-16 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <div className="space-y-3 p-4">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-2/3" />
          </div>
        </SettingsCard>
      </SettingsSection>
    );
  }

  if (!project) return null;

  const toggleActive = () => {
    updateProject(
      {
        id: project._id,
        name: project.name,
        code: project.code,
        active: !project.active,
        primaryColor: project.primaryColor,
        secondaryColor: project.secondaryColor,
        logo: project.logo,
      },
      {
        onSuccess: () =>
          toast.success(
            `Proyecto ${project.active ? "archivado" : "reactivado"} correctamente`,
          ),
        onError: (error) => handleConvexErrorCallback(error),
      },
    );
  };

  return (
    <>
      <SettingsSection
        title={TITLE}
        description={DESCRIPTION}
        actions={
          canEdit ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditOpen(true)}
            >
              <Pencil className="size-4" />
              Editar
            </Button>
          ) : null
        }
      >
        <SettingsCard>
          <div className="flex items-center gap-4 p-4">
            <ProjectAvatar
              name={project.name}
              logoImage={project.logoImage}
              className="size-16 shrink-0 rounded-lg"
              fallbackClassName="rounded-lg text-lg"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{project.name}</p>
              <p className="mt-1 text-ui text-muted-foreground">
                Creado el {fullDate(new Date(project._creationTime))}
              </p>
            </div>
          </div>

          <SettingsFieldList>
            <SettingsField label="Nombre">{project.name}</SettingsField>
            <SettingsField label="Código">
              {project.code ?? (
                <span className="text-muted-foreground">Sin código</span>
              )}
            </SettingsField>
            <SettingsField label="Colores">
              <span className="flex items-center gap-2">
                <ProjectColors
                  primaryColor={project.primaryColor}
                  secondaryColor={project.secondaryColor}
                  className="w-12 shrink-0"
                />
                <span className="text-muted-foreground">
                  {customColors[project.primaryColor]} y{" "}
                  {customColors[project.secondaryColor].toLowerCase()}
                </span>
              </span>
            </SettingsField>
            <SettingsField
              label="Estado"
              action={
                canEdit ? (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isUpdating}
                    onClick={toggleActive}
                  >
                    {project.active ? (
                      <Archive className="size-4" />
                    ) : (
                      <ArchiveRestore className="size-4" />
                    )}
                    {project.active ? "Archivar" : "Reactivar"}
                  </Button>
                ) : null
              }
            >
              <div className="space-y-1">
                <Badge
                  variant="secondary"
                  className={
                    project.active
                      ? "bg-green-500/10 text-green-600 dark:text-green-400"
                      : undefined
                  }
                >
                  {project.active ? "Activo" : "Archivado"}
                </Badge>
                {/* El estado cambia dónde aparece el proyecto, así que se
                    explica donde se cambia y no en un tooltip. */}
                <p className="text-ui text-muted-foreground">
                  {project.active
                    ? "Se abre por defecto y aparece entre los proyectos en curso."
                    : "Se conserva y se puede consultar, pero deja de abrirse por defecto."}
                </p>
              </div>
            </SettingsField>
          </SettingsFieldList>
        </SettingsCard>
      </SettingsSection>

      {isOwner ? (
        <ProjectDangerZone project={project} />
      ) : member ? (
        <ProjectMembership project={project} memberId={member._id} />
      ) : null}

      {editOpen ? (
        <EditProjectModal
          project={project}
          open={editOpen}
          onOpenChange={setEditOpen}
        />
      ) : null}
    </>
  );
};
