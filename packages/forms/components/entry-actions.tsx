"use client";

import { Button } from "@/components/ui/button";
import type { Id } from "@/convex/_generated/dataModel";
import { useConfirm } from "@/hooks/use-confirm";
import { handleConvexErrorCallback } from "@/lib/convex-error-handler";
import { Loader2, Pencil, ToggleLeft, ToggleRight } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { useSetEntryActive } from "../api";

interface EntryActionsProps {
  entry: {
    _id: Id<"formResponses">;
    title: string | null;
    active: boolean | null;
  };
  /** A dónde lleva «Editar»; sin él, no se ofrece (sin `editCatalogs`, o el
   *  listado no está publicado). */
  editHref: string | undefined;
  /** Si puede inactivarlo o reactivarlo. */
  canToggle: boolean;
}

/**
 * Las acciones de un elemento de un listado, en la cabecera de la página.
 *
 * Inactivar confirma porque saca el elemento de todos los selectores en ese
 * momento, a quien esté diligenciando; reactivar no, porque sólo lo devuelve.
 */
export const EntryActions = ({
  entry,
  editHref,
  canToggle,
}: EntryActionsProps) => {
  const { mutate: setActive, isPending } = useSetEntryActive();
  const title = entry.title || "este elemento";
  const [ConfirmDialog, confirm] = useConfirm({
    title: `Inactivar «${title}»`,
    message:
      "Deja de ofrecerse al diligenciar. Las respuestas que ya lo eligieron lo conservan, y su historial sigue aquí. Se puede reactivar después.",
    type: "warning",
    confirmText: "Inactivar",
  });

  const isActive = entry.active !== false;

  const toggle = async () => {
    if (isActive && !(await confirm())) return;
    setActive(
      { id: entry._id, active: !isActive },
      {
        onSuccess: () =>
          toast.success(
            isActive
              ? "Elemento inactivado correctamente"
              : "Elemento reactivado correctamente",
          ),
        onError: (error) => handleConvexErrorCallback(error),
      },
    );
  };

  const ToggleIcon = isActive ? ToggleLeft : ToggleRight;

  return (
    <>
      <ConfirmDialog />
      {canToggle ? (
        <Button
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={toggle}
        >
          {isPending ? <Loader2 className="animate-spin" /> : <ToggleIcon />}
          <span className="sr-only sm:not-sr-only">
            {isActive ? "Inactivar" : "Reactivar"}
          </span>
        </Button>
      ) : null}
      {editHref ? (
        <Button size="sm" asChild>
          <Link href={editHref}>
            <Pencil />
            Editar
          </Link>
        </Button>
      ) : null}
    </>
  );
};
