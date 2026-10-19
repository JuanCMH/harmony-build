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
// El menú es el único sitio del hub que mira hacia un paquete de feature, y
// sólo toma de él lo que no puede inventar: el glifo de la entidad y su
// dirección. Ni componentes ni datos (`02 §4.3`).
import { ENTITY_ICONS } from "@/packages/forms/lib/field-catalog";
import { formRoutes } from "@/packages/forms/lib/routes";
import type { PermissionValue } from "@/packages/roles/lib/permissions";
import { usePermissions } from "@/packages/roles/store/use-permissions";
import { History, House, Settings } from "lucide-react";
import { useMemo, type ComponentProps } from "react";
import { useProjectId } from "../store/use-project-id";
import { ProjectSwitcher } from "./project-switcher";

/**
 * Basta una de estas llaves para que «Formatos» tenga algo que enseñar: quien
 * los construye, quien los diligencia, quien consulta sus respuestas y quien
 * mantiene los listados. Un miembro sin rol no ve la entrada.
 */
const FORMS_PERMISSIONS: PermissionValue[] = [
  "createForms",
  "editForms",
  "deleteForms",
  "fillForms",
  "viewResponses",
  "editCatalogs",
];

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
  const canSeeForms = can(FORMS_PERMISSIONS);
  const canSeeTrackings = can(["viewResponses", "fillForms"]);

  const entries: SidebarMenuEntry[] = useMemo(() => {
    const base = `/projects/${projectId}`;
    return [
      {
        title: "Inicio",
        icon: House,
        group: "operacion",
        href: base,
      },
      ...(canSeeForms
        ? [
            {
              title: "Formatos",
              icon: ENTITY_ICONS.form,
              hint: "Los formatos y los listados del proyecto",
              group: "operacion",
              href: formRoutes.list(projectId),
            } satisfies SidebarMenuEntry,
          ]
        : []),
      ...(canSeeTrackings
        ? [
            {
              title: "Seguimientos",
              icon: ENTITY_ICONS.tracking,
              hint: "Lo que está abierto y hay que resolver",
              group: "operacion",
              href: formRoutes.trackings(projectId),
            } satisfies SidebarMenuEntry,
          ]
        : []),
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
  }, [projectId, canViewLogs, canSeeForms, canSeeTrackings]);

  return (
    <Sidebar variant="inset" collapsible="icon" {...props}>
      <SidebarHeader>
        <ProjectSwitcher />
      </SidebarHeader>
      <SidebarContent>
        {/* Mientras se resuelven los permisos no se sabe si «Formatos» y
            «Registros» van: pintar el menú sin ellas y añadirlas después
            empuja a «Ajustes». */}
        {isLoading ? (
          <>
            {/* Dos filas en operación: casi todo miembro tiene alguna llave
                de formatos, y el esqueleto promete lo que va a llegar. */}
            <SidebarMenuGroupsLoading groups={["operacion"]} rows={2} />
            <SidebarMenuGroupsLoading groups={["configuracion"]} rows={1} />
          </>
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
