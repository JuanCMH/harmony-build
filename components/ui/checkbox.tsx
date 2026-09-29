"use client"

import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { CheckIcon, XIcon } from "lucide-react"
import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * La casilla, en dos formas.
 *
 * `switch` —la de siempre y la que sigue siendo el valor por defecto— es una
 * pastilla de 64×24 que dice «SÍ ✓» o «NO ✕». Se lee sola cuando hay una o dos
 * en un formulario, que es donde nació.
 *
 * `box` es la casilla clásica de 16px. Existe porque esa pastilla no escala a
 * una **lista**: en los ocho espacios del modal de clave de API la palabra
 * «NO» aparecía ocho veces seguidas —repetir el mismo estado en cada fila no
 * distingue ninguna— y 64px de control por fila dejaban el nombre arrinconado.
 * En una lista, lo que se lee es el nombre; el estado es la marca.
 */
export function Checkbox({
  className,
  variant = "switch",
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root> & {
  variant?: "switch" | "box"
}) {
  if (variant === "box") {
    return (
      <CheckboxPrimitive.Root
        data-slot="checkbox"
        className={cn(
          // El fondo oscuro se limita a la casilla **sin marcar**. Escrito como
          // `dark:bg-input/30` a secas convivía con
          // `data-[state=checked]:bg-primary`: son variantes distintas, así que
          // `tailwind-merge` no ve conflicto y las dos llegan a la hoja con la
          // misma especificidad. Ganaba la que Tailwind emite después —la del
          // tema oscuro—, de modo que una casilla marcada se quedaba con el
          // fondo al 4,5% de blanco y el chulo en `primary-foreground`, que en
          // oscuro es casi negro: contraste 1:1, invisible. Quedaba
          // seleccionada y no había forma de saberlo.
          "peer size-4 shrink-0 rounded-[4px] border border-input dark:data-[state=unchecked]:bg-input/30",
          "data-[state=checked]:bg-primary data-[state=checked]:border-primary data-[state=checked]:text-primary-foreground",
          "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "shadow-xs transition-colors outline-none",
          className
        )}
        {...props}
      >
        <CheckboxPrimitive.Indicator
          data-slot="checkbox-indicator"
          className="flex items-center justify-center text-current"
        >
          <CheckIcon className="size-3" strokeWidth={3} />
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
    )
  }

  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer h-6 w-16 shrink-0 rounded-sm border border-input dark:bg-input/30 flex items-center justify-between px-2",
        "focus-visible:border-ring focus-visible:ring-ring/50",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "shadow-xs transition-shadow outline-none",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        forceMount
        className="flex items-center justify-between w-full text-current"
      >
        {props.checked ? (
          <>
            <span className="text-xs font-medium text-foreground">SÍ</span>
            <CheckIcon className="h-3 w-3" strokeWidth={2} />

          </>
        ) : (
          <>
            <span className="text-xs font-medium text-foreground">NO</span>
            <XIcon className="h-3 w-3" strokeWidth={2} />
          </>
        )}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

