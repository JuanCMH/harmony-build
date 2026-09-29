"use client";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { FormField } from "@/convex/lib/form_types";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

import {
  describeAutoValue,
  describeComputed,
  describeVisibility,
} from "../lib/field-rules";

/**
 * Todas las reglas del formato, una frase por regla y agrupadas por campo.
 *
 * Es una **lectura del conjunto**, no un segundo sitio donde editar: pulsar un
 * campo lo elige y abre su comportamiento. Sin reglas no se pinta, porque «no
 * aplica» no es un estado vacío.
 */
export const FormRulesSummary = ({
  fields,
  ruleFields,
  onOpen,
}: {
  /** Los campos del formato: los que pueden tener reglas. */
  fields: readonly FormField[];
  /** Los del formato y los datos de la respuesta: los que una frase nombra. */
  ruleFields: readonly FormField[];
  onOpen: (field: FormField) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const withRules = fields.flatMap((field) => {
    const sentences = [
      describeVisibility(field, ruleFields),
      ...describeAutoValue(field, ruleFields),
      describeComputed(field, ruleFields),
    ].filter((sentence): sentence is string => !!sentence);
    return sentences.length > 0 ? [{ field, sentences }] : [];
  });

  if (withRules.length === 0) return null;

  return (
    // Plegada por omisión, con el número de campos a la vista: abierta, la
    // lista crecía bajo la paleta y la empujaba fuera de la columna.
    <Collapsible asChild open={isOpen} onOpenChange={setIsOpen}>
      <section aria-labelledby="form-rules-title" className="space-y-2">
        <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-md text-left focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">
          <span className="min-w-0 flex-1 space-y-1">
            <span
              id="form-rules-title"
              className="block text-sm font-medium tracking-tight"
            >
              Reglas del formato
            </span>
            <span className="block text-xs text-muted-foreground">
              {withRules.length}{" "}
              {withRules.length === 1 ? "campo tiene" : "campos tienen"}{" "}
              comportamiento
            </span>
          </span>
          <ChevronDown
            className={cn(
              "size-4 shrink-0 text-muted-foreground transition-transform",
              isOpen && "rotate-180",
            )}
            aria-hidden
          />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <ul className="divide-y divide-border/60 rounded-lg border">
            {withRules.map(({ field, sentences }) => (
              <li key={field.id}>
                <button
                  type="button"
                  onClick={() => onOpen(field)}
                  className="w-full space-y-0.5 px-3 py-2 text-left transition-colors hover:bg-accent/30 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-ring/50"
                >
                  <span className="block text-ui font-medium">
                    {field.label}
                  </span>
                  {sentences.map((sentence) => (
                    <span
                      key={sentence}
                      className="block text-xs text-muted-foreground"
                    >
                      {sentence}
                    </span>
                  ))}
                </button>
              </li>
            ))}
          </ul>
        </CollapsibleContent>
      </section>
    </Collapsible>
  );
};
