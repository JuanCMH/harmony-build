"use client";

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
import { CheckIcon, ChevronDownIcon } from "lucide-react";
import { useRef, useState } from "react";

import { SEARCHABLE_TRIGGER_CLASS, coincide, conBuscador } from "./searchable-select.utils";

export interface SearchableOption {
  value: string;
  label: string;
  /** Segunda línea en gris: el correo de una persona, el cliente de un puesto. */
  description?: string;
  disabled?: boolean;
}

interface SearchableSelectProps {
  value: string | undefined;
  onValueChange: (value: string) => void;
  options: readonly SearchableOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  "aria-label"?: string;
  /** Los pone `FormControl` al envolverlo: enlazan el mensaje de error. */
  "aria-describedby"?: string;
  "aria-invalid"?: boolean | "true" | "false";
  id?: string;
  size?: "sm" | "default";
  className?: string;
  contentClassName?: string;
  align?: "start" | "center" | "end";
  disabled?: boolean;
}

/**
 * Una lista desplegable **de datos** —campos de una plantilla, personas,
 * clientes, puestos— que se puede filtrar escribiendo.
 *
 * Se ve igual que un `Select` cerrado. Abierta, enseña un buscador cuando la
 * lista pasa de siete opciones; con menos se usa como una lista normal. Las
 * listas cortas y fijas —estado, tamaño, operador— siguen siendo `Select`
 * (`2026-09-16-formularios-ajustes-de-uso-design §1`).
 */
export function SearchableSelect({
  value,
  onValueChange,
  options,
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
}: SearchableSelectProps) {
  const [abierta, setAbierta] = useState(false);
  const lista = useRef<HTMLDivElement>(null);
  const elegida = options.find((o) => o.value === value);
  const buscador = conBuscador(options.length);

  return (
    // `modal`: dentro de un sheet o un modal, el bloqueo de scroll del diálogo
    // impedía desplazar la lista con la rueda.
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
          title={elegida?.label}
          disabled={disabled}
          data-size={size}
          data-placeholder={elegida ? undefined : ""}
          className={cn(SEARCHABLE_TRIGGER_CLASS, className)}
        >
          <span className="min-w-0 truncate text-left">{elegida?.label ?? placeholder}</span>
          <ChevronDownIcon className="size-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align={align}
        className={cn("w-(--radix-popover-trigger-width) min-w-72 max-w-[min(28rem,90vw)] p-0", contentClassName)}
        onOpenAutoFocus={(event) => {
          // Sin buscador no hay nada que enfocar dentro: el foco va a la lista
          // para que las flechas y Enter funcionen desde el primer momento.
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
            <CommandGroup>
              {options.map((opcion) => (
                <CommandItem
                  key={opcion.value}
                  value={opcion.value}
                  keywords={[opcion.label, opcion.description ?? ""]}
                  disabled={opcion.disabled}
                  onSelect={() => {
                    onValueChange(opcion.value);
                    setAbierta(false);
                  }}
                >
                  <span className="min-w-0 flex-1">
                    {/* Dos líneas antes de cortar: un nombre de campo largo
                        se quedaba en «Fecha de vencimiento …». */}
                    <span className="line-clamp-2 break-words">{opcion.label}</span>
                    {opcion.description ? (
                      <span className="block truncate text-xs text-muted-foreground">
                        {opcion.description}
                      </span>
                    ) : null}
                  </span>
                  <CheckIcon
                    className={cn("size-4", opcion.value === value ? "opacity-100" : "opacity-0")}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
