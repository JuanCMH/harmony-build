"use client";

import { PageLoading } from "@/components/harmony/page-loading";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import type { Id } from "@/convex/_generated/dataModel";
import { todayInColombia } from "@/convex/lib/dates";
import { flattenFields } from "@/convex/lib/form_evaluation";
import type { FormKind, FormSection } from "@/convex/lib/form_types";
import type { ResultConfig, ResultType } from "@/convex/lib/result_types";
import { useConfirm } from "@/hooks/use-confirm";
import { handleConvexErrorCallback } from "@/lib/convex-error-handler";
import { cn } from "@/lib/utils";
import { Info, Lock, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { type ReactNode, useMemo } from "react";
import { toast } from "sonner";

import { useComputeFormResults, useRemoveFormResult } from "../api";
import { RESULT_CATALOG } from "../lib/result-catalog";
import { arrangeResults } from "../lib/results-layout";
import { resolveRange } from "../lib/results-range";
import { suggestedHeight } from "../lib/suggested-height";
import { HEIGHT_SPAN, SIZE_SPAN, WIDGET_GRID } from "../lib/widget-grid";
import { useResultEditorSheet } from "../store/use-result-editor-sheet";
import { useResultsRange } from "../store/use-results-range";
import { ListEmpty } from "./list-empty";
import { ResultCard } from "./result-card";
import { ResultsRangeBar } from "./results-range-bar";
import { ResultEditorSheet } from "./sheets/result-editor-sheet";

/** El orden en que se enseñan: las cifras juntas arriba, después las
 *  gráficas y al final lo que pide la fila. En el orden en que se crearon,
 *  una cifra suelta entre dos tablas dejaba media fila vacía. */
const ORDER: readonly ResultType[] = [
  "indicator",
  "composite",
  "tracking",
  "coverage",
  "trend",
  "compliance",
  "distribution",
  "findings",
  "expirations",
  "table",
  "heatmap",
];

interface ResultsBoardProps {
  formId: Id<"forms">;
  kind: FormKind;
  /** Las secciones de la versión publicada. */
  sections: readonly FormSection[];
  /** `editForms`: define los resultados. */
  canEdit: boolean;
  /** Lo que la página añade al menú de cada tarjeta: «Añadir al tablero». El
   *  tablero es de otro paquete, que importa a este y no al revés (`02 §3`). */
  menuItems?: (result: {
    _id: Id<"formResults">;
    name: string;
    config: ResultConfig;
  }) => ReactNode;
}

/**
 * Los resultados de un formato: lo que se calcula de sus respuestas en el
 * rango de fechas elegido, y —para quien construye el formato— dónde se
 * definen.
 */
export const ResultsBoard = ({
  formId,
  kind,
  sections,
  canEdit,
  menuItems,
}: ResultsBoardProps) => {
  const today = todayInColombia(Date.now());
  const [rawRange, setRange] = useResultsRange();
  const range = resolveRange(rawRange, today);
  const fields = useMemo(() => flattenFields(sections), [sections]);

  const { data } = useComputeFormResults({ formId, ...range, today });
  const { mutate: removeResult } = useRemoveFormResult();
  const [editing, setEditing] = useResultEditorSheet();
  const [ConfirmDialog, confirm] = useConfirm({
    title: "Eliminar resultado",
    message:
      "El resultado dejará de verse aquí y en el tablero. Las respuestas del formato no se tocan.",
    type: "critical",
  });

  const handleRemove = async (id: Id<"formResults">) => {
    if (!(await confirm())) return;
    removeResult(
      { id },
      {
        onSuccess: () => toast.success("Resultado eliminado correctamente"),
        onError: (error) => handleConvexErrorCallback(error),
      },
    );
  };

  const body = () => {
    if (data === undefined)
      return (
        <div className={WIDGET_GRID} aria-busy="true">
          <span className="sr-only">Calculando los resultados…</span>
          <Skeleton className="row-span-2 rounded-lg lg:col-span-4" />
          <Skeleton className="row-span-2 rounded-lg lg:col-span-4" />
          <Skeleton className="row-span-2 rounded-lg lg:col-span-4" />
          <Skeleton className="row-span-3 rounded-lg lg:col-span-12" />
        </div>
      );
    if (data === null)
      return (
        <PageLoading
          icon={Lock}
          text="Los resultados resumen las respuestas de todos: hace falta el permiso para verlas."
        />
      );
    if (data.results.length === 0)
      return (
        <div className="rounded-lg border bg-card">
          <ListEmpty
            icon={RESULT_CATALOG.trend.icon}
            title="Este formato todavía no tiene resultados."
            hint="Un resultado es lo que se calcula de sus respuestas: una cifra, una tendencia, una tabla."
            action={
              canEdit ? (
                <Button size="sm" onClick={() => setEditing("new")}>
                  <Plus />
                  Añadir resultado
                </Button>
              ) : null
            }
          />
        </div>
      );

    const sorted = [...data.results].sort(
      (a, b) => ORDER.indexOf(a.config.type) - ORDER.indexOf(b.config.type),
    );
    const arranged = arrangeResults(
      sorted.map((result) => ({
        type: result.config.type,
        height: suggestedHeight(
          result.config.type,
          result.problem ? undefined : result.data,
        ),
      })),
    ).map(({ index, size, height }) => ({
      result: sorted[index],
      size,
      height,
    }));

    return (
      <>
        {data.capped ? (
          <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <Info aria-hidden className="mt-px size-3.5 shrink-0" />
            El rango tiene más respuestas de las que se calculan de una vez: las
            cifras son de las más recientes. Acorta el rango para verlas todas.
          </p>
        ) : null}
        {/* Aquí nadie los ordena a mano: se acomodan solos, sin huecos, y
            cada uno con el alto en que caben hoy sus datos. */}
        <div className={WIDGET_GRID}>
          {arranged.map(({ result, size, height }) => (
            <ResultCard
              key={result._id}
              name={result.name}
              caption={RESULT_CATALOG[result.config.type].label}
              config={result.config}
              data={result.data}
              problem={result.problem}
              today={today}
              range={range}
              height={height}
              className={cn(SIZE_SPAN[size], HEIGHT_SPAN[height])}
              actions={
                // Una sola entrada para lo propio de la tarjeta (`03 §2.3`):
                // con tres botones sueltos la cabecera se partía en dos.
                canEdit || menuItems ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="iconSm"
                        className="text-muted-foreground"
                        aria-label={`Acciones de ${result.name}`}
                      >
                        <MoreHorizontal />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-52">
                      {menuItems?.(result)}
                      {canEdit ? (
                        <>
                          <DropdownMenuItem onSelect={() => setEditing(result)}>
                            <Pencil />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onSelect={() => handleRemove(result._id)}
                          >
                            <Trash2 />
                            Eliminar
                          </DropdownMenuItem>
                        </>
                      ) : null}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : null
              }
            />
          ))}
        </div>
      </>
    );
  };

  return (
    // 12px entre los controles y la retícula, como en los listados; entre
    // tarjetas, 16.
    <div className="space-y-3">
      {/* Un listado no se mira por fechas: sus vencimientos son de hoy. */}
      {kind !== "catalog" ? (
        <ResultsRangeBar
          range={range}
          today={today}
          align="start"
          onChange={setRange}
          className="w-full sm:w-auto"
        />
      ) : null}
      {body()}

      <ResultEditorSheet
        formId={formId}
        kind={kind}
        fields={fields}
        result={editing && editing !== "new" ? editing : undefined}
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
      />
      <ConfirmDialog />
    </div>
  );
};
