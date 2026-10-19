"use client";

import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";
import { Fragment } from "react";

export interface BreadcrumbItemData {
  label: string;
  href?: string;
}

interface ResponsiveBreadcrumbProps {
  items: BreadcrumbItemData[];
}

export function ResponsiveBreadcrumb({ items }: ResponsiveBreadcrumbProps) {
  const router = useRouter();

  if (items.length === 0) return null;

  const lastItem = items[items.length - 1];
  const hiddenItems = items.slice(0, -1);

  return (
    // Colapsa por el espacio que le dejan el menú lateral y las acciones de la
    // cabecera, no por el ancho de la ventana: en una tableta con acciones
    // las migas completas quedaban en «Pis… › F… › Ins…».
    <Breadcrumb className="@container w-full min-w-0 gap-0">
      {/* Con sitio: todas las migas */}
      <BreadcrumbList className="hidden min-w-0 flex-nowrap @lg:flex">
        {items.map((item, index) => (
          <Fragment key={index}>
            {index > 0 && <BreadcrumbSeparator className="shrink-0" />}
            <BreadcrumbItem className="min-w-0">
              {item.href ? (
                <BreadcrumbLink href={item.href} className="truncate max-w-64">
                  {item.label}
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage className="truncate max-w-64">
                  {item.label}
                </BreadcrumbPage>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>

      {/* Sin él: puntos suspensivos y el último nivel */}
      <BreadcrumbList className="flex min-w-0 flex-nowrap @lg:hidden">
        {hiddenItems.length > 0 && (
          <>
            <BreadcrumbItem>
              <DropdownMenu>
                {/* Con caja: sin ella el único acceso a los niveles superiores
                    en móvil era un objetivo de 16×16px, el del icono. */}
                <DropdownMenuTrigger className="text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:ring-ring/50 -ml-1 inline-flex size-7 items-center justify-center rounded-md transition-colors focus-visible:ring-[3px] focus-visible:outline-none">
                  <BreadcrumbEllipsis className="size-4" />
                  <span className="sr-only">Navegación</span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {hiddenItems.map((item, index) => (
                    <DropdownMenuItem
                      key={index}
                      className="cursor-pointer"
                      onClick={() => item.href && router.push(item.href)}
                    >
                      {item.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
          </>
        )}
        <BreadcrumbItem className="min-w-0">
          {lastItem.href ? (
            <BreadcrumbLink href={lastItem.href} className="block truncate">
              {lastItem.label}
            </BreadcrumbLink>
          ) : (
            <BreadcrumbPage className="block truncate">
              {lastItem.label}
            </BreadcrumbPage>
          )}
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}
