"use client";

import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type {
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
import { isCut } from "../lib/result-periods";

const AXIS = { tickLine: false, axisLine: false } as const;
const MARGIN = { top: 8, right: 12, bottom: 0, left: 0 } as const;
/** Sin ejes, el primer y el último punto quedan contra el borde: aire para
 *  que no se corten. */
const COMPACT_MARGIN = { top: 8, right: 8, bottom: 8, left: 8 } as const;

/** La línea de la meta: punteada y en gris, para que acompañe sin competir
 *  con la serie. Su valor va escrito al final. */
const goalLine = (goal: ResultGoal, format: NumberFormat, compact: boolean) => (
  <ReferenceLine
    y={goal.value}
    stroke="var(--color-muted-foreground)"
    strokeDasharray="4 4"
    strokeOpacity={0.7}
    label={
      compact
        ? undefined
        : {
            value: `Meta ${formatWith(goal.value, format)}`,
            position: "insideTopRight",
            fill: "var(--color-muted-foreground)",
            fontSize: 11,
          }
    }
  />
);

/** Llena el alto que le deja su tarjeta (`docs/plans/2026-10-14-tablero-a-la-medida-design.md` §2). */
const FILL = "aspect-auto h-full min-h-0 w-full";

/** Lo que tienen en común las dos gráficas. */
interface ChartShape {
  interval: ResultInterval;
  /** En la tarjeta baja: sin ejes ni rejilla, sólo la línea y la meta. El
   *  valor de cada punto sigue en la ayuda. */
  compact?: boolean;
  /** Los periodos que el rango corta: el tramo que llega a ellos va
   *  punteado y su ayuda lo dice (`cutPeriods`). */
  cut: { first: boolean; last: boolean };
}

/**
 * Parte una serie en lo entero y lo cortado. `solid` es la serie sin los
 * periodos cortados; `open`, sólo el tramo que los une con su vecino, para
 * dibujarlo punteado encima.
 */
function splitCut(
  values: readonly (number | null)[],
  cut: ChartShape["cut"],
): { solid: (number | null)[]; open: (number | null)[] } {
  const count = values.length;
  const near = (index: number) =>
    isCut(cut, index, count) ||
    (cut.first && index === 1) ||
    (cut.last && index === count - 2);
  return {
    solid: values.map((value, index) =>
      isCut(cut, index, count) ? null : value,
    ),
    open: values.map((value, index) => (near(index) ? value : null)),
  };
}

const titleOf = (
  interval: ResultInterval,
  key: string,
  keys: readonly string[],
  cut: ChartShape["cut"],
) =>
  `${bucketTitle(interval, key)}${
    isCut(cut, keys.indexOf(key), keys.length) ? " · periodo incompleto" : ""
  }`;

export interface TrendSeries {
  /** Qué mide: «Suma de Horas». */
  label: string;
  format: NumberFormat;
  points: readonly TrendPoint[];
}

interface TrendChartProps extends ChartShape {
  series: readonly TrendSeries[];
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
export const TrendChart = ({
  series,
  interval,
  goal,
  compact = false,
  cut,
}: TrendChartProps) => {
  const config: ChartConfig = Object.fromEntries(
    series.map((one, index) => [
      `s${index}`,
      { label: one.label, color: SERIES_COLORS[index] },
    ]),
  );
  const keys = (series[0]?.points ?? []).map((point) => point.key);
  const split = series.map((one) =>
    splitCut(
      one.points.map((point) => point.value),
      cut,
    ),
  );
  // Un punto por intervalo, con el valor de cada serie en su columna, y el
  // tramo cortado aparte.
  const rows = keys.map((key, at) => ({
    key,
    ...Object.fromEntries(
      split.flatMap((one, index) => [
        [`s${index}`, one.solid[at]],
        [`o${index}`, one.open[at]],
      ]),
    ),
  }));
  const formatOf = (name: unknown) =>
    series.find((one) => one.label === name)?.format ?? series[0]?.format;
  const single = series.length === 1;
  const Chart = single ? AreaChart : LineChart;
  const dots = rows.length <= 12;

  return (
    <ChartContainer config={config} className={FILL}>
      <Chart
        data={rows}
        margin={compact ? COMPACT_MARGIN : MARGIN}
        accessibilityLayer
      >
        {compact ? null : <CartesianGrid vertical={false} />}
        <XAxis
          dataKey="key"
          {...AXIS}
          hide={compact}
          tickMargin={8}
          minTickGap={28}
          tickFormatter={(key: string) => bucketLabel(interval, key)}
        />
        <YAxis
          {...AXIS}
          hide={compact}
          width="auto"
          tickFormatter={(value: number) => formatNumber(value, 0)}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(key) =>
                titleOf(interval, String(key), keys, cut)
              }
              valueFormatter={(value, name) =>
                formatWith(
                  typeof value === "number" ? value : null,
                  formatOf(name),
                )
              }
            />
          }
        />
        {goal ? goalLine(goal, series[0]?.format ?? {}, compact) : null}
        {single ? (
          <Area
            dataKey="s0"
            name={series[0].label}
            type="monotone"
            stroke="var(--color-s0)"
            strokeWidth={2}
            fill="var(--color-s0)"
            fillOpacity={0.1}
            dot={dots}
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
              dot={dots}
              isAnimationActive={false}
              activeDot={{ r: 4 }}
            />
          ))
        )}
        {series.map((one, index) => (
          <Line
            key={`o${index}`}
            dataKey={`o${index}`}
            name={one.label}
            type="monotone"
            stroke={`var(--color-s${index})`}
            strokeWidth={2}
            strokeDasharray="4 4"
            dot={dots ? { strokeDasharray: "0" } : false}
            legendType="none"
            isAnimationActive={false}
            activeDot={false}
          />
        ))}
      </Chart>
    </ChartContainer>
  );
};

