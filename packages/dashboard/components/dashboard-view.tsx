"use client";

import { Hint } from "@/components/harmony/hint";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { todayInColombia } from "@/convex/lib/dates";
import { WIDGET_SIZES, type WidgetSize } from "@/convex/lib/result_validators";
import { useConfirm } from "@/hooks/use-confirm";
import { handleConvexErrorCallback } from "@/lib/convex-error-handler";
import { cn } from "@/lib/utils";
import { ListEmpty } from "@/packages/forms/components/list-empty";
import { ResultsRangeBar } from "@/packages/forms/components/results-range-bar";
import { newId } from "@/packages/forms/lib/new-id";
import { resolveRange } from "@/packages/forms/lib/results-range";
import { useResultsRange } from "@/packages/forms/store/use-results-range";
import { useProjectId } from "@/packages/projects/store/use-project-id";
import {
  ArrowLeft,
  ArrowRight,
  LayoutDashboard,
  Loader2,
  Pencil,
  Plus,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { type useGetDashboard, useSaveDashboard } from "../api";
import {
  DASHBOARD_ROOM,
  type DraftTab,
  SIZE_LABEL,
  SIZE_SPAN,
  addTab,
  addWidget,
  dashboardPayload,
  dashboardProblem,
  moveTab,
  moveWidget,
  removeTab,
  removeWidget,
  renameTab,
  resizeWidget,
} from "../lib/dashboard-draft";
import { useDashboardTab } from "../store/use-dashboard-tab";
import { AddWidgetPopover } from "./add-widget-popover";
import { DashboardWidget } from "./dashboard-widget";

type Dashboard = NonNullable<ReturnType<typeof useGetDashboard>["data"]>;

interface DashboardViewProps {
  dashboard: Dashboard;
  /** El modo edición lo abre la acción de la cabecera (`03 §2.2`). */
  editing: boolean;
  onEditingChange: (editing: boolean) => void;
}

/**
 * El tablero del proyecto: pestañas con los resultados de los formatos, todos
 * calculados para el mismo periodo. Una sola fila de controles —las pestañas
 * a la izquierda, el periodo a la derecha— y debajo, la retícula. La pestaña
 * y el periodo viven en la dirección (`02 §8`).
 *
 * Se edita **en el sitio**: en modo edición las tarjetas siguen pintando sus
 * datos, y cada una lleva encima con qué moverla, cambiarle el tamaño o
 * quitarla. Lo que se ve al editar es lo que queda al guardar.
 */
export const DashboardView = ({
  dashboard,
  editing,
  onEditingChange,
}: DashboardViewProps) => {
  const projectId = useProjectId();
  const [tab, setTab] = useDashboardTab();
  const [rawRange, setRange] = useResultsRange();
  const [draft, setDraft] = useState<DraftTab[]>([]);
  const [showProblem, setShowProblem] = useState(false);
  const { mutate: save, isPending } = useSaveDashboard();
  const [ConfirmRemoveTab, confirmRemoveTab] = useConfirm({
    title: "Quitar la pestaña",
    message:
      "Se quitan del tablero la pestaña y los resultados que tiene. Los resultados siguen en sus formatos.",
    type: "warning",
    confirmText: "Quitar",
  });

  const { canEdit } = dashboard;
  const isEditing = editing && canEdit;

  // Al entrar en edición, el borrador nace de lo guardado. Un tablero vacío
  // nace con su primera pestaña: lo siguiente es añadirle resultados.
  useEffect(() => {
    if (!isEditing) return;
    setShowProblem(false);
    if (dashboard.tabs.length > 0) {
      setDraft(dashboard.tabs);
      return;
    }
    const id = newId();
    setDraft([{ id, label: "General", widgets: [] }]);
    setTab(id);
  }, [isEditing]);

  const today = todayInColombia(Date.now());
  const range = resolveRange(rawRange, today);
  const tabs: readonly DraftTab[] = isEditing ? draft : dashboard.tabs;
  const active = tabs.find((one) => one.id === tab) ?? tabs[0];
  const activeIndex = active ? tabs.indexOf(active) : -1;
  const problem = isEditing ? dashboardProblem(draft) : null;

  const handleSave = () => {
    if (problem) {
      setShowProblem(true);
      return;
    }
    save(
      { projectId, tabs: dashboardPayload(draft) },
      {
        onSuccess: () => {
          toast.success("Tablero guardado correctamente");
          onEditingChange(false);
        },
        onError: (error) => handleConvexErrorCallback(error),
      },
    );
  };

  // Quitar una pestaña se lleva sus resultados: con alguno, se pregunta.
  const handleRemoveTab = async () => {
    if (!active) return;
    if (active.widgets.length > 0 && !(await confirmRemoveTab())) return;
    setDraft(removeTab(draft, active.id));
  };

  const handleAddTab = () => {
    const id = newId();
    setDraft(addTab(draft, id, "Nueva pestaña"));
    setTab(id);
  };

  if (!isEditing && tabs.length === 0) {
    return (
      <section aria-label="Tablero" className="rounded-lg border bg-card">
        <ListEmpty
          icon={LayoutDashboard}
          title="El tablero todavía no tiene pestañas."
          hint={
            canEdit
              ? "Escoge los resultados de los formatos que quieres ver juntos."
              : "Cuando quien administra el proyecto lo arme, aparecerá aquí."
          }
          action={
            canEdit ? (
              <Button size="sm" onClick={() => onEditingChange(true)}>
                <Pencil />
                Armar el tablero
              </Button>
            ) : null
          }
        />
      </section>
    );
  }

  return (
    <section aria-label="Tablero" className="space-y-4">
      <ConfirmRemoveTab />
      {isEditing ? (
        <div
          role="status"
          className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-h-indigo/10 bg-h-indigo/10 px-4 py-3"
        >
          <div className="min-w-0 flex-1 basis-64">
            <p className="text-sm font-medium">Estás editando el tablero</p>
            <p
              className={cn(
                "text-xs",
                showProblem && problem
                  ? "text-destructive"
                  : "text-muted-foreground",
              )}
            >
              {showProblem && problem
                ? problem
                : "Añade, mueve o quita resultados en cada pestaña. Nada cambia para los demás hasta que guardes."}
            </p>
          </div>
          <Button
            size="sm"
            variant="ghost"
            disabled={isPending}
            onClick={() => onEditingChange(false)}
          >
            Cancelar
          </Button>
          <Button size="sm" disabled={isPending} onClick={handleSave}>
            {isPending ? <Loader2 className="animate-spin" /> : null}
            Guardar tablero
          </Button>
        </div>
      ) : null}

      <Tabs value={active?.id ?? ""} onValueChange={setTab} className="gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* `TabsList` ya se desplaza de lado cuando no cabe (`03 §3.2`). */}
          <TabsList aria-label="Pestañas del tablero" className="min-w-0">
            {tabs.map((one) => (
              <TabsTrigger key={one.id} value={one.id}>
                {one.label.trim() || "Sin nombre"}
              </TabsTrigger>
            ))}
          </TabsList>
          {isEditing ? (
            <>
              {draft.length < DASHBOARD_ROOM.tabs ? (
                <Button
                  variant="ghost"
                  disabled={isPending}
                  onClick={handleAddTab}
                >
                  <Plus />
                  Pestaña
                </Button>
              ) : null}
              {active ? (
                <div className="flex w-full items-center gap-1 sm:ml-auto sm:w-auto">
                  <Input
                    aria-label="Nombre de la pestaña"
                    className="sm:w-56"
                    maxLength={40}
                    placeholder="Nombre de la pestaña"
                    value={active.label}
                    disabled={isPending}
                    onChange={(event) =>
                      setDraft(renameTab(draft, active.id, event.target.value))
                    }
                  />
                  <Hint label="Mover la pestaña a la izquierda">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Mover la pestaña a la izquierda"
                      disabled={isPending || activeIndex === 0}
                      onClick={() => setDraft(moveTab(draft, active.id, -1))}
                    >
                      <ArrowLeft />
                    </Button>
                  </Hint>
                  <Hint label="Mover la pestaña a la derecha">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Mover la pestaña a la derecha"
                      disabled={isPending || activeIndex === draft.length - 1}
                      onClick={() => setDraft(moveTab(draft, active.id, 1))}
                    >
                      <ArrowRight />
                    </Button>
                  </Hint>
                  <Hint label="Quitar la pestaña">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      aria-label="Quitar la pestaña"
                      disabled={isPending}
                      onClick={handleRemoveTab}
                    >
                      <X />
                    </Button>
                  </Hint>
                </div>
              ) : null}
            </>
          ) : (
            <ResultsRangeBar
              range={range}
              today={today}
              onChange={setRange}
              className="w-full sm:ml-auto sm:w-auto"
            />
          )}
        </div>

        {tabs.map((one) => (
          <TabsContent key={one.id} value={one.id}>
            {!isEditing && one.widgets.length === 0 ? (
              <div className="rounded-lg border bg-card">
                <ListEmpty
                  icon={LayoutDashboard}
                  title="Esta pestaña todavía no tiene resultados."
                  hint={
                    canEdit
                      ? "Entra en «Editar tablero» para añadirle los primeros."
                      : undefined
                  }
                />
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-12">
                {one.widgets.map((widget, index) => (
                  <div
                    key={widget.id}
                    className={cn(
                      "flex min-w-0 flex-col gap-2",
                      SIZE_SPAN[widget.size],
                    )}
                  >
                    {isEditing ? (
                      <div className="flex items-center gap-1 rounded-md border bg-muted/50 p-1">
                        <Hint label="Mover antes">
                          <Button
                            variant="ghost"
                            size="iconSm"
                            aria-label={`Mover ${widget.name} antes`}
                            disabled={isPending || index === 0}
                            onClick={() =>
                              setDraft(moveWidget(draft, one.id, widget.id, -1))
                            }
                          >
                            <ArrowLeft />
                          </Button>
                        </Hint>
                        <Hint label="Mover después">
                          <Button
                            variant="ghost"
                            size="iconSm"
                            aria-label={`Mover ${widget.name} después`}
                            disabled={
                              isPending || index === one.widgets.length - 1
                            }
                            onClick={() =>
                              setDraft(moveWidget(draft, one.id, widget.id, 1))
                            }
                          >
                            <ArrowRight />
                          </Button>
                        </Hint>
                        <Select
                          value={widget.size}
                          disabled={isPending}
                          onValueChange={(size) =>
                            setDraft(
                              resizeWidget(
                                draft,
                                one.id,
                                widget.id,
                                size as WidgetSize,
                              ),
                            )
                          }
                        >
                          <SelectTrigger
                            size="sm"
                            className="ml-1 w-36 bg-background"
                            aria-label={`Ancho de ${widget.name}`}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {WIDGET_SIZES.map((size) => (
                              <SelectItem key={size} value={size}>
                                {SIZE_LABEL[size]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Hint label="Quitar del tablero">
                          <Button
                            variant="ghost"
                            size="iconSm"
                            className="ml-auto text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            aria-label={`Quitar ${widget.name} del tablero`}
                            disabled={isPending}
                            onClick={() =>
                              setDraft(removeWidget(draft, one.id, widget.id))
                            }
                          >
                            <X />
                          </Button>
                        </Hint>
                      </div>
                    ) : null}
                    <DashboardWidget
                      widget={widget}
                      range={range}
                      today={today}
                      className="h-full"
                    />
                  </div>
                ))}
                {isEditing &&
                one.widgets.length < DASHBOARD_ROOM.widgetsPerTab ? (
                  <AddWidgetPopover
                    taken={
                      new Set(one.widgets.map((widget) => widget.resultId))
                    }
                    onAdd={(widget) =>
                      setDraft(addWidget(draft, one.id, widget))
                    }
                  />
                ) : null}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </section>
  );
};
