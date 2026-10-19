"use client";

import {
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { DEFAULT_WIDGET } from "@/convex/lib/widget_layout";
import type { Id } from "@/convex/_generated/dataModel";
import type { ResultType } from "@/convex/lib/result_types";
import { handleConvexErrorCallback } from "@/lib/convex-error-handler";
import { newId } from "@/packages/forms/lib/new-id";
import { useProjectId } from "@/packages/projects/store/use-project-id";
import { Check, LayoutDashboard, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useGetDashboard, useSaveDashboard } from "../api";
import { DASHBOARD_ROOM } from "../lib/dashboard-draft";

interface AddToDashboardMenuProps {
  resultId: Id<"formResults">;
  name: string;
  type: ResultType;
  /** Si después vienen más entradas en el menú: pinta la línea que las separa. */
  withSeparator?: boolean;
}

/**
 * «Añadir al tablero», en el menú de la tarjeta de un resultado: se elige la
 * pestaña y queda puesto, sin pasar por el editor del tablero. Va **dentro**
 * de un `DropdownMenu`, y sólo se pinta para quien puede editar el tablero.
 */
export const AddToDashboardMenu = ({
  resultId,
  name,
  type,
  withSeparator = false,
}: AddToDashboardMenuProps) => {
  const projectId = useProjectId();
  const router = useRouter();
  const { data: dashboard } = useGetDashboard({ projectId });
  const { mutate: save, isPending } = useSaveDashboard();

  if (!dashboard?.canEdit) return null;

  const saved = dashboard.tabs.map((tab) => ({
    id: tab.id,
    label: tab.label,
    widgets: tab.widgets.map((widget) => ({
      id: widget.id,
      resultId: widget.resultId,
      size: widget.size,
      height: widget.height,
    })),
  }));
  const widget = { id: newId(), resultId, ...DEFAULT_WIDGET[type] };

  const addTo = (tabId: string | null) => {
    const newTabId = newId();
    const tabs =
      tabId === null
        ? [...saved, { id: newTabId, label: "General", widgets: [widget] }]
        : saved.map((tab) =>
            tab.id === tabId
              ? { ...tab, widgets: [...tab.widgets, widget] }
              : tab,
          );
    const label =
      dashboard.tabs.find((tab) => tab.id === tabId)?.label ?? "General";
    save(
      { projectId, tabs },
      {
        onSuccess: () =>
          toast.success(`«${name}» quedó en la pestaña ${label} del tablero`, {
            action: {
              label: "Ver tablero",
              onClick: () =>
                router.push(
                  `/projects/${projectId}?pestana=${tabId ?? newTabId}`,
                ),
            },
          }),
        onError: (error) => handleConvexErrorCallback(error),
      },
    );
  };

  return (
    <>
      <DropdownMenuSub>
        <DropdownMenuSubTrigger disabled={isPending}>
          <LayoutDashboard />
          Añadir al tablero
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent className="min-w-52">
          <DropdownMenuLabel>En la pestaña</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {dashboard.tabs.map((tab) => {
            const has = tab.widgets.some((one) => one.resultId === resultId);
            const full = tab.widgets.length >= DASHBOARD_ROOM.widgetsPerTab;
            return (
              <DropdownMenuItem
                key={tab.id}
                disabled={has || full}
                onSelect={() => addTo(tab.id)}
              >
                {has ? <Check /> : <Plus />}
                <span className="flex-1">{tab.label}</span>
                {has ? (
                  <span className="text-xs text-muted-foreground">Ya está</span>
                ) : full ? (
                  <span className="text-xs text-muted-foreground">Llena</span>
                ) : null}
              </DropdownMenuItem>
            );
          })}
          {dashboard.tabs.length === 0 ? (
            <DropdownMenuItem onSelect={() => addTo(null)}>
              <Plus />
              Una pestaña nueva, «General»
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuSubContent>
      </DropdownMenuSub>
      {withSeparator ? <DropdownMenuSeparator /> : null}
    </>
  );
};
