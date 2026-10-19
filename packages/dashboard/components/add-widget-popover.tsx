"use client";

import { SearchableSelect } from "@/components/harmony/searchable-select";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { DEFAULT_WIDGET } from "@/convex/lib/widget_layout";
import type { Id } from "@/convex/_generated/dataModel";
import { useGetFormResults, useGetForms } from "@/packages/forms/api";
import { newId } from "@/packages/forms/lib/new-id";
import { RESULT_CATALOG } from "@/packages/forms/lib/result-catalog";
import { formRoutes } from "@/packages/forms/lib/routes";
import { useProjectId } from "@/packages/projects/store/use-project-id";
import { ArrowUpRight, Check, Plus } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import type { DraftWidget } from "../lib/dashboard-draft";

interface AddWidgetPopoverProps {
  /** Los resultados que la pestaña ya tiene: se marcan, no se repiten. */
  taken: ReadonlySet<Id<"formResults">>;
  onAdd: (widget: DraftWidget) => void;
}

/**
 * La casilla que añade un resultado a la pestaña: primero el formato, después
 * uno de los suyos. Si el que se busca no existe todavía, lleva a donde se
 * crea: los resultados de ese formato.
 */
export const AddWidgetPopover = ({ taken, onAdd }: AddWidgetPopoverProps) => {
  const projectId = useProjectId();
  const [open, setOpen] = useState(false);
  const [formId, setFormId] = useState<Id<"forms"> | null>(null);
  const { data: records } = useGetForms(
    open ? { projectId, kind: "record" } : "skip",
  );
  const { data: catalogs } = useGetForms(
    open ? { projectId, kind: "catalog" } : "skip",
  );
  const { data: trackings } = useGetForms(
    open ? { projectId, kind: "tracking" } : "skip",
  );
  const { data: results } = useGetFormResults(formId ? { formId } : "skip");

  const forms = useMemo(
    () =>
      [...(records ?? []), ...(trackings ?? []), ...(catalogs ?? [])].filter(
        (form) => form.status === "published",
      ),
    [records, trackings, catalogs],
  );
  const form = forms.find((candidate) => candidate._id === formId);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="row-span-2 flex h-full w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-ui text-muted-foreground transition-colors hover:border-h-indigo/50 hover:bg-h-indigo/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 lg:col-span-4"
        >
          <span className="flex size-9 items-center justify-center rounded-xl border border-h-indigo/10 bg-h-indigo/10 text-h-indigo">
            <Plus className="size-4" />
          </span>
          Añadir resultado
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-88 max-w-[calc(100vw-2rem)] space-y-3"
      >
        <div className="space-y-1">
          <p className="text-sm font-medium">Añadir un resultado</p>
          <p className="text-xs text-muted-foreground">
            Elige el formato y después lo que quieres ver de él.
          </p>
        </div>
        <SearchableSelect
          className="w-full"
          aria-label="Formato del resultado"
          placeholder="Elige un formato o un listado"
          searchPlaceholder="Buscar por nombre o código…"
          value={formId ?? undefined}
          options={forms.map((candidate) => ({
            value: candidate._id,
            label: candidate.name,
            description: candidate.code,
          }))}
          onValueChange={(value) => setFormId(value as Id<"forms">)}
        />
        {form ? (
          <div className="space-y-2">
            {results === undefined ? (
              <p className="text-xs text-muted-foreground">Cargando…</p>
            ) : results === null || results.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Este formato todavía no tiene resultados definidos.
              </p>
            ) : (
              <ul className="max-h-64 space-y-0.5 overflow-y-auto">
                {results.map((result) => {
                  const kind = RESULT_CATALOG[result.config.type];
                  const isTaken = taken.has(result._id);
                  return (
                    <li key={result._id}>
                      <button
                        type="button"
                        disabled={isTaken}
                        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-ring/50 disabled:opacity-60 disabled:hover:bg-transparent"
                        onClick={() => {
                          onAdd({
                            id: newId(),
                            resultId: result._id,
                            ...DEFAULT_WIDGET[result.config.type],
                            name: result.name,
                            type: result.config.type,
                            formId: form._id,
                            formName: form.name,
                          });
                          setOpen(false);
                        }}
                      >
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-h-indigo/10 bg-h-indigo/10 text-h-indigo">
                          <kind.icon aria-hidden className="size-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm">
                            {result.name}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {isTaken ? "Ya está en esta pestaña" : kind.label}
                          </span>
                        </span>
                        {isTaken ? (
                          <Check
                            aria-hidden
                            className="size-4 text-muted-foreground"
                          />
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            <Button variant="ghost" size="sm" className="w-full" asChild>
              {/* En otra pestaña del navegador: el tablero a medio editar no
                  se pierde. */}
              <Link
                href={formRoutes.results(projectId, form._id)}
                target="_blank"
              >
                Crear uno nuevo en este formato
                <ArrowUpRight />
              </Link>
            </Button>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
};
