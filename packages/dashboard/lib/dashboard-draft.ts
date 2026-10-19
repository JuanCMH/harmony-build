import type { Id } from "@/convex/_generated/dataModel";
import type { ResultType } from "@/convex/lib/result_types";
import type {
  WidgetHeight,
  WidgetSize,
} from "@/convex/lib/result_validators";

/**
 * El tablero mientras se edita: sus pestañas y los resultados de cada una, y
 * las operaciones que lo cambian. Todas devuelven un tablero nuevo; ninguna
 * toca el que recibe.
 */

export interface DraftWidget {
  id: string;
  resultId: Id<"formResults">;
  size: WidgetSize;
  height: WidgetHeight;
  /** Lo que hace falta para pintarlo mientras se edita: su nombre, su tipo
   *  y el formato del que sale. */
  name: string;
  type: ResultType;
  formId: Id<"forms">;
  formName: string;
}

export interface DraftTab {
  id: string;
  label: string;
  widgets: DraftWidget[];
}

export const SIZE_LABEL: Record<WidgetSize, string> = {
  third: "Un tercio",
  half: "Media fila",
  twoThirds: "Dos tercios",
  full: "Fila entera",
};

export const HEIGHT_LABEL: Record<WidgetHeight, string> = {
  short: "Bajo",
  medium: "Medio",
  tall: "Alto",
};

const replaceTab = (
  tabs: readonly DraftTab[],
  tabId: string,
  change: (tab: DraftTab) => DraftTab,
): DraftTab[] => tabs.map((tab) => (tab.id === tabId ? change(tab) : tab));

/** Mueve un elemento un puesto; en el borde, lo deja donde está. */
function moved<T>(items: readonly T[], index: number, delta: -1 | 1): T[] {
  const target = index + delta;
  if (index < 0 || target < 0 || target >= items.length) return [...items];
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export const addTab = (
  tabs: readonly DraftTab[],
  id: string,
  label: string,
): DraftTab[] => [...tabs, { id, label, widgets: [] }];

export const renameTab = (
  tabs: readonly DraftTab[],
  tabId: string,
  label: string,
): DraftTab[] => replaceTab(tabs, tabId, (tab) => ({ ...tab, label }));

export const removeTab = (
  tabs: readonly DraftTab[],
  tabId: string,
): DraftTab[] => tabs.filter((tab) => tab.id !== tabId);

export const moveTab = (
  tabs: readonly DraftTab[],
  tabId: string,
  delta: -1 | 1,
): DraftTab[] =>
  moved(
    tabs,
    tabs.findIndex((tab) => tab.id === tabId),
    delta,
  );

export const addWidget = (
  tabs: readonly DraftTab[],
  tabId: string,
  widget: DraftWidget,
): DraftTab[] =>
  replaceTab(tabs, tabId, (tab) => ({
    ...tab,
    widgets: [...tab.widgets, widget],
  }));

export const removeWidget = (
  tabs: readonly DraftTab[],
  tabId: string,
  widgetId: string,
): DraftTab[] =>
  replaceTab(tabs, tabId, (tab) => ({
    ...tab,
    widgets: tab.widgets.filter((widget) => widget.id !== widgetId),
  }));

/** Cambia el ancho, el alto o los dos. */
export const resizeWidget = (
  tabs: readonly DraftTab[],
  tabId: string,
  widgetId: string,
  change: { size?: WidgetSize; height?: WidgetHeight },
): DraftTab[] =>
  replaceTab(tabs, tabId, (tab) => ({
    ...tab,
    widgets: tab.widgets.map((widget) =>
      widget.id === widgetId ? { ...widget, ...change } : widget,
    ),
  }));

export const moveWidget = (
  tabs: readonly DraftTab[],
  tabId: string,
  widgetId: string,
  delta: -1 | 1,
): DraftTab[] =>
  replaceTab(tabs, tabId, (tab) => ({
    ...tab,
    widgets: moved(
      tab.widgets,
      tab.widgets.findIndex((widget) => widget.id === widgetId),
      delta,
    ),
  }));

/** Lo primero que impide guardar, o `null`. */
export function dashboardProblem(tabs: readonly DraftTab[]): string | null {
  if (tabs.length === 0) return "Añade al menos una pestaña.";
  if (tabs.some((tab) => tab.label.trim() === "")) {
    return "Hay una pestaña sin nombre.";
  }
  return null;
}

/** Lo que se manda a `dashboards.save`: sólo lo que se guarda. */
export const dashboardPayload = (tabs: readonly DraftTab[]) =>
  tabs.map((tab) => ({
    id: tab.id,
    label: tab.label.trim(),
    widgets: tab.widgets.map(({ id, resultId, size, height }) => ({
      id,
      resultId,
      size,
      height,
    })),
  }));

export const DASHBOARD_ROOM = { tabs: 20, widgetsPerTab: 12 } as const;
