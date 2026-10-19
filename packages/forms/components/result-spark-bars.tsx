"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ResultInterval, TrendPoint } from "@/convex/lib/result_types";
import { cn } from "@/lib/utils";

import {
  type NumberFormat,
  bucketLabel,
  bucketTitle,
  formatWith,
} from "../lib/result-catalog";
import { isCut } from "../lib/result-periods";

interface ResultSparkBarsProps {
  points: readonly TrendPoint[];
  interval: ResultInterval;
  /** Qué mide cada columna: «Respuestas», «Suma». */
  label: string;
  format?: NumberFormat;
  /** Los periodos que el rango corta: van punteados (`cutPeriods`). */
  cut: { first: boolean; last: boolean };
}

/**
 * Las columnas que acompañan a un indicador: la misma cifra, repartida en el
 * periodo. Sin ejes; sólo el primer día y el último, y la cifra exacta al
 * pasar por cada columna. Llena el alto que le dejen: junto a una gráfica
 * alta, la tarjeta no se queda con la cifra colgada arriba.
 *
 * Columnas y no línea: un día sin respuestas es un hueco, no una caída. Un
 * periodo que el rango corta va punteado: suma menos porque tiene menos días.
 */
export const ResultSparkBars = ({
  points,
  interval,
  label,
  format,
  cut,
}: ResultSparkBarsProps) => {
  const max = Math.max(1, ...points.map((point) => point.value ?? 0));
  return (
    <TooltipProvider delayDuration={50}>
      <div className="flex min-h-12 flex-1 flex-col gap-1">
        <div className="flex min-h-0 flex-1 items-end gap-px border-b border-border/60 sm:gap-0.5">
          {points.map((point, index) => {
            const partial = isCut(cut, index, points.length);
            return (
              <Tooltip key={point.key}>
                <TooltipTrigger asChild>
                  <span className="group flex h-full min-w-0 flex-1 items-end">
                    <span
                      className={cn(
                        "mx-auto block rounded-t-sm transition-colors",
                        // Pocas columnas no se pegan en un bloque.
                        points.length <= 12 ? "w-3/5" : "w-full",
                        partial
                          ? "border border-b-0 border-dashed border-h-indigo/60 bg-h-indigo/15"
                          : "bg-h-indigo/45 group-hover:bg-h-indigo",
                      )}
                      style={{
                        height:
                          point.value && point.value > 0
                            ? `max(2px, ${(point.value / max) * 100}%)`
                            : 0,
                      }}
                    />
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-medium">
                    {bucketTitle(interval, point.key)}
                    {partial ? " · periodo incompleto" : ""}
                  </p>
                  <p className="opacity-80">
                    {label}: {formatWith(point.value, format)}
                  </p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
        <p
          aria-hidden
          className="flex justify-between text-xs text-muted-foreground tabular-nums"
        >
          <span>{bucketLabel(interval, points[0].key)}</span>
          <span>{bucketLabel(interval, points[points.length - 1].key)}</span>
        </p>
      </div>
    </TooltipProvider>
  );
};
