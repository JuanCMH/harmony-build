"use client";

import { Badge } from "@/components/ui/badge";
import type { Measure, ResultGoal } from "@/convex/lib/result_types";
import {
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  Minus,
  XCircle,
} from "lucide-react";
import type { ReactNode } from "react";

import {
  type NumberFormat,
  OPERATION_LABEL,
  changeFrom,
  formatNumber,
  formatWith,
  goalText,
  meetsGoal,
} from "../lib/result-catalog";
import { STATUS_TONE_CLASS } from "../lib/status";

/** Las piezas con que se arma un resultado en su tarjeta: la cifra, si
 *  cumple su meta, cuánto cambió y el vacío. */

export const NO_RESPONSES = "No hay respuestas en este periodo.";

export const responsesText = (count: number) =>
  `${formatNumber(count, 0)} ${count === 1 ? "respuesta" : "respuestas"}`;

/** Lo que mide una medida, dicho corto: «Suma», «Respuestas», o su nombre. */
export const measureCaption = (measure: Measure) =>
  measure.label ||
  (measure.operation === "count"
    ? "Respuestas"
    : measure.operation === "formula"
      ? "Fórmula"
      : OPERATION_LABEL[measure.operation]);

/** Un vacío ocupa el alto que le toque: el texto queda centrado en la
 *  tarjeta, no colgado arriba. */
export const Empty = ({ children }: { children: string }) => (
  <p className="flex flex-1 items-center justify-center py-4 text-center text-sm text-muted-foreground">
    {children}
  </p>
);

/** La cifra que manda, y debajo cómo se lee. */
export const Figure = ({
  value,
  caption,
}: { value: string; caption: string }) => (
  <div className="min-w-0 space-y-0.5">
    <p className="font-space-grotesk text-3xl font-medium tracking-tight tabular-nums">
      {value}
    </p>
    <p className="truncate text-ui text-muted-foreground" title={caption}>
      {caption}
    </p>
  </div>
);

/** Las etiquetas bajo la cifra, en una fila que envuelve. */
export const Badges = ({ children }: { children: ReactNode }) => (
  <p className="flex flex-wrap gap-2">{children}</p>
);

/** Si la cifra cumple su meta, dicho con palabras y con icono además del
 *  color (`03 §6.1`). Sin cifra no se juzga. */
export const GoalBadge = ({
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
export const ChangeBadge = ({
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

/** Una medida con su color, cuando una tendencia tiene varias. */
export const SeriesFigure = ({
  value,
  label,
  color,
}: {
  value: string;
  label: string;
  color: string;
}) => (
  <li className="min-w-0">
    <p className="font-space-grotesk text-xl font-medium tracking-tight tabular-nums">
      {value}
    </p>
    <p className="flex items-center gap-1.5 text-ui text-muted-foreground">
      <span
        aria-hidden
        className="size-2 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span className="truncate">{label}</span>
    </p>
  </li>
);
