"use client";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Id } from "@/convex/_generated/dataModel";
import { todayInColombia } from "@/convex/lib/dates";
import { dateText } from "@/convex/lib/field_text";
import { TRACKING_LIST_LIMIT, isOverdue } from "@/convex/lib/tracking";
import { cn } from "@/lib/utils";
import { useProjectId } from "@/packages/projects/store/use-project-id";
import { Info } from "lucide-react";
import Link from "next/link";
import { type ReactNode, useMemo } from "react";

import { useListTrackings } from "../api";
import { ENTITY_ICONS } from "../lib/field-catalog";
import { formRoutes } from "../lib/routes";
import { STATUS_TONE_CLASS, trackingStatusBadge } from "../lib/status";
import { useTrackingsView } from "../store/use-trackings-view";
import { ListEmpty } from "./list-empty";

const HEAD_CLASS = "h-9 px-3 text-ui font-normal text-muted-foreground";

const LINK_FOCUS =
  "rounded-sm focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50";

interface TrackingsTableProps {
  /** Sólo los de este seguimiento; sin él, los de todo el proyecto. */
  formId?: Id<"forms">;
  /** Lo que va sobre el recuento: el estado del formato, o nada. */
  lead?: ReactNode;
  /** Lo que resuelve el vacío: «Abrir asunto». */
  emptyAction?: ReactNode;
}

/**
 * La bandeja de seguimientos: los asuntos abiertos, los vencidos primero, o
 * los cerrados (`docs/plans/2026-10-10-seguimiento-de-hallazgos-design.md
 * §6`).
 *
 * Los abiertos no dependen de un rango de fechas: uno de hace ocho meses que
 * sigue abierto es justo el que hay que ver.
 */
