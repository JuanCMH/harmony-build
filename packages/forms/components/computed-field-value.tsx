"use client";

import { fieldText } from "@/convex/lib/field_text";
import type { FormField } from "@/convex/lib/form_types";
import { cn } from "@/lib/utils";
import { Sigma } from "lucide-react";

/**
 * Un campo derivado mientras se diligencia: lo que vale **ahora**, de sólo
 * lectura, y la marca `Sigma` que dice que se calcula (decisiones §1).
 *
 * No es un `input` deshabilitado: un control gris invita a pulsarlo y se lee
 * peor que un texto. Es un `output`, que un lector de pantalla anuncia al
 * cambiar.
 *
 * Lo que se ve es una vista previa: el servidor lo recalcula al guardar con la
 * misma función.
 */
export const ComputedFieldValue = ({
  id,
  field,
  value,
}: {
  id: string;
  field: FormField;
  value: unknown;
}) => {
  const text = fieldText(field, value);

  return (
    <output
      id={id}
      aria-live="polite"
      className="flex h-10 w-full items-center gap-2 rounded-md border border-dashed bg-muted/40 px-3 text-sm sm:h-9"
    >
      <Sigma className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      <span
        className={cn(
          "min-w-0 flex-1 truncate tabular-nums",
          !text && "text-muted-foreground",
        )}
      >
        {text || "Se calcula solo"}
      </span>
      <span className="sr-only">(se calcula solo)</span>
    </output>
  );
};
