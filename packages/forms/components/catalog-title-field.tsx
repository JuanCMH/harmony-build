"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Id } from "@/convex/_generated/dataModel";
import type { FormSection } from "@/convex/lib/form_types";
import { handleConvexErrorCallback } from "@/lib/convex-error-handler";
import { toast } from "sonner";

import { useSetFormTitleField } from "../api";
import { titleFieldCandidates } from "../lib/builder-sections";
import { ConfigBlock } from "./form-field-config";

/**
 * El campo que titula cada elemento de un listado: la placa de un vehículo, el
 * nombre de una persona. Es lo que se lee al elegirlo desde otro formato.
 *
 * Se guarda al momento, aparte del borrador, y el servidor lo comprueba contra
 * lo **guardado**: por eso los candidatos salen del borrador guardado y de la
 * versión publicada, no de lo que se está editando. Un campo recién añadido se
 * guarda —y, si el listado ya está publicado, se publica— antes de elegirlo.
 */
export const CatalogTitleField = ({
  formId,
  titleFieldId,
  savedDraft,
  published,
  hasUnsavedChanges,
}: {
  formId: Id<"forms">;
  titleFieldId: string | undefined;
  savedDraft: readonly FormSection[];
  published: readonly FormSection[] | null;
  hasUnsavedChanges: boolean;
}) => {
  const { mutate: setTitleField, isPending } = useSetFormTitleField();
  const candidates = titleFieldCandidates(savedDraft, published);
  const isValid = candidates.some((field) => field.id === titleFieldId);

  return (
    <ConfigBlock
      title="Campo que titula cada elemento"
      help="Un texto corto, obligatorio, sin condición ni cálculo. Es lo que se lee al elegir un elemento desde otro formato."
    >
      <Select
        value={isValid ? titleFieldId : ""}
        disabled={isPending || candidates.length === 0}
        onValueChange={(id) =>
          setTitleField(
            { id: formId, titleFieldId: id },
            {
              onSuccess: () =>
                toast.success("Campo de título guardado correctamente"),
              onError: (error) => handleConvexErrorCallback(error),
            },
          )
        }
      >
        <SelectTrigger
          aria-label="Campo que titula cada elemento"
          className="w-full"
        >
          <SelectValue
            placeholder={
              candidates.length === 0
                ? "Ningún campo sirve todavía"
                : "Elige un campo"
            }
          />
        </SelectTrigger>
        <SelectContent>
          {candidates.map((field) => (
            <SelectItem key={field.id} value={field.id}>
              {field.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {hasUnsavedChanges || (published !== null && candidates.length === 0) ? (
        <p className="text-xs text-muted-foreground">
          {published === null
            ? "Un campo nuevo se puede elegir después de guardar el borrador."
            : "Un campo nuevo se puede elegir después de publicarlo."}
        </p>
      ) : null}
    </ConfigBlock>
  );
};
