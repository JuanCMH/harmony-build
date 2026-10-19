"use client";

import { Badge } from "@/components/ui/badge";
import { daysBetween } from "@/convex/lib/date_buckets";
import type { PendingIssue } from "@/convex/lib/result_types";
import { cn } from "@/lib/utils";

import { shortDateEs } from "../lib/date-value";
import { STATUS_TONE_CLASS, type StatusTone } from "../lib/status";
import { ResultFitList } from "./result-fit-list";

/** Qué tan cerca está el compromiso de un asunto abierto, dicho con palabras
 *  además del color (`03 §6.1`). */
const dueState = (
  dueDate: string | null,
  today: string,
): { label: string; tone: StatusTone } => {
  if (dueDate === null) return { label: "Abierto · sin fecha", tone: "yellow" };
  const days = daysBetween(today, dueDate);
  if (days < 0) {
    return {
      label: `Vencido hace ${-days} ${days === -1 ? "día" : "días"}`,
      tone: "red",
    };
  }
  return {
    label:
      days === 0
        ? "Vence hoy"
        : `Vence en ${days} ${days === 1 ? "día" : "días"}`,
    tone: "yellow",
  };
};

/** Los asuntos abiertos que más urgen, los vencidos primero: los que caben
 *  en la tarjeta. Cada fila tiene un solo molde: el texto en una línea y el
 *  plazo a la derecha, nunca debajo. */
export const ResultPendingIssues = ({
  issues,
  open,
  today,
}: {
  issues: readonly PendingIssue[];
  /** Cuántos hay abiertos hoy: `issues` trae sólo los que más urgen. */
  open: number;
  today: string;
}) => (
  <ResultFitList
    items={issues}
    rowHeight={48}
    className="border-t border-border/60"
    itemKey={(issue) => issue.id}
    beyond={Math.max(0, open - issues.length)}
    more={(hidden) =>
      `y ${hidden} ${hidden === 1 ? "abierto más" : "abiertos más"}`
    }
    renderItem={(issue) => {
      const state = dueState(issue.dueDate, today);
      return (
        <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{issue.title}</p>
            <p className="truncate text-xs text-muted-foreground">
              {[
                issue.code,
                issue.responsible,
                `Abierto el ${shortDateEs(issue.date)}`,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          <Badge
            variant="outline"
            className={cn("shrink-0", STATUS_TONE_CLASS[state.tone])}
          >
            {state.label}
          </Badge>
        </div>
      );
    }}
  />
);
