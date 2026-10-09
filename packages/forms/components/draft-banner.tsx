"use client";

import { Button } from "@/components/ui/button";
import { useConfirm } from "@/hooks/use-confirm";

import { FORM_ACTION_ICONS } from "../lib/field-catalog";
import { draftAgeText, type LocalDraft, omittedText } from "../lib/local-draft";

const DiscardIcon = FORM_ACTION_ICONS.discardDraft;

interface DraftBannerProps {
  draft: LocalDraft;
  disabled: boolean;
  /** Vacía el formulario y borra lo guardado. */
  onDiscard: () => void;
}

/**
 * La franja de arriba cuando se recuperó lo que se llevaba (decisiones §4):
 * discreta, porque lo normal es seguir donde se dejó. Dice de cuándo es y, si
 * había fotos o firmas, que ésas no se guardaron.
 */
export const DraftBanner = ({
  draft,
  disabled,
  onDiscard,
}: DraftBannerProps) => {
  const [ConfirmDialog, confirm] = useConfirm({
    title: "Empezar de cero",
    message:
      "Se borra lo que llevabas escrito en este formato. No se puede deshacer.",
    type: "warning",
    confirmText: "Empezar de cero",
  });
  const omitted = omittedText(draft.omitted);

  return (
    <div
      role="status"
      className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border bg-muted/40 py-1 pr-1 pl-3 text-sm"
    >
      <p className="min-w-0 flex-1 basis-48 py-1">
        Recuperamos lo que llevabas {draftAgeText(draft.savedAt, Date.now())}.
        {omitted ? (
          <span className="block text-xs text-muted-foreground">{omitted}</span>
        ) : null}
      </p>
      <Button
        type="button"
        variant="ghost"
        className="h-10 sm:h-9"
        disabled={disabled}
        onClick={async () => {
          if (await confirm()) onDiscard();
        }}
      >
        <DiscardIcon />
        Empezar de cero
      </Button>
      <ConfirmDialog />
    </div>
  );
};
