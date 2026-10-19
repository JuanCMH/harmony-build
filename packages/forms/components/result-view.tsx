"use client";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MIN_POINTS } from "@/convex/lib/date_buckets";
import type {
  ResultConfig,
  ResultData,
  ResultInterval,
} from "@/convex/lib/result_types";
import type { WidgetHeight } from "@/convex/lib/result_validators";
import { cn } from "@/lib/utils";
import { CheckCircle2, TriangleAlert, XCircle } from "lucide-react";
import dynamic from "next/dynamic";
import type { ReactNode } from "react";

import {
  SERIES_COLORS,
  formatNumber,
  formatWith,
  measureLabel,
} from "../lib/result-catalog";
import { cutPeriods } from "../lib/result-periods";
import type { ResultsRange } from "../lib/results-range";
import { STATUS_TONE_CLASS } from "../lib/status";
import { ResultBars } from "./result-bars";
import { ResultCoverageRows } from "./result-coverage";
import {
  Badges,
  ChangeBadge,
  Empty,
  Figure,
  GoalBadge,
  NO_RESPONSES,
  SeriesFigure,
  measureCaption,
  responsesText,
} from "./result-figures";
import { ResultFitList } from "./result-fit-list";
import { ResultHeatmap } from "./result-heatmap";
import { ResultSparkBars } from "./result-spark-bars";
import { ResultExpirations, ResultTable } from "./result-tables";
import { ResultPendingIssues } from "./result-tracking";

// Recharts sólo viaja cuando hay una gráfica que pintar (`02 §1`).
const ChartLoading = () => <Skeleton className="h-full w-full" />;
const TrendChart = dynamic(
  () => import("./result-charts").then((module) => module.TrendChart),
  { ssr: false, loading: ChartLoading },
);
const PercentChart = dynamic(
  () => import("./result-charts").then((module) => module.PercentChart),
  { ssr: false, loading: ChartLoading },
);

/** El sitio de una gráfica: el alto que dejan la cifra y las etiquetas.
 *  Con una lista debajo, nunca menos de 160 px. */
const ChartArea = ({
  withList = false,
  children,
}: {
  withList?: boolean;
  children: ReactNode;
}) => (
  <div className={cn("flex-1 basis-0", withList ? "min-h-40" : "min-h-0")}>
    {children}
  </div>
);

/** Todo resultado se apila igual: la cifra, sus etiquetas y lo que la
 *  explica, que toma el alto que sobra. */
const Stack = ({ children }: { children: ReactNode }) => (
  <div className="flex min-h-0 flex-1 flex-col gap-3">{children}</div>
);

interface ResultViewProps {
  config: ResultConfig;
  data: ResultData;
  /** Lo que el resultado pide y ya no está. */
  problem: string | null;
  /** El día de hoy en Colombia: contra él se dice qué asunto está vencido. */
  today: string;
  /** El alto de su tarjeta: qué cabe en ella
   *  (`docs/plans/2026-10-14-tablero-a-la-medida-design.md` §2). */
  height: WidgetHeight;
  /** El rango que se mira: dice qué periodos quedan cortados. */
  range: ResultsRange;
}

/**
 * Un resultado, pintado según su tipo y el alto de su tarjeta. No sabe de
 * dónde salen los datos: los recibe ya calculados, y sólo decide la forma.
 * Nada desplaza por dentro: lo que no cabe se resume.
 */
