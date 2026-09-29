"use client";

import { Hint } from "@/components/harmony/hint";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { FormKind } from "@/convex/lib/form_types";
import { Loader2, MoreHorizontal, Save } from "lucide-react";

import type { BuilderProblems } from "../lib/builder-problems";
import type { LocatedProblem } from "../lib/builder-sections";
import { ENTITY_ICONS, FORM_ACTION_ICONS } from "../lib/field-catalog";
import { STATUS_TONE_CLASS, type StatusBadge } from "../lib/status";
import { FormProblemsMenu } from "./form-problems-menu";

const PublishIcon = FORM_ACTION_ICONS.publish;
const DiscardIcon = FORM_ACTION_ICONS.discardDraft;

/**
 * El estado del formato, entre las migas y las acciones: es un dato, no un
 * botón, así que no va en la zona de acciones (`03 §2.3`).
 */
export const FormBuilderStatus = ({
  badges,
}: {
  badges: readonly StatusBadge[];
}) =>
  badges.length > 0 ? (
    <div className="hidden shrink-0 items-center gap-2 lg:flex">
      {badges.map((badge) => (
        <Badge
          key={badge.label}
          variant="outline"
          className={STATUS_TONE_CLASS[badge.tone]}
        >
          {badge.label}
        </Badge>
      ))}
    </div>
  ) : null;

/**
 * Las acciones del constructor: los problemas, los detalles, descartar,
 * guardar el borrador y publicar.
 *
 * En pantalla estrecha «Detalles» y «Descartar» van a un menú: el constructor
 * se diseña para escritorio, pero en el teléfono no puede empujar la cabecera
 * fuera de la pantalla.
 */
export const FormBuilderActions = ({
  kind,
  problems,
  canSave,
  canPublish,
  canDiscard,
  isSaving,
  isPublishing,
  isBusy,
  publishHint,
  onGoToProblem,
  onOpenDetails,
  onDiscard,
  onSave,
  onPublish,
}: {
  kind: FormKind;
  problems: BuilderProblems;
  canSave: boolean;
  canPublish: boolean;
  canDiscard: boolean;
  isSaving: boolean;
  isPublishing: boolean;
  isBusy: boolean;
  /** Por qué «Publicar» está apagado, si no es por un problema. */
  publishHint?: string;
  onGoToProblem: (problem: LocatedProblem) => void;
  onOpenDetails: () => void;
  onDiscard: () => void;
  onSave: () => void;
  onPublish: () => void;
}) => {
  const DetailsIcon =
    kind === "catalog" ? ENTITY_ICONS.catalog : ENTITY_ICONS.form;
  return (
    <div className="flex items-center gap-2">
      <FormProblemsMenu problems={problems} onGo={onGoToProblem} />
      <Button
        size="sm"
        variant="ghost"
        className="hidden md:inline-flex"
        onClick={onOpenDetails}
      >
        Detalles
      </Button>
      {/* Sólo cuando hay algo que descartar, y como icono: la cabecera es
          de las migas, y el nombre del formato no puede quedarse en «Insp…». */}
      {canDiscard ? (
        <Hint label="Descartar cambios" side="bottom">
          <Button
            size="icon"
            variant="ghost"
            className="hidden size-8 text-muted-foreground md:inline-flex"
            aria-label="Descartar cambios"
            disabled={isBusy}
            onClick={onDiscard}
          >
            <DiscardIcon className="size-4" />
          </Button>
        </Hint>
      ) : null}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="icon"
            variant="ghost"
            className="size-8 md:hidden"
            aria-label="Más acciones"
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={onOpenDetails}>
            <DetailsIcon className="size-4" />
            Detalles
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!canDiscard || isBusy}
            onSelect={onDiscard}
          >
            <DiscardIcon className="size-4" />
            Descartar cambios
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Button
        size="sm"
        variant="outline"
        disabled={!canSave || isBusy}
        onClick={onSave}
      >
        {isSaving ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Save className="size-4" />
        )}
        <span className="hidden sm:inline">Guardar borrador</span>
        <span className="sm:hidden">Guardar</span>
      </Button>
      <Button
        size="sm"
        disabled={!canPublish || isBusy}
        title={publishHint}
        onClick={onPublish}
      >
        {isPublishing ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <PublishIcon className="size-4" />
        )}
        Publicar
      </Button>
    </div>
  );
};
