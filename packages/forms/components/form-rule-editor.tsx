"use client";

import { SearchableSelect } from "@/components/harmony/searchable-select";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type FormField,
  UNARY_OPERATORS,
  type VisibilityOperator,
  type VisibilityRule,
} from "@/convex/lib/form_types";
import { optionsExist } from "@/convex/lib/form_validation";
import { cn } from "@/lib/utils";
import { Trash2 } from "lucide-react";
import type { ReactNode } from "react";

import { OPERATOR_LABEL, OPERATORS_BY_TYPE } from "../lib/field-catalog";
import { fieldOption, newRule } from "../lib/field-rules";
import { FormRuleValueInput, RULE_PIECE } from "./form-rule-value-input";

/** Una pieza de la regla con su rótulo encima. */
export const RulePiece = ({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) => (
  <div className="min-w-0 space-y-1">
    <p className="text-xs text-muted-foreground">{title}</p>
    {children}
  </div>
);

/** El hueco de una pieza que aún no aplica: ocupa su tercio para que la fila
 *  no cambie de forma al completarse. */
const EmptyPiece = ({ children }: { children: ReactNode }) => (
  <div className="flex h-8 items-center rounded-md border border-dashed px-3 text-ui text-muted-foreground">
    <span className="truncate">{children}</span>
  </div>
);

/**
 * Una regla como frase de tres piezas —campo, operador, valor—. Sirve a la
 * visibilidad de un campo, a la de una sección y al valor sugerido: lo que
 * cambia es lo que va detrás de la frase, que llega como `children`.
 *
 * Cambiar el campo reinicia operador y valor —«anterior a» no significa nada
 * sobre una lista—; cambiar el operador conserva el valor si sigue teniendo
 * sentido.
 */
export const FormRuleRow = <T extends VisibilityRule>({
  rule,
  index,
  fields,
  candidates,
  onChange,
  onRemove,
  removeLabel,
  children,
}: {
  rule: T;
  index: number;
  fields: readonly FormField[];
  /** Los campos que pueden gobernar a este (`controllerCandidates`). */
  candidates: readonly FormField[];
  onChange: (rule: T) => void;
  onRemove: () => void;
  removeLabel: string;
  children?: ReactNode;
}) => {
  const controller = fields.find((field) => field.id === rule.fieldId);
  const operators = controller ? OPERATORS_BY_TYPE[controller.type] : [];
  const isUnary = UNARY_OPERATORS.includes(rule.operator);
  const lacksValue = !isUnary && !rule.values.some((value) => value !== "");
  const lacksField = rule.fieldId === "";
  const hasDeletedOption =
    !lacksValue && !isUnary && !optionsExist(controller, rule.values);

  const changeOperator = (operator: VisibilityOperator) =>
    onChange({
      ...rule,
      operator,
      values: UNARY_OPERATORS.includes(operator)
        ? []
        : operator === "anyOf"
          ? rule.values
          : rule.values.slice(0, 1),
    });

  return (
    <li className="space-y-3 rounded-lg border bg-card p-3">
      <div className="flex items-start gap-2">
        <div
          role="group"
          aria-label={`Condición ${index + 1}`}
          className={cn(
            "grid min-w-0 flex-1 grid-cols-1 gap-2 sm:grid-cols-3",
            // Rojo sólo para lo que está roto. Lo que falta por completar se
            // pide en gris: una condición recién añadida no es un error.
            hasDeletedOption && "[&_[data-slot=value]]:border-destructive/40",
          )}
        >
          <RulePiece title={index === 0 ? "Cuando el campo" : "Y el campo"}>
            <SearchableSelect
              size="sm"
              aria-label="Campo"
              className={cn(RULE_PIECE, "font-medium")}
              placeholder={lacksField ? "Elige un campo" : "Un campo eliminado"}
              searchPlaceholder="Buscar un campo…"
              value={rule.fieldId}
              options={candidates.map(fieldOption)}
              onValueChange={(id) => {
                const next = fields.find((field) => field.id === id);
                if (next) onChange({ ...rule, ...newRule(next) });
              }}
            />
          </RulePiece>

          <RulePiece title="Cumple">
            {controller ? (
              <Select value={rule.operator} onValueChange={changeOperator}>
                <SelectTrigger
                  size="sm"
                  aria-label="Condición"
                  className={RULE_PIECE}
                >
                  <SelectValue placeholder="Elige cómo se cumple" />
                </SelectTrigger>
                <SelectContent>
                  {operators.map((operator) => (
                    <SelectItem key={operator} value={operator}>
                      {OPERATOR_LABEL[operator]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <EmptyPiece>Primero elige el campo</EmptyPiece>
            )}
          </RulePiece>

          <RulePiece title="Valor">
            {controller && isUnary ? (
              <EmptyPiece>No necesita valor</EmptyPiece>
            ) : controller ? (
              <div data-slot="value" className="min-w-0">
                <FormRuleValueInput
                  key={`${rule.fieldId}:${rule.operator}`}
                  field={controller}
                  operator={rule.operator}
                  values={rule.values}
                  label="Valor con el que comparar"
                  onChange={(values) => onChange({ ...rule, values })}
                />
              </div>
            ) : (
              <EmptyPiece>—</EmptyPiece>
            )}
          </RulePiece>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="mt-5 size-8 shrink-0 text-muted-foreground hover:text-destructive"
          aria-label={removeLabel}
          onClick={onRemove}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>

      {children}

      {lacksField ? (
        <p className="px-1 text-xs text-muted-foreground">
          Elige el campo del que depende.
        </p>
      ) : lacksValue ? (
        <p className="px-1 text-xs text-muted-foreground">
          Falta el valor con el que comparar.
        </p>
      ) : null}
      {hasDeletedOption ? (
        <p className="px-1 text-xs text-destructive">
          Compara con una opción que ya no existe en «{controller?.label}».
          Elige otra.
        </p>
      ) : null}
    </li>
  );
};
