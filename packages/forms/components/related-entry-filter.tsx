"use client";

import { SEARCHABLE_TRIGGER_CLASS } from "@/components/harmony/searchable-select.utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { Id } from "@/convex/_generated/dataModel";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";
import { CheckIcon, ChevronDownIcon, Loader2, X } from "lucide-react";
import { useState } from "react";

import { useGetResponse, useSearchEntries } from "../api";
import type { RelatedCatalog } from "../lib/response-filters";

/** Lo bastante corto para que la lista siga al tecleo, lo bastante largo para
 *  no buscar «s», «sl», «slp» por separado. */
const SEARCH_DELAY_MS = 250;

interface RelatedEntryFilterProps {
  /** Los listados que el formato relaciona. Al menos uno. */
  catalogs: readonly RelatedCatalog[];
  /** El elemento por el que se filtra, ya comprobado que tiene forma de id. */
  value: Id<"formResponses"> | undefined;
  onChange: (entryId: string | null) => void;
  className?: string;
}

/**
 * El filtro «por elemento» del listado de respuestas: las inspecciones de
 * SLP-835, las entregas a una persona.
 *
 * Busca en el servidor, como el selector con que se diligencia: un listado
 * puede tener cientos de elementos y no viaja al navegador. Si el formato
 * relaciona más de un listado, se elige primero en cuál buscar.
 */
export const RelatedEntryFilter = ({
  catalogs,
  value,
  onChange,
  className,
}: RelatedEntryFilterProps) => {
  const [open, setOpen] = useState(false);
  const [catalogId, setCatalogId] = useState(catalogs[0]?.formId);
  const [search, setSearch] = useState("");
  const debounced = useDebounce(search, SEARCH_DELAY_MS);
  // El título de lo elegido en esta sesión. Al llegar por un enlace no se
  // conoce, y se pide aparte.
  const [picked, setPicked] = useState<{ id: string; title: string } | null>(
    null,
  );

  const catalog =
    catalogs.find((candidate) => candidate.formId === catalogId) ?? catalogs[0];

  const { data: entries, isLoading } = useSearchEntries(
    open && catalog ? { formId: catalog.formId, search: debounced } : "skip",
  );
  const knowsTitle = picked !== null && picked.id === value;
  const { data: chosen } = useGetResponse(
    value !== undefined && !knowsTitle ? { id: value } : "skip",
  );

  const title =
    value === undefined
      ? null
      : knowsTitle
        ? picked.title
        : (chosen?.title ?? "Elemento elegido");

  const label =
    catalogs.length === 1 ? catalogs[0].label : "Elemento relacionado";

  return (
    <div className={cn("flex min-w-0 items-center gap-1", className)}>
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setSearch("");
        }}
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            role="combobox"
            aria-expanded={open}
            aria-label={`Filtrar por ${label.toLowerCase()}`}
            data-size="default"
            data-placeholder={title === null ? "" : undefined}
            className={cn(SEARCHABLE_TRIGGER_CLASS, "w-full min-w-0 sm:w-56")}
          >
            <span className="min-w-0 truncate text-left">
              {title ?? label}
            </span>
            <ChevronDownIcon className="size-4 shrink-0 opacity-50" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          className="w-(--radix-popover-trigger-width) min-w-72 max-w-[min(28rem,90vw)] p-0"
        >
          {catalogs.length > 1 ? (
            <div
              role="group"
              aria-label="En qué listado buscar"
              className="flex flex-wrap gap-1 border-b p-2"
            >
              {catalogs.map((candidate) => (
                <button
                  key={candidate.formId}
                  type="button"
                  aria-pressed={candidate.formId === catalog?.formId}
                  onClick={() => setCatalogId(candidate.formId)}
                  className={cn(
                    "min-h-7 rounded-sm px-2 py-1 text-xs font-medium focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
                    candidate.formId === catalog?.formId
                      ? "bg-accent text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {candidate.label}
                </button>
              ))}
            </div>
          ) : null}
          {/* La búsqueda es del servidor: `cmdk` no filtra lo que llega. */}
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Buscar por título…"
              value={search}
              onValueChange={setSearch}
            />
            <CommandList className="max-h-80">
              {isLoading ? (
                <p className="flex items-center justify-center gap-2 px-3 py-6 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Buscando…
                </p>
              ) : (entries ?? []).length === 0 ? (
                <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                  {debounced.trim()
                    ? `Ningún elemento coincide con «${debounced.trim()}».`
                    : "Este listado todavía no tiene elementos activos."}
                </p>
              ) : (
                <CommandGroup>
                  {(entries ?? []).map((entry) => (
                    <CommandItem
                      key={entry._id}
                      value={entry._id}
                      onSelect={() => {
                        setPicked({ id: entry._id, title: entry.title });
                        onChange(entry._id);
                        setOpen(false);
                        setSearch("");
                      }}
                    >
                      <span className="min-w-0 flex-1 truncate">
                        {entry.title || "Elemento sin título"}
                      </span>
                      <CheckIcon
                        className={cn(
                          "size-4",
                          entry._id === value ? "opacity-100" : "opacity-0",
                        )}
                      />
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {value !== undefined ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Quitar el filtro por ${label.toLowerCase()}`}
          onClick={() => {
            setPicked(null);
            onChange(null);
          }}
        >
          <X />
        </Button>
      ) : null}
    </div>
  );
};
