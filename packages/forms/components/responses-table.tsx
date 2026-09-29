"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Id } from "@/convex/_generated/dataModel";
import { dateText } from "@/convex/lib/field_text";
import type { FormSection } from "@/convex/lib/form_types";
import { cn } from "@/lib/utils";
import { useProjectId } from "@/packages/projects/store/use-project-id";
import { Info, PenLine, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type MouseEvent, type ReactNode, useMemo } from "react";

import { useListResponses } from "../api";
import { MEANING_DOT } from "../lib/checklist-styles";
import { ENTITY_ICONS } from "../lib/field-catalog";
import {
  type ResponseCell,
  cellParts,
  isNumericColumn,
  loadedCountText,
  phoneRowDetails,
  responseCells,
  responseColumns,
} from "../lib/response-columns";
import {
  hasResponseFilters,
  relatedCatalogs,
  responsesQueryArgs,
} from "../lib/response-filters";
import { timeText } from "../lib/response-reading";
import { formRoutes } from "../lib/routes";
import { STATUS_TONE_CLASS, VOIDED_BADGE } from "../lib/status";
import { useResponsesFilters } from "../store/use-responses-filters";
import { ListEmpty } from "./list-empty";
import { LoadMoreButton } from "./load-more-button";
import { ResponsesFiltersBar } from "./responses-filters-bar";

type ResponseRow = ReturnType<typeof useListResponses>["data"][number];

const HEAD_CLASS = "h-9 px-3 text-ui font-normal text-muted-foreground";

const LINK_FOCUS =
  "rounded-sm focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50";

interface ResponsesTableProps {
  formId: Id<"forms">;
  /** Las secciones de la versión publicada: de ellas salen los encabezados y
   *  los listados por los que se puede filtrar. */
  sections: FormSection[];
  /** `viewResponses`: ve las de todos. Sin ella, el servidor da sólo las
   *  suyas. */
  canViewAll: boolean;
  /** Si puede diligenciarlo ahora: publicado, sin archivar, con la llave. */
  canFill: boolean;
  /** El estado y el código del formato, sobre el recuento. */
  lead?: ReactNode;
}

/** El texto de una celda; en una lista de chequeo con hallazgos, los no
 *  conformes en rojo y con su punto (el color nunca va solo, `03 §6.1`). */
const CellText = ({ cell }: { cell: ResponseCell }) => {
  if (cell.text === "")
    return <span className="text-muted-foreground/60">—</span>;
  if (!cell.hasFindings) return <>{cell.text}</>;
  return (
    <>
      {cellParts(cell).map((part, index) => (
        <span key={part.text}>
          {index > 0 ? " · " : null}
          {part.isFinding ? (
            <span className="inline-flex items-center gap-1 font-medium text-red-700 dark:text-red-400">
              <span
                aria-hidden
                className={cn("size-1.5 rounded-full", MEANING_DOT.fail)}
              />
              {part.text}
            </span>
          ) : (
            part.text
          )}
        </span>
      ))}
    </>
  );
};

const VoidedBadge = () => (
  <Badge variant="outline" className={STATUS_TONE_CLASS[VOIDED_BADGE.tone]}>
    {VOIDED_BADGE.label}
  </Badge>
);

const TableLoading = () => (
  <div aria-busy="true" aria-live="polite" className="divide-y divide-border/60">
    <span className="sr-only">Cargando las respuestas…</span>
    {Array.from({ length: 6 }, (_, index) => index).map((index) => (
      <div key={index} className="flex items-center gap-4 px-3 py-3">
        <Skeleton className="h-3.5 w-28" />
        <Skeleton className="h-3.5 w-32" />
        <Skeleton className="hidden h-3.5 flex-1 md:block" />
        <Skeleton className="h-3.5 w-8" />
      </div>
    ))}
  </div>
);

/**
 * Las respuestas de un formato, lo más reciente primero (`03 §2.3`).
 *
 * Los filtros viven en la dirección. En escritorio es una tabla con las
 * columnas que el formato marcó para el listado; en el teléfono, una fila
 * pulsable por respuesta con la fecha, quién y sus tres primeros datos.
 */
