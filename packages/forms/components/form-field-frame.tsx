import { FULL_WIDTH_TYPES, type FormField } from "@/convex/lib/form_types";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

import { FIELD_SIZE_SPAN } from "../lib/grid";
import { fieldFrameId } from "../lib/field-dom";
import type { SubmissionProblem } from "../lib/submission-problems";

interface FormFieldFrameProps {
  field: FormField;
  /** El id del control: a él apunta la etiqueta. */
  controlId: string;
  /** Lo que impide enviar este campo, si se está señalando. */
  problem?: SubmissionProblem;
  children: ReactNode;
}

/**
 * Lo que rodea al control de un campo (`03 §6.2`): la etiqueta encima, la
 * ayuda debajo de ella, el asterisco del obligatorio y, tras un intento de
 * envío, lo que falta o está mal. Ocupa en la retícula lo que dice su tamaño.
 *
 * El problema de un ítem de lista de chequeo o de una celda lo dice el propio
 * control, junto a lo que falta; aquí se repetiría lejos de su sitio.
 */
export const FormFieldFrame = ({
  field,
  controlId,
  problem,
  children,
}: FormFieldFrameProps) => {
  const helpId = `${controlId}-ayuda`;
  const errorId = `${controlId}-error`;
  const showsError = problem && !problem.itemId && !problem.rowId;

  return (
    <div
      id={fieldFrameId(field.id)}
      // Enfocable sólo por programa: el salto al primer problema cae aquí
      // cuando el control no se enfoca —el recuadro de una firma—, y un
      // lector de pantalla lee entonces la etiqueta y el error.
      tabIndex={-1}
      className={cn(
        "min-w-0 scroll-mt-28 space-y-1.5 outline-none",
        // Una lista de chequeo o una tabla no caben en menos de una fila,
        // diga lo que diga el tamaño guardado.
        FIELD_SIZE_SPAN[
          FULL_WIDTH_TYPES.includes(field.type) ? "full" : field.size
        ],
      )}
    >
      <div className="space-y-0.5">
        <label
          htmlFor={controlId}
          className="block text-sm font-medium leading-snug"
        >
          {field.label}
          {field.required && !field.config.computed ? (
            <>
              <span aria-hidden className="text-destructive">
                {" "}
                *
              </span>
              <span className="sr-only"> (obligatorio)</span>
            </>
          ) : null}
        </label>
        {field.description ? (
          <p id={helpId} className="text-xs text-muted-foreground">
            {field.description}
          </p>
        ) : null}
      </div>
      {children}
      {showsError ? (
        <p
          id={errorId}
          role="alert"
          className="text-xs font-medium text-destructive"
        >
          {problem.message}
        </p>
      ) : null}
    </div>
  );
};
