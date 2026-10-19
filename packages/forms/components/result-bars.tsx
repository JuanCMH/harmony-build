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
import { fitRows } from "../lib/fit-rows";
import { useMeasuredBox } from "../lib/use-fit-rows";

/** Los caracteres que caben en la columna del rótulo —dos quintos del
 *  ancho— con la letra de 13 px. Con un rótulo más largo, la barra va debajo
 *  de él (`docs/plans/2026-10-14-tablero-a-la-medida-design.md` §5). Antes de
 *  medir, los de media fila. */
const labelRoom = (width: number | null) =>
  width === null ? 28 : Math.floor((width * 0.4 - 12) / 7);
/** El alto de cada fila: en columnas, y con el rótulo encima. */
const ROW_HEIGHT = { columns: 32, stacked: 52 } as const;
const MORE_HEIGHT = 28;

interface ResultBarsProps {
  rows: readonly { key: string; label: string; value: number }[];
  /** Lo que no cupo en las filas, sumado. */
  others?: number;
  /** «respuestas», «hallazgos»: lo que cuenta cada barra. */
  unit: string;
  /** Si las barras son partes de un todo: la ayuda dice además el porcentaje,
   *  y lo que no cabe en la tarjeta se suma en «Otros». Si no, se cuenta. */
  share?: boolean;
  /** Cómo se escribe cada valor: su unidad y sus decimales. */
  format?: NumberFormat;
}

/**
 * Barras horizontales, de mayor a menor: cómo se reparte algo, o qué falla
 * más. La primera lleva el color; las demás acompañan en gris, que es lo que
 * deja ver cuál manda. El valor va escrito: la barra no es la única que lo
 * dice.
 *
 * Enseña las filas que caben en su tarjeta. Con rótulos que caben en su
 * columna —una prioridad, una persona en media fila— van en tres columnas;
 * con rótulos más largos —las preguntas de una lista de chequeo, un nombre
 * completo en un tercio— el rótulo va arriba, a todo el ancho, y la barra
 * debajo: en columnas se cortaba y sólo se leía pasando por encima, que en un
 * teléfono no existe.
 */
export const ResultBars = ({
  rows,
  others = 0,
  unit,
  share = false,
  format,
}: ResultBarsProps) => {
  const { ref, height, width } = useMeasuredBox();
  const room = labelRoom(width);
  const stacked = rows.some((row) => row.label.length > room);
  const rowHeight = stacked ? ROW_HEIGHT.stacked : ROW_HEIGHT.columns;
  const visible =
    height === null
      ? rows.length
      : fitRows({
          space: height,
          total: rows.length,
          rowHeight,
          moreHeight: MORE_HEIGHT,
          more: share && others > 0,
        });
  const hidden = rows.length - visible;
  const max = Math.max(1, ...rows.map((row) => row.value));
  const total = rows.reduce((sum, row) => sum + row.value, 0) + others;
  const rest =
    others + rows.slice(visible).reduce((sum, row) => sum + row.value, 0);

  return (
    <TooltipProvider delayDuration={100}>
      <div
        ref={ref}
        className="flex min-h-0 flex-1 basis-0 flex-col overflow-hidden"
      >
        <ul
          className={cn(
            "grid gap-x-3",
            stacked
              ? "grid-cols-[minmax(0,1fr)_auto]"
              : "grid-cols-[minmax(0,2fr)_minmax(0,3fr)_auto]",
          )}
        >
          {rows.slice(0, visible).map((row, index) => {
            const bar = (
              <span
                aria-hidden
                className={cn(
                  "h-2.5 overflow-hidden rounded-full bg-muted",
                  stacked && "col-span-2",
                )}
              >
                <span
                  className={cn(
                    "block h-full min-w-1 rounded-full",
                    index === 0 ? "bg-h-indigo" : "bg-muted-foreground/30",
                  )}
                  style={{ width: `${(row.value / max) * 100}%` }}
                />
              </span>
            );
            const value = (
              <span className="text-right font-medium tabular-nums">
                {formatWith(row.value, format)}
                <span className="sr-only"> {unit}</span>
              </span>
            );
            return (
              <Tooltip key={row.key}>
                <TooltipTrigger asChild>
                  <li
                    className={cn(
                      "-mx-2 grid grid-cols-subgrid rounded-md px-2 text-ui transition-colors hover:bg-accent/30",
                      stacked
                        ? "col-span-2 content-center gap-y-1"
                        : "col-span-3 items-center",
                    )}
                    style={{ height: rowHeight }}
                  >
                    <span
                      className={cn(
                        "min-w-0 text-muted-foreground",
                        stacked ? "line-clamp-2" : "truncate",
                      )}
                    >
                      {row.label}
                    </span>
                    {stacked ? (
                      <>
                        {value}
                        {bar}
                      </>
                    ) : (
                      <>
                        {bar}
                        {value}
                      </>
                    )}
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
            );
          })}
        </ul>
        {share && rest > 0 ? (
          <p
            className="flex items-end justify-between gap-3 border-t border-border/60 text-ui text-muted-foreground"
            style={{ height: MORE_HEIGHT }}
          >
            <span>Otros</span>
            <span className="tabular-nums">{formatWith(rest, format)}</span>
          </p>
        ) : !share && hidden > 0 ? (
          <p
            className="flex items-end border-t border-border/60 text-xs text-muted-foreground"
            style={{ height: MORE_HEIGHT }}
          >
            y {formatNumber(hidden, 0)} más
          </p>
        ) : null}
      </div>
    </TooltipProvider>
  );
};
