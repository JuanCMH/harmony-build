"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ResultInterval, TrendPoint } from "@/convex/lib/result_types";

import {
  type NumberFormat,
  bucketLabel,
  bucketTitle,
  formatWith,
} from "../lib/result-catalog";

interface ResultSparkBarsProps {
  points: readonly TrendPoint[];
  interval: ResultInterval;
  /** Qué mide cada columna: «Respuestas», «Suma». */
  label: string;
  format?: NumberFormat;
}

/**
 * Las columnas que acompañan a un indicador: la misma cifra, repartida en el
 * periodo. Sin ejes; sólo el primer día y el último, y la cifra exacta al
 * pasar por cada columna. Llena el alto que le dejen: junto a una gráfica
 * alta, la tarjeta no se queda con la cifra colgada arriba.
 *
 * Columnas y no línea: un día sin respuestas es un hueco, no una caída.
 */
export const ResultSparkBars = ({
  points,
  interval,
  label,
  format,
}: ResultSparkBarsProps) => {
  const max = Math.max(1, ...points.map((point) => point.value ?? 0));
  return (
    <TooltipProvider delayDuration={50}>
      <div className="flex min-h-20 flex-1 flex-col gap-1">
        <div className="flex min-h-0 flex-1 items-end gap-px border-b border-border/60 sm:gap-0.5">
          {points.map((point) => (
            <Tooltip key={point.key}>
              <TooltipTrigger asChild>
                <span className="group flex h-full min-w-0 flex-1 items-end">
                  <span
                    className="block w-full rounded-t-sm bg-h-indigo/45 transition-colors group-hover:bg-h-indigo"
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
                </p>
                <p className="opacity-80">
                  {label}: {formatWith(point.value, format)}
                </p>
              </TooltipContent>
            </Tooltip>
          ))}
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
