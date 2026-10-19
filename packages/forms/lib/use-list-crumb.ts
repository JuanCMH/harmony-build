"use client";

import type { BreadcrumbItemData } from "@/components/ui/responsive-breadcrumb";
import { useProjectId } from "@/packages/projects/store/use-project-id";
import { usePermissions } from "@/packages/roles/store/use-permissions";

import { KIND_TEXT } from "./kind-text";
import { formRoutes } from "./routes";

/**
 * La miga que lleva de un formato a su lista, entre la del proyecto y la del
 * formato.
 *
 * Quien administra vuelve al catálogo («Formatos», «Seguimientos»). Quien sólo
 * diligencia no tiene catálogo (`03 §2.2`): de una respuesta vuelve a «Mis
 * respuestas», de un asunto a la bandeja, y al diligenciar no hay miga, porque
 * su lista de formatos es el inicio, que ya es la primera.
 */
export const useListCrumb = (
  kind: "record" | "catalog" | "tracking",
  from: "fill" | "form" | "response",
): BreadcrumbItemData | null => {
  const projectId = useProjectId();
  const { isCaptureView } = usePermissions();

  if (!isCaptureView) {
    return {
      label: KIND_TEXT[kind].listLabel,
      href: formRoutes.list(projectId, kind),
    };
  }
  if (kind === "tracking") {
    return { label: "Seguimientos", href: formRoutes.trackings(projectId) };
  }
  return from === "fill"
    ? null
    : { label: "Mis respuestas", href: formRoutes.mine(projectId) };
};
