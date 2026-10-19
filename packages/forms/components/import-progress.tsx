"use client";

import type { FormKind } from "@/convex/lib/form_types";
import { Loader2, TriangleAlert } from "lucide-react";

import { importCountsText, pendingRows } from "../lib/import-history";
import type { ImportOutcome } from "../lib/use-import-wizard";
import { Notice } from "./import-file-step";

interface ImportProgressProps {
  outcome: ImportOutcome;
  kind: FormKind;
  isRunning: boolean;
}

/** Cuántas filas rechazadas por el servidor se enumeran. */
const PROBLEMS_SHOWN = 50;

/**
 * Lo que va escribiéndose, lote a lote, y cómo terminó. El servidor tiene la
 * última palabra: una fila que pasó la revisión puede volver con su motivo.
 */
export const ImportProgress = ({
  outcome,
  kind,
  isRunning,
}: ImportProgressProps) => {
  const { counts, problems, interrupted } = outcome;
  const pending = pendingRows(counts);
  const done = counts.total - pending;
  const percent = counts.total === 0 ? 0 : (done / counts.total) * 100;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3 text-sm">
          <p className="flex min-w-0 items-center gap-2">
            {isRunning ? (
              <Loader2 aria-hidden className="size-4 shrink-0 animate-spin" />
            ) : null}
            {isRunning
              ? "Escribiendo… no cierres esta ventana."
              : interrupted
                ? "La importación se interrumpió."
                : "Importación terminada."}
          </p>
          <p className="shrink-0 text-muted-foreground tabular-nums">
            {done.toLocaleString("es-CO")} de{" "}
            {counts.total.toLocaleString("es-CO")}
          </p>
        </div>
        <div
          role="progressbar"
          aria-label="Filas escritas"
          aria-valuemin={0}
          aria-valuemax={counts.total}
          aria-valuenow={done}
          className="h-1.5 overflow-hidden rounded-full bg-muted"
        >
          <div
            className="h-full rounded-full bg-h-indigo transition-[width]"
            style={{ width: `${percent}%` }}
          />
        </div>
        <p className="text-sm text-muted-foreground tabular-nums">
          {importCountsText(counts, kind)}
        </p>
      </div>

      {interrupted ? (
        <Notice tone="yellow" icon={TriangleAlert}>
          Lo ya escrito se conserva y queda marcado como una importación sin
          terminar. Puedes deshacerla desde «Importaciones» y volver a
          intentarlo.
        </Notice>
      ) : null}

      {problems.length > 0 ? (
        <section className="space-y-3">
          <div>
            <h3 className="text-sm font-medium">Filas que no entraron</h3>
            <p className="text-xs text-muted-foreground">
              Pasaron la revisión del navegador y el servidor las rechazó.
            </p>
          </div>
          <ul className="divide-y divide-border/60 rounded-lg border">
            {problems.slice(0, PROBLEMS_SHOWN).map((problem) => (
              <li key={problem.row} className="space-y-0.5 px-3 py-2">
                <p className="text-sm break-words">{problem.message}</p>
                <p className="text-xs text-muted-foreground tabular-nums">
                  Fila {problem.row}
                </p>
              </li>
            ))}
          </ul>
          {problems.length > PROBLEMS_SHOWN ? (
            <p className="text-xs text-muted-foreground tabular-nums">
              Y {(problems.length - PROBLEMS_SHOWN).toLocaleString("es-CO")}{" "}
              más.
            </p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
};
