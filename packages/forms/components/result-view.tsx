"use client";

import type {
  Measure,
  ResultConfig,
  ResultData,
  ResultGoal,
} from "@/convex/lib/result_types";
import {
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  Minus,
  TriangleAlert,
  XCircle,
} from "lucide-react";
import dynamic from "next/dynamic";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

import {
  type NumberFormat,
  OPERATION_LABEL,
  SERIES_COLORS,
  changeFrom,
  formatNumber,
  formatWith,
  goalText,
  measureLabel,
  meetsGoal,
} from "../lib/result-catalog";
import { STATUS_TONE_CLASS } from "../lib/status";
import { ResultBars } from "./result-bars";
import { ResultHeatmap } from "./result-heatmap";
import { ResultSparkBars } from "./result-spark-bars";
import { ResultExpirations, ResultTable } from "./result-tables";

// Recharts sólo viaja cuando hay una gráfica que pintar (`02 §1`).
const ChartLoading = () => <Skeleton className="h-52 w-full" />;
const TrendChart = dynamic(
  () => import("./result-charts").then((module) => module.TrendChart),
  { ssr: false, loading: ChartLoading },
);
const ComplianceChart = dynamic(
  () => import("./result-charts").then((module) => module.ComplianceChart),
  { ssr: false, loading: ChartLoading },
);

interface ResultViewProps {
  config: ResultConfig;
  data: ResultData;
  /** Lo que el resultado pide y ya no está. */
  problem: string | null;
}

/** Un vacío ocupa el alto que le toque: junto a una tarjeta alta, el texto
 *  queda centrado y no colgado arriba. */
const Empty = ({ children }: { children: string }) => (
  <p className="flex flex-1 items-center justify-center py-8 text-center text-sm text-muted-foreground">
    {children}
  </p>
);

const Figure = ({ value, caption }: { value: string; caption: string }) => (
  <div className="space-y-0.5">
    <p className="font-space-grotesk text-3xl font-medium tracking-tight tabular-nums">
      {value}
    </p>
    <p className="text-ui text-muted-foreground">{caption}</p>
  </div>
);

/** Si la cifra cumple su meta, dicho con palabras y con icono además del
 *  color (`03 §6.1`). Sin cifra no se juzga. */
const GoalBadge = ({
  value,
  goal,
  format,
}: {
  value: number | null;
  goal: ResultGoal;
  format?: NumberFormat;
}) => {
  const meets = meetsGoal(value, goal);
  const Icon = meets ? CheckCircle2 : XCircle;
  return (
    <Badge
      variant="outline"
      className={
        meets === null
          ? STATUS_TONE_CLASS.gray
          : STATUS_TONE_CLASS[meets ? "green" : "red"]
      }
    >
      {meets === null ? null : <Icon aria-hidden />}
      {meets === null ? "" : meets ? "Cumple · " : "No cumple · "}
      {goalText(goal, format)}
    </Badge>
  );
};

/** Cuánto cambió frente al periodo anterior. Sin dirección buena o mala: si
 *  subir es bueno lo dice la meta, no el color. */
const ChangeBadge = ({
  value,
  previous,
  format,
}: {
  value: number | null;
  previous: number | null | undefined;
  format?: NumberFormat;
}) => {
  const change = changeFrom(value, previous);
  if (change === null) {
    return (
      <Badge variant="outline" className={STATUS_TONE_CLASS.gray}>
        Sin periodo anterior con que comparar
      </Badge>
    );
  }
  const Icon = change > 0 ? ArrowUpRight : change < 0 ? ArrowDownRight : Minus;
  return (
    <Badge variant="outline" className={STATUS_TONE_CLASS.gray}>
      <Icon aria-hidden />
      {change > 0 ? "+" : ""}
      {formatNumber(change)} % frente a {formatWith(previous ?? null, format)}{" "}
      del periodo anterior
    </Badge>
  );
};

const NO_RESPONSES = "No hay respuestas en este periodo.";

