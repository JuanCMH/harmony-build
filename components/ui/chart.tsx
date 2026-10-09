"use client";

import * as React from "react";
import * as RechartsPrimitive from "recharts";

import { cn } from "@/lib/utils";

/**
 * El contenedor de gráficas de shadcn/ui sobre Recharts 3, en su parte
 * esencial: las variables de color de cada serie y el estilo recesivo de la
 * rejilla y los ejes. El tooltip se compone aparte (`ChartTooltipContent`).
 */

export type ChartConfig = Record<string, { label: string; color: string }>;

function ChartContainer({
  config,
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  config: ChartConfig;
  children: React.ComponentProps<
    typeof RechartsPrimitive.ResponsiveContainer
  >["children"];
}) {
  // Cada serie expone su color como `--color-<clave>`, y las marcas lo leen.
  const style = Object.fromEntries(
    Object.entries(config).map(([key, item]) => [`--color-${key}`, item.color]),
  ) as React.CSSProperties;

  return (
    <div
      data-slot="chart"
      style={style}
      className={cn(
        "flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line]:stroke-border/60 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-layer]:outline-hidden [&_.recharts-surface]:outline-hidden",
        className,
      )}
      {...props}
    >
      <RechartsPrimitive.ResponsiveContainer>
        {children}
      </RechartsPrimitive.ResponsiveContainer>
    </div>
  );
}

const ChartTooltip = RechartsPrimitive.Tooltip;

interface TooltipEntry {
  name?: unknown;
  value?: unknown;
  color?: string;
}

/** Lo que Recharts le pasa al contenido de un tooltip, en lo que se usa. */
interface ChartTooltipContentProps {
  active?: boolean;
  payload?: readonly TooltipEntry[];
  label?: unknown;
  /** El rótulo del punto, ya leído: una fecha, una semana. */
  labelFormatter?: (label: unknown) => string;
  /** El valor, con su unidad. */
  valueFormatter?: (value: unknown, name: unknown) => string;
}

function ChartTooltipContent({
  active,
  payload,
  label,
  labelFormatter,
  valueFormatter,
}: ChartTooltipContentProps) {
  if (!active || !payload?.length) return null;

  return (
    <div className="grid min-w-32 gap-1 rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground">
      <p className="font-medium">
        {labelFormatter ? labelFormatter(label) : String(label ?? "")}
      </p>
      {payload.map((entry) => (
        <div
          key={String(entry.name)}
          className="flex items-center justify-between gap-3"
        >
          <span className="flex items-center gap-1.5 opacity-80">
            <span
              aria-hidden
              className="size-2.5 shrink-0 rounded-sm"
              style={{ backgroundColor: entry.color }}
            />
            {String(entry.name ?? "")}
          </span>
          <span className="font-medium tabular-nums">
            {valueFormatter
              ? valueFormatter(entry.value, entry.name)
              : String(entry.value ?? "")}
          </span>
        </div>
      ))}
    </div>
  );
}

export { ChartContainer, ChartTooltip, ChartTooltipContent };
