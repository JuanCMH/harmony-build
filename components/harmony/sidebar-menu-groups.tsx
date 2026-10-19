"use client";

import { Hint } from "@/components/harmony/hint";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { ChevronDown, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";

/**
 * La taxonomía del menú, la misma en todo sidebar que lo use.
 *
 * El contexto —el conmutador de proyecto— va en la cabecera del sidebar, y lo
 * que no es dominio —tema, usuario— va en el pie.
 */
export type SidebarMenuGroup = "operacion" | "consulta" | "configuracion";

export interface SidebarMenuEntry {
  title: string;
  icon?: LucideIcon;
  group: SidebarMenuGroup;
  /** Destino, para lo que es navegación de verdad. Excluyente con `onClick`. */
  href?: string;
  onClick?: () => void;
  hint?: string;
  className?: string;
  disabled?: boolean;
  dropdown?: {
    items: {
      title: string;
      /** Igual que en la entrada: lo que navega es un enlace. */
      href?: string;
      onClick?: () => void;
      separator?: boolean;
    }[];
  };
}

const GROUP_LABELS: Record<SidebarMenuGroup, string> = {
  operacion: "Operación",
  consulta: "Consulta",
  configuracion: "Configuración",
};

/**
 * Los grupos que se pueden plegar.
 *
 * Ninguno arranca plegado: un grupo plegado por defecto esconde sus entradas
 * de quien no sabe que están ahí, y eso es peor que un poco de scroll. Se deja
 * el mecanismo, que plegar sigue siendo útil para quien quiera.
 */
const COLLAPSIBLE_GROUPS: ReadonlySet<SidebarMenuGroup> = new Set([
  "configuracion",
]);

const MenuEntryButton = ({
  entry,
  isActive,
}: {
  entry: SidebarMenuEntry;
  isActive: boolean;
}) => {
  // En el teléfono el menú es una hoja encima de la pantalla: al elegir a
  // dónde ir, se cierra. Abierta, tapaba la pantalla a la que se acababa de
  // llegar.
  const { setOpenMobile } = useSidebar();
  const content = (
    <>
      {entry.icon && <entry.icon className="size-4 text-muted-foreground" />}
      <span>{entry.title}</span>
      {entry.disabled && (
        <Badge variant="outline" className="ml-auto h-4 px-1.5 py-0 text-2xs">
          Próximamente
        </Badge>
      )}
    </>
  );

  // `03 §2.2`: la navegación no compite con el contenido. Gris en reposo, a
  // plena luz sólo la abierta. Con veinte entradas a la vista, el color es lo
  // que hace legible el menú; el tamaño no.
  const className = cn(
    "text-ui font-normal text-muted-foreground transition-colors",
    "data-[active=true]:font-medium data-[active=true]:text-foreground",
    entry.disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
  );

  // Lo que navega es un enlace: se abre en otra pestaña, se copia y el
  // navegador lo precarga. Antes todo era un botón con `router.push`.
  const button =
    entry.href && !entry.disabled ? (
      <SidebarMenuButton
        asChild
        tooltip={entry.title}
        isActive={isActive}
        className={className}
      >
        <Link href={entry.href} onClick={() => setOpenMobile(false)}>
          {content}
        </Link>
      </SidebarMenuButton>
    ) : (
      <SidebarMenuButton
        tooltip={entry.title}
        isActive={isActive}
        className={className}
        onClick={entry.disabled ? undefined : entry.onClick}
      >
        {content}
      </SidebarMenuButton>
    );

  if (entry.dropdown) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>{button}</DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="start">
          {entry.dropdown.items.map((item, index) => (
            <div key={item.title}>
              {item.separator && index > 0 && <DropdownMenuSeparator />}
              <DropdownMenuItem
                className="cursor-pointer"
                asChild={!!item.href}
                onClick={item.onClick}
              >
                {item.href ? (
                  <Link href={item.href}>{item.title}</Link>
                ) : (
                  item.title
                )}
              </DropdownMenuItem>
            </div>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  if (entry.hint) {
    return (
      <Hint label={entry.hint} side="right" align="center">
        {button}
      </Hint>
    );
  }

  return button;
};

/**
 * El menú lateral mientras se resuelven los permisos.
 *
 * Esconder el menú entero con un `!isLoading &&` deja la columna **vacía**
 * —sólo el pie—, y los grupos aparecen de golpe al llegar la respuesta,
 * empujando lo que hubiera debajo.
 * Los rótulos de grupo son los de verdad porque no dependen del permiso: lo que
 * se resuelve es qué entradas cuelgan de cada uno.
 */
export function SidebarMenuGroupsLoading({
  groups = ["operacion", "consulta"],
  rows = 3,
}: {
  groups?: SidebarMenuGroup[];
  rows?: number;
}) {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Cargando el menú…</span>
      {groups.map((group) => (
        <SidebarGroup key={group}>
          <SidebarGroupLabel className="text-xs font-normal text-muted-foreground/70">
            {GROUP_LABELS[group]}
          </SidebarGroupLabel>
          <SidebarMenu>
            {Array.from({ length: rows }, (_, indice) => (
              <SidebarMenuItem key={indice}>
                {/* La altura de `SidebarMenuButton`, para que la lista no salte
                    al sustituirse. */}
                <div className="flex h-8 items-center gap-2 px-2">
                  <Skeleton className="size-4 shrink-0 rounded-sm" />
                  <Skeleton
                    className={cn(
                      "h-3.5",
                      indice % 3 === 0
                        ? "w-28"
                        : indice % 3 === 1
                          ? "w-20"
                          : "w-24",
                    )}
                  />
                </div>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      ))}
    </div>
  );
}

/** Los grupos del menú lateral. */
export function SidebarMenuGroups({
  entries,
  children,
}: {
  entries: SidebarMenuEntry[];
  /** Grupos propios del sidebar, que van antes que los de la taxonomía. */
  children?: React.ReactNode;
}) {
  const pathname = usePathname();

  const grouped = useMemo(() => {
    const groups: Record<SidebarMenuGroup, SidebarMenuEntry[]> = {
      operacion: [],
      consulta: [],
      configuracion: [],
    };
    for (const entry of entries) groups[entry.group].push(entry);
    return groups;
  }, [entries]);

  const activa = (entry: SidebarMenuEntry) =>
    !!entry.href && pathname === entry.href.split("?")[0];

  return (
    <>
      {children}
      {(Object.keys(GROUP_LABELS) as SidebarMenuGroup[]).map((group) => {
        const groupEntries = grouped[group];
        if (groupEntries.length === 0) return null;

        const lista = (
          <SidebarMenu>
            {groupEntries.map((entry) => (
              <SidebarMenuItem key={entry.title} className={entry.className}>
                <MenuEntryButton entry={entry} isActive={activa(entry)} />
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        );

        if (!COLLAPSIBLE_GROUPS.has(group)) {
          return (
            <SidebarGroup key={group}>
              <SidebarGroupLabel className="text-xs font-normal text-muted-foreground/70">
                {GROUP_LABELS[group]}
              </SidebarGroupLabel>
              {lista}
            </SidebarGroup>
          );
        }

        return (
          <Collapsible key={group} defaultOpen className="group/collapsible">
            <SidebarGroup>
              <SidebarGroupLabel
                asChild
                className="text-xs font-normal text-muted-foreground/70"
              >
                <CollapsibleTrigger className="w-full cursor-pointer">
                  {GROUP_LABELS[group]}
                  <ChevronDown className="ml-auto size-3.5 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                </CollapsibleTrigger>
              </SidebarGroupLabel>
              <CollapsibleContent>{lista}</CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
        );
      })}
    </>
  );
}
