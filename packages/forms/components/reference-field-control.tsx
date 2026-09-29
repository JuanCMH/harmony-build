"use client";

import { SEARCHABLE_TRIGGER_CLASS } from "@/components/harmony/searchable-select.utils";
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
import type { ReferenceConfig, ReferenceValue } from "@/convex/lib/form_types";
import { isReferenceValue } from "@/convex/lib/stored_values";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";
import { CheckIcon, ChevronDownIcon, Loader2, X } from "lucide-react";
import { useState } from "react";

import { useGetReferencePreview, useSearchEntries } from "../api";
import { INACTIVE_BADGE, STATUS_TONE_CLASS } from "../lib/status";

/** Lo bastante corto para que la lista siga al tecleo, lo bastante largo para
 *  no buscar «s», «sl», «slp» por separado. */
const SEARCH_DELAY_MS = 250;

/** El alto de un control de captura sobre un disparador que trae el suyo
 *  atado a `data-size` (`03 §6.2`): 40px en teléfono, 36px desde `sm`. */
const TRIGGER_HEIGHT =
  "w-full data-[size=default]:h-10 sm:data-[size=default]:h-9";

interface ReferenceFieldControlProps {
  id: string;
  /** El nombre del campo, para quien no lo ve. */
  label: string;
  config: ReferenceConfig | undefined;
  /** El formato **que tiene el campo**, no el listado. `null` en el lienzo del
   *  constructor: ahí no se consulta nada. */
  formId: Id<"forms"> | null;
  fieldId: string;
  /** Cuando la relación es la columna de una tabla. */
  columnId?: string;
  /** Un `ReferenceValue`, o nada. */
  value: unknown;
  placeholder?: string;
  /** Un campo obligatorio no ofrece «Quitar»: se cambia por otro. */
  required: boolean;
  disabled: boolean;
  invalid: boolean;
  onChange: (value: ReferenceValue | undefined) => void;
}

/**
 * Elegir un elemento de un listado: el vehículo, el conductor, el equipo.
 *
 * Cerrado se ve como cualquier lista. Abierto, **busca en el servidor**: un
 * listado puede tener cientos de elementos y no viaja al navegador. Debajo,
 * los datos que el formato trae del elemento elegido, de sólo lectura: es lo
 * que en el papel había que copiar a mano cada semana (diseño §5).
 *
 * Esos datos son una **vista previa**: los que se guardan con la respuesta los
 * compone el servidor al enviar. Por eso de aquí sólo sale el id del elemento
 * y su título.
 */
