"use client";

import { SearchableSelect } from "@/components/harmony/searchable-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  COMPUTED_OPERATORS,
  type ComputedTerm,
  DATE_ADD_UNITS,
  type FieldComputed,
  type FormField,
  type FormulaComputed,
} from "@/convex/lib/form_types";
import { cn } from "@/lib/utils";
import { Plus, Trash2, X } from "lucide-react";
import { type ReactNode, useState } from "react";

import { DATE_ADD_UNIT_LABEL, OPERATION_LABEL } from "../lib/field-catalog";
import {
  fieldOption,
  OPERATOR_SYMBOL,
  operandCandidates,
} from "../lib/field-rules";
import { RulePiece } from "./form-rule-editor";

/**
 * Las piezas de cada receta de un valor derivado. Viven aparte del editor
 * porque son siete recetas con su propia forma y, juntas, pasaban de 650
 * líneas (`06 §3`).
 */

const FieldPicker = ({
  value,
  candidates,
  label,
  onChange,
}: {
  value: string;
  candidates: readonly FormField[];
  label: string;
  onChange: (fieldId: string) => void;
}) => (
  <SearchableSelect
    size="sm"
    aria-label={label}
    className="h-8 w-full min-w-0"
    placeholder="Elige un campo"
    searchPlaceholder="Buscar un campo…"
    value={value}
    options={candidates.map(fieldOption)}
    onValueChange={onChange}
  />
);

/**
 * Las piezas de una receta en tercios, con su rótulo encima, como las de una
 * condición: en fila, «19 % de [campo]» dejaba dos tercios vacíos.
 */
export const Thirds = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => (
  <div className={cn("grid grid-cols-1 gap-2 sm:grid-cols-3", className)}>
    {children}
  </div>
);

/** Una pieza que no se elige: lo que la receta hace sola. */
export const FixedPiece = ({ children }: { children: string }) => (
  <div className="flex h-8 items-center rounded-md bg-muted/40 px-3 text-ui text-muted-foreground">
    <span className="truncate" title={children}>
      {children}
    </span>
  </div>
);

/** Un número de la receta, que ocupa su tercio. */
const NumberPiece = ({
  label,
  value,
  onChange,
  integer = false,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  integer?: boolean;
}) => (
  <Input
    type="number"
    inputMode={integer ? "numeric" : "decimal"}
    step={integer ? 1 : undefined}
    aria-label={label}
    className="h-8 w-full"
    value={Number.isFinite(value) ? value : ""}
    // Vacío es vacío: con `Number("")` volvía a 0, y al teclear «10» se
    // quedaba «010». El formato avisa si falta.
    onChange={(event) =>
      onChange(
        event.target.value === ""
          ? Number.NaN
          : integer
            ? Math.trunc(Number(event.target.value))
            : Number(event.target.value),
      )
    }
  />
);

/** Los términos de una fórmula como fichas, y lo que se les puede añadir. */
const FormulaEditor = ({
  recipe,
  candidates,
  fields,
  onChange,
}: {
  recipe: FormulaComputed;
  candidates: readonly FormField[];
  fields: readonly FormField[];
  onChange: (recipe: FieldComputed) => void;
}) => {
  const [number, setNumber] = useState("");
  const terms = recipe.terms;
  const push = (term: ComputedTerm) =>
    onChange({ ...recipe, terms: [...terms, term] });

  return (
    <div className="space-y-2">
      <div
        className="flex min-h-9 flex-wrap items-center gap-1 rounded-md border bg-muted/30 p-1"
        aria-label="Términos de la fórmula"
      >
        {terms.length === 0 ? (
          <span className="px-2 text-ui text-muted-foreground">
            Añade campos, números y operadores.
          </span>
        ) : null}
        {terms.map((term, index) => {
          const text =
            term.type === "field"
              ? (fields.find((field) => field.id === term.fieldId)?.label ??
                "Campo eliminado")
              : term.type === "const"
                ? term.value.toLocaleString("es-CO")
                : OPERATOR_SYMBOL[term.op];
          return (
            <span
              // La posición es la identidad de un término: la fórmula es su
              // orden.
              key={index}
              className="inline-flex min-h-7 items-center gap-1 rounded-sm border bg-card px-2 text-ui"
            >
              {text}
              <button
                type="button"
                aria-label={`Quitar ${text}`}
                className="flex size-6 items-center justify-center rounded-sm text-muted-foreground hover:text-destructive focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                onClick={() =>
                  onChange({
                    ...recipe,
                    terms: terms.filter((_, position) => position !== index),
                  })
                }
              >
                <X className="size-3" />
              </button>
            </span>
          );
        })}
      </div>
      <Thirds>
        <RulePiece title="Añadir un campo">
          <SearchableSelect
            size="sm"
            aria-label="Añadir campo"
            className="h-8 w-full min-w-0"
            placeholder="Elige un campo"
            searchPlaceholder="Buscar un campo…"
            value=""
            options={candidates.map(fieldOption)}
            onValueChange={(fieldId) => push({ type: "field", fieldId })}
          />
        </RulePiece>
        <RulePiece title="Añadir un número">
          <div className="flex gap-2">
            <Input
              type="number"
              inputMode="decimal"
              aria-label="Número"
              placeholder="0"
              className="h-8 min-w-0 flex-1"
              value={number}
              onChange={(event) => setNumber(event.target.value)}
            />
            <Button
              size="sm"
              variant="outline"
              disabled={number === "" || !Number.isFinite(Number(number))}
              onClick={() => {
                push({ type: "const", value: Number(number) });
                setNumber("");
              }}
            >
              Añadir
            </Button>
          </div>
        </RulePiece>
        <RulePiece title="Añadir un operador">
          <div className="grid grid-cols-4 gap-1">
            {COMPUTED_OPERATORS.map((op) => (
              <Button
                key={op}
                size="sm"
                variant="outline"
                className="px-0"
                aria-label={OPERATION_LABEL[op]}
                onClick={() => push({ type: "op", op })}
              >
                {OPERATOR_SYMBOL[op]}
              </Button>
            ))}
          </div>
        </RulePiece>
      </Thirds>
    </div>
  );
};

