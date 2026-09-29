"use client";

import { SidebarModeToggle } from "@/components/harmony/sidebar-mode-toggle";
import { SidebarUser } from "@/components/harmony/sidebar-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  useSidebar,
} from "@/components/ui/sidebar";
import { usePermissions } from "@/packages/roles/store/use-permissions";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps } from "react";
import { useGetProject } from "../api";
import { SETTINGS_AREAS } from "../lib/settings-areas";
import { useProjectId } from "../store/use-project-id";

/**
 * La entrada del menú: 13px y gris en reposo, a plena luz sólo la abierta.
 * El menú no compite con el contenido (`03 §2.2`).
 */
const ENTRY_CLASS =
  "text-ui font-normal text-muted-foreground data-[active=true]:font-medium data-[active=true]:text-foreground";

/**
 * El sidebar de ajustes: sustituye al del proyecto mientras se configura.
 *
 * Sustituir en vez de añadir es lo que evita la tercera columna de navegación
 * (`03 §2.2`). Lleva siempre la vuelta al proyecto en su cabecera.
 *
 * **Sin iconos por entrada, a propósito**: en una navegación de ajustes las
 * entradas son texto, y el rótulo del grupo ya dice de qué son.
 */
export const SettingsSidebar = ({
  ...props
}: ComponentProps<typeof Sidebar>) => {
  const projectId = useProjectId();
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();

  const { data: project } = useGetProject({ id: projectId });
  const { can, isLoading } = usePermissions();

  const base = `/projects/${projectId}`;
  const closeOnMobile = () => setOpenMobile(false);

  // Un área sin llave no se lista. Entrar por su dirección sigue pasando por
  // `ProjectSettingsPage`, que es quien responde de verdad.
  const areas = SETTINGS_AREAS.filter(
    (area) => !("permissions" in area) || can([...area.permissions]),
  );

  return (
    // `inset` es la variante del sidebar del proyecto: es la que hace que el
    // contenido sea una superficie con margen y esquinas. Sin `collapsible`
    // a iconos porque aquí las entradas son texto: colapsarlas dejaría una
    // columna de cuadros mudos.
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href={base} onClick={closeOnMobile}>
                <ArrowLeft className="size-4 text-muted-foreground" />
                <span className="truncate text-ui font-medium">
                  {project ? `Volver a ${project.name}` : "Volver al proyecto"}
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="pb-4">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-normal text-muted-foreground/70">
            Ajustes del proyecto
          </SidebarGroupLabel>
          <SidebarMenu>
            {isLoading
              ? // El `index` da a cada esqueleto un ancho distinto sin usar
                // azar, que rompía la hidratación.
                SETTINGS_AREAS.map((area, index) => (
                  <SidebarMenuItem key={area.key}>
                    <SidebarMenuSkeleton index={index} />
                  </SidebarMenuItem>
                ))
              : areas.map((area) => {
                  const href = `${base}/ajustes${area.segment}`;
                  return (
                    <SidebarMenuItem key={area.key}>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === href}
                        className={ENTRY_CLASS}
                      >
                        <Link href={href} onClick={closeOnMobile}>
                          <span className="truncate">{area.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t">
        <SidebarModeToggle />
        <SidebarUser />
      </SidebarFooter>
    </Sidebar>
  );
};
