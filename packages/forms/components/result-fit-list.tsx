"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

import { useFitRows } from "../lib/use-fit-rows";

/** El alto de la línea de «y N más». */
const MORE_HEIGHT = 28;

interface ResultFitListProps<T> {
  items: readonly T[];
  /** El alto de cada fila, en píxeles: todas miden lo mismo. */
  rowHeight: number;
  itemKey: (item: T) => string;
  renderItem: (item: T) => ReactNode;
  /** Lo que se dice de las que quedaron fuera: «y 12 más». */
  more: (hidden: number) => ReactNode;
  /** Las que ni siquiera llegaron: el cálculo sólo manda las primeras. */
  beyond?: number;
  /** Comparte la tarjeta con una gráfica: pide sólo el alto de sus filas y
   *  cede el resto, y si no cabe, encoge hasta que la gráfica llega a su
   *  mínimo. */
  shareSpace?: boolean;
  className?: string;
}

/**
 * Una lista dentro de una tarjeta de alto fijo: las filas enteras que caben
 * y, debajo, cuántas quedaron fuera. Nunca desplaza por dentro ni corta una
 * fila a la mitad (`docs/plans/2026-10-14-tablero-a-la-medida-design.md` §2).
 * Toma el alto que le sobra a la tarjeta.
 */
export function ResultFitList<T>({
  items,
  rowHeight,
  itemKey,
  renderItem,
  more,
  beyond = 0,
  shareSpace = false,
  className,
}: ResultFitListProps<T>) {
  const { ref, visible, hidden } = useFitRows(
    items.length,
    rowHeight,
    MORE_HEIGHT,
    beyond > 0,
  );
  return (
    <div
      ref={ref}
      className={cn(
        "flex min-h-0 flex-col overflow-hidden",
        !shareSpace && "flex-1 basis-0",
        className,
      )}
      style={
        shareSpace
          ? {
              flex: `0 1 ${items.length * rowHeight + (beyond > 0 ? MORE_HEIGHT : 0)}px`,
            }
          : undefined
      }
    >
      <ul className="divide-y divide-border/60">
        {items.slice(0, visible).map((item) => (
          <li
            key={itemKey(item)}
            className="flex items-center"
            style={{ height: rowHeight }}
          >
            {renderItem(item)}
          </li>
        ))}
      </ul>
      {hidden + beyond > 0 ? (
        <p
          className="flex items-end border-t border-border/60 text-xs text-muted-foreground"
          style={{ height: MORE_HEIGHT }}
        >
          {more(hidden + beyond)}
        </p>
      ) : null}
    </div>
  );
}
