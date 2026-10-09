"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Id } from "@/convex/_generated/dataModel";
import { todayInColombia } from "@/convex/lib/dates";
import { dateText } from "@/convex/lib/field_text";
import type { FormSection } from "@/convex/lib/form_types";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";
import { useProjectId } from "@/packages/projects/store/use-project-id";
import { Plus, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type MouseEvent, type ReactNode, useMemo } from "react";

import { useListEntries } from "../api";
import { ENTITY_ICONS } from "../lib/field-catalog";
import {
  entryColumns,
  isNumericColumn,
  loadedCountText,
  phoneRowDetails,
  responseCells,
} from "../lib/response-columns";
import { entriesQueryArgs } from "../lib/response-filters";
import { formRoutes } from "../lib/routes";
import { INACTIVE_BADGE, STATUS_TONE_CLASS } from "../lib/status";
import { useEntriesFilters } from "../store/use-entries-filters";
import { ListEmpty } from "./list-empty";
import { LoadMoreButton } from "./load-more-button";

type EntryRow = ReturnType<typeof useListEntries>["data"][number];

const HEAD_CLASS = "h-9 px-3 text-ui font-normal text-muted-foreground";

interface EntriesTableProps {
  formId: Id<"forms">;
  /** Las secciones de la versión publicada del listado. */
  sections: FormSection[];
  titleFieldId: string | undefined;
  /** Si puede añadir elementos ahora: publicado, sin archivar, con la
   *  llave. */
  canAdd: boolean;
  /** El estado y el código del listado, sobre el recuento. */
  lead?: ReactNode;
}

const InactiveBadge = () => (
  <Badge variant="outline" className={STATUS_TONE_CLASS[INACTIVE_BADGE.tone]}>
    {INACTIVE_BADGE.label}
  </Badge>
);

/** El día de la última modificación, el de Colombia. */
const updatedText = (row: EntryRow) =>
  dateText(todayInColombia(row.updatedAt ?? row._creationTime));

const TableLoading = () => (
  <div
    aria-busy="true"
    aria-live="polite"
    className="divide-y divide-border/60"
  >
    <span className="sr-only">Cargando los elementos…</span>
    {Array.from({ length: 6 }, (_, index) => index).map((index) => (
      <div key={index} className="flex items-center gap-4 px-3 py-3">
        <Skeleton className="h-3.5 w-40" />
        <Skeleton className="hidden h-3.5 flex-1 md:block" />
        <Skeleton className="h-3.5 w-20" />
      </div>
    ))}
  </div>
);

/**
 * Los elementos de un listado, por título (`03 §2.3`).
 *
 * La búsqueda y «Mostrar inactivos» viven en la dirección. La búsqueda es del
 * servidor —un listado de personal puede tener cientos de filas— y pasa por
 * `useDebounce` para no pedir una consulta por letra.
 */
