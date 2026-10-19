"use client";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { dateText } from "@/convex/lib/field_text";
import { cn } from "@/lib/utils";
import { useProjectId } from "@/packages/projects/store/use-project-id";
import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { useListMyResponses } from "../api";
import { ENTITY_ICONS } from "../lib/field-catalog";
import { loadedCountText } from "../lib/response-columns";
import { timeText } from "../lib/response-reading";
import { formRoutes } from "../lib/routes";
import { STATUS_TONE_CLASS, VOIDED_BADGE } from "../lib/status";
import { ListEmpty } from "./list-empty";
import { LoadMoreButton } from "./load-more-button";

/**
 * «Mis respuestas»: lo que quien mira diligenció, en todos los formatos y
 * seguimientos, lo más reciente primero.
 *
 * Es la pantalla de quien diligencia en el teléfono: para comprobar que lo de
 * esta mañana quedó enviado, y abrirlo si se lo piden. Una fila por
 * respuesta, sin tabla: se lee igual a 390px que en escritorio.
 */
export const MyResponsesList = () => {
  const projectId = useProjectId();
  const {
    data: rows,
    isLoading,
    isLoadingMore,
    canLoadMore,
    loadMore,
  } = useListMyResponses({ projectId });

  return (
    <div className="space-y-3">
      {!isLoading && rows.length > 0 ? (
        <p className="text-ui tabular-nums text-muted-foreground">
          {loadedCountText(rows.length, "record", canLoadMore)}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-lg border bg-card">
        {isLoading ? (
          <div aria-busy="true" className="divide-y divide-border/60">
            <span className="sr-only">Cargando tus respuestas…</span>
            {[0, 1, 2, 3].map((row) => (
              <div
                key={row}
                className="flex min-h-16 flex-col justify-center gap-1.5 px-4 py-3"
              >
                <Skeleton className="h-4 w-56 max-w-full" />
                <Skeleton className="h-3 w-40" />
              </div>
            ))}
          </div>
        ) : rows.length === 0 ? (
          <ListEmpty
            icon={ENTITY_ICONS.response}
            title="Todavía no has diligenciado nada en este proyecto."
            hint="Cada formato que envíes aparecerá aquí, lo más reciente primero."
          />
        ) : (
          <ul className="divide-y divide-border/60">
            {rows.map((row) => {
              const isVoided = row.status === "voided";
              const isIssue = row.kind === "tracking";
              const Icon = isIssue ? ENTITY_ICONS.issue : ENTITY_ICONS.response;
              return (
                <li key={row._id}>
                  <Link
                    href={formRoutes.response(projectId, row.formId, row._id)}
                    className={cn(
                      "flex min-h-16 items-center gap-3 px-4 py-3 transition-colors outline-none hover:bg-accent/40 focus-visible:bg-accent/40 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:ring-inset",
                      isVoided && "text-muted-foreground",
                    )}
                  >
                    <Icon
                      className="size-4 shrink-0 text-muted-foreground"
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1 space-y-0.5">
                      <span className="line-clamp-2 text-sm font-medium">
                        {isIssue
                          ? [row.code, row.title || "Asunto sin título"]
                              .filter(Boolean)
                              .join(" · ")
                          : row.formName}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground tabular-nums">
                        {[
                          isIssue ? row.formName : row.formCode,
                          `${dateText(row.date)} ${
                            row.imported
                              ? "· Importada"
                              : timeText(row._creationTime)
                          }`,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </span>
                    {isVoided ? (
                      <Badge
                        variant="outline"
                        className={STATUS_TONE_CLASS[VOIDED_BADGE.tone]}
                      >
                        {VOIDED_BADGE.label}
                      </Badge>
                    ) : null}
                    <ChevronRight
                      className="size-4 shrink-0 text-muted-foreground"
                      aria-hidden
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <LoadMoreButton
        canLoadMore={canLoadMore}
        isLoadingMore={isLoadingMore}
        onLoadMore={loadMore}
      />
    </div>
  );
};