export const ResultView = ({
  config,
  data,
  problem,
  today,
  height,
  range,
}: ResultViewProps) => {
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

  const compact = height === "short";
  const cutOf = (
    interval: ResultInterval,
    points: readonly { key: string }[],
  ) =>
    cutPeriods(
      interval,
      points.map((point) => point.key),
      range,
    );

  switch (data.type) {
    case "indicator": {
      if (config.type !== "indicator") return null;
      const { measure } = config;
      return (
        <Stack>
          <Figure
            value={formatWith(data.value, measure)}
            caption={
              measure.operation === "count"
                ? "Respuestas en el periodo"
                : `${measureCaption(measure)} · ${responsesText(data.responses)}`
            }
          />
          {config.goal || config.compare ? (
            <Badges>
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
            </Badges>
          ) : null}
          {data.points.length > 1 ? (
            <ResultSparkBars
              points={data.points}
              interval={data.interval}
              label={measureCaption(measure)}
              format={measure}
              cut={cutOf(data.interval, data.points)}
            />
          ) : null}
        </Stack>
      );
    }

    case "composite": {
      if (config.type !== "composite") return null;
      return (
        <Stack>
          <Figure
            value={formatWith(data.value, config)}
            caption="Calculada con los indicadores de abajo"
          />
          {config.goal ? (
            <Badges>
              <GoalBadge
                value={data.value}
                goal={config.goal}
                format={config}
              />
            </Badges>
          ) : null}
          <ResultFitList
            items={data.parts}
            rowHeight={44}
            className="border-t border-border/60"
            itemKey={(part) => part.resultId}
            more={(hidden) =>
              `y ${hidden} ${hidden === 1 ? "indicador más" : "indicadores más"}`
            }
            renderItem={(part) => (
              <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
                <span className="min-w-0">
                  <span className="block truncate text-ui">{part.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {part.formName}
                  </span>
                </span>
                <span className="text-sm font-medium tabular-nums">
                  {formatWith(part.value)}
                </span>
              </div>
            )}
          />
        </Stack>
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
      return (
        <Stack>
          {series.length === 1 ? (
            <Figure
              value={formatWith(data.total, config.measure)}
              caption={`${measureCaption(config.measure)} en el periodo`}
            />
          ) : (
            // Con varias series no hay una cifra que mande: cada una dice la
            // suya, junto a su color.
            <ul className="flex flex-wrap gap-x-6 gap-y-2">
              {series.map((one, index) => (
                <SeriesFigure
                  // El orden es la identidad de una serie.
                  key={`series-${index}`}
                  value={formatWith(one.total, one.format)}
                  label={one.label}
                  color={SERIES_COLORS[index]}
                />
              ))}
            </ul>
          )}
          {config.goal ? (
            <Badges>
              <GoalBadge
                value={data.total}
                goal={config.goal}
                format={config.measure}
              />
            </Badges>
          ) : null}
          <ChartArea>
            <TrendChart
              series={series}
              interval={data.interval}
              goal={config.goal}
              compact={compact}
              cut={cutOf(data.interval, data.points)}
            />
          </ChartArea>
        </Stack>
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
        <Stack>
          <Figure
            value={
              data.percent === null ? "—" : `${formatNumber(data.percent)} %`
            }
            caption={`Ítems conformes · ${responsesText(data.responses)}`}
          />
          {goal ? (
            <Badges>
              <GoalBadge
                value={data.percent}
                goal={goal}
                format={{ unit: "%" }}
              />
            </Badges>
          ) : null}
          <ChartArea>
            <PercentChart
              points={data.points}
              interval={data.interval}
              goal={goal}
              label="Ítems conformes"
              compact={compact}
              cut={cutOf(data.interval, data.points)}
            />
          </ChartArea>
        </Stack>
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
        <Stack>
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
        </Stack>
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

    case "coverage": {
      const goal = config.type === "coverage" ? config.goal : undefined;
      if (data.elements === 0) {
        return (
          <Empty>
            {config.type === "coverage" && config.scope === "seen"
              ? NO_RESPONSES
              : "El listado no tiene elementos activos."}
          </Empty>
        );
      }
      if (data.expected === 0) {
        return (
          <Empty>
            El periodo no cubre ninguna vez completa de este programa. Elige uno
            más largo.
          </Empty>
        );
      }
      // Bajo: la cifra y los peores elementos. Medio: la cifra y su línea.
      // Alto: las dos. Sin tres puntos no hay línea, y van los elementos.
      const line = !compact && data.points.length >= MIN_POINTS;
      const rows = height !== "medium" || !line;
      return (
        <Stack>
          <Figure
            value={
              data.percent === null ? "—" : `${formatNumber(data.percent)} %`
            }
            caption={`Se hizo ${formatNumber(data.done, 0)} de las ${formatNumber(data.expected, 0)} veces que tocaba · ${formatNumber(data.elements, 0)} ${data.elements === 1 ? "elemento" : "elementos"}`}
          />
          {goal || data.missing > 0 ? (
            <Badges>
              {goal ? (
                <GoalBadge
                  value={data.percent}
                  goal={goal}
                  format={{ unit: "%" }}
                />
              ) : null}
              {data.missing > 0 ? (
                <Badge variant="outline" className={STATUS_TONE_CLASS.red}>
                  <XCircle aria-hidden />
                  {formatNumber(data.missing, 0)} sin ninguna respuesta en el
                  periodo
                </Badge>
              ) : null}
            </Badges>
          ) : null}
          {line ? (
            <ChartArea withList={rows}>
              <PercentChart
                points={data.points}
                interval={data.interval}
                goal={goal}
                label="Programa cumplido"
                cut={cutOf(data.interval, data.points)}
              />
            </ChartArea>
          ) : null}
          {rows ? <ResultCoverageRows data={data} shareSpace={line} /> : null}
        </Stack>
      );
    }

    case "tracking": {
      const goal = config.type === "tracking" ? config.goal : undefined;
      return (
        <Stack>
          <Figure
            value={
              data.percent === null ? "—" : `${formatNumber(data.percent)} %`
            }
            caption={
              data.opened === 0
                ? "No se abrió ningún asunto en el periodo"
                : `Cerrado · ${formatNumber(data.closed, 0)} de ${formatNumber(data.opened, 0)} ${data.opened === 1 ? "asunto abierto" : "asuntos abiertos"} en el periodo`
            }
          />
          <Badges>
            {goal ? (
              <GoalBadge
                value={data.percent}
                goal={goal}
                format={{ unit: "%" }}
              />
            ) : null}
            {data.open === 0 ? (
              <Badge variant="outline" className={STATUS_TONE_CLASS.green}>
                <CheckCircle2 aria-hidden />
                Nada abierto hoy
              </Badge>
            ) : (
              <Badge variant="outline" className={STATUS_TONE_CLASS.yellow}>
                {formatNumber(data.open, 0)}{" "}
                {data.open === 1 ? "abierto hoy" : "abiertos hoy"}
              </Badge>
            )}
            {data.overdue > 0 ? (
              <Badge variant="outline" className={STATUS_TONE_CLASS.red}>
                <XCircle aria-hidden />
                {formatNumber(data.overdue, 0)}{" "}
                {data.overdue === 1 ? "vencido" : "vencidos"}
              </Badge>
            ) : null}
            {data.averageDays !== null ? (
              <Badge variant="outline" className={STATUS_TONE_CLASS.gray}>
                Cierre en {formatNumber(data.averageDays)}{" "}
                {data.averageDays === 1 ? "día" : "días"} en promedio
              </Badge>
            ) : null}
          </Badges>
          {!compact && data.pending.length > 0 ? (
            <ResultPendingIssues
              issues={data.pending}
              open={data.open}
              today={today}
            />
          ) : null}
        </Stack>
      );
    }

    case "expirations":
      return data.rows.length === 0 ? (
        <Empty>Ningún elemento activo tiene estas fechas.</Empty>
      ) : (
        <Stack>
          <Badges>
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
          </Badges>
          <ResultExpirations data={data} />
        </Stack>
      );
  }
};