interface PercentChartProps extends ChartShape {
  points: readonly { key: string; percent: number | null }[];
  goal?: ResultGoal;
  /** De qué es el porcentaje: «Ítems conformes», «Programa cumplido». */
  label: string;
}

/** Un porcentaje en el tiempo: los ítems conformes de una lista de chequeo o
 *  lo cumplido de un programa. El eje no baja de cero ni pasa de cien, y se
 *  acerca a los datos para que una caída de tres puntos se vea. Con meta,
 *  baja hasta enseñarla. */
export const PercentChart = ({
  points,
  interval,
  goal,
  label,
  compact = false,
  cut,
}: PercentChartProps) => {
  const config: ChartConfig = {
    percent: { label, color: SERIES_COLORS[0] },
  };
  const known = points
    .map((point) => point.percent)
    .filter((value) => value !== null);
  const lowest = Math.min(100, ...known, ...(goal ? [goal.value] : []));
  const floor = Math.max(0, Math.floor((lowest - 5) / 10) * 10);
  const keys = points.map((point) => point.key);
  const split = splitCut(
    points.map((point) => point.percent),
    cut,
  );
  const rows = points.map((point, at) => ({
    key: point.key,
    percent: split.solid[at],
    open: split.open[at],
  }));
  const dots = points.length <= 12;
  return (
    <ChartContainer config={config} className={FILL}>
      <LineChart
        data={rows}
        margin={compact ? COMPACT_MARGIN : MARGIN}
        accessibilityLayer
      >
        {compact ? null : <CartesianGrid vertical={false} />}
        <XAxis
          dataKey="key"
          {...AXIS}
          hide={compact}
          tickMargin={8}
          minTickGap={28}
          tickFormatter={(key: string) => bucketLabel(interval, key)}
        />
        <YAxis
          {...AXIS}
          hide={compact}
          width="auto"
          domain={[floor, 100]}
          tickFormatter={(value: number) => `${formatNumber(value, 0)} %`}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(key) =>
                titleOf(interval, String(key), keys, cut)
              }
              valueFormatter={(value) =>
                typeof value === "number" ? `${formatNumber(value)} %` : "—"
              }
            />
          }
        />
        {goal ? goalLine(goal, { unit: "%" }, compact) : null}
        <Line
          dataKey="percent"
          name={label}
          type="monotone"
          stroke="var(--color-percent)"
          strokeWidth={2}
          dot={dots}
          // Sin animación: al recalcular con otro periodo no parpadea.
          isAnimationActive={false}
          activeDot={{ r: 4 }}
          connectNulls
        />
        <Line
          dataKey="open"
          name={label}
          type="monotone"
          stroke="var(--color-percent)"
          strokeWidth={2}
          strokeDasharray="4 4"
          dot={dots ? { strokeDasharray: "0" } : false}
          legendType="none"
          isAnimationActive={false}
          activeDot={false}
        />
      </LineChart>
    </ChartContainer>
  );
};
