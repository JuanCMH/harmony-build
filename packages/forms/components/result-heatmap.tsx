"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toDate } from "@/packages/forms/lib/date-value";
import type { ResultData } from "@/convex/lib/result_types";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import { fitRows } from "../lib/fit-rows";
import { bucketTitle, formatNumber } from "../lib/result-catalog";
import { useMeasuredBox } from "../lib/use-fit-rows";

/** Cada fila del mapa: la celda de 24 px y su separación. Con alto de sobra
 *  las celdas crecen hasta 32, para que el mapa llene su tarjeta. */
const ROW_HEIGHT = 26;
const ROW_MAX = 34;
/** La fila de los días y la leyenda, con su separación. */
const FRAME_HEIGHT = 52;

type HeatmapData = Extract<ResultData, { type: "heatmap" }>;

/** Cinco pasos de un solo tono: más es más oscuro. El cero no lleva tono. */
const STEPS = [18, 36, 56, 78, 100] as const;

const stepOf = (value: number, max: number): number =>
  STEPS[
    Math.min(STEPS.length - 1, Math.ceil((value / max) * STEPS.length) - 1)
  ];

const columnLabel = (interval: HeatmapData["interval"], key: string) => {
  const date = toDate(key);
  if (!date) return key;
  return interval === "day"
    ? format(date, "EEEEE d", { locale: es })
    : format(date, "d MMM", { locale: es });
};

interface ResultHeatmapProps {
  data: HeatmapData;
  /** «hallazgos», «respuestas»: lo que cuenta cada celda. */
  unit: string;
}

/**
 * Elemento por día: la hoja semanal del papel. Cada celda dice cuánto hubo
 * ese día; la que está vacía y punteada es un día sin respuesta, que no es lo
 * mismo que un cero. Enseña los elementos que caben en su tarjeta, y la
 * leyenda dice cuántos quedaron fuera.
 */
export const ResultHeatmap = ({ data, unit }: ResultHeatmapProps) => {
  const { ref, height } = useMeasuredBox();
  const visible =
    height === null
      ? data.rows.length
      : fitRows({
          space: height - FRAME_HEIGHT,
          total: data.rows.length,
          rowHeight: ROW_HEIGHT,
          moreHeight: 0,
        });
  const hidden = data.rows.length - visible;
  const rowHeight =
    height === null || visible === 0
      ? ROW_HEIGHT
      : Math.min(
          ROW_MAX,
          Math.max(ROW_HEIGHT, Math.floor((height - FRAME_HEIGHT) / visible)),
        );
  return (
    <TooltipProvider delayDuration={50}>
      <div
        ref={ref}
        className="flex min-h-0 flex-1 basis-0 flex-col gap-3 overflow-hidden"
      >
        {/* `relative`: los textos `sr-only` de las celdas son absolutos, y sin un
        ancestro posicionado se salen del recorte y ensanchan la página. */}
        <div className="relative overflow-x-auto">
          <div
            className="grid min-w-fit items-center gap-0.5 text-2xs"
            style={{
              gridTemplateColumns: `minmax(5rem, auto) repeat(${data.columns.length}, minmax(1.5rem, 1fr))`,
              gridTemplateRows: `auto repeat(${visible}, ${rowHeight - 2}px)`,
            }}
          >
            <span />
            {data.columns.map((key) => (
              <span
                key={key}
                className="truncate text-center text-muted-foreground"
              >
                {columnLabel(data.interval, key)}
              </span>
            ))}
            {data.rows.slice(0, visible).map((row) => (
              <div key={row.key} className="contents">
                <span
                  className="sticky left-0 z-10 max-w-48 truncate bg-card pr-2 text-ui text-muted-foreground"
                  title={row.label}
                >
                  {row.label}
                </span>
                {row.cells.map((value, index) => {
                  const column = data.columns[index];
                  const what =
                    value === null
                      ? "sin respuesta"
                      : `${formatNumber(value)} ${unit}`;
                  return (
                    <Tooltip key={column}>
                      <TooltipTrigger asChild>
                        <span
                          className={cn(
                            "h-full rounded-sm ring-foreground/40 transition-shadow hover:ring-1",
                            value === null &&
                              "border border-dashed border-border",
                            value === 0 && "bg-muted",
                          )}
                          style={
                            value !== null && value > 0
                              ? {
                                  backgroundColor: `color-mix(in oklab, var(--color-h-indigo) ${stepOf(value, data.max)}%, transparent)`,
                                }
                              : undefined
                          }
                        >
                          <span className="sr-only">{what}</span>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="font-medium">{row.label}</p>
                        <p className="opacity-80">
                          {bucketTitle(data.interval, column)} · {what}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            Menos
            <span aria-hidden className="flex gap-0.5">
              {STEPS.map((step) => (
                <span
                  key={step}
                  className="size-2.5 rounded-sm"
                  style={{
                    backgroundColor: `color-mix(in oklab, var(--color-h-indigo) ${step}%, transparent)`,
                  }}
                />
              ))}
            </span>
            Más · hasta {formatNumber(Math.max(1, data.max))} {unit}
          </span>
          <span className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="size-2.5 rounded-sm border border-dashed border-border"
            />
            Sin respuesta
          </span>
          {hidden > 0 ? (
            <span>
              y {formatNumber(hidden, 0)}{" "}
              {hidden === 1 ? "elemento más" : "elementos más"}
            </span>
          ) : null}
        </p>
      </div>
    </TooltipProvider>
  );
};
