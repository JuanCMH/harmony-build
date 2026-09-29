"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FORM_LIMITS, type FieldOption } from "@/convex/lib/form_types";
import { Plus, Trash2 } from "lucide-react";

import { newOption } from "../lib/field-defaults";

/**
 * Las opciones de una lista, o de una columna de lista: renombrar, quitar y
 * añadir.
 *
 * El valor se fija al crear la opción y no sigue a la etiqueta: renombrar
 * «Opción 1» a «Moto» cambiaría lo guardado y rompería en silencio las reglas
 * y las respuestas que la nombran.
 */
export const FormOptionsEditor = ({
  options,
  onChange,
  labelPrefix = "Opción",
}: {
  options: readonly FieldOption[];
  onChange: (options: FieldOption[]) => void;
  /** Cómo se anuncia cada opción: «Opción 2», «Opción 2 de Estado». */
  labelPrefix?: string;
}) => (
  <div className="space-y-2">
    <ul className="space-y-2">
      {options.map((option, index) => (
        <li key={option.value} className="flex items-center gap-2">
          <Input
            value={option.label}
            aria-label={`${labelPrefix} ${index + 1}`}
            className="h-8"
            onChange={(event) =>
              onChange(
                options.map((current, position) =>
                  position === index
                    ? { ...current, label: event.target.value }
                    : current,
                ),
              )
            }
          />
          <Button
            size="icon"
            variant="ghost"
            className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
            aria-label={`Quitar la opción ${option.label || index + 1}`}
            disabled={options.length <= 1}
            onClick={() =>
              onChange(options.filter((_, position) => position !== index))
            }
          >
            <Trash2 className="size-3.5" />
          </Button>
        </li>
      ))}
    </ul>
    <Button
      size="sm"
      variant="outline"
      disabled={options.length >= FORM_LIMITS.maxOptions}
      onClick={() => onChange([...options, newOption(options)])}
    >
      <Plus className="size-4" />
      Añadir opción
    </Button>
  </div>
);
