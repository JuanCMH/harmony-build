"use client";

import { Hint } from "@/components/harmony/hint";
import { Button } from "@/components/ui/button";
import type { FieldType } from "@/convex/lib/form_types";
import { cn } from "@/lib/utils";
import { useDraggable } from "@dnd-kit/core";
import type { PointerEventHandler } from "react";

import { FIELD_CATALOG } from "../lib/field-catalog";

/** Lo que lleva un tipo arrastrado desde la paleta. */
export interface PaletteDragData {
  source: "palette";
  type: FieldType;
}

/**
 * Un tipo de la paleta. **Se arrastra con el puntero o se pulsa.** Arrastrar
 * hasta el lienzo es lo que se espera al ver una paleta; pulsar sigue estando
 * porque es lo que funciona con teclado, y añade el campo al final de la
 * sección abierta.
 *
 * Al botón sólo se le engancha el activador de **puntero** de dnd-kit: con el
 * de teclado, Enter sobre un tipo empezaba un arrastre en vez de añadirlo, que
 * es un control que se ve pero no se puede accionar sin ratón (`03 §6.1`).
 */
const PaletteItem = ({
  type,
  disabled,
  onAdd,
}: {
  type: FieldType;
  disabled: boolean;
  onAdd: () => void;
}) => {
  const { label, icon: Icon, description } = FIELD_CATALOG[type];
  const data: PaletteDragData = { source: "palette", type };
  const { listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${type}`,
    data,
    disabled,
  });
  // `listeners` viene tipado como `Record<string, Function>`; el de puntero es
  // un manejador de React normal.
  const drag = listeners
    ? {
        onPointerDown:
          listeners.onPointerDown as PointerEventHandler<HTMLButtonElement>,
      }
    : {};

  return (
    <Hint label={description} side="left">
      <Button
        ref={setNodeRef}
        variant="ghost"
        size="sm"
        disabled={disabled}
        className={cn(
          "h-auto w-full cursor-grab justify-start gap-2 px-2 py-2 font-normal active:cursor-grabbing",
          isDragging && "opacity-40",
        )}
        onClick={onAdd}
        {...drag}
      >
        <Icon className="size-4 shrink-0 text-muted-foreground" />
        <span className="truncate text-ui">{label}</span>
      </Button>
    </Hint>
  );
};

/** Los tipos de campo que admite el formato, en dos columnas: dieciocho en
 *  una sola empujaban el resumen de reglas fuera de la columna. */
export const FormFieldPalette = ({
  types,
  disabled = false,
  onAdd,
}: {
  /** Los que admite la clase (`fieldTypesFor`): un listado no lleva firma. */
  types: readonly FieldType[];
  disabled?: boolean;
  onAdd: (type: FieldType) => void;
}) => (
  <div className="grid grid-cols-2 gap-1" aria-label="Tipos de campo">
    {types.map((type) => (
      <PaletteItem
        key={type}
        type={type}
        disabled={disabled}
        onAdd={() => onAdd(type)}
      />
    ))}
  </div>
);

/** Lo que se ve bajo el puntero mientras se arrastra un tipo. */
export const PaletteDragPreview = ({ type }: { type: FieldType }) => {
  const { icon: Icon, label } = FIELD_CATALOG[type];
  return (
    <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 shadow-sm">
      <Icon className="size-4 text-muted-foreground" />
      <span className="text-ui">{label}</span>
    </div>
  );
};
