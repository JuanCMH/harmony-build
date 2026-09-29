"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { FormKind } from "@/convex/lib/form_types";
import {
  type LucideIcon,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import Link from "next/link";

import { ENTITY_ICONS, FORM_ACTION_ICONS } from "../lib/field-catalog";
import {
  type FormRowAction,
  type FormRowActionKey,
  formRowActionLabel,
} from "../lib/form-row-actions";

/** Las acciones que sólo llevan a otra pantalla: son enlaces, no botones. */
export type FormRowLinkKey = Extract<
  FormRowActionKey,
  "fill" | "addEntry" | "responses" | "edit"
>;

export const isLinkAction = (key: FormRowActionKey): key is FormRowLinkKey =>
  key === "fill" || key === "addEntry" || key === "responses" || key === "edit";

const actionIcon = (key: FormRowActionKey, kind: FormKind): LucideIcon => {
  switch (key) {
    case "fill":
      return FORM_ACTION_ICONS.fill;
    case "addEntry":
      return Plus;
    case "responses":
      return kind === "record" ? ENTITY_ICONS.response : ENTITY_ICONS.entry;
    case "edit":
      return Pencil;
    case "duplicate":
      return FORM_ACTION_ICONS.duplicate;
    case "archive":
      return FORM_ACTION_ICONS.archive;
    case "unarchive":
      return FORM_ACTION_ICONS.unarchive;
    case "remove":
      return Trash2;
  }
};

/** Lo que cambia el formato va debajo de una línea: no se pulsa por error al
 *  ir a abrirlo. */
const startsGroup = (key: FormRowActionKey, previous?: FormRowActionKey) =>
  previous !== undefined && isLinkAction(previous) && !isLinkAction(key);

/**
 * El menú de una fila de la lista de formatos (`03 §2.3`).
 *
 * No decide nada: recibe las acciones que `formRowActions` ya filtró por las
 * llaves de quien mira. Sin ninguna, no se pinta.
 */
export const FormRowMenu = ({
  name,
  kind,
  actions,
  hrefOf,
  disabled,
  onAction,
}: {
  name: string;
  kind: FormKind;
  actions: readonly FormRowAction[];
  hrefOf: (key: FormRowLinkKey) => string;
  disabled: boolean;
  onAction: (key: Exclude<FormRowActionKey, FormRowLinkKey>) => void;
}) => {
  if (actions.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="iconSm"
          variant="ghost"
          disabled={disabled}
          aria-label={`Acciones de ${name}`}
          className="text-muted-foreground"
        >
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-52">
        {actions.map(({ key, blockedReason }, index) => {
          const Icon = actionIcon(key, kind);
          const label = formRowActionLabel(key, kind);
          const separator = startsGroup(key, actions[index - 1]?.key) ? (
            <DropdownMenuSeparator key={`${key}-separator`} />
          ) : null;

          if (isLinkAction(key)) {
            return [
              separator,
              <DropdownMenuItem key={key} asChild>
                <Link href={hrefOf(key)}>
                  <Icon className="size-4" />
                  {label}
                </Link>
              </DropdownMenuItem>,
            ];
          }

          return [
            separator,
            <DropdownMenuItem
              key={key}
              variant={key === "remove" ? "destructive" : "default"}
              disabled={blockedReason !== undefined}
              onSelect={() => onAction(key)}
              // Apagada, la acción dice por qué en su segunda línea: un
              // `title` sobre un elemento deshabilitado no recibe el ratón.
              className={blockedReason ? "items-start" : undefined}
            >
              <Icon className={blockedReason ? "mt-0.5 size-4" : "size-4"} />
              {blockedReason ? (
                <span className="min-w-0">
                  <span className="block">{label}</span>
                  <span className="block text-xs">{blockedReason}</span>
                </span>
              ) : (
                label
              )}
            </DropdownMenuItem>,
          ];
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