export const ReferenceFieldControl = ({
  id,
  label,
  config,
  formId,
  fieldId,
  columnId,
  value,
  placeholder,
  required,
  disabled,
  invalid,
  onChange,
}: ReferenceFieldControlProps) => {
  const chosen = isReferenceValue(value) && value.responseId ? value : null;
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const typed = search.trim();
  const requested = useDebounce(typed, SEARCH_DELAY_MS);

  // Sin formato —el lienzo del constructor— no hay a quién preguntar.
  const canQuery = formId !== null && Boolean(config?.formId);
  const { data: entries } = useSearchEntries(
    canQuery && open && config
      ? { formId: config.formId as Id<"forms">, search: requested }
      : "skip",
  );
  const { data: preview, isLoading: isLoadingPreview } = useGetReferencePreview(
    canQuery && formId && chosen
      ? {
          fieldFormId: formId,
          fieldId,
          ...(columnId ? { columnId } : {}),
          responseId: chosen.responseId as Id<"formResponses">,
        }
      : "skip",
  );

  // Mientras lo escrito no es lo pedido, o lo pedido no ha vuelto, lo que hay
  // en la lista es de antes: se dice que busca.
  const isSearching = typed !== requested || entries === undefined;

  const choose = (next: ReferenceValue | undefined) => {
    onChange(next);
    setOpen(false);
    setSearch("");
  };

  return (
    <div className="space-y-2">
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setSearch("");
        }}
        modal
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            role="combobox"
            id={id}
            aria-label={label}
            aria-expanded={open}
            aria-invalid={invalid}
            title={chosen?.label || undefined}
            disabled={disabled || !canQuery}
            data-size="default"
            data-placeholder={chosen ? undefined : ""}
            className={cn(SEARCHABLE_TRIGGER_CLASS, TRIGGER_HEIGHT)}
          >
            <span className="min-w-0 truncate text-left">
              {chosen
                ? preview?.label || chosen.label || "Elemento sin título"
                : (placeholder ?? "Busca y elige")}
            </span>
            <ChevronDownIcon className="size-4 shrink-0 opacity-50" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-(--radix-popover-trigger-width) min-w-72 max-w-[min(28rem,90vw)] p-0"
        >
          <Command shouldFilter={false} className="outline-none">
            <CommandInput
              value={search}
              onValueChange={setSearch}
              placeholder={placeholder ?? "Buscar…"}
              aria-label={`Buscar: ${label}`}
              // 16px en teléfono: por debajo, iOS amplía la página al enfocar.
              className="text-base sm:text-sm"
            />
            <CommandList className="max-h-80">
              {isSearching && !entries?.length ? (
                <output className="flex items-center justify-center gap-2 px-3 py-6 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  Buscando…
                </output>
              ) : entries?.length === 0 ? (
                <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                  {typed === ""
                    ? "Este listado todavía no tiene elementos activos."
                    : `Ningún elemento coincide con «${typed}».`}
                </p>
              ) : (
                <CommandGroup>
                  {(entries ?? []).map((entry) => (
                    <CommandItem
                      key={entry._id}
                      value={entry._id}
                      className="min-h-10"
                      onSelect={() =>
                        choose({
                          responseId: entry._id,
                          label: entry.title,
                          snapshot: [],
                        })
                      }
                    >
                      <span className="min-w-0 flex-1 line-clamp-2 break-words">
                        {entry.title || "Elemento sin título"}
                      </span>
                      <CheckIcon
                        className={cn(
                          "size-4",
                          entry._id === chosen?.responseId
                            ? "opacity-100"
                            : "opacity-0",
                        )}
                      />
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {/* Una relación que no es obligatoria se puede quitar; sin esto,
                  elegida una vez, quedaba para siempre. */}
              {chosen && !required && typed === "" ? (
                <CommandGroup className="border-t">
                  <CommandItem
                    value="quitar"
                    className="min-h-10"
                    onSelect={() => choose(undefined)}
                  >
                    <X className="size-4" aria-hidden />
                    Quitar la elección
                  </CommandItem>
                </CommandGroup>
              ) : null}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {chosen && canQuery ? (
        <ReferencePreview
          fill={config?.fill ?? []}
          preview={preview}
          isLoading={isLoadingPreview}
        />
      ) : null}
    </div>
  );
};

interface ReferencePreviewProps {
  /** Los campos que el formato trae: sin ninguno, no hay bloque que pintar. */
  fill: readonly string[];
  preview:
    | {
        snapshot: { fieldId: string; label: string; text: string }[];
        active: boolean;
      }
    | null
    | undefined;
  isLoading: boolean;
}

/** Los datos traídos del elemento elegido, y lo que haya que decir de él. */
const ReferencePreview = ({
  fill,
  preview,
  isLoading,
}: ReferencePreviewProps) => {
  if (isLoading) {
    return fill.length > 0 ? (
      <output className="flex items-center gap-2 rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" aria-hidden />
        Trayendo los datos…
      </output>
    ) : null;
  }

  // El elemento se eliminó, o ya no es de este listado: el servidor no lo va a
  // aceptar, y es mejor saberlo aquí que al enviar.
  if (!preview) {
    return (
      <p className="text-xs font-medium text-destructive">
        Este elemento ya no está disponible. Elige otro.
      </p>
    );
  }

  return (
    <>
      {preview.active ? null : (
        <p
          className={cn(
            "rounded-md border px-3 py-2 text-xs",
            STATUS_TONE_CLASS[INACTIVE_BADGE.tone],
          )}
        >
          <span className="font-medium">{INACTIVE_BADGE.label}.</span> Este
          elemento ya no se usa: elige otro.
        </p>
      )}
      {preview.snapshot.length > 0 ? (
        <dl className="grid grid-cols-2 gap-3 rounded-md border bg-muted/40 p-3 lg:grid-cols-4">
          {preview.snapshot.map((entry) => (
            <div key={entry.fieldId} className="min-w-0 space-y-0.5">
              <dt className="text-xs text-muted-foreground">{entry.label}</dt>
              <dd className="text-sm break-words">
                {entry.text || (
                  <span className="text-muted-foreground">Sin dato</span>
                )}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
    </>
  );
};
