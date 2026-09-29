"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import type { FormSection } from "@/convex/lib/form_types";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  ArrowRight,
  Copy,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useState } from "react";

import { BEHAVIOR_CATALOG } from "../lib/field-catalog";

const ConditionMark = BEHAVIOR_CATALOG.visibility.icon;

/**
 * Una sección como pestaña. El nombre se edita **en la pestaña** —doble clic o
 * «Renombrar»— y el resto de lo que se le hace sale de su menú: dos controles
 * permanentes ocupando una fila para algo que se toca una vez sobraban.
 */
const SectionTab = ({
  section,
  isActive,
  isFirst,
  isLast,
  canRemove,
  canDuplicate,
  onSelect,
  onRename,
  onMove,
  onDuplicate,
  onRemove,
}: {
  section: FormSection;
  isActive: boolean;
  isFirst: boolean;
  isLast: boolean;
  canRemove: boolean;
  canDuplicate: boolean;
  onSelect: () => void;
  onRename: (label: string) => void;
  onMove: (offset: -1 | 1) => void;
  onDuplicate: () => void;
  onRemove: () => void;
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(section.label);
  const hasCondition = (section.visibility?.rules.length ?? 0) > 0;

  const commit = () => {
    const clean = value.trim();
    if (clean && clean !== section.label) onRename(clean);
    else setValue(section.label);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <Input
        autoFocus
        value={value}
        aria-label={`Nombre de la sección ${section.label}`}
        className="h-8 w-44 shrink-0 text-ui"
        onChange={(event) => setValue(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") commit();
          if (event.key === "Escape") {
            setValue(section.label);
            setIsEditing(false);
          }
        }}
      />
    );
  }

  return (
    <div
      className={cn(
        "group flex shrink-0 items-center gap-1 rounded-md pr-1 pl-3 transition-colors",
        isActive
          ? "bg-muted text-foreground"
          : "text-muted-foreground hover:bg-muted/50",
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        onDoubleClick={() => {
          setValue(section.label);
          setIsEditing(true);
        }}
        aria-current={isActive ? "true" : undefined}
        title={section.label}
        className="flex max-w-56 cursor-pointer items-center gap-1.5 truncate py-2 text-ui whitespace-nowrap"
      >
        {hasCondition ? (
          <ConditionMark
            className="size-3.5 shrink-0"
            aria-label={BEHAVIOR_CATALOG.visibility.mark}
          />
        ) : null}
        <span className="truncate">{section.label}</span>
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="icon"
            variant="ghost"
            aria-label={`Acciones de ${section.label}`}
            className={cn(
              "size-6 shrink-0 text-muted-foreground opacity-0 transition-opacity",
              "group-hover:opacity-100 focus-visible:opacity-100",
              isActive && "opacity-100",
            )}
          >
            <MoreHorizontal className="size-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem
            onSelect={() => {
              setValue(section.label);
              setIsEditing(true);
            }}
          >
            <Pencil className="size-4" />
            Renombrar
          </DropdownMenuItem>
          <DropdownMenuItem disabled={isFirst} onSelect={() => onMove(-1)}>
            <ArrowLeft className="size-4" />
            Mover antes
          </DropdownMenuItem>
          <DropdownMenuItem disabled={isLast} onSelect={() => onMove(1)}>
            <ArrowRight className="size-4" />
            Mover después
          </DropdownMenuItem>
          <DropdownMenuItem disabled={!canDuplicate} onSelect={onDuplicate}>
            <Copy className="size-4" />
            Duplicar
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            disabled={!canRemove}
            onSelect={onRemove}
          >
            <Trash2 className="size-4" />
            Eliminar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

/**
 * Las secciones del formato, como pestañas, con el resumen del formato a su
 * derecha: «12 campos · 3 secciones» es un dato de lo que describen las
 * pestañas, no un botón de la cabecera (`03 §2.3`).
 */
export const FormSectionTabs = ({
  sections,
  activeSectionId,
  summary,
  canAdd,
  onSelect,
  onAdd,
  onRename,
  onMove,
  onDuplicate,
  onRemove,
}: {
  sections: readonly FormSection[];
  activeSectionId: string | null;
  summary: string;
  /** Falso al llegar al tope de secciones. */
  canAdd: boolean;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onRename: (id: string, label: string) => void;
  onMove: (id: string, offset: -1 | 1) => void;
  onDuplicate: (id: string) => void;
  onRemove: (id: string) => void;
}) => (
  <div className="flex min-w-0 items-center gap-1">
    <nav
      // `-m-1 p-1`: un contenedor que se desplaza recorta lo que sobresale, y
      // el anillo de foco sobresale 3px. El margen negativo devuelve la barra
      // a su sitio (`03 §6.1`).
      className="-m-1 flex min-w-0 flex-1 items-center gap-1 overflow-x-auto p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      aria-label="Secciones del formato"
    >
      {sections.map((section, index) => (
        <SectionTab
          key={section.id}
          section={section}
          isActive={section.id === activeSectionId}
          isFirst={index === 0}
          isLast={index === sections.length - 1}
          // La última sección no se quita: un campo vive dentro de una.
          canRemove={sections.length > 1}
          canDuplicate={canAdd}
          onSelect={() => onSelect(section.id)}
          onRename={(label) => onRename(section.id, label)}
          onMove={(offset) => onMove(section.id, offset)}
          onDuplicate={() => onDuplicate(section.id)}
          onRemove={() => onRemove(section.id)}
        />
      ))}
    </nav>
    <span className="hidden shrink-0 px-2 text-ui text-muted-foreground tabular-nums sm:inline">
      {summary}
    </span>
    <Button
      size="sm"
      variant="ghost"
      disabled={!canAdd}
      title={canAdd ? undefined : "El formato llegó al máximo de secciones"}
      className="shrink-0 text-muted-foreground"
      onClick={onAdd}
    >
      <Plus className="size-4" />
      Sección
    </Button>
  </div>
);
