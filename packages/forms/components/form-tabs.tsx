"use client";

import type { Id } from "@/convex/_generated/dataModel";
import type { FormKind, FormStatus } from "@/convex/lib/form_types";
import { useConfirm } from "@/hooks/use-confirm";
import { cn } from "@/lib/utils";
import { useProjectId } from "@/packages/projects/store/use-project-id";
import { ChartLine, type LucideIcon, PencilRuler } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { ENTITY_ICONS } from "../lib/field-catalog";
import { KIND_TEXT } from "../lib/kind-text";
import { formRoutes } from "../lib/routes";

export type FormTab = "responses" | "results" | "design";

interface FormTabsProps {
  formId: Id<"forms">;
  active: FormTab;
  form: {
    kind: FormKind;
    status: FormStatus;
    canViewAll: boolean;
    canEdit: boolean;
  };
  /** Quien sólo diligencia también abre las respuestas: ve las suyas. */
  canList: boolean;
  /** Hay cambios sin guardar en esta pantalla: se pregunta antes de salir. */
  hasUnsavedChanges?: boolean;
}

/**
 * Las tres caras de un formato, siempre en el mismo sitio —bajo la barra de
 * la página—: lo que se ha respondido, lo que se calcula de ello y cómo está
 * diseñado. Son pantallas distintas con su dirección, así que cada pestaña es
 * un enlace.
 *
 * Sólo salen las que quien mira puede abrir; con una sola no hay entre qué
 * elegir y la barra no se pinta.
 */
export const FormTabs = ({
  formId,
  active,
  form,
  canList,
  hasUnsavedChanges = false,
}: FormTabsProps) => {
  const projectId = useProjectId();
  const router = useRouter();
  const [ConfirmDialog, confirm] = useConfirm({
    title: "Salir sin guardar",
    message:
      "Hay cambios en el diseño que no se han guardado. Si sales ahora, se pierden.",
    type: "warning",
    confirmText: "Salir sin guardar",
  });

  const isCatalog = form.kind === "catalog";
  const tabs: { id: FormTab; label: string; icon: LucideIcon; href: string }[] =
    [
      ...(canList
        ? [
            {
              id: "responses" as const,
              label: KIND_TEXT[form.kind].itemsLabel,
              icon: ENTITY_ICONS[
                isCatalog
                  ? "entry"
                  : form.kind === "tracking"
                    ? "issue"
                    : "response"
              ],
              href: formRoutes.responses(projectId, formId),
            },
          ]
        : []),
      ...(form.canViewAll
        ? [
            {
              id: "results" as const,
              label: "Resultados",
              icon: ChartLine,
              href: formRoutes.results(projectId, formId),
            },
          ]
        : []),
      ...(form.canEdit && form.status !== "archived"
        ? [
            {
              id: "design" as const,
              label: "Diseño",
              icon: PencilRuler,
              href: formRoutes.edit(projectId, formId),
            },
          ]
        : []),
    ];

  if (tabs.length < 2) return null;

  return (
    <nav
      aria-label={isCatalog ? "Secciones del listado" : "Secciones del formato"}
      className="flex h-10 shrink-0 items-stretch gap-1 overflow-x-auto border-b px-2"
    >
      <ConfirmDialog />
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        return (
          <Link
            key={tab.id}
            href={tab.href}
            aria-current={isActive ? "page" : undefined}
            onClick={async (event) => {
              if (isActive || !hasUnsavedChanges) return;
              event.preventDefault();
              if (await confirm()) router.push(tab.href);
            }}
            className={cn(
              "relative flex items-center gap-1.5 px-2 text-ui whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground",
              // Por dentro: el `nav` recorta lo que se salga (`03 §6.1`).
              "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-ring/50",
              isActive &&
                "font-medium text-foreground after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full after:bg-foreground",
            )}
          >
            <tab.icon aria-hidden className="size-4" />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
};
