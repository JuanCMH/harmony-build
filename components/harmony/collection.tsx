"use client";

import * as React from "react";
import {
  SettingsCard,
  useEstaEnAreaDeAjustes,
} from "@/components/harmony/settings-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

/**
 * Una colección administrable: sus filas, su estado vacío y su esqueleto.
 *
 * Vivían dentro de `harmony-sheet.tsx` llamándose `HarmonySheetItem`,
 * `…Empty` y `…Loading`, pero no tienen nada de sheet. Al sacar los ocho
 * catálogos a una pantalla (S3) la misma lista pasó a necesitarse dentro de una
 * página, y un nombre que miente sobre dónde puede usarse algo termina en una
 * segunda copia.
 */

/**
 * La caja de una fila de colección y la del contenedor que las apila.
 *
 * Existen como clase y no sólo dentro de `CollectionItem` porque dos listas
 * —integrantes y super administradores— llevan un avatar en lugar de un icono y
 * dibujan su propia fila. Sin esto, dentro de un área de ajustes se quedaban con
 * borde de tarjeta mientras las demás pasaban al hairline: la misma pantalla con
 * dos formas de lista.
 */
export function useCollectionRowClassName({
  interactive = true,
}: { interactive?: boolean } = {}) {
  const enArea = useEstaEnAreaDeAjustes();

  return cn(
    "w-full text-left transition-colors",
    interactive &&
      "group cursor-pointer hover:bg-accent/30 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
    enArea ? "" : "rounded-lg border bg-card",
    interactive && !enArea && "focus-visible:border-ring",
  );
}

export function useCollectionListClassName() {
  const enArea = useEstaEnAreaDeAjustes();
  return cn("flex flex-col", enArea ? "divide-y divide-border/40" : "gap-2");
}

interface CollectionItemProps {
  icon: LucideIcon;
  iconClassName?: string;
  title: string;
  description?: string;
  trailing?: React.ReactNode;
  onSelect: () => void;
  children?: React.ReactNode;
}

/**
 * Fila de una colección administrable. Es un `button` real: se alcanza con el
 * tabulador y responde a Enter y Espacio, a diferencia de una tarjeta con
 * `onClick`.
 */
function CollectionItem({
  icon: Icon,
  iconClassName,
  title,
  description,
  trailing,
  onSelect,
  children,
}: CollectionItemProps) {
  // Dentro de un área de ajustes las filas van una debajo de otra separadas por
  // un hairline: veinte cargos eran veinte cajas con borde y fondo dentro de una
  // columna de 768px, y el borde no dice nada que la separación no diga mejor.
  // Fuera —una colección suelta en medio de una vista— la caja es lo que la
  // delimita.
  const enArea = useEstaEnAreaDeAjustes();

  // El icono se queda cuando dice algo: el color de una novedad, el de una
  // etiqueta de turno. El genérico repetido veinte veces en una lista de cargos
  // no distingue una fila de la siguiente, y dentro de un área el título de la
  // pantalla ya dijo de qué catálogo son todas.
  const conIcono = !enArea || !!iconClassName;
  const filaClassName = useCollectionRowClassName();

  return (
    <button
      type="button"
      onClick={onSelect}
      className={filaClassName}
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          {conIcono ? (
            <div
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-lg",
                iconClassName ?? "bg-h-indigo/10 text-h-indigo",
              )}
            >
              <Icon className="size-4" />
            </div>
          ) : null}
          <div className="min-w-0">
            <h3 className="truncate text-sm font-medium leading-tight">
              {title}
            </h3>
            {description && (
              <p className="mt-1 truncate text-xs leading-tight text-muted-foreground">
                {description}
              </p>
            )}
          </div>
        </div>
        {trailing && <div className="shrink-0">{trailing}</div>}
      </div>
      {children && <div className="px-3 pb-3">{children}</div>}
    </button>
  );
}

interface CollectionEmptyProps {
  icon: LucideIcon;
  title: string;
  hint?: string;
}

/**
 * El vacío de una colección.
 *
 * Sin caja de guiones: donde aparece —un área de ajustes, un sheet, un panel—
 * ya hay una superficie, y una caja punteada dentro de otra es un borde que no
 * delimita nada (`03 §1.3`). Lo que separa es el aire.
 */
function CollectionEmpty({ icon: Icon, title, hint }: CollectionEmptyProps) {
  const enArea = useEstaEnAreaDeAjustes();

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-8 text-center",
        enArea ? "py-16" : "py-10",
      )}
    >
      <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
        <Icon className="size-5" />
      </div>
      <p className="text-sm text-muted-foreground">{title}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

interface CollectionLoadingProps {
  rows?: number;
}

/**
 * El esqueleto de una colección, con **la forma que va a tener la lista**.
 *
 * Dibujaba siempre tarjetas con borde separadas por `gap-2`, y dentro de un
 * área de ajustes la lista cargada es lo contrario: una sola tarjeta con las
 * filas separadas por un hairline, sin borde ni fondo propios. Prometía tres
 * cajas y entregaba filas planas, en los ocho catálogos. Un esqueleto que no se
 * parece a lo que sustituye es el salto de retícula que `03 §2.4` viene a
 * evitar, sólo que en dos tiempos.
 *
 * El relleno es el de `CollectionItem` —`px-4 py-3`— por lo mismo.
 */
function CollectionLoading({ rows = 3 }: CollectionLoadingProps) {
  const enArea = useEstaEnAreaDeAjustes();

  // Dentro de un área la fila no lleva icono salvo que diga algo con su color,
  // que es la excepción; fuera, la caja siempre lo tiene.
  const fila = (index: number) => (
    <div key={index} className="flex items-center gap-2 px-4 py-3">
      {!enArea && <Skeleton className="size-8 shrink-0 rounded-lg" />}
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3.5 w-1/2" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  );

  const filas = Array.from({ length: rows }, (_, index) => index);

  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Cargando…</span>
      {enArea ? (
        <SettingsCard>{filas.map(fila)}</SettingsCard>
      ) : (
        <div className="flex flex-col gap-2">
          {filas.map((index) => (
            <div key={index} className="rounded-lg border bg-card">
              {fila(index)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export { CollectionItem, CollectionEmpty, CollectionLoading };