export const ResponsesTable = ({
  formId,
  sections,
  canViewAll,
  canFill,
  lead,
}: ResponsesTableProps) => {
  const projectId = useProjectId();
  const router = useRouter();
  const [filters, setFilters] = useResponsesFilters();

  const args = responsesQueryArgs(formId, filters, canViewAll);
  const isFiltering = hasResponseFilters(args);
  const columns = useMemo(() => responseColumns(sections), [sections]);
  const catalogs = useMemo(() => relatedCatalogs(sections), [sections]);

  const {
    data: rows,
    isLoading,
    isLoadingMore,
    canLoadMore,
    loadMore,
  } = useListResponses(args);

  const hrefOf = (row: ResponseRow) =>
    formRoutes.response(projectId, formId, row._id);

  const clearFilters = () =>
    setFilters({ from: null, to: null, mine: null, entryId: null });

  /** La fila entera abre la respuesta; el enlace de la fecha es el que se
   *  alcanza con el teclado y el que se abre en otra pestaña. */
  const openRow = (event: MouseEvent<HTMLTableRowElement>, row: ResponseRow) => {
    if ((event.target as HTMLElement).closest("a, button")) return;
    router.push(hrefOf(row));
  };

  const fillButton = canFill ? (
    <Button size="sm" asChild>
      <Link href={formRoutes.fill(projectId, formId)}>
        <PenLine />
        Diligenciar
      </Link>
    </Button>
  ) : null;

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <div className="min-w-0 space-y-1">
          {lead}
          {!isLoading ? (
            <p className="text-ui tabular-nums text-muted-foreground">
              {rows.length === 0
                ? "Sin respuestas"
                : loadedCountText(rows.length, "record", canLoadMore)}
            </p>
          ) : null}
          {!canViewAll ? (
            <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <Info aria-hidden className="mt-px size-3.5 shrink-0" />
              Ves sólo las respuestas que tú diligenciaste.
            </p>
          ) : null}
        </div>
        <ResponsesFiltersBar
          from={args.from}
          to={args.to}
          mine={args.mine === true}
          entryId={args.targetResponseId}
          canViewAll={canViewAll}
          catalogs={catalogs}
          hasFilters={isFiltering}
          onChange={(next) => setFilters(next)}
          onClear={clearFilters}
        />
      </div>

      <div className="overflow-hidden rounded-lg border bg-card">
        {isLoading ? (
          <TableLoading />
        ) : rows.length === 0 ? (
          isFiltering ? (
            <ListEmpty
              icon={SlidersHorizontal}
              title="Ninguna respuesta coincide con los filtros."
              hint="Amplía el rango de fechas o quita algún filtro."
              action={
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Quitar filtros
                </Button>
              }
            />
          ) : (
            <ListEmpty
              icon={ENTITY_ICONS.response}
              title={
                canViewAll
                  ? "Todavía nadie ha diligenciado este formato."
                  : "Todavía no has diligenciado este formato."
              }
              hint={
                canFill
                  ? "Cada vez que se diligencie aparecerá aquí, lo más reciente primero."
                  : "Las respuestas aparecerán aquí, lo más reciente primero."
              }
              action={fillButton}
            />
          )
        ) : (
          <>
            {/* Escritorio y tableta: la tabla. */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className={cn(HEAD_CLASS, "w-44")}>
                      Fecha
                    </TableHead>
                    <TableHead className={HEAD_CLASS}>Diligenciada por</TableHead>
                    {columns.map((column) => (
                      <TableHead
                        key={column.fieldId}
                        className={cn(
                          HEAD_CLASS,
                          isNumericColumn(column) && "text-right",
                        )}
                      >
                        {column.label}
                      </TableHead>
                    ))}
                    <TableHead className={cn(HEAD_CLASS, "w-20 text-right")}>
                      Versión
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => {
                    const isVoided = row.status === "voided";
                    return (
                      <TableRow
                        key={row._id}
                        className={cn(
                          "cursor-pointer",
                          isVoided && "text-muted-foreground",
                        )}
                        onClick={(event) => openRow(event, row)}
                      >
                        <TableCell className="px-3 py-2.5 align-top whitespace-normal">
                          <Link
                            href={hrefOf(row)}
                            className={cn(
                              "block text-sm font-medium tabular-nums",
                              isVoided && "line-through",
                              LINK_FOCUS,
                            )}
                          >
                            {dateText(row.date)}
                            <span className="ml-2 font-normal text-muted-foreground">
                              {timeText(row._creationTime)}
                            </span>
                          </Link>
                          {isVoided ? (
                            <div className="mt-1 space-y-1">
                              <VoidedBadge />
                              {row.voided?.reason ? (
                                <p
                                  className="line-clamp-2 max-w-48 text-xs"
                                  title={row.voided.reason}
                                >
                                  {row.voided.reason}
                                </p>
                              ) : null}
                            </div>
                          ) : null}
                        </TableCell>
                        <TableCell className="max-w-56 truncate px-3 py-2.5 align-top text-sm">
                          {row.author.name}
                        </TableCell>
                        {responseCells(columns, row.columns).map((cell) => (
                          <TableCell
                            key={cell.fieldId}
                            className={cn(
                              "max-w-72 px-3 py-2.5 align-top text-sm whitespace-normal",
                              cell.numeric && "text-right tabular-nums",
                            )}
                          >
                            <span className="line-clamp-2 break-words">
                              <CellText cell={cell} />
                            </span>
                          </TableCell>
                        ))}
                        <TableCell className="px-3 py-2.5 text-right align-top text-ui tabular-nums text-muted-foreground">
                          v{row.versionNumber}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Teléfono: una fila pulsable por respuesta, con lo esencial. */}
            <ul className="divide-y divide-border/60 md:hidden">
              {rows.map((row) => {
                const isVoided = row.status === "voided";
                const details = phoneRowDetails(
                  responseCells(columns, row.columns),
                );
                return (
                  <li key={row._id}>
                    <Link
                      href={hrefOf(row)}
                      className={cn(
                        "block min-h-14 space-y-1 px-3 py-3 transition-colors hover:bg-accent/30 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none focus-visible:ring-inset",
                        isVoided && "text-muted-foreground",
                      )}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span
                          className={cn(
                            "text-sm font-medium tabular-nums",
                            isVoided && "line-through",
                          )}
                        >
                          {dateText(row.date)}
                          <span className="ml-2 font-normal text-muted-foreground">
                            {timeText(row._creationTime)}
                          </span>
                        </span>
                        {isVoided ? <VoidedBadge /> : null}
                      </span>
                      <span className="block truncate text-ui text-muted-foreground">
                        {row.author.name}
                      </span>
                      {details.map((cell) => (
                        <span
                          key={cell.fieldId}
                          className="block truncate text-ui"
                        >
                          <span className="text-muted-foreground">
                            {cell.label}:{" "}
                          </span>
                          <CellText cell={cell} />
                        </span>
                      ))}
                      {isVoided && row.voided?.reason ? (
                        <span className="block truncate text-xs">
                          Motivo: {row.voided.reason}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
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