export const TrackingsTable = ({
  formId,
  lead,
  emptyAction,
}: TrackingsTableProps) => {
  const projectId = useProjectId();
  const [view, setView] = useTrackingsView();
  const state = view === "cerrados" ? "closed" : "open";
  const { data, isLoading } = useListTrackings({ projectId, state, formId });

  const today = useMemo(() => todayInColombia(Date.now()), []);
  const rows = data?.rows ?? [];
  const overdue = rows.filter((row) => isOverdue(row, today)).length;

  const count = isLoading
    ? null
    : `${rows.length.toLocaleString("es-CO")} ${
        state === "open"
          ? rows.length === 1
            ? "asunto abierto"
            : "asuntos abiertos"
          : rows.length === 1
            ? "asunto cerrado"
            : "asuntos cerrados"
      }${overdue > 0 ? ` · ${overdue} ${overdue === 1 ? "vencido" : "vencidos"}` : ""}`;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          {lead}
          <p className="text-sm text-muted-foreground tabular-nums">
            {count ?? "Cargando…"}
          </p>
        </div>
        <Tabs
          value={view}
          onValueChange={(next) =>
            void setView(next === "cerrados" ? "cerrados" : "abiertos")
          }
        >
          <TabsList>
            <TabsTrigger value="abiertos" className="min-w-fit px-3">
              Abiertos
            </TabsTrigger>
            <TabsTrigger value="cerrados" className="min-w-fit px-3">
              Cerrados
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {data?.capped ? (
        <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <Info aria-hidden className="mt-px size-3.5 shrink-0" />
          Hay más de {TRACKING_LIST_LIMIT} asuntos: se enseñan los más
          recientes.
        </p>
      ) : null}

      {/* Los cortes se miden contra el espacio de la bandeja, no contra la
          ventana: el menú lateral le quita 256px (`03 §2.3`). */}
      <div className="@container rounded-lg border bg-card">
        {isLoading ? (
          <div aria-busy="true" className="divide-y divide-border/60">
            <span className="sr-only">Cargando los asuntos…</span>
            {[0, 1, 2, 3].map((index) => (
              <div key={index} className="flex items-center gap-4 px-3 py-3">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-3.5 flex-1" />
                <Skeleton className="h-3.5 w-20" />
              </div>
            ))}
          </div>
        ) : rows.length === 0 ? (
          <ListEmpty
            icon={ENTITY_ICONS.issue}
            title={
              state === "open"
                ? "No hay asuntos abiertos."
                : "Todavía no se ha cerrado ningún asunto."
            }
            hint={
              state === "open"
                ? "Lo que se abra aparecerá aquí hasta que se complete su última etapa."
                : undefined
            }
            action={state === "open" ? emptyAction : undefined}
          />
        ) : (
          <>
            {/* Con sitio para las columnas: la tabla. La que no cabe pasa a
                la segunda línea del asunto. */}
            <div className="hidden @3xl:block">
              <Table className="table-fixed">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className={cn(HEAD_CLASS, "w-28")}>
                      Consecutivo
                    </TableHead>
                    <TableHead className={HEAD_CLASS}>Asunto</TableHead>
                    {formId ? null : (
                      <TableHead
                        className={cn(
                          HEAD_CLASS,
                          "hidden w-48 @7xl:table-cell",
                        )}
                      >
                        Seguimiento
                      </TableHead>
                    )}
                    <TableHead className={cn(HEAD_CLASS, "w-36")}>
                      {state === "open" ? "Etapa que toca" : "Cerrado el"}
                    </TableHead>
                    <TableHead
                      className={cn(HEAD_CLASS, "hidden w-44 @4xl:table-cell")}
                    >
                      Responsable
                    </TableHead>
                    <TableHead className={cn(HEAD_CLASS, "w-28")}>
                      Compromiso
                    </TableHead>
                    <TableHead className={cn(HEAD_CLASS, "w-28")}>
                      Estado
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => {
                    const badge = trackingStatusBadge(
                      row.status,
                      isOverdue(row, today),
                    );
                    return (
                      <TableRow key={row._id}>
                        <TableCell className="px-3 py-2.5 text-sm tabular-nums">
                          {row.code}
                        </TableCell>
                        <TableCell className="px-3 py-2.5 whitespace-normal">
                          <Link
                            href={formRoutes.response(
                              projectId,
                              row.formId,
                              row._id,
                            )}
                            className={cn(
                              "block text-sm font-medium break-words",
                              LINK_FOCUS,
                            )}
                          >
                            {row.title || "Asunto sin título"}
                          </Link>
                          <p className="text-xs text-muted-foreground tabular-nums">
                            Abierto el {dateText(row.date)} por {row.openedBy}
                          </p>
                          {formId ? null : (
                            <p className="truncate text-xs text-muted-foreground @7xl:hidden">
                              {row.formName}
                            </p>
                          )}
                          {row.responsible ? (
                            <p className="truncate text-xs text-muted-foreground @4xl:hidden">
                              Responsable: {row.responsible}
                            </p>
                          ) : null}
                        </TableCell>
                        {formId ? null : (
                          <TableCell className="hidden truncate px-3 py-2.5 text-ui text-muted-foreground @7xl:table-cell">
                            {row.formName}
                          </TableCell>
                        )}
                        <TableCell className="px-3 py-2.5 text-ui whitespace-normal">
                          {state === "open" ? (
                            <>
                              {row.stage ?? "—"}
                              <span className="block text-xs text-muted-foreground tabular-nums">
                                {row.stagesDone} de {row.stagesTotal} etapas
                              </span>
                            </>
                          ) : row.closedAt !== null ? (
                            <span className="tabular-nums">
                              {dateText(todayInColombia(row.closedAt))}
                            </span>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className="hidden truncate px-3 py-2.5 text-ui @4xl:table-cell">
                          {row.responsible ?? (
                            <span className="text-muted-foreground/60">—</span>
                          )}
                        </TableCell>
                        <TableCell className="px-3 py-2.5 text-ui tabular-nums">
                          {row.dueDate ? (
                            dateText(row.dueDate)
                          ) : (
                            <span className="text-muted-foreground/60">—</span>
                          )}
                        </TableCell>
                        <TableCell className="px-3 py-2.5">
                          <Badge
                            variant="outline"
                            className={STATUS_TONE_CLASS[badge.tone]}
                          >
                            {badge.label}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Sin él: una tarjeta por asunto. */}
            <ul className="divide-y divide-border/60 @3xl:hidden">
              {rows.map((row) => {
                const badge = trackingStatusBadge(
                  row.status,
                  isOverdue(row, today),
                );
                return (
                  <li key={row._id}>
                    <Link
                      href={formRoutes.response(projectId, row.formId, row._id)}
                      className={cn("block space-y-1 px-3 py-3", LINK_FOCUS)}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {row.code}
                        </span>
                        <Badge
                          variant="outline"
                          className={STATUS_TONE_CLASS[badge.tone]}
                        >
                          {badge.label}
                        </Badge>
                      </span>
                      <span className="block text-sm font-medium break-words">
                        {row.title || "Asunto sin título"}
                      </span>
                      <span className="block text-ui text-muted-foreground tabular-nums">
                        {[
                          formId ? null : row.formName,
                          row.stage ? `Toca: ${row.stage}` : null,
                          row.responsible,
                          row.dueDate
                            ? `Para el ${dateText(row.dueDate)}`
                            : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </div>
  );
};
