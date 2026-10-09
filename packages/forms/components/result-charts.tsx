"use client";

import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type {
  CompliancePoint,
  ResultGoal,
  ResultInterval,
  TrendPoint,
} from "@/convex/lib/result_types";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";

import {
  type NumberFormat,
  SERIES_COLORS,
  bucketLabel,
  bucketTitle,
  formatNumber,
  formatWith,
} from "../lib/result-catalog";

const AXIS = { tickLine: false, axisLine: false } as const;
const MARGIN = { top: 8, right: 12, bottom: 0, left: 0 } as const;

/** La línea de la meta: punteada y en gris, para que acompañe sin competir
 *  con la serie. Su valor va escrito al final. */
const goalLine = (goal: ResultGoal, format: NumberFormat) => (
  <ReferenceLine
    y={goal.value}
    stroke="var(--color-muted-foreground)"
    strokeDasharray="4 4"
    strokeOpacity={0.7}
    label={{
      value: `Meta ${formatWith(goal.value, format)}`,
      position: "insideTopRight",
      fill: "var(--color-muted-foreground)",
      fontSize: 11,
    }}
  />
);

export interface TrendSeries {
  /** Qué mide: «Suma de Horas». */
  label: string;
  format: NumberFormat;
  points: readonly TrendPoint[];
}

interface TrendChartProps {
  series: readonly TrendSeries[];
  interval: ResultInterval;
  goal?: ResultGoal;
}

/**
 * La misma cifra, periodo a periodo. Un intervalo sin dato deja un hueco: un
 * promedio de nada no baja a cero.
 *
 * Con una serie, un área en el color de la marca. Con varias, una línea por
 * serie sobre el mismo eje: se comparan entre sí, así que el relleno
 * estorbaría.
 */
export const TrendChart = ({ series, interval, goal }: TrendChartProps) => {
  const config: ChartConfig = Object.fromEntries(
    series.map((one, index) => [
      `s${index}`,
      { label: one.label, color: SERIES_COLORS[index] },
    ]),
  );
  // Un punto por intervalo, con el valor de cada serie en su columna.
  const rows = (series[0]?.points ?? []).map((point, at) => ({
    key: point.key,
    ...Object.fromEntries(
      series.map((one, index) => [`s${index}`, one.points[at]?.value ?? null]),
    ),
  }));
  const formatOf = (name: unknown) =>
    series.find((one) => one.label === name)?.format ?? series[0]?.format;
  const single = series.length === 1;
  const Chart = single ? AreaChart : LineChart;

  return (
    <ChartContainer config={config} className="aspect-auto h-52 w-full">
      <Chart data={rows} margin={MARGIN} accessibilityLayer>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="key"
          {...AXIS}
          tickMargin={8}
          minTickGap={28}
          tickFormatter={(key: string) => bucketLabel(interval, key)}
        />
        <YAxis
          {...AXIS}
          width="auto"
          tickFormatter={(value: number) => formatNumber(value, 0)}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(key) => bucketTitle(interval, String(key))}
              valueFormatter={(value, name) =>
                formatWith(
                  typeof value === "number" ? value : null,
                  formatOf(name),
                )
              }
            />
          }
        />
        {goal ? goalLine(goal, series[0]?.format ?? {}) : null}
        {single ? (
          <Area
            dataKey="s0"
            name={series[0].label}
            type="monotone"
            stroke="var(--color-s0)"
            strokeWidth={2}
            fill="var(--color-s0)"
            fillOpacity={0.1}
            dot={rows.length <= 12}
            // Sin animación: al recalcular con otro periodo no parpadea.
            isAnimationActive={false}
            activeDot={{ r: 4 }}
          />
        ) : (
          series.map((one, index) => (
            <Line
              // El orden es la identidad de una serie.
              key={`s${index}`}
              dataKey={`s${index}`}
              name={one.label}
              type="monotone"
              stroke={`var(--color-s${index})`}
              strokeWidth={2}
              dot={rows.length <= 12}
              isAnimationActive={false}
              activeDot={{ r: 4 }}
            />
          ))
        )}
      </Chart>
    </ChartContainer>
  );
};

interface ComplianceChartProps {
  points: readonly CompliancePoint[];
  interval: ResultInterval;
  goal?: ResultGoal;
}

/** El porcentaje de ítems conformes en el tiempo. El eje no baja de cero ni
 *  pasa de cien, y se acerca a los datos para que una caída de tres puntos se
 *  vea. Con meta, baja hasta enseñarla. */
export const ComplianceChart = ({
  points,
  interval,
  goal,
}: ComplianceChartProps) => {
  const config: ChartConfig = {
    percent: { label: "Ítems conformes", color: SERIES_COLORS[0] },
  };
  const known = points
    .map((point) => point.percent)
    .filter((value) => value !== null);
  const lowest = Math.min(100, ...known, ...(goal ? [goal.value] : []));
  const floor = Math.max(0, Math.floor((lowest - 5) / 10) * 10);
  return (
    <ChartContainer config={config} className="aspect-auto h-52 w-full">
      <LineChart data={[...points]} margin={MARGIN} accessibilityLayer>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="key"
          {...AXIS}
          tickMargin={8}
          minTickGap={28}
          tickFormatter={(key: string) => bucketLabel(interval, key)}
        />
        <YAxis
          {...AXIS}
          width="auto"
          domain={[floor, 100]}
          tickFormatter={(value: number) => `${formatNumber(value, 0)} %`}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(key) => bucketTitle(interval, String(key))}
              valueFormatter={(value) =>
                typeof value === "number" ? `${formatNumber(value)} %` : "—"
              }
            />
          }
        />
        {goal ? goalLine(goal, { unit: "%" }) : null}
        <Line
          dataKey="percent"
          name="Ítems conformes"
          type="monotone"
          stroke="var(--color-percent)"
          strokeWidth={2}
          dot={points.length <= 12}
          // Sin animación: al recalcular con otro periodo no parpadea.
          isAnimationActive={false}
          activeDot={{ r: 4 }}
          connectNulls
        />
      </LineChart>
    </ChartContainer>
  );
};
