"use client";

import { DateRangePicker } from "@/components/harmony/date-range-picker";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import type { Id } from "@/convex/_generated/dataModel";
import { X } from "lucide-react";

import { toDate, toDateValue } from "../lib/date-value";
import type { RelatedCatalog } from "../lib/response-filters";
import { RelatedEntryFilter } from "./related-entry-filter";

interface ResponsesFiltersBarProps {
  /** Las fechas ya enderezadas por `responsesQueryArgs`. */
  from: string | undefined;
  to: string | undefined;
  mine: boolean;
  entryId: Id<"formResponses"> | undefined;
  /** Quien sólo ve las suyas no tiene nada que filtrar con «Sólo las mías». */
  canViewAll: boolean;
  catalogs: readonly RelatedCatalog[];
  hasFilters: boolean;
  onChange: (next: {
    from?: string | null;
    to?: string | null;
    mine?: boolean | null;
    entryId?: string | null;
  }) => void;
  onClear: () => void;
}

/**
 * Los filtros del listado de respuestas: el rango de fechas, «Sólo las mías»
 * y el elemento relacionado. Todos escriben en la dirección; aquí sólo se
 * pintan.
 */
export const ResponsesFiltersBar = ({
  from,
  to,
  mine,
  entryId,
  canViewAll,
  catalogs,
  hasFilters,
  onChange,
  onClear,
}: ResponsesFiltersBarProps) => (
  // Los cortes son del contenedor de `ResponsesTable`. Envuelve en vez de
  // empujar el último control fuera del borde.
  <div className="flex min-w-0 flex-col gap-2 @md:flex-row @md:flex-wrap @md:items-center @4xl:ml-auto @4xl:justify-end">
    <DateRangePicker
      className="w-full @md:w-64"
      align="end"
      from={toDate(from)}
      to={toDate(to)}
      clearOnStartClick
      onSelect={(range) =>
        onChange({
          from: range?.from ? toDateValue(range.from) : null,
          to: range?.to ? toDateValue(range.to) : null,
        })
      }
    />
    {catalogs.length > 0 ? (
      <RelatedEntryFilter
        className="w-full @md:w-auto"
        catalogs={catalogs}
        value={entryId}
        onChange={(next) => onChange({ entryId: next })}
      />
    ) : null}
    <div className="flex items-center justify-between gap-3 @md:justify-start">
      {canViewAll ? (
        <label className="flex h-9 shrink-0 items-center gap-2 text-ui text-muted-foreground">
          <Switch
            checked={mine}
            onCheckedChange={(checked) => onChange({ mine: checked || null })}
          />
          Sólo las mías
        </label>
      ) : null}
      {hasFilters ? (
        <Button variant="ghost" size="sm" onClick={onClear}>
          <X />
          Quitar filtros
        </Button>
      ) : null}
    </div>
  </div>
);
