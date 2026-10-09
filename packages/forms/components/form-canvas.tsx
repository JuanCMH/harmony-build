"use client";

import { CollectionEmpty } from "@/components/harmony/collection";
import { Hint } from "@/components/harmony/hint";
import { Button } from "@/components/ui/button";
import { findDependents } from "@/convex/lib/field_logic";
import type { FormField, FormSection } from "@/convex/lib/form_types";
import { cn } from "@/lib/utils";
import { useDroppable } from "@dnd-kit/core";
import {
  rectSortingStrategy,
  SortableContext,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, LayoutGrid, Trash2 } from "lucide-react";

import { previewChecklist } from "../lib/builder-sections";
import {
  BEHAVIOR_CATALOG,
  FIELD_CATALOG,
  FORM_ACTION_ICONS,
} from "../lib/field-catalog";
import {
  type CatalogNames,
  describeTypeConfig,
} from "../lib/field-config-text";
import {
  FIELD_CELL,
  FIELD_CELL_LABEL,
  FIELD_GRID,
  FIELD_SIZE_SPAN,
} from "../lib/grid";
import { FormFieldInput } from "./form-field";

/** El campo del lienzo no se rellena: su `onChange` no lleva a ninguna parte. */
const IGNORE = () => {};

/** En el lienzo nadie diligencia: el campo se enseña y no se usa. */
const CANVAS_CONTEXT = { formId: null, authorName: "Quien diligencia" };

/** Lo que lleva un campo del lienzo al arrastrarlo, y el propio lienzo como
 *  destino. */
export interface CanvasDragData {
  source: "canvas";
  sectionId: string;
}

const DuplicateIcon = FORM_ACTION_ICONS.duplicate;

/** El sitio que la etiqueta deja a las marcas de comportamiento, según
 *  cuántas lleve el campo (de ninguna a tres). */
const MARKS_PADDING = ["", "pr-6", "pr-10", "pr-14"] as const;

/**
 * El campo como se verá, con lo que una lista de chequeo larga no puede
 * enseñar entera: sus primeros ítems por bloque y «… y 58 más».
 */
const FieldPreview = ({
  field,
  catalogNames,
  markCount,
}: {
  field: FormField;
  catalogNames: CatalogNames;
  /** Cuántas marcas de comportamiento lleva encima, a la derecha: la
   *  etiqueta les deja sitio, y sólo el que hace falta. */
  markCount: number;
}) => {
  const preview =
    field.type === "checklist" && field.config.checklist
      ? previewChecklist(field.config.checklist)
      : null;
  const shown: FormField = preview
    ? { ...field, config: { ...field.config, checklist: preview.config } }
    : field;
  const summary = describeTypeConfig(field, catalogNames);
  const TypeIcon = FIELD_CATALOG[field.type].icon;

  return (
    // Dos hijos, las dos pistas de `FIELD_CELL`: la etiqueta con su ayuda, y
    // el control con lo que cuelga de él. Así los controles de una fila del
    // lienzo arrancan a la misma altura, como en el formulario.
    <>
      <div
        className={cn(
          FIELD_CELL_LABEL,
          "space-y-1",
          MARKS_PADDING[Math.min(markCount, MARKS_PADDING.length - 1)],
        )}
      >
        <p className="text-sm font-medium">
          {field.label || (
            <span className="text-muted-foreground">Sin etiqueta</span>
          )}
          {field.required ? (
            <span aria-hidden className="ml-0.5 text-destructive">
              *
            </span>
          ) : null}
          {field.required ? (
            <span className="sr-only"> (obligatorio)</span>
          ) : null}
        </p>
        {field.description ? (
          <p className="text-xs text-muted-foreground">{field.description}</p>
        ) : null}
      </div>
      <div className="min-w-0 space-y-2">
        {/* El mismo control que rellena quien diligencia, apagado: el lienzo
            deja de ser una lista de nombres y pasa a ser el formato. `inert`:
            ni se pulsa ni se anuncia, porque aquí es una muestra. */}
        <div inert className="pointer-events-none">
          <FormFieldInput
            id={`canvas-${field.id}`}
            field={shown}
            value={undefined}
            disabled
            showMissing={false}
            context={CANVAS_CONTEXT}
            onChange={IGNORE}
          />
        </div>
        {preview && preview.hidden > 0 ? (
          <p className="text-ui text-muted-foreground">
            … y {preview.hidden} más
          </p>
        ) : null}
        {summary && field.type !== "checklist" ? (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <TypeIcon className="size-3.5 shrink-0" aria-hidden />
            {summary}
          </p>
        ) : null}
      </div>
    </>
  );
};