/** Lo que leen las recetas de un solo campo en sus otros dos tercios. */
const SINGLE_READING = {
  daysUntil: ["Hoy, al abrir el formato", "Días que faltan"],
  daysSince: ["Hoy, al abrir el formato", "Días que han pasado"],
  yearsSince: ["Hoy, al abrir el formato", "Años cumplidos"],
  count: [null, "Cuántas opciones están marcadas"],
} as const satisfies Record<string, readonly [string | null, string]>;

/** Los selectores de la receta elegida, en tercios. `rounding` es la pieza
 *  de decimales, si la receta la admite: va en la misma rejilla. */
export const RecipePieces = ({
  field,
  fields,
  recipe,
  rounding,
  onChange,
}: {
  field: FormField;
  fields: readonly FormField[];
  recipe: FieldComputed;
  rounding: ReactNode;
  onChange: (recipe: FieldComputed) => void;
}) => {
  const candidates = operandCandidates(field, fields, recipe.kind);

  switch (recipe.kind) {
    case "formula":
      return (
        <div className="space-y-3">
          <FormulaEditor
            recipe={recipe}
            candidates={candidates}
            fields={fields}
            onChange={onChange}
          />
          {rounding ? <Thirds>{rounding}</Thirds> : null}
        </div>
      );

    case "percent":
      return (
        <Thirds>
          <RulePiece title="Porcentaje">
            <div className="flex items-center gap-2">
              <NumberPiece
                label="Porcentaje"
                value={recipe.percent}
                onChange={(percent) => onChange({ ...recipe, percent })}
              />
              <span className="text-ui text-muted-foreground">%</span>
            </div>
          </RulePiece>
          <RulePiece title="De">
            <FieldPicker
              value={recipe.of}
              candidates={candidates}
              label="Campo del que se calcula el porcentaje"
              onChange={(of) => onChange({ ...recipe, of })}
            />
          </RulePiece>
          {rounding}
        </Thirds>
      );

    case "arithmetic":
      return (
        <Thirds>
          <RulePiece title="Operación">
            <Select
              value={recipe.op}
              onValueChange={(op) =>
                onChange({ ...recipe, op: op as typeof recipe.op })
              }
            >
              <SelectTrigger
                size="sm"
                aria-label="Operación"
                className="h-8 w-full"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COMPUTED_OPERATORS.map((op) => (
                  <SelectItem key={op} value={op}>
                    {OPERATION_LABEL[op]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </RulePiece>
          {recipe.operands.map((operand, index) => (
            // La posición del operando es su identidad: restar y dividir
            // dependen del orden.
            <RulePiece
              key={index}
              title={
                index === 0
                  ? "Operando 1"
                  : `${OPERATOR_SYMBOL[recipe.op]} Operando ${index + 1}`
              }
            >
              <div className="flex items-center gap-1">
                <div className="min-w-0 flex-1">
                  <FieldPicker
                    value={operand}
                    candidates={candidates}
                    label={`Operando ${index + 1}`}
                    onChange={(next) =>
                      onChange({
                        ...recipe,
                        operands: recipe.operands.map((current, position) =>
                          position === index ? next : current,
                        ),
                      })
                    }
                  />
                </div>
                {/* Los dos primeros no se quitan: una operación necesita dos. */}
                {recipe.operands.length > 2 ? (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                    aria-label={`Quitar el operando ${index + 1}`}
                    onClick={() =>
                      onChange({
                        ...recipe,
                        operands: recipe.operands.filter(
                          (_, position) => position !== index,
                        ),
                      })
                    }
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                ) : null}
              </div>
            </RulePiece>
          ))}
          {rounding}
          <div className="flex items-end">
            <Button
              size="sm"
              variant="outline"
              className="w-full sm:w-auto"
              disabled={candidates.length === 0}
              onClick={() =>
                onChange({
                  ...recipe,
                  operands: [...recipe.operands, candidates[0].id],
                })
              }
            >
              <Plus className="size-4" />
              Añadir operando
            </Button>
          </div>
        </Thirds>
      );

    case "dateAdd":
      return (
        <Thirds>
          <RulePiece title="Fecha de partida">
            <FieldPicker
              value={recipe.of}
              candidates={candidates}
              label="Fecha de partida"
              onChange={(of) => onChange({ ...recipe, of })}
            />
          </RulePiece>
          <RulePiece title="Más">
            <NumberPiece
              integer
              label="Cantidad del plazo"
              value={recipe.amount}
              onChange={(amount) => onChange({ ...recipe, amount })}
            />
          </RulePiece>
          <RulePiece title="Unidad">
            <Select
              value={recipe.unit}
              onValueChange={(unit) =>
                onChange({ ...recipe, unit: unit as typeof recipe.unit })
              }
            >
              <SelectTrigger
                size="sm"
                aria-label="Unidad del plazo"
                className="h-8 w-full"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DATE_ADD_UNITS.map((unit) => (
                  <SelectItem key={unit} value={unit}>
                    {DATE_ADD_UNIT_LABEL[unit]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </RulePiece>
        </Thirds>
      );

    case "concat":
      return (
        <div className="space-y-2">
          <ol className="space-y-2">
            {recipe.parts.map((part, index) => (
              // Las piezas se leen en orden: su posición es su identidad.
              <li key={index} className="flex items-center gap-2">
                <span className="w-4 shrink-0 text-center text-ui text-muted-foreground tabular-nums">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  {part.type === "field" ? (
                    <FieldPicker
                      value={part.fieldId}
                      candidates={candidates}
                      label={`Pieza ${index + 1}`}
                      onChange={(fieldId) =>
                        onChange({
                          ...recipe,
                          parts: recipe.parts.map((current, position) =>
                            position === index
                              ? { type: "field" as const, fieldId }
                              : current,
                          ),
                        })
                      }
                    />
                  ) : (
                    <Input
                      aria-label={`Texto de la pieza ${index + 1}`}
                      className="h-8 w-full"
                      value={part.text}
                      onChange={(event) =>
                        onChange({
                          ...recipe,
                          parts: recipe.parts.map((current, position) =>
                            position === index
                              ? {
                                  type: "text" as const,
                                  text: event.target.value,
                                }
                              : current,
                          ),
                        })
                      }
                    />
                  )}
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                  aria-label={`Quitar la pieza ${index + 1}`}
                  onClick={() =>
                    onChange({
                      ...recipe,
                      parts: recipe.parts.filter(
                        (_, position) => position !== index,
                      ),
                    })
                  }
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </li>
            ))}
          </ol>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={candidates.length === 0}
              onClick={() =>
                onChange({
                  ...recipe,
                  parts: [
                    ...recipe.parts,
                    { type: "field" as const, fieldId: candidates[0].id },
                  ],
                })
              }
            >
              <Plus className="size-4" />
              Añadir campo
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                onChange({
                  ...recipe,
                  parts: [
                    ...recipe.parts,
                    { type: "text" as const, text: " - " },
                  ],
                })
              }
            >
              <Plus className="size-4" />
              Añadir texto
            </Button>
          </div>
        </div>
      );

    default: {
      // El campo en su tercio y, en los otros, contra qué se mide y qué da:
      // una receta de un solo selector dejaba dos tercios vacíos.
      const [against, gives] = SINGLE_READING[recipe.kind];
      return (
        <Thirds>
          <RulePiece
            title={recipe.kind === "count" ? "Lista múltiple" : "Fecha"}
          >
            <FieldPicker
              value={recipe.of}
              candidates={candidates}
              label="Campo del que se calcula"
              onChange={(of) => onChange({ ...recipe, of })}
            />
          </RulePiece>
          {against ? (
            <RulePiece title="Contra">
              <FixedPiece>{against}</FixedPiece>
            </RulePiece>
          ) : null}
          <div className={cn("min-w-0", !against && "sm:col-span-2")}>
            <RulePiece title="Da">
              <FixedPiece>{gives}</FixedPiece>
            </RulePiece>
          </div>
        </Thirds>
      );
    }
  }
};
