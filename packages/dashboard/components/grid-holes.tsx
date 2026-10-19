"use client";

import { Button } from "@/components/ui/button";
import type {
  WidgetHeight,
  WidgetSize,
} from "@/convex/lib/result_validators";
import { placeWidgets, widenInto } from "@/convex/lib/widget_layout";

interface GridHolesProps {
  widgets: readonly {
    id: string;
    name: string;
    size: WidgetSize;
    height: WidgetHeight;
  }[];
  disabled: boolean;
  onWiden: (widgetId: string, size: WidgetSize) => void;
}

/**
 * Los huecos que deja la pestaña al armarla, punteados en su sitio de la
 * retícula, y la forma de cerrarlos cuando la hay: ensanchar el resultado de
 * al lado. No se reacomoda solo: el orden lo decide quien arma el tablero
 * (`docs/plans/2026-10-14-tablero-a-la-medida-design.md` §6).
 *
 * Sólo en escritorio: en teléfono todo va a fila entera y no hay huecos.
 */
export const GridHoles = ({ widgets, disabled, onWiden }: GridHolesProps) => {
  const { placed, holes } = placeWidgets(widgets);
  return holes.map((hole) => {
    const widen = widenInto(placed, hole);
    const neighbor = widen ? widgets[widen.index] : null;
    return (
      <div
        key={`${hole.row}-${hole.column}`}
        className="hidden flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-h-indigo/40 bg-h-indigo/5 p-3 text-center text-xs text-muted-foreground lg:flex"
        style={{
          gridRow: `${hole.row + 1} / span ${hole.floors}`,
          gridColumn: `${hole.column + 1} / span ${hole.columns}`,
        }}
      >
        Espacio libre
        {widen && neighbor ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 max-w-full text-xs"
            disabled={disabled}
            onClick={() => onWiden(neighbor.id, widen.size)}
          >
            <span className="truncate">Ensanchar «{neighbor.name}»</span>
          </Button>
        ) : null}
      </div>
    );
  });
};
