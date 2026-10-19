import type { FormStatus } from "@/convex/lib/form_types";

/**
 * El estado de un formato, de una respuesta y de un elemento, traducido a lo
 * que se lee y a su color (`03 §1.4`). Un color de estado no es una elección
 * de la pantalla: sale de un dato guardado, y sale de aquí.
 */

export type StatusTone = "green" | "yellow" | "red" | "gray";

/** El tinte de una insignia de estado, sobre `Badge variant="outline"`. */
export const STATUS_TONE_CLASS: Record<StatusTone, string> = {
  green:
    "border-green-500/20 bg-green-500/10 text-green-700 dark:text-green-400",
  yellow:
    "border-yellow-500/20 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  red: "border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-400",
  gray: "border-gray-500/20 bg-gray-500/10 text-gray-600 dark:text-gray-400",
};

export interface StatusBadge {
  label: string;
  tone: StatusTone;
}

export const formStatusBadge = (form: {
  status: FormStatus;
  publishedVersionNumber: number | null;
}): StatusBadge => {
  if (form.status === "archived") return { label: "Archivado", tone: "gray" };
  if (form.status === "draft") return { label: "Borrador", tone: "gray" };
  return {
    label:
      form.publishedVersionNumber === null
        ? "Publicado"
        : `Publicado · v${form.publishedVersionNumber}`,
    tone: "green",
  };
};

/** Un formato publicado cuyo borrador ya no es lo que se diligencia. */
export const hasUnpublishedChanges = (form: {
  status: FormStatus;
  hasDraftChanges: boolean;
}) => form.status === "published" && form.hasDraftChanges;

export const UNPUBLISHED_CHANGES_BADGE: StatusBadge = {
  label: "Cambios sin publicar",
  tone: "yellow",
};

export const VOIDED_BADGE: StatusBadge = { label: "Anulada", tone: "red" };

export const INACTIVE_BADGE: StatusBadge = { label: "Inactivo", tone: "gray" };

/** El estado de un asunto de seguimiento. «Vencido» no se guarda: sale de su
 *  fecha de compromiso contra el día de hoy, y sustituye a «Abierto». */
export const trackingStatusBadge = (
  status: string,
  overdue: boolean,
): StatusBadge => {
  if (status === "closed") return { label: "Cerrado", tone: "green" };
  if (status === "voided") return { label: "Anulado", tone: "red" };
  return overdue
    ? { label: "Vencido", tone: "red" }
    : { label: "Abierto", tone: "yellow" };
};
