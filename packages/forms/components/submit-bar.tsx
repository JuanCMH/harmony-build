"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface SubmitBarProps {
  /** «Faltan 3 obligatorios», o `null` si no falta nada. */
  summary: string | null;
  /** Ya se intentó enviar: lo que falta se dice en rojo. */
  showMissing: boolean;
  isSubmitting: boolean;
  label: string;
  onSubmit: () => void;
}

/**
 * La barra de envío, pegada abajo (`03 §6.2`): a todo el ancho del contenido,
 * translúcida, con lo que falta a la izquierda y «Enviar» a la derecha; en el
 * teléfono el botón va a todo lo ancho, donde cae el pulgar.
 *
 * El botón no se deshabilita cuando falta algo: pulsarlo es la forma de saber
 * **qué** falta —lleva la vista al primero y señala los demás—. Un botón gris
 * no lo explica.
 */
export const SubmitBar = ({
  summary,
  showMissing,
  isSubmitting,
  label,
  onSubmit,
}: SubmitBarProps) => (
  // `-mb-24` devuelve el aire que la variante `documento` deja al pie: con la
  // barra pegada, ese aire quedaba **debajo** de ella al llegar al final, como
  // una franja en blanco bajo el botón.
  <div className="sticky bottom-0 z-10 -mx-4 -mb-24 flex flex-col gap-2 border-t bg-background/80 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-lg sm:-mx-6 sm:flex-row sm:items-center sm:justify-end sm:gap-4 sm:px-6">
    {summary ? (
      <p
        aria-live="polite"
        className={cn(
          "text-center text-sm tabular-nums sm:text-right",
          showMissing ? "font-medium text-destructive" : "text-muted-foreground",
        )}
      >
        {summary}
      </p>
    ) : null}
    <Button
      type="button"
      className="h-10 w-full sm:h-9 sm:w-auto sm:min-w-32"
      disabled={isSubmitting}
      onClick={onSubmit}
    >
      {isSubmitting ? <Loader2 className="animate-spin" aria-hidden /> : null}
      {isSubmitting ? "Enviando…" : label}
    </Button>
  </div>
);
