import type { Id } from "@/convex/_generated/dataModel";
import { describe, expect, it } from "vitest";

import {
  type DraftTab,
  addTab,
  addWidget,
  dashboardPayload,
  dashboardProblem,
  moveTab,
  moveWidget,
  removeWidget,
  resizeWidget,
} from "../dashboard-draft";

const widget = (id: string) => ({
  id,
  resultId: `resultado-${id}` as Id<"formResults">,
  size: "half" as const,
  height: "short" as const,
  name: `Resultado ${id}`,
  type: "indicator" as const,
  formId: "f1" as Id<"forms">,
  formName: "Inspección",
});

const TABS: DraftTab[] = [
  { id: "t1", label: "Inspecciones", widgets: [widget("a"), widget("b")] },
  { id: "t2", label: "Personas", widgets: [] },
];

describe("el tablero mientras se edita", () => {
  it("añade pestañas y resultados sin tocar el tablero que recibe", () => {
    const next = addWidget(addTab(TABS, "t3", "Ambiental"), "t3", widget("c"));
    expect(next.map((tab) => tab.widgets.length)).toEqual([2, 0, 1]);
    expect(TABS).toHaveLength(2);
  });

  it("mueve una pestaña o un resultado un puesto, y en el borde no hace nada", () => {
    expect(moveTab(TABS, "t2", -1).map((tab) => tab.id)).toEqual(["t2", "t1"]);
    expect(moveTab(TABS, "t1", -1).map((tab) => tab.id)).toEqual(["t1", "t2"]);
    expect(
      moveWidget(TABS, "t1", "a", 1)[0].widgets.map((one) => one.id),
    ).toEqual(["b", "a"]);
  });

  it("cambia el ancho y el alto de un resultado, y lo quita", () => {
    expect(
      resizeWidget(TABS, "t1", "a", { size: "full" })[0].widgets[0],
    ).toMatchObject({ size: "full", height: "short" });
    expect(
      resizeWidget(TABS, "t1", "a", { height: "medium" })[0].widgets[0],
    ).toMatchObject({ size: "half", height: "medium" });
    expect(
      removeWidget(TABS, "t1", "a")[0].widgets.map((one) => one.id),
    ).toEqual(["b"]);
  });

  it("no se guarda vacío ni con una pestaña sin nombre", () => {
    expect(dashboardProblem([])).toMatch(/al menos una pestaña/);
    expect(dashboardProblem([{ id: "x", label: "  ", widgets: [] }])).toMatch(
      /sin nombre/,
    );
    expect(dashboardProblem(TABS)).toBeNull();
  });

  it("manda sólo lo que se guarda: ni el nombre del resultado ni el del formato", () => {
    expect(dashboardPayload(TABS)[0]).toEqual({
      id: "t1",
      label: "Inspecciones",
      widgets: [
        { id: "a", resultId: "resultado-a", size: "half", height: "short" },
        { id: "b", resultId: "resultado-b", size: "half", height: "short" },
      ],
    });
  });
});