const CanvasField = ({
  field,
  sectionId,
  spanClassName,
  isSelected,
  blockedBy,
  catalogNames,
  onSelect,
  onDuplicate,
  onRemove,
}: {
  field: FormField;
  sectionId: string;
  spanClassName: string;
  isSelected: boolean;
  /** Los campos que dependen de éste: si los hay, no se puede quitar. */
  blockedBy: string[];
  catalogNames: CatalogNames;
  onSelect: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
}) => {
  const data: CanvasDragData = { source: "canvas", sectionId };
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id, data });
  const name = field.label || FIELD_CATALOG[field.type].label;
  const blockReason =
    blockedBy.length > 0
      ? `No se puede eliminar: ${blockedBy.join(", ")} depende${blockedBy.length > 1 ? "n" : ""} de este campo.`
      : null;
  const marks = [
    field.config.visibility?.rules.length ? BEHAVIOR_CATALOG.visibility : null,
    field.config.computed ? BEHAVIOR_CATALOG.value : null,
    field.config.autoValue?.rules.length ? BEHAVIOR_CATALOG.autoValue : null,
  ].filter((mark) => mark !== null);

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "group relative",
        FIELD_CELL,
        spanClassName,
        isDragging && "z-10 opacity-40",
      )}
    >
      {/* No es un `<button>`: el control de dentro ya lo es —el selector de
          fecha, la lista— y un botón dentro de otro es HTML inválido. El
          envoltorio hace de botón por rol y teclado. */}
      <div
        role="button"
        tabIndex={0}
        onClick={onSelect}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onSelect();
          }
        }}
        aria-label={`Configurar ${name}`}
        aria-pressed={isSelected}
        className={cn(
          FIELD_CELL,
          "w-full cursor-pointer rounded-lg p-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
          isSelected
            ? "bg-h-indigo/5 ring-2 ring-h-indigo/40"
            : "hover:bg-accent/40",
        )}
      >
        <FieldPreview
          field={field}
          catalogNames={catalogNames}
          markCount={marks.length}
        />
      </div>

      {/* Lo que no se ve en el control pero cambia su comportamiento. */}
      {marks.length > 0 ? (
        <div className="pointer-events-none absolute top-3 right-3 flex items-center gap-1 text-muted-foreground transition-opacity group-hover:opacity-0 group-focus-within:opacity-0">
          {marks.map(({ icon: Icon, mark }) => (
            <Icon key={mark} className="size-3.5" aria-label={mark} />
          ))}
        </div>
      ) : null}

      {/* Las herramientas aparecen al acercarse: en reposo, el lienzo es el
          formato y nada más. */}
      <div
        className={cn(
          "absolute -top-2 right-1 flex items-center gap-0.5 rounded-md border bg-card p-0.5 opacity-0 shadow-sm transition-opacity",
          "group-hover:opacity-100 group-focus-within:opacity-100",
          isSelected && "opacity-100",
        )}
      >
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Reordenar ${name}`}
          className="flex size-7 cursor-grab touch-none items-center justify-center rounded-sm text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <GripVertical className="size-3.5" />
        </button>
        <Hint label="Duplicar">
          <Button
            size="icon"
            variant="ghost"
            className="size-7 text-muted-foreground"
            aria-label={`Duplicar ${name}`}
            onClick={onDuplicate}
          >
            <DuplicateIcon className="size-3.5" />
          </Button>
        </Hint>
        {/* Quitar un campo del que otro depende dejaría una regla apuntando al
            vacío. El botón sigue vivo con `aria-disabled` y el motivo sale en
            un `Hint`: un botón `disabled` no recibe el ratón y no explica
            nada. */}
        <Hint label={blockReason ?? "Eliminar"}>
          <Button
            size="icon"
            variant="ghost"
            className={cn(
              "size-7 text-muted-foreground hover:bg-destructive/10 hover:text-destructive",
              blockReason &&
                "cursor-not-allowed opacity-50 hover:bg-transparent hover:text-muted-foreground",
            )}
            aria-label={
              blockReason
                ? `Eliminar ${name}. ${blockReason}`
                : `Eliminar ${name}`
            }
            aria-disabled={!!blockReason}
            onClick={blockReason ? undefined : onRemove}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </Hint>
      </div>
    </div>
  );
};

/** Los campos de una sección, en su retícula, reordenables arrastrando. */
export const FormCanvas = ({
  section,
  allFields,
  selectedFieldId,
  catalogNames,
  onSelectField,
  onDuplicateField,
  onRemoveField,
}: {
  section: FormSection;
  /** Todos los del formato: hacen falta para saber quién depende de quién. */
  allFields: readonly FormField[];
  selectedFieldId: string | null;
  catalogNames: CatalogNames;
  onSelectField: (id: string) => void;
  onDuplicateField: (id: string) => void;
  onRemoveField: (id: string) => void;
}) => {
  // El lienzo recibe lo que cae desde la paleta; reordenar lo resuelve el
  // `SortableContext`, y los dos viven en el `DndContext` del constructor.
  const data: CanvasDragData = { source: "canvas", sectionId: section.id };
  const { setNodeRef, isOver } = useDroppable({
    id: `canvas-${section.id}`,
    data,
  });

  if (section.fields.length === 0) {
    return (
      <div
        ref={setNodeRef}
        className={cn(
          "rounded-lg border border-dashed transition-colors",
          isOver && "border-h-indigo/50 bg-h-indigo/5",
        )}
      >
        <CollectionEmpty
          icon={LayoutGrid}
          title="Esta sección no tiene campos"
          hint="Arrastra un tipo desde la derecha, o púlsalo."
        />
      </div>
    );
  }

  return (
    <SortableContext
      items={section.fields.map((field) => field.id)}
      strategy={rectSortingStrategy}
    >
      <div
        ref={setNodeRef}
        className={cn(
          FIELD_GRID,
          "rounded-lg transition-colors",
          isOver && "bg-h-indigo/5 ring-1 ring-h-indigo/30",
        )}
        aria-label="Campos de la sección"
      >
        {section.fields.map((field) => (
          <CanvasField
            key={field.id}
            field={field}
            sectionId={section.id}
            spanClassName={FIELD_SIZE_SPAN[field.size]}
            isSelected={selectedFieldId === field.id}
            blockedBy={findDependents(allFields, field.id)
              .filter((dependent) => dependent.id !== field.id)
              .map((dependent) => dependent.label)}
            catalogNames={catalogNames}
            onSelect={() => onSelectField(field.id)}
            onDuplicate={() => onDuplicateField(field.id)}
            onRemove={() => onRemoveField(field.id)}
          />
        ))}
      </div>
    </SortableContext>
  );
};
