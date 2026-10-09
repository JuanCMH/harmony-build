"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Id } from "@/convex/_generated/dataModel";
import { dateText } from "@/convex/lib/field_text";
import { cn } from "@/lib/utils";
import { useProjectId } from "@/packages/projects/store/use-project-id";
import { ChevronRight, Loader2 } from "lucide-react";
import Link from "next/link";

import { useListEntryHistory } from "../api";
import { loadedCountText } from "../lib/response-columns";
import { formRoutes } from "../lib/routes";
import { STATUS_TONE_CLASS, VOIDED_BADGE } from "../lib/status";

interface EntryHistoryProps {
  entryId: Id<"formResponses">;
  /** Si quien mira ve las respuestas de todos o sólo las suyas. */
  seesAll: boolean;
}

/**
 * El historial de un elemento: las respuestas de otros formatos que lo
 * eligieron, lo más reciente primero («inspecciones de SLP-835»).
 *
 * Se monta sólo para quien tiene `viewResponses` o `fillForms`: su consulta
 * **lanza** sin ninguna de las dos.
 */
export const EntryHistory = ({ entryId, seesAll }: EntryHistoryProps) => {
  const projectId = useProjectId();
  const {
    data: rows,
    isLoading,
    isLoadingMore,
    canLoadMore,
    loadMore,
  } = useListEntryHistory({ entryId });

  return (
    <section className="space-y-3" aria-labelledby="entry-history-title">
      <header className="space-y-1">
        <h3
          id="entry-history-title"
          className="flex items-baseline gap-2 text-base font-medium tracking-tight"
        >
          Historial
          {!isLoading && rows.length > 0 && (
            <span className="text-sm font-normal text-muted-foreground tabular-nums">
              {loadedCountText(rows.length, "record", canLoadMore)}
            </span>
          )}
        </h3>
        <p className="text-sm text-muted-foreground">
          {seesAll
            ? "Las respuestas de otros formatos que eligieron este elemento, lo más reciente primero."
            : "Tus respuestas de otros formatos que eligieron este elemento, lo más reciente primero."}
        </p>
      </header>

      {isLoading ? (
        <div
          className="divide-y divide-border/60 rounded-lg border bg-card"
          aria-busy="true"
          aria-live="polite"
        >
          <span className="sr-only">Cargando el historial…</span>
          {[0, 1, 2].map((row) => (
            <div key={row} className="space-y-2 px-3 py-3">
              <Skeleton className="h-3.5 w-1/2" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="rounded-lg border bg-card px-3 py-8 text-center text-sm text-muted-foreground">
          {seesAll
            ? "Ninguna respuesta ha elegido todavía este elemento. Aparecerán aquí cuando alguien lo elija al diligenciar."
            : "Todavía no has elegido este elemento en ninguna respuesta."}
        </p>
      ) : (
        <ul className="divide-y divide-border/60 overflow-clip rounded-lg border bg-card">
          {rows.map((row) => {
            const isVoided = row.status === "voided";
            return (
              <li key={row.responseId}>
                <Link
                  href={formRoutes.response(
                    projectId,
                    row.formId,
                    row.responseId,
                  )}
                  className={cn(
                    "flex min-h-14 items-center gap-3 px-3 py-2 transition-colors hover:bg-accent/30 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none focus-visible:ring-inset",
                    isVoided && "text-muted-foreground",
                  )}
                >
                  <div className="min-w-0 flex-1 sm:grid sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] sm:items-center sm:gap-4">
                    <p className="min-w-0 text-sm">
                      <span
                        className={cn(
                          "font-medium break-words",
                          isVoided && "line-through",
                        )}
                      >
                        {row.formName}
                      </span>
                      {row.formCode && (
                        <span className="ml-2 text-xs text-muted-foreground tabular-nums">
                          {row.formCode}
                        </span>
                      )}
                    </p>
                    <p className="truncate text-ui text-muted-foreground">
                      {/* Otro listado que lo relaciona: la fila es un
                          elemento, y se dice cuál. */}
                      {row.title ? `${row.title} · ` : null}
                      <span className="tabular-nums">{dateText(row.date)}</span>{" "}
                      · {row.author.name}
                    </p>
                  </div>
                  {isVoided && (
                    <Badge
                      variant="outline"
                      className={STATUS_TONE_CLASS[VOIDED_BADGE.tone]}
                    >
                      {VOIDED_BADGE.label}
                    </Badge>
                  )}
                  <ChevronRight
                    aria-hidden
                    className="size-4 shrink-0 text-muted-foreground"
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {canLoadMore || isLoadingMore ? (
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="sm"
            disabled={isLoadingMore}
            onClick={loadMore}
          >
            {isLoadingMore && <Loader2 className="animate-spin" />}
            Cargar más
          </Button>
        </div>
      ) : null}
    </section>
  );
};
