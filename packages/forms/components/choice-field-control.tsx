"use client";

import { SearchableMultiSelect } from "@/components/harmony/searchable-multi-select";
import { SearchableSelect } from "@/components/harmony/searchable-select";
import { conBuscador } from "@/components/harmony/searchable-select.utils";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FieldOption } from "@/convex/lib/form_types";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

/** El alto de captura sobre un disparador que ata el suyo a `data-size`
 *  (`03 §6.2`): 40px en teléfono, 36px desde `sm`. */
export const TRIGGER_HEIGHT =
  "w-full data-[size=default]:h-10 sm:data-[size=default]:h-9";

interface SelectFieldControlProps {
  id: string;
  label: string;
  options: readonly FieldOption[];
  value: unknown;
  placeholder?: string;
  disabled: boolean;
  invalid: boolean;
  onChange: (value: string) => void;
}

/**
 * Una lista de opción única. Hasta siete opciones, la lista de siempre; con
 * más, la que se filtra escribiendo (`03 §6`): buscar «Bog» es más rápido que
 * desplazar treinta ciudades con el pulgar.
 */
export const SelectFieldControl = ({
  id,
  label,
  options,
  value,
  placeholder,
  disabled,
  invalid,
  onChange,
}: SelectFieldControlProps) => {
  const text = typeof value === "string" ? value : "";

  if (conBuscador(options.length)) {
    return (
      <SearchableSelect
        id={id}
        aria-label={label}
        aria-invalid={invalid}
        value={text || undefined}
        options={options}
        placeholder={placeholder ?? "Selecciona"}
        disabled={disabled}
        className={TRIGGER_HEIGHT}
        onValueChange={onChange}
      />
    );
  }

  return (
    <Select value={text} disabled={disabled} onValueChange={onChange}>
      <SelectTrigger
        id={id}
        aria-invalid={invalid}
        className={cn("w-full", TRIGGER_HEIGHT)}
      >
        <SelectValue placeholder={placeholder ?? "Selecciona"} />
      </SelectTrigger>
      <SelectContent className="max-h-80">
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

interface MultiSelectFieldControlProps {
  id: string;
  label: string;
  options: readonly FieldOption[];
  value: unknown;
  placeholder?: string;
  disabled: boolean;
  invalid: boolean;
  onChange: (value: string[]) => void;
}

/**
 * Una lista de varias opciones.
 *
 * Con pocas, las opciones a la vista como botones que se marcan: un toque por
 * opción y se ve de un golpe qué está marcado, sin abrir nada. Con más de
 * siete ya no caben en la pantalla del teléfono sin empujar el formulario
 * hacia abajo, y pasan a la lista con buscador.
 */
export const MultiSelectFieldControl = ({
  id,
  label,
  options,
  value,
  placeholder,
  disabled,
  invalid,
  onChange,
}: MultiSelectFieldControlProps) => {
  const selected = Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];

  if (conBuscador(options.length)) {
    return (
      <SearchableMultiSelect
        id={id}
        aria-label={label}
        aria-invalid={invalid}
        value={selected}
        groups={[{ label: "", options }]}
        placeholder={placeholder ?? "Selecciona"}
        disabled={disabled}
        className={TRIGGER_HEIGHT}
        onValueChange={onChange}
      />
    );
  }

  return (
    <div
      id={id}
      role="group"
      aria-label={label}
      aria-invalid={invalid}
      className={cn(
        "flex flex-wrap gap-2 rounded-md",
        invalid && "outline outline-destructive outline-offset-2",
      )}
    >
      {options.map((option) => {
        const isSelected = selected.includes(option.value);
        return (
          <Button
            key={option.value}
            type="button"
            variant={isSelected ? "default" : "outline"}
            className="h-10 sm:h-9"
            aria-pressed={isSelected}
            disabled={disabled}
            onClick={() =>
              onChange(
                isSelected
                  ? selected.filter((item) => item !== option.value)
                  : [...selected, option.value],
              )
            }
          >
            {isSelected ? <Check aria-hidden /> : null}
            {option.label}
          </Button>
        );
      })}
    </div>
  );
};