const responsesText = (count: number) =>
  `${formatNumber(count, 0)} ${count === 1 ? "respuesta" : "respuestas"}`;

/** Lo que mide una medida, dicho corto: «Suma», «Respuestas», o su nombre. */
const measureCaption = (measure: Measure) =>
  measure.label ||
  (measure.operation === "count"
    ? "Respuestas"
    : measure.operation === "formula"
      ? "Fórmula"
      : OPERATION_LABEL[measure.operation]);

/**
 * Un resultado, pintado según su tipo. No sabe de dónde salen los datos: los
 * recibe ya calculados, y sólo decide la forma.
 */
export const ResultView = ({ config, data, problem }: ResultViewProps) => {
  if (problem) {
    return (
      <p className="flex items-start gap-2 text-sm text-muted-foreground">
        <TriangleAlert
          aria-hidden
          className="mt-0.5 size-4 shrink-0 text-yellow-700 dark:text-yellow-400"
        />
        {config.type === "composite"
          ? `${problem}.`
          : "Este resultado apunta a un campo que el formato ya no tiene. Edítalo para elegir otro."}
      </p>
    );
  }

  switch (data.type) {
    case "indicator": {
      if (config.type !== "indicator") return null;
      const { measure } = config;
      return (
        <div className="flex flex-1 flex-col gap-3">
          <Figure
            value={formatWith(data.value, measure)}
            caption={
              measure.operation === "count"
                ? "Respuestas en el periodo"
                : `${measureCaption(measure)} · ${responsesText(data.responses)}`
            }
          />
          {config.goal || config.compare ? (
            <p className="flex flex-wrap gap-2">
              {config.goal ? (
                <GoalBadge
                  value={data.value}
                  goal={config.goal}
                  format={measure}
                />
              ) : null}
              {config.compare ? (
                <ChangeBadge
                  value={data.value}
                  previous={data.previous}
                  format={measure}
                />
              ) : null}
            </p>
          ) : null}
          {data.points.length > 1 ? (
            <ResultSparkBars
              points={data.points}
              interval={data.interval}
              label={measureCaption(measure)}
              format={measure}
            />
          ) : null}
        </div>
      );
    }

    case "composite": {
      if (config.type !== "composite") return null;
      return (
        <div className="flex flex-1 flex-col gap-3">
          <Figure
            value={formatWith(data.value, config)}
            caption="Calculada con los indicadores de abajo"
          />
          {config.goal ? (
            <p className="flex flex-wrap gap-2">
              <GoalBadge
                value={data.value}
                goal={config.goal}
                format={config}
              />
            </p>
          ) : null}
          <ul className="divide-y divide-border/60 border-t border-border/60">
            {data.parts.map((part) => (
              <li
                key={part.resultId}
                className="flex items-baseline justify-between gap-3 py-2 last:pb-0"
              >
                <span className="min-w-0">
                  <span className="block truncate text-ui">{part.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {part.formName}
                  </span>
                </span>
                <span className="text-sm font-medium tabular-nums">
                  {formatWith(part.value)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      );
    }

    case "trend": {
      if (config.type !== "trend") return null;
      const measures = [config.measure, ...(config.series ?? [])];
      const all = [
        { points: data.points, total: data.total },
        ...(data.extra ?? []),
      ];
      const series = all.map((one, index) => ({
        label: measureLabel(measures[index] ?? config.measure, null),
        format: measures[index] ?? config.measure,
        ...one,
      }));
      const single = series.length === 1;
      return (
        <div className="space-y-3">
          {single ? (
            <Figure
              value={formatWith(data.total, config.measure)}
              caption={`${measureCaption(config.measure)} en el periodo`}
            />
          ) : (
            // Con varias series no hay una cifra que mande: cada una dice la
            // suya, junto a su color.
            <ul className="flex flex-wrap gap-x-6 gap-y-2">
              {series.map((one, index) => (
                <li
                  // El orden es la identidad de una serie.
                  key={`series-${index}`}
                  className="min-w-0"
                >
                  <p className="font-space-grotesk text-xl font-medium tracking-tight tabular-nums">
                    {formatWith(one.total, one.format)}
                  </p>
                  <p className="flex items-center gap-1.5 text-ui text-muted-foreground">
                    <span
                      aria-hidden
                      className="size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: SERIES_COLORS[index] }}
                    />
                    <span className="truncate">{one.label}</span>
                  </p>
                </li>
              ))}
            </ul>
          )}
          {config.goal ? (
            <p className="flex flex-wrap gap-2">
              <GoalBadge
                value={data.total}
                goal={config.goal}
                format={config.measure}
              />
            </p>
          ) : null}
          <TrendChart
            series={series}
            interval={data.interval}
            goal={config.goal}
          />
        </div>
      );
    }

    case "distribution": {
      if (config.type !== "distribution") return null;
      const { measure } = config;
      return data.rows.length === 0 ? (
        <Empty>{NO_RESPONSES}</Empty>
      ) : (
        <ResultBars
          rows={data.rows}
          others={data.others}
          share={measure.operation === "count" || measure.operation === "sum"}
          format={measure}
          unit={
            measure.operation === "count"
              ? "respuestas"
              : measureCaption(measure).toLowerCase()
          }
        />
      );
    }

    case "table":
      return data.rows.length === 0 ? (
        <Empty>{NO_RESPONSES}</Empty>
      ) : (
        <ResultTable data={data} />
      );

    case "compliance": {
      const goal = config.type === "compliance" ? config.goal : undefined;
      return (
        <div className="space-y-3">
          <Figure
            value={
              data.percent === null ? "—" : `${formatNumber(data.percent)} %`
            }
            caption={`Ítems conformes · ${responsesText(data.responses)}`}
          />
          {goal ? (
            <p className="flex flex-wrap gap-2">
              <GoalBadge
                value={data.percent}
                goal={goal}
                format={{ unit: "%" }}
              />
            </p>
          ) : null}
          <ComplianceChart
            points={data.points}
            interval={data.interval}
            goal={goal}
          />
        </div>
      );
    }

    case "findings":
      return data.rows.length === 0 ? (
        <Empty>
          {data.responses === 0
            ? NO_RESPONSES
            : "Ningún ítem salió no conforme en este periodo."}
        </Empty>
      ) : (
        <div className="space-y-3">
          <p className="text-ui text-muted-foreground">
            {formatNumber(data.total, 0)}{" "}
            {data.total === 1 ? "hallazgo" : "hallazgos"} en{" "}
            {responsesText(data.responses)}
          </p>
          <ResultBars
            rows={data.rows.map((row) => ({
              key: row.itemId,
              label: row.label,
              value: row.count,
            }))}
            unit="hallazgos"
          />
        </div>
      );

    case "heatmap":
      return data.rows.length === 0 ? (
        <Empty>{NO_RESPONSES}</Empty>
      ) : (
        <ResultHeatmap
          data={data}
          unit={
            config.type === "heatmap" && config.value === "failures"
              ? "hallazgos"
              : config.type === "heatmap" && config.value === "sum"
                ? ""
                : "respuestas"
          }
        />
      );

    case "expirations":
      return data.rows.length === 0 ? (
        <Empty>Ningún elemento activo tiene estas fechas.</Empty>
      ) : (
        <div className="space-y-3">
          <p className="flex flex-wrap gap-2">
            {data.expired === 0 && data.soon === 0 ? (
              <Badge variant="outline" className={STATUS_TONE_CLASS.green}>
                Nada vence en los próximos 30 días
              </Badge>
            ) : null}
            {data.expired > 0 ? (
              <Badge variant="outline" className={STATUS_TONE_CLASS.red}>
                {data.expired} {data.expired === 1 ? "vencido" : "vencidos"}
              </Badge>
            ) : null}
            {data.soon > 0 ? (
              <Badge variant="outline" className={STATUS_TONE_CLASS.yellow}>
                {data.soon} por vencer en 30 días
              </Badge>
            ) : null}
          </p>
          <ResultExpirations data={data} />
        </div>
      );
  }
};
