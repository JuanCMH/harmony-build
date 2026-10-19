"use client";

import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { type ReactNode, useId } from "react";

/**
 * La tarjeta de un resultado: en el tablero del proyecto y en la página de
 * resultados de un formato (`03 §1.3`).
 *
 * Es de **alto fijo**: el alto lo pone la retícula —dos, tres o cuatro pisos—
 * y el contenido se adapta a él (`docs/plans/2026-10-14-tablero-a-la-medida-design.md`).
 * Por eso no es `PanelCard`, que crece con lo que lleva y reserva la cabecera
 * para buscadores y filtros: aquí la cabecera es sólo el nombre y, debajo, de
 * dónde sale, con el glifo de su tipo en pequeño. 16 px a los cuatro lados y
 * sin separador: el margen ya separa.
 */
export const WidgetCard = ({
  icon: Icon,
  title,
  caption,
  actions,
  className,
  bleed = false,
  children,
}: {
  /** El glifo del tipo de resultado (`03 §5.6`). */
  icon: LucideIcon;
  title: string;
  /** De dónde sale: el formato, o el tipo. */
  caption: string;
  /** Lo propio de la tarjeta, a la derecha del título. */
  actions?: ReactNode;
  /** El sitio en la retícula: columnas y pisos. */
  className?: string;
  /** El contenido va a sangre por los lados y por abajo: una tabla trae sus
   *  propios márgenes en las celdas. */
  bleed?: boolean;
  children: ReactNode;
}) => {
  // El título nombra la región: sin nombre, una `<section>` no es una región
  // para un lector de pantalla ni se puede señalar en una prueba.
  const titleId = useId();

  return (
    <section
      aria-labelledby={titleId}
      className={cn(
        "flex h-full min-h-0 min-w-0 flex-col gap-3 overflow-hidden rounded-lg border bg-card pt-4",
        !bleed && "px-4 pb-4",
        className,
      )}
    >
      <header className={cn("flex items-start gap-2", bleed && "px-4")}>
        <div className="min-w-0 flex-1">
          <h2
            id={titleId}
            // Dos líneas y, si no caben, entero al pasar por él.
            title={title}
            className="line-clamp-2 text-sm font-medium tracking-tight"
          >
            {title}
          </h2>
          <p className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
            <Icon aria-hidden className="size-3.5 shrink-0" />
            <span className="truncate">{caption}</span>
          </p>
        </div>
        {actions ? (
          <div className="-mt-1 -mr-1.5 flex shrink-0 items-center">
            {actions}
          </div>
        ) : null}
      </header>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </section>
  );
};
