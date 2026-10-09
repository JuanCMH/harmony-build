"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import {
  type NumberFormat,
  formatNumber,
  formatWith,
} from "../lib/result-catalog";

interface ResultBarsProps {
  rows: readonly { key: string; label: string; value: number }[];
  /** Lo que no cupo en las filas, sumado. */
  others?: number;
  /** «respuestas», «hallazgos»: lo que cuenta cada barra. */
  unit: string;
  /** Si las barras son partes de un todo: la ayuda dice además el porcentaje. */
  share?: boolean;
  /** Cómo se escribe cada valor: su unidad y sus decimales. */
  format?: NumberFormat;
}

/**
 * Barras horizontales, de mayor a menor: cómo se reparte algo, o qué falla
 * más. La primera lleva el color; las demás acompañan en gris, que es lo que
 * deja ver cuál manda. El valor va escrito: la barra no es la única que lo
 * dice. Un rótulo largo se corta a dos líneas y se lee entero al pasar por
 * la fila.
 */
export const ResultBars = ({
  rows,
  others = 0,
  unit,
  share = false,
  format,
}: ResultBarsProps) => {
  const max = Math.max(1, ...rows.map((row) => row.value));
  const total = rows.reduce((sum, row) => sum + row.value, 0) + others;
  return (
    <TooltipProvider delayDuration={100}>
      <ul className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)_auto] gap-x-3 gap-y-1">
        {rows.map((row, index) => (
          <Tooltip key={row.key}>
            <TooltipTrigger asChild>
              <li className="col-span-3 -mx-2 grid grid-cols-subgrid items-center rounded-md px-2 py-1.5 text-ui transition-colors hover:bg-accent/30">
                <span className="line-clamp-2 min-w-0 break-words text-muted-foreground">
                  {row.label}
                </span>
                <span
                  aria-hidden
                  className="h-2.5 overflow-hidden rounded-full bg-muted"
                >
                  <span
                    className={cn(
                      "block h-full min-w-1 rounded-full",
                      index === 0 ? "bg-h-indigo" : "bg-muted-foreground/30",
                    )}
                    style={{ width: `${(row.value / max) * 100}%` }}
                  />
                </span>
                <span className="text-right font-medium tabular-nums">
                  {formatWith(row.value, format)}
                  <span className="sr-only"> {unit}</span>
                </span>
              </li>
            </TooltipTrigger>
            <TooltipContent side="top" align="start" className="max-w-72">
              <p className="font-medium">{row.label}</p>
              <p className="opacity-80">
                {formatWith(row.value, format)} {unit}
                {share && total > 0
                  ? ` · ${formatNumber((row.value / total) * 100)} % del total`
                  : ""}
              </p>
            </TooltipContent>
          </Tooltip>
        ))}
        {others > 0 ? (
          <li className="col-span-3 flex justify-between gap-3 border-t border-border/60 pt-2 text-ui text-muted-foreground">
            <span>Otros</span>
            <span className="tabular-nums">{formatWith(others, format)}</span>
          </li>
        ) : null}
      </ul>
    </TooltipProvider>
  );
};