export const EntriesTable = ({
  formId,
  sections,
  titleFieldId,
  canAdd,
  lead,
}: EntriesTableProps) => {
  const projectId = useProjectId();
  const router = useRouter();
  const [filters, setFilters] = useEntriesFilters();
  const search = useDebounce(filters.search, 500);

  const columns = useMemo(
    () => entryColumns(sections, titleFieldId),
    [sections, titleFieldId],
  );

  const {
    data: rows,
    isLoading,
    isLoadingMore,
    canLoadMore,
    loadMore,
  } = useListEntries(
    entriesQueryArgs(formId, {
      search,
      includeInactive: filters.includeInactive,
    }),
  );

  const trimmed = search.trim();
  const hrefOf = (row: EntryRow) =>
    formRoutes.response(projectId, formId, row._id);

  const openRow = (event: MouseEvent<HTMLTableRowElement>, row: EntryRow) => {
    if ((event.target as HTMLElement).closest("a, button")) return;
    router.push(hrefOf(row));
  };

  const addButton = canAdd ? (
    <Button size="sm" asChild>
      <Link href={formRoutes.newEntry(projectId, formId)}>
        <Plus />
        Añadir elemento
      </Link>
    </Button>
  ) : null;

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="min-w-0 space-y-1">
          {lead}
          {!isLoading ? (
            <p className="text-ui tabular-nums text-muted-foreground">
              {rows.length === 0
                ? "Sin elementos"
                : loadedCountText(rows.length, "catalog", canLoadMore)}
            </p>
          ) : null}
        </div>
        <div className="flex flex-col gap-2 sm:ml-auto sm:flex-row sm:items-center">
          <div className="relative min-w-0 sm:w-72">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Buscar por título"
              aria-label="Buscar por título"
              value={filters.search}
              onChange={(event) =>
                setFilters({ search: event.target.value || null })
              }
            />
          </div>
          <label className="flex h-9 shrink-0 items-center gap-2 text-ui text-muted-foreground">
            <Switch
              checked={filters.includeInactive}
              onCheckedChange={(checked) =>
                setFilters({ includeInactive: checked || null })
              }
            />
            Mostrar inactivos
          </label>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border bg-card">
        {isLoading ? (
          <TableLoading />
        ) : rows.length === 0 ? (
          trimmed !== "" ? (
            <ListEmpty
              icon={Search}
              title={`Ningún elemento coincide con «${trimmed}».`}
              hint={
                filters.includeInactive
                  ? "Prueba con otra palabra."
                  : "Prueba con otra palabra, o incluye los inactivos."
              }
            />
          ) : (
            <ListEmpty
              icon={ENTITY_ICONS.entry}
              title={
                filters.includeInactive
                  ? "Este listado todavía no tiene elementos."
                  : "Este listado no tiene elementos activos."
              }
              hint={
                canAdd
                  ? "Añade el primero: los formatos que lo relacionan lo ofrecerán al diligenciar."
                  : "Cuando se añadan, aparecerán aquí."
              }
              action={addButton}
            />
          )
        ) : (
          <>
            {/* Escritorio y tableta: la tabla. */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className={HEAD_CLASS}>Título</TableHead>
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
                    <TableHead className={cn(HEAD_CLASS, "w-36 text-right")}>
                      Modificado
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => {
                    const isInactive = row.active === false;
                    return (
                      <TableRow
                        key={row._id}
                        className={cn(
                          "cursor-pointer",
                          isInactive && "text-muted-foreground",
                        )}
                        onClick={(event) => openRow(event, row)}
                      >
                        <TableCell className="px-3 py-2.5 whitespace-normal">
                          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <Link
                              href={hrefOf(row)}
                              className="rounded-sm text-sm font-medium break-words focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                            >
                              {row.title || "Elemento sin título"}
                            </Link>
                            {isInactive ? <InactiveBadge /> : null}
                          </span>
                        </TableCell>
                        {responseCells(columns, row.columns).map((cell) => (
                          <TableCell
                            key={cell.fieldId}
                            className={cn(
                              "max-w-72 px-3 py-2.5 text-sm whitespace-normal",
                              cell.numeric && "text-right tabular-nums",
                            )}
                          >
                            <span className="line-clamp-2 break-words">
                              {cell.text || (
                                <span className="text-muted-foreground/60">
                                  —
                                </span>
                              )}
                            </span>
                          </TableCell>
                        ))}
                        <TableCell className="px-3 py-2.5 text-right text-ui tabular-nums text-muted-foreground">
                          {updatedText(row)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Teléfono: una fila pulsable por elemento, con lo esencial. */}
            <ul className="divide-y divide-border/60 md:hidden">
              {rows.map((row) => {
                const isInactive = row.active === false;
                const details = phoneRowDetails(
                  responseCells(columns, row.columns),
                );
                return (
                  <li key={row._id}>
                    <Link
                      href={hrefOf(row)}
                      className={cn(
                        "block min-h-14 space-y-1 px-3 py-3 transition-colors hover:bg-accent/30 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none focus-visible:ring-inset",
                        isInactive && "text-muted-foreground",
                      )}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="min-w-0 text-sm font-medium break-words">
                          {row.title || "Elemento sin título"}
                        </span>
                        {isInactive ? <InactiveBadge /> : null}
                      </span>
                      {details.map((cell) => (
                        <span
                          key={cell.fieldId}
                          className="block truncate text-ui"
                        >
                          <span className="text-muted-foreground">
                            {cell.label}:{" "}
                          </span>
                          {cell.text}
                        </span>
                      ))}
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
