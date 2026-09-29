"use client";

import { Input } from "@/components/ui/input";
import { formatCurrency, parseCurrency } from "@/lib/currency";
import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

interface CurrencyInputProps
  extends Omit<
    ComponentProps<typeof Input>,
    "value" | "onChange" | "type" | "inputMode"
  > {
  /** La cifra, o `undefined` si el campo está vacío. */
  value: number | undefined;
  onChange: (value: number | undefined) => void;
}

/**
 * Un campo de dinero: se escribe la cifra y se lee en pesos, con su separador
 * de miles («$ 1.250.000»). Entrega un número, no el texto formateado.
 *
 * Portado de Harmony. Allí guardaba en un estado propio el texto que se veía y
 * lo sincronizaba con un efecto; aquí el texto **se deriva** del valor en cada
 * render (`02 §1`), así que no hay dos verdades que puedan discrepar.
 */
export function CurrencyInput({
  value,
  onChange,
  placeholder = "$ 0",
  className,
  ...props
}: CurrencyInputProps) {
  return (
    <Input
      {...props}
      type="text"
      // Teclado numérico en el teléfono: un campo de dinero no lleva letras.
      inputMode="numeric"
      autoComplete="off"
      value={value === undefined ? "" : formatCurrency(value)}
      placeholder={placeholder}
      className={cn("w-full tabular-nums", className)}
      onChange={(event) =>
        onChange(parseCurrency(event.target.value) ?? undefined)
      }
    />
  );
}
