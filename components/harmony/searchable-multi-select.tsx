"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { ChevronDownIcon } from "lucide-react";
import { useRef, useState } from "react";

import type { SearchableOption } from "./searchable-select";
import {
  type MultiSelectGroup,
  impliedValues,
  summarize,
  toggleValue,
} from "./searchable-multi-select.utils";
import { coincide, conBuscador } from "./searchable-select.utils";

export type SearchableMultiSelectGroup = MultiSelectGroup<SearchableOption>;

interface SearchableMultiSelectProps {
  value: readonly string[];
  onValueChange: (value: string[]) => void;
  /** Las opciones por grupos. Un grupo con `all` ofrece marcarlo entero. */
  groups: readonly SearchableMultiSelectGroup[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  "aria-label"?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean | "true" | "false";
  id?: string;
  size?: "sm" | "default";
  className?: string;
  contentClassName?: string;
  align?: "start" | "center" | "end";
  disabled?: boolean;
}

/** Una fila de la lista: la casilla, la etiqueta y su descripción. La casilla
 *  es sólo la marca: quien se elige es la fila entera. */
const Fila = ({
  label,
  description,
  checked,
  destacada = false,
}: {
  label: string;
  description?: string;
  checked: boolean;
  destacada?: boolean;
}) => (
  <>
    <Checkbox
      variant="box"
      checked={checked}
      tabIndex={-1}
      aria-hidden
      // La lista pinta sus iconos en gris; el chulo de una casilla marcada
      // tiene que contrastar con su fondo.
      className="pointer-events-none [&_svg]:text-primary-foreground!"
    />
    <span className="min-w-0 flex-1">
      <span className={cn("line-clamp-2 break-words", destacada && "font-medium")}>{label}</span>
      {description ? (
        <span className="block truncate text-xs text-muted-foreground">{description}</span>
      ) : null}
    </span>
    <span className="sr-only">{checked ? "marcada" : "sin marcar"}</span>
  </>
);

/**
 * Una lista **múltiple** de datos, con búsqueda y grupos: las novedades de una
 * organización por tipo, o las opciones de una lista larga de la plantilla.
 *
 * Cerrada se ve como un `Select` y resume lo elegido —«Incapacidad médica,
 * Vacaciones y 2 más»—. Abierta, cada grupo lleva su encabezado y, si tiene
 * `all`, primero la opción de marcarlo entero: al marcarla, sus opciones se ven
 * marcadas y deshabilitadas, y se guarda sólo el valor del grupo
 * (`2026-09-16-formulario-de-novedades-design`, revisión del 17-sep §5).
 */
export function SearchableMultiSelect({
  value,
  onValueChange,
  groups,
  placeholder = "Elige",
  searchPlaceholder = "Buscar…",
  emptyText = "Nada coincide con la búsqueda.",
  "aria-label": ariaLabel,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  id,
  size = "default",
  className,
  contentClassName,
  align = "start",
  disabled = false,
}: SearchableMultiSelectProps) {
  const [abierta, setAbierta] = useState(false);
  const lista = useRef<HTMLDivElement>(null);
  const resumen = summarize(value, groups);
  const implicitas = impliedValues(value, groups);
  const total = groups.reduce((n, g) => n + g.options.length + (g.all ? 1 : 0), 0);
  const buscador = conBuscador(total);
  const alternar = (objetivo: string) => onValueChange(toggleValue(value, groups, objetivo));

  return (
    <Popover open={abierta} onOpenChange={setAbierta} modal>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          id={id}
          aria-label={ariaLabel}
          aria-describedby={ariaDescribedBy}
          aria-invalid={ariaInvalid}
          aria-expanded={abierta}
          title={resumen ?? undefined}
          disabled={disabled}
          data-size={size}
          data-placeholder={resumen ? undefined : ""}
          className={cn(
            "border-input data-[placeholder]:text-muted-foreground aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 focus-visible:border-ring focus-visible:ring-ring/50 dark:bg-input/30 dark:hover:bg-input/50 flex w-fit min-w-0 items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 data-[size=default]:h-9 data-[size=sm]:h-8",
            className,
          )}
        >
          <span className="min-w-0 truncate text-left">{resumen ?? placeholder}</span>
          <ChevronDownIcon className="size-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align={align}
        className={cn("w-(--radix-popover-trigger-width) min-w-72 max-w-[min(28rem,90vw)] p-0", contentClassName)}
        onOpenAutoFocus={(event) => {
          if (!buscador) {
            event.preventDefault();
            lista.current?.focus();
          }
        }}
      >
        <Command
          ref={lista}
          tabIndex={-1}
          className="outline-none"
          filter={(_, busqueda, palabras) => (coincide((palabras ?? []).join(" "), busqueda) ? 1 : 0)}
        >
          {buscador ? <CommandInput placeholder={searchPlaceholder} /> : null}
          <CommandList className="max-h-80">
            <CommandEmpty className="px-3 py-6 text-center text-sm text-muted-foreground">
              {emptyText}
            </CommandEmpty>
            {groups.map(({ label, all: todo, options }, i) => (
              <CommandGroup
                // Dos grupos sin título no se distinguen por nombre.
                key={label || `grupo-${i}`}
                // Un grupo que es sólo su «todo» —Adicional— no repite el nombre
                // encima de sí mismo.
                heading={label && !(options.length === 0 && todo?.label === label) ? label : undefined}
              >
                {todo ? (
                  <CommandItem
                    value={todo.value}
                    keywords={[todo.label]}
                    onSelect={() => alternar(todo.value)}
                  >
                    <Fila label={todo.label} checked={value.includes(todo.value)} destacada />
                  </CommandItem>
                ) : null}
                {options.map((opcion) => {
                  const implicita = implicitas.has(opcion.value);
                  return (
                    <CommandItem
                      key={opcion.value}
                      value={opcion.value}
                      keywords={[opcion.label, opcion.description ?? ""]}
                      disabled={opcion.disabled || implicita}
                      onSelect={() => alternar(opcion.value)}
                    >
                      <Fila
                        label={opcion.label}
                        description={opcion.description}
                        checked={implicita || value.includes(opcion.value)}
                      />
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
        <div className="flex items-center justify-between gap-2 border-t px-3 py-1.5">
          <span className="text-xs text-muted-foreground">
            {value.length === 0
              ? "Nada elegido"
              : `${value.length} ${value.length === 1 ? "elegida" : "elegidas"}`}
          </span>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-ui"
            disabled={value.length === 0}
            onClick={() => onValueChange([])}
          >
            Limpiar
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
