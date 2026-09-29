"use client";

import {
  SidebarMenuGroups,
  SidebarMenuGroupsLoading,
  type SidebarMenuEntry,
} from "@/components/harmony/sidebar-menu-groups";
import { SidebarModeToggle } from "@/components/harmony/sidebar-mode-toggle";
import { SidebarUser } from "@/components/harmony/sidebar-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { usePermissions } from "@/packages/roles/store/use-permissions";
import { History, House, Settings } from "lucide-react";
import { useMemo, type ComponentProps } from "react";
import { useProjectId } from "../store/use-project-id";
import { ProjectSwitcher } from "./project-switcher";

/**
 * El menú del proyecto.
 *
 * Una entrada existe cuando existe su pantalla: no se dejan enlaces a módulos
 * que todavía no están construidos.
 */
export const ProjectSidebar = ({
  ...props
}: ComponentProps<typeof Sidebar>) => {
  const projectId = useProjectId();
  const { can, isLoading } = usePermissions();
  const canViewLogs = can(["viewLogs"]);

  const entries: SidebarMenuEntry[] = useMemo(() => {
    const base = `/projects/${projectId}`;
    return [
      {
        title: "Inicio",
        icon: House,
        group: "operacion",
        href: base,
      },
      ...(canViewLogs
        ? [
            {
              title: "Registros",
              icon: History,
              hint: "Auditoría de lo que se ha hecho en el proyecto",
              group: "consulta",
              href: `${base}/registros`,
            } satisfies SidebarMenuEntry,
          ]
        : []),
      {
        title: "Ajustes",
        icon: Settings,
        hint: "El proyecto, su equipo y sus roles",
        group: "configuracion",
        href: `${base}/ajustes`,
      },
    ];
  }, [projectId, canViewLogs]);

  return (
    <Sidebar variant="inset" collapsible="icon" {...props}>
      <SidebarHeader>
        <ProjectSwitcher />
      </SidebarHeader>
      <SidebarContent>
        {/* Mientras se resuelven los permisos no se sabe si «Registros» va:
            pintar el menú sin ella y añadirla después empuja a «Ajustes». */}
        {isLoading ? (
          <SidebarMenuGroupsLoading
            groups={["operacion", "configuracion"]}
            rows={1}
          />
        ) : (
          <SidebarMenuGroups entries={entries} />
        )}
      </SidebarContent>
      <SidebarFooter className="border-t">
        <SidebarModeToggle />
        <SidebarUser />
      </SidebarFooter>
    </Sidebar>
  );
};
