import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

/**
 * `text-ui` y `text-2xs` son tamaños propios (`03 §0.7`). Sin declararlos,
 * tailwind-merge los tomaba por colores y los borraba en cuanto la misma
 * llamada llevaba `text-foreground` o `text-muted-foreground`: una ficha con
 * `text-ui` y color de estado salía a 16px. Medido el 16 de septiembre de 2026
 * en las fichas de «Pedir en» del formulario de novedades.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: ["ui", "2xs"] }],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
