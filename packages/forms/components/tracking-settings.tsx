"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Id } from "@/convex/_generated/dataModel";
import { flattenFields } from "@/convex/lib/form_evaluation";
import type { FormSection } from "@/convex/lib/form_types";
import { TRACKING_PREFIX_MAX } from "@/convex/lib/tracking";
import { handleConvexErrorCallback } from "@/lib/convex-error-handler";
import { useState } from "react";
import { toast } from "sonner";

import { useConfigureTracking } from "../api";
import { ConfigBlock } from "./form-field-config";

/** «Ninguno» necesita un valor propio: la lista no elige el vacío. */
const NONE = "none";

export interface TrackingDeclared {
  dueDateFieldId?: string;
  responsibleFieldId?: string;
  numberPrefix?: string;
}

/**
 * Lo que un seguimiento declara para que sus asuntos se puedan seguir: la
 * fecha de compromiso, de la que sale «vencido»; el responsable; y el prefijo
 * del consecutivo.
 *
 * Como el campo de título, se guarda al momento y el servidor lo comprueba
 * contra el borrador **guardado**: un campo recién añadido se guarda antes.
 */
export const TrackingSettings = ({
  formId,
  declared,
  savedDraft,
}: {
  formId: Id<"forms">;
  declared: TrackingDeclared;
  savedDraft: readonly FormSection[];
}) => {
  const { mutate: configure, isPending } = useConfigureTracking();
  const [prefix, setPrefix] = useState(declared.numberPrefix ?? "");

  const fields = flattenFields(savedDraft);
  const dates = fields.filter((field) => field.type === "date");
  const people = fields.filter(
    (field) => field.type === "reference" || field.type === "text",
  );

  const save = (patch: TrackingDeclared) =>
    configure(
      { formId, ...declared, ...patch },
      {
        onSuccess: () => toast.success("Seguimiento guardado correctamente"),
        onError: (error) => handleConvexErrorCallback(error),
      },
    );

  const picker = (
    id: string,
    label: string,
    help: string,
    options: typeof fields,
    value: string | undefined,
    onChange: (fieldId: string | undefined) => void,
  ) => (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Select
        value={options.some((field) => field.id === value) ? value : NONE}
        disabled={isPending}
        onValueChange={(next) => onChange(next === NONE ? undefined : next)}
      >
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>Ninguno</SelectItem>
          {options.map((field) => (
            <SelectItem key={field.id} value={field.id}>
              {field.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">{help}</p>
    </div>
  );

  return (
    <ConfigBlock
      title="Cómo se sigue cada asunto"
      help="Cada sección es una etapa: se completa una vez, en orden, y completar la última cierra el asunto."
    >
      <div className="space-y-4">
        {picker(
          "tracking-due",
          "Fecha de compromiso",
          "Un campo de fecha. Un asunto abierto que la pasa sale como vencido.",
          dates,
          declared.dueDateFieldId,
          (dueDateFieldId) => save({ dueDateFieldId }),
        )}
        {picker(
          "tracking-responsible",
          "Responsable",
          "Una relación con un listado de personas, o un texto corto.",
          people,
          declared.responsibleFieldId,
          (responsibleFieldId) => save({ responsibleFieldId }),
        )}
        <form
          className="space-y-2"
          onSubmit={(event) => {
            event.preventDefault();
            save({ numberPrefix: prefix });
          }}
        >
          <Label htmlFor="tracking-prefix">Prefijo del consecutivo</Label>
          <div className="flex gap-2">
            <Input
              id="tracking-prefix"
              value={prefix}
              maxLength={TRACKING_PREFIX_MAX}
              placeholder="AC"
              disabled={isPending}
              onChange={(event) => setPrefix(event.target.value.toUpperCase())}
            />
            <Button
              type="submit"
              variant="outline"
              disabled={isPending || prefix === (declared.numberPrefix ?? "")}
            >
              Guardar
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Cada asunto se numera por año: «{prefix || "AC"}-2026-014».
          </p>
        </form>
      </div>
    </ConfigBlock>
  );
};
