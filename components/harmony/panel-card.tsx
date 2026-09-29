"use client";

import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { useId, type ReactNode } from "react";
import { clickableProps } from "@/lib/clickable-props";

/**
 * La tarjeta de un panel: cabecera con icono, título, descripción y acciones,
 * y debajo su contenido.
 *
 * Una sola forma para todas las tarjetas de un panel, la de `03 §1.3`:
 * `rounded-lg border bg-card`, y nada más. Escrita a mano en cada panel, cada
 * copia acaba con su propio `gap` y su propia capitalización, y dos paneles
 * que se parecen dejan de ser iguales.
 */
export const PanelCard = ({
  icon: Icon,
  title,
  description,
  actions,
  className,
  contentClassName,
  onClick,
  children,
}: {
  icon: LucideIcon;
  title: string;
  /** Lo que hay debajo del título. Puede llevar más de un texto. */
  description?: ReactNode;
  /** Lo propio de la tarjeta: un filtro, unas pestañas, un buscador. */
  actions?: ReactNode;
  /** El sitio en la retícula (`col-span-*`). */
  className?: string;
  contentClassName?: string;
  /** Si la tarjeta entera lleva a algún sitio. */
  onClick?: () => void;
  children: ReactNode;
}) => {
  // El título nombra la tarjeta siempre, lleve o no a algún sitio: una
  // `<section>` sin nombre no es una región para quien navega con lector de
  // pantalla, ni se puede señalar en una prueba.
  const tituloId = useId();

  return (
    <section
      className={cn(
        "flex h-full min-h-0 flex-col overflow-hidden rounded-lg border bg-card",
        onClick && "cursor-pointer transition-colors hover:bg-accent/30",
        className,
      )}
      {...(onClick ? clickableProps(onClick) : {})}
      aria-labelledby={tituloId}
    >
      {/* La cabecera envuelve: un botón de filtros se queda en la línea del
        título, y unas pestañas con buscador pasan a la siguiente sólo cuando
        no caben. */}
      <header className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex min-w-0 flex-1 basis-56 items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-h-indigo/10 bg-h-indigo/10 text-h-indigo">
            <Icon className="size-4" />
          </div>
          <div className="min-w-0">
            <h2
              id={tituloId}
              className="truncate text-sm font-medium tracking-tight"
            >
              {title}
            </h2>
            {description ? (
              <p className="truncate text-xs text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
        </div>
        {actions ? (
          <div className="flex min-w-0 flex-wrap items-center gap-2 sm:justify-end">
            {actions}
          </div>
        ) : null}
      </header>
      <Separator className="opacity-40" />
      <div className={cn("flex min-h-0 flex-1 flex-col", contentClassName)}>
        {children}
      </div>
    </section>
  );
};
