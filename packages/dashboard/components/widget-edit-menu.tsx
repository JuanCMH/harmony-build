"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  WIDGET_SIZES,
  type WidgetHeight,
  type WidgetSize,
} from "@/convex/lib/result_validators";
import { HEIGHTS_OF } from "@/convex/lib/widget_layout";
import type { ResultType } from "@/convex/lib/result_types";
import { ArrowLeft, ArrowRight, MoreHorizontal, X } from "lucide-react";

import { HEIGHT_LABEL, SIZE_LABEL } from "../lib/dashboard-draft";

interface WidgetEditMenuProps {
  name: string;
  type: ResultType;
  size: WidgetSize;
  height: WidgetHeight;
  /** El alto en que mejor caben hoy sus datos (`suggestedHeight`). */
  suggested: WidgetHeight;
  isFirst: boolean;
  isLast: boolean;
  disabled: boolean;
  onMove: (delta: -1 | 1) => void;
  onResize: (change: { size?: WidgetSize; height?: WidgetHeight }) => void;
  onRemove: () => void;
}

/**
 * Lo que se hace con un resultado mientras se arma el tablero: moverlo,
 * darle ancho y alto, quitarlo. En un menú de la cabecera y no en una barra
 * encima: con altos fijos, la barra le quitaba alto a la tarjeta y lo que se
 * veía al editar dejaba de ser lo que quedaba al guardar
 * (`docs/plans/2026-10-14-tablero-a-la-medida-design.md` §6).
 */
export const WidgetEditMenu = ({
  name,
  type,
  size,
  height,
  suggested,
  isFirst,
  isLast,
  disabled,
  onMove,
  onResize,
  onRemove,
}: WidgetEditMenuProps) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button
        variant="ghost"
        size="iconSm"
        className="text-muted-foreground"
        aria-label={`Ajustar ${name}`}
        disabled={disabled}
      >
        <MoreHorizontal />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="min-w-52">
      <DropdownMenuItem disabled={isFirst} onSelect={() => onMove(-1)}>
        <ArrowLeft />
        Mover antes
      </DropdownMenuItem>
      <DropdownMenuItem disabled={isLast} onSelect={() => onMove(1)}>
        <ArrowRight />
        Mover después
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
        Ancho
      </DropdownMenuLabel>
      <DropdownMenuRadioGroup
        value={size}
        onValueChange={(value) => onResize({ size: value as WidgetSize })}
      >
        {WIDGET_SIZES.map((one) => (
          <DropdownMenuRadioItem key={one} value={one}>
            {SIZE_LABEL[one]}
          </DropdownMenuRadioItem>
        ))}
      </DropdownMenuRadioGroup>
      <DropdownMenuSeparator />
      <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
        Alto
      </DropdownMenuLabel>
      <DropdownMenuRadioGroup
        value={height}
        onValueChange={(value) => onResize({ height: value as WidgetHeight })}
      >
        {HEIGHTS_OF[type].map((one) => (
          <DropdownMenuRadioItem key={one} value={one}>
            {HEIGHT_LABEL[one]}
            {one === suggested ? (
              <span className="ml-auto text-xs text-muted-foreground">
                Sugerido
              </span>
            ) : null}
          </DropdownMenuRadioItem>
        ))}
      </DropdownMenuRadioGroup>
      <DropdownMenuSeparator />
      <DropdownMenuItem variant="destructive" onSelect={onRemove}>
        <X />
        Quitar del tablero
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
);
