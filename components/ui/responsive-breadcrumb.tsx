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
    <Breadcrumb className="min-w-0 gap-0">
      {/* Desktop: full breadcrumb */}
      <BreadcrumbList className="hidden min-w-0 flex-nowrap md:flex">
        {items.map((item, index) => (
          <Fragment key={index}>
            {index > 0 && <BreadcrumbSeparator className="shrink-0" />}
            <BreadcrumbItem className="min-w-0">
              {item.href ? (
                <BreadcrumbLink
                  href={item.href}
                  className="truncate max-w-[20vw]"
                >
                  {item.label}
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage className="truncate max-w-[20vw]">
                  {item.label}
                </BreadcrumbPage>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>

      {/* Mobile: ellipsis + last item */}
      <BreadcrumbList className="flex min-w-0 flex-nowrap md:hidden">
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
            <BreadcrumbLink
              href={lastItem.href}
              className="truncate max-w-[40vw]"
            >
              {lastItem.label}
            </BreadcrumbLink>
          ) : (
            <BreadcrumbPage className="truncate max-w-[40vw]">
              {lastItem.label}
            </BreadcrumbPage>
          )}
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}
