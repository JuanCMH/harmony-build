/** El cálculo de un resultado de seguimiento: si se está cerrando lo que se
 *  abre (`docs/plans/2026-10-10-seguimiento-de-hallazgos-design.md §7`).
 *
 *  Puro, como `result_compute.ts`, que es quien lo llama: recibe los asuntos
 *  ya leídos y filtrados.
 */

import { daysBetween } from "./date_buckets";
import type { FormValues } from "./form_types";
import {
  RESULT_LIMITS,
  type ResultData,
} from "./result_types";

/** Un asunto vigente —abierto o cerrado, nunca anulado— de un seguimiento. */
export interface ComputedIssue {
  id: string;
  code: string;
  title: string;
  status: "open" | "closed";
  /** El día en que se abrió. */
  date: string;
  /** El día en que se cerró, en hora de Colombia. */
  closedDate?: string;
  dueDate?: string;
  responsible?: string;
  values: FormValues;
}

type TrackingData = Extract<ResultData, { type: "tracking" }>;

/**
 * Un asunto se imputa al periodo **en que se abrió**: el porcentaje cerrado de
 * septiembre es, de lo que se abrió en septiembre, cuánto está cerrado hoy.
 * Los abiertos, en cambio, no miran el periodo: uno de hace ocho meses que
 * sigue abierto es justo el que hay que ver.
 */
export function computeTracking(input: {
  /** Todos los abiertos hoy. */
  open: readonly ComputedIssue[];
  /** Los que se abrieron en el periodo. */
  opened: readonly ComputedIssue[];
  today: string;
}): TrackingData {
  const { open, opened, today } = input;
  const isLate = (issue: ComputedIssue) =>
    issue.dueDate !== undefined && issue.dueDate < today;

  const closed = opened.filter((issue) => issue.status === "closed");
  const durations = closed.flatMap((issue) =>
    issue.closedDate
      ? [Math.max(0, daysBetween(issue.date, issue.closedDate))]
      : [],
  );

  return {
    type: "tracking",
    open: open.length,
    overdue: open.filter(isLate).length,
    opened: opened.length,
    closed: closed.length,
    percent: opened.length === 0 ? null : (closed.length / opened.length) * 100,
    averageDays:
      durations.length === 0
        ? null
        : durations.reduce((sum, days) => sum + days, 0) / durations.length,
    // Lo que tiene fecha primero, la más vieja arriba —ahí están los
    // vencidos—; después lo que no la tiene, lo más antiguo antes.
    pending: [...open]
      .sort(
        (a, b) =>
          (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999") ||
          a.date.localeCompare(b.date),
      )
      .slice(0, RESULT_LIMITS.maxPending)
      .map((issue) => ({
        id: issue.id,
        code: issue.code,
        title: issue.title,
        date: issue.date,
        dueDate: issue.dueDate ?? null,
        responsible: issue.responsible ?? null,
      })),
  };
}
