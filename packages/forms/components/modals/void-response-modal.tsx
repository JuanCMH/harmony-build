"use client";

import {
  DialogClose,
  HarmonyModal,
  HarmonyModalContent,
  HarmonyModalFooter,
  HarmonyModalHeader,
} from "@/components/harmony/harmony-modal";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Id } from "@/convex/_generated/dataModel";
import { VOID_REASON_MAX, VOID_REASON_MIN } from "@/convex/lib/form_types";
import { normalizeText } from "@/convex/lib/text";
import { handleConvexErrorCallback } from "@/lib/convex-error-handler";
import { Ban, Loader2 } from "lucide-react";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";

import { useVoidResponse } from "../../api";

const FORM_ID = "void-response-form";

interface VoidResponseModalProps {
  responseId: Id<"formResponses">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Anular una respuesta equivocada. Pide el motivo porque es lo que queda: la
 * respuesta sigue en el listado, tachada, con quién la anuló y por qué.
 *
 * El motivo se mide como lo medirá el servidor —recortado y con los espacios
 * colapsados—, para que cinco espacios no pasen por cinco letras.
 */
export const VoidResponseModal = ({
  responseId,
  open,
  onOpenChange,
}: VoidResponseModalProps) => {
  const [reason, setReason] = useState("");
  const { mutate: voidResponse, isPending } = useVoidResponse();

  const length = normalizeText(reason).length;
  const isValid = length >= VOID_REASON_MIN && length <= VOID_REASON_MAX;

  const handleOpenChange = (next: boolean) => {
    // Al cerrar se olvida lo escrito: reabrir con el motivo de la respuesta
    // anterior es la forma de anular la siguiente con un motivo que no es el
    // suyo.
    if (!next) setReason("");
    onOpenChange(next);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!isValid) return;
    voidResponse(
      { id: responseId, reason },
      {
        onSuccess: () => {
          toast.success("Respuesta anulada correctamente");
          handleOpenChange(false);
        },
        onError: (error) => handleConvexErrorCallback(error),
      },
    );
  };

  return (
    <HarmonyModal
      open={open}
      onOpenChange={handleOpenChange}
      maxWidth="sm:max-w-md"
    >
      <HarmonyModalHeader
        icon={Ban}
        iconClassName="bg-destructive/10 border-destructive/10 text-destructive"
        title="Anular respuesta"
        description="Seguirá en el listado, marcada como anulada. No se puede deshacer."
      />
      <HarmonyModalContent>
        <form id={FORM_ID} className="space-y-2" onSubmit={handleSubmit}>
          <Label htmlFor="void-reason">Motivo</Label>
          <Textarea
            id="void-reason"
            className="min-h-24"
            placeholder="Por qué se anula: se eligió otro vehículo, se diligenció dos veces…"
            value={reason}
            required
            minLength={VOID_REASON_MIN}
            maxLength={VOID_REASON_MAX}
            disabled={isPending}
            aria-describedby="void-reason-help"
            onChange={(event) => setReason(event.target.value)}
          />
          <div
            id="void-reason-help"
            className="flex items-start justify-between gap-3 text-xs text-muted-foreground"
          >
            <p>
              Entre {VOID_REASON_MIN} y {VOID_REASON_MAX} caracteres. Lo verá
              quien abra la respuesta.
            </p>
            <p className="shrink-0 tabular-nums" aria-live="polite">
              <span className="sr-only">Caracteres escritos: </span>
              {length}/{VOID_REASON_MAX}
            </p>
          </div>
        </form>
      </HarmonyModalContent>
      <HarmonyModalFooter>
        <DialogClose asChild>
          <Button variant="outline" disabled={isPending}>
            Cancelar
          </Button>
        </DialogClose>
        <Button
          type="submit"
          form={FORM_ID}
          variant="destructive"
          disabled={isPending || !isValid}
        >
          {isPending && <Loader2 className="animate-spin" />}
          Anular respuesta
        </Button>
      </HarmonyModalFooter>
    </HarmonyModal>
  );
};
