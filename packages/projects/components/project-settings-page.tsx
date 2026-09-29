"use client";

import { PageLoading } from "@/components/harmony/page-loading";
import { SettingsArea } from "@/components/harmony/settings-area";
import { usePermissions } from "@/packages/roles/store/use-permissions";
import { Lock } from "lucide-react";
import type { ReactNode } from "react";
import { useGetProject } from "../api";
import { getSettingsArea, type SettingsAreaKey } from "../lib/settings-areas";
import { useProjectId } from "../store/use-project-id";

/**
 * El armazón de un área de ajustes del proyecto.
 *
 * Aporta lo suyo —las migas y la puerta del área—; el ancho, el ritmo y el
 * contexto los pone `SettingsArea`. La puerta usa la misma lista que el menú
 * de ajustes: quien llega por la dirección a un área que el menú no le
 * enseña, lee por qué no la ve en vez de una pantalla a medias.
 */
export const ProjectSettingsPage = ({
  area,
  children,
}: {
  area: SettingsAreaKey;
  children: ReactNode;
}) => {
  const projectId = useProjectId();
  const { data: project } = useGetProject({ id: projectId });
  const { can } = usePermissions();

  const { title, segment, permissions } = getSettingsArea(area);
  const base = `/projects/${projectId}`;
  const hasAccess = !permissions || can(permissions);

  return (
    <SettingsArea
      breadcrumb={
        project
          ? [
              { label: project.name, href: base },
              // General **es** la raíz de ajustes: su miga es la última.
              ...(segment === ""
                ? [{ label: "Ajustes" }]
                : [
                    { label: "Ajustes", href: `${base}/ajustes` },
                    { label: title },
                  ]),
            ]
          : []
      }
    >
      {hasAccess ? (
        children
      ) : (
        <PageLoading
          icon={Lock}
          text={`No tienes permiso para ver «${title}» en este proyecto. Pídeselo a quien lo administra.`}
        />
      )}
    </SettingsArea>
  );
};
