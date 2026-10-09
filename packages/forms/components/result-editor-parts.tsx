"use client";

import { SearchableSelect } from "@/components/harmony/searchable-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { Id } from "@/convex/_generated/dataModel";
import {
  COMPUTED_OPERATORS,
  type ComputedOperator,
  type FormField,
  type VisibilityRule,
} from "@/convex/lib/form_types";
import { filterFields, numericFields } from "@/convex/lib/result_definition";
import {
  type CompositeTerm,
  MEASURE_KINDS,
  MEASURE_OPERATIONS,
  type MeasureKind,
  type MeasureOperation,
  type MeasureTerm,
  RESULT_LIMITS,
} from "@/convex/lib/result_types";
import { cn } from "@/lib/utils";
import { Plus, X } from "lucide-react";
import type { ReactNode } from "react";

import { useGetProjectIndicators } from "../api";
import { OPERATORS_BY_TYPE } from "../lib/field-catalog";
import { OPERATOR_SYMBOL, newRule } from "../lib/field-rules";
import { OPERATION_LABEL } from "../lib/result-catalog";
import {
  type DraftGoal,
  type DraftMeasure,
  aggTerm,
  appendTerm,
  removeTerm,
  withOperation,
} from "../lib/result-draft";
import { FormRuleRow } from "./form-rule-editor";

const OPERATOR_NAME: Record<ComputedOperator, string> = {
  "+": "Más",
  "-": "Menos",
  "*": "Por",
  "/": "Dividido por",
};

/** Una parte del editor con su título: lo que el resultado puede llevar
 *  además de lo propio de su tipo. `control` va a la derecha del título. */
export const EditorSection = ({
  title,
  description,
  control,
  children,
}: {
  title: string;
  description: string;
  control?: ReactNode;
  children?: ReactNode;
}) => (
  <section className="space-y-3 border-t pt-4">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0 space-y-0.5">
        <h3 className="text-sm font-medium">{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      {control}
    </div>
    {children}
  </section>
);

interface FieldSelectProps {
  id: string;
  label: string;
  fields: readonly FormField[];
  value: string | null;
  disabled: boolean;
  /** Lo que se dice cuando el formato no tiene campos de esa clase. */
  emptyText: string;
  onChange: (fieldId: string) => void;
}

/** Elegir un campo del formato, entre los que sirven a lo que se configura. */
export const FieldSelect = ({
  id,
  label,
  fields,
  value,
  disabled,
  emptyText,
  onChange,
}: FieldSelectProps) => (
  <div className="space-y-2">
    <Label htmlFor={id}>{label}</Label>
    {fields.length === 0 ? (
      <p className="text-xs text-muted-foreground">{emptyText}</p>
    ) : (
      <Select
        value={value ?? undefined}
        disabled={disabled}
        onValueChange={onChange}
      >
        <SelectTrigger id={id} className="w-full">
          <SelectValue placeholder="Elige un campo" />
        </SelectTrigger>
        <SelectContent>
          {fields.map((field) => (
            <SelectItem key={field.id} value={field.id}>
              {field.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )}
  </div>
);

/** La unidad y los decimales con que se escribe una cifra. */
export const FormatFields = ({
  prefix,
  unit,
  decimals,
  disabled,
  onChange,
}: {
  prefix: string;
  unit: string;
  decimals: number | null;
  disabled: boolean;
  onChange: (format: { unit: string; decimals: number | null }) => void;
}) => (
  <div className="grid grid-cols-2 gap-4">
    <div className="space-y-2">
      <Label htmlFor={`${prefix}-unit`}>Unidad</Label>
      <Input
        id={`${prefix}-unit`}
        maxLength={RESULT_LIMITS.maxUnitLength}
        placeholder="Ej.: %, h, kg"
        value={unit}
        disabled={disabled}
        onChange={(event) => onChange({ unit: event.target.value, decimals })}
      />
    </div>
    <div className="space-y-2">
      <Label htmlFor={`${prefix}-decimals`}>Decimales</Label>
      <Select
        value={decimals === null ? "auto" : String(decimals)}
        disabled={disabled}
        onValueChange={(value) =>
          onChange({ unit, decimals: value === "auto" ? null : Number(value) })
        }
      >
        <SelectTrigger id={`${prefix}-decimals`} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="auto">Los que salgan, hasta uno</SelectItem>
          {Array.from({ length: RESULT_LIMITS.maxDecimals + 1 }, (_, count) => (
            // El número de decimales es la identidad de la opción.
            <SelectItem key={`decimals-${count}`} value={String(count)}>
              {count === 0 ? "Sin decimales" : `Siempre ${count}`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  </div>
);

interface TermRowsProps<T extends { type: string }> {
  terms: readonly T[];
  disabled: boolean;
  /** Para los rótulos accesibles: «la fórmula», «la cuenta». */
  noun: string;
  onChange: (terms: T[]) => void;
  /** Lo que va en la fila de un operando que no es un número suelto. */
  operand: (term: T, change: (term: T) => void, index: number) => ReactNode;
}

/**
 * Las filas de una cuenta: un operando por fila, con su operador delante a
 * partir de la segunda. La misma para la fórmula de una medida y para la
 * cifra compuesta; lo que cambia es qué es un operando.
 */
const TermRows = <T extends { type: string }>({
  terms,
  disabled,
  noun,
  onChange,
  operand,
}: TermRowsProps<T>) => {
  const replace = (index: number, term: unknown) =>
    onChange(
      terms.map((current, at) => (at === index ? (term as T) : current)),
    );

  return (
    <ol className="space-y-2">
      {terms.map((term, index) => {
        if (term.type === "op") return null;
        const operator = index > 0 ? terms[index - 1] : null;
        const position = index / 2 + 1;
        return (
          <li
            // El orden es la identidad de un término mientras se edita.
            key={`term-${index}`}
            className="grid grid-cols-[4rem_minmax(0,1fr)_auto] items-center gap-2"
          >
            {operator ? (
              <Select
                value={(operator as unknown as { op: ComputedOperator }).op}
                disabled={disabled}
                onValueChange={(op) => replace(index - 1, { type: "op", op })}
              >
                <SelectTrigger
                  className="w-full"
                  aria-label={`Operador antes de la cifra ${position}`}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COMPUTED_OPERATORS.map((op) => (
                    <SelectItem
                      key={op}
                      value={op}
                      aria-label={OPERATOR_NAME[op]}
                    >
                      {OPERATOR_SYMBOL[op]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <span className="text-center text-sm text-muted-foreground">
                =
              </span>
            )}
            {term.type === "const" ? (
              <Input
                type="number"
                inputMode="decimal"
                aria-label={`Número ${position} de ${noun}`}
                placeholder="Ej.: 100"
                value={String(
                  Number.isFinite((term as unknown as { value: number }).value)
                    ? (term as unknown as { value: number }).value
                    : "",
                )}
                disabled={disabled}
                onChange={(event) =>
                  replace(index, {
                    type: "const",
                    value:
                      event.target.value === ""
                        ? Number.NaN
                        : Number(event.target.value),
                  })
                }
              />
            ) : (
              operand(term, (next) => replace(index, next), index)
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-muted-foreground"
              aria-label={`Quitar la cifra ${position} de ${noun}`}
              disabled={disabled || terms.length === 1}
              onClick={() => onChange(removeTerm(terms, index))}
            >
              <X />
            </Button>
          </li>
        );
      })}
    </ol>
  );
};

const DIVIDED: { type: "op"; op: ComputedOperator } = { type: "op", op: "/" };
const TIMES: { type: "op"; op: ComputedOperator } = { type: "op", op: "*" };

/** La fórmula de una medida: una cuenta entre sumas, promedios y conteos de
 *  los campos del formato. */
const FormulaEditor = ({
  prefix,
  terms,
  fields,
  disabled,
  onChange,
}: {
  prefix: string;
  terms: readonly MeasureTerm[];
  fields: readonly FormField[];
  disabled: boolean;
  onChange: (terms: MeasureTerm[]) => void;
}) => {
  const numeric = numericFields(fields);
  const hasRoom = terms.length + 2 <= RESULT_LIMITS.maxTerms;
  return (
    <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
      <TermRows<MeasureTerm>
        terms={terms}
        disabled={disabled}
        noun="la fórmula"
        onChange={onChange}
        operand={(term, change, index) =>
          term.type !== "agg" ? null : (
            <div className="grid min-w-0 grid-cols-2 gap-2">
              <Select
                value={term.operation}
                disabled={disabled}
                onValueChange={(operation) =>
                  change(
                    aggTerm(
                      operation as MeasureOperation,
                      term.fieldId ?? null,
                      fields,
                    ),
                  )
                }
              >
                <SelectTrigger
                  id={`${prefix}-term-${index}`}
                  className="w-full"
                  aria-label="Qué se calcula"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MEASURE_OPERATIONS.map((operation) => (
                    <SelectItem
                      key={operation}
                      value={operation}
                      disabled={operation !== "count" && numeric.length === 0}
                    >
                      {OPERATION_LABEL[operation]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {term.operation === "count" ? (
                <span className="flex h-9 items-center rounded-md border border-dashed px-3 text-ui text-muted-foreground">
                  No mira ningún campo
                </span>
              ) : (
                <Select
                  value={term.fieldId}
                  disabled={disabled}
                  onValueChange={(fieldId) => change({ ...term, fieldId })}
                >
                  <SelectTrigger className="w-full" aria-label="De qué campo">
                    <SelectValue placeholder="Elige un campo" />
                  </SelectTrigger>
                  <SelectContent>
                    {numeric.map((field) => (
                      <SelectItem key={field.id} value={field.id}>
                        {field.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )
        }
      />
      {hasRoom ? (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() =>
              onChange(
                appendTerm<MeasureTerm>(
                  terms,
                  aggTerm(numeric.length > 0 ? "sum" : "count", null, fields),
                  DIVIDED,
                ),
              )
            }
          >
            <Plus />
            Añadir cifra
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled}
            onClick={() =>
              onChange(
                appendTerm<MeasureTerm>(
                  terms,
                  { type: "const", value: 100 },
                  TIMES,
                ),
              )
            }
          >
            <Plus />
            Añadir número
          </Button>
        </div>
      ) : null}
      <p className="text-xs text-muted-foreground">
        Se multiplica y se divide antes de sumar y restar. Si se divide por
        cero, la cifra queda sin valor.
      </p>
    </div>
  );
};

interface MeasureFieldsProps {
  prefix: string;
  measure: DraftMeasure;
  fields: readonly FormField[];
  disabled: boolean;
  /** Pide además el nombre de la medida: el de su columna o su serie. */
  named?: boolean;
  onChange: (measure: DraftMeasure) => void;
}

/**
 * Una medida: la operación y su campo, o una fórmula entre varias; y cómo se
 * escribe —su unidad y sus decimales—.
 */
export const MeasureFields = ({
  prefix,
  measure,
  fields,
  disabled,
  named = false,
  onChange,
}: MeasureFieldsProps) => {
  const numeric = numericFields(fields);
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div
          className={cn(
            "space-y-2",
            // Sola en su fila cuando no hay nada que poner a su lado.
            !named &&
              (measure.operation === "count" ||
                measure.operation === "formula") &&
              "sm:col-span-2",
          )}
        >
          <Label htmlFor={`${prefix}-operation`}>Qué se mide</Label>
          <Select
            value={measure.operation}
            disabled={disabled}
            onValueChange={(operation) =>
              onChange(withOperation(measure, operation as MeasureKind, fields))
            }
          >
            <SelectTrigger id={`${prefix}-operation`} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MEASURE_KINDS.map((operation) => (
                <SelectItem
                  key={operation}
                  value={operation}
                  // Sin campos numéricos sólo se puede contar.
                  disabled={
                    operation !== "count" &&
                    operation !== "formula" &&
                    numeric.length === 0
                  }
                >
                  {OPERATION_LABEL[operation]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {measure.operation === "count" || measure.operation === "formula" ? (
          named ? (
            <div className="space-y-2">
              <Label htmlFor={`${prefix}-label`}>Nombre</Label>
              <Input
                id={`${prefix}-label`}
                maxLength={RESULT_LIMITS.maxLabelLength}
                placeholder="Opcional"
                value={measure.label}
                disabled={disabled}
                onChange={(event) =>
                  onChange({ ...measure, label: event.target.value })
                }
              />
            </div>
          ) : null
        ) : (
          <FieldSelect
            id={`${prefix}-field`}
            label="De qué campo"
            fields={numeric}
            value={measure.fieldId}
            disabled={disabled}
            emptyText="Este formato no tiene campos numéricos."
            onChange={(fieldId) => onChange({ ...measure, fieldId })}
          />
        )}
      </div>
      {measure.operation === "formula" ? (
        <FormulaEditor
          prefix={prefix}
          terms={measure.terms}
          fields={fields}
          disabled={disabled}
          onChange={(terms) => onChange({ ...measure, terms })}
        />
      ) : null}
      {named &&
      measure.operation !== "count" &&
      measure.operation !== "formula" ? (
        <div className="space-y-2">
          <Label htmlFor={`${prefix}-label`}>Nombre</Label>
          <Input
            id={`${prefix}-label`}
            maxLength={RESULT_LIMITS.maxLabelLength}
            placeholder="Opcional: si no, se nombra sola"
            value={measure.label}
            disabled={disabled}
            onChange={(event) =>
              onChange({ ...measure, label: event.target.value })
            }
          />
        </div>
      ) : null}
      {measure.operation === "count" ? null : (
        <FormatFields
          prefix={prefix}
          unit={measure.unit}
          decimals={measure.decimals}
          disabled={disabled}
          onChange={(format) => onChange({ ...measure, ...format })}
        />
      )}
    </div>
  );
};

/** Las condiciones de un resultado: qué respuestas entran en la cuenta. */
export const FiltersEditor = ({
  filters,
  fields,
  disabled,
  onChange,
}: {
  filters: readonly VisibilityRule[];
  fields: readonly FormField[];
  disabled: boolean;
  onChange: (filters: VisibilityRule[]) => void;
}) => {
  const candidates = filterFields(fields).filter(
    (field) => OPERATORS_BY_TYPE[field.type].length > 0,
  );
  return (
    <EditorSection
      title="Condiciones"
      description={
        filters.length === 0
          ? "Entran todas las respuestas del periodo."
          : "Sólo entran las respuestas que las cumplen todas."
      }
    >
      {filters.length > 0 ? (
        <ul className="space-y-2">
          {filters.map((rule, index) => (
            <FormRuleRow
              // El orden es la identidad de una condición mientras se edita.
              key={`filter-${index}`}
              rule={rule}
              index={index}
              fields={fields}
              candidates={candidates}
              removeLabel={`Quitar la condición ${index + 1}`}
              onChange={(next) =>
                onChange(
                  filters.map((current, at) => (at === index ? next : current)),
                )
              }
              onRemove={() => onChange(filters.filter((_, at) => at !== index))}
            />
          ))}
        </ul>
      ) : null}
      {candidates.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Este formato no tiene campos por los que condicionar.
        </p>
      ) : filters.length < RESULT_LIMITS.maxFilters ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => onChange([...filters, newRule()])}
        >
          <Plus />
          Añadir condición
        </Button>
      ) : null}
    </EditorSection>
  );
};

/** La meta de una cifra: de qué lado se cumple y a partir de cuánto. */
export const GoalEditor = ({
  goal,
  disabled,
  onChange,
}: {
  goal: DraftGoal;
  disabled: boolean;
  onChange: (goal: DraftGoal) => void;
}) => (
  <EditorSection
    title="Meta"
    description="Marca si la cifra cumple, y dibuja la línea en la gráfica."
    control={
      <Switch
        aria-label="Tiene meta"
        checked={goal.enabled}
        disabled={disabled}
        onCheckedChange={(enabled) => onChange({ ...goal, enabled })}
      />
    }
  >
    {goal.enabled ? (
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="result-goal-direction">Se cumple con</Label>
          <Select
            value={goal.direction}
            disabled={disabled}
            onValueChange={(direction) =>
              onChange({
                ...goal,
                direction: direction as DraftGoal["direction"],
              })
            }
          >
            <SelectTrigger id="result-goal-direction" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="min">Al menos</SelectItem>
              <SelectItem value="max">Como máximo</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="result-goal-value">Valor</Label>
          <Input
            id="result-goal-value"
            type="number"
            inputMode="decimal"
            placeholder="Ej.: 95"
            value={goal.value}
            disabled={disabled}
            onChange={(event) =>
              onChange({ ...goal, value: event.target.value })
            }
          />
        </div>
      </div>
    ) : null}
  </EditorSection>
);

/**
 * La cuenta de una cifra compuesta: indicadores de cualquier formato del
 * proyecto, unidos por operadores. Cada uno se calcula para el mismo periodo.
 */
export const CompositeEditor = ({
  formId,
  terms,
  disabled,
  onChange,
}: {
  formId: Id<"forms">;
  terms: readonly CompositeTerm[];
  disabled: boolean;
  onChange: (terms: CompositeTerm[]) => void;
}) => {
  const { data: indicators } = useGetProjectIndicators({ formId });
  const options = (indicators ?? []).map((indicator) => ({
    value: indicator._id as string,
    // Con su formato: «Inspecciones» hay una en cada inspección.
    label: `${indicator.name} · ${indicator.formName}`,
  }));
  const used = new Set(
    terms.flatMap((term) => (term.type === "result" ? [term.resultId] : [])),
  );
  const hasRoom = terms.length + 2 <= RESULT_LIMITS.maxTerms;
  const next = options.find((option) => !used.has(option.value));

  return (
    <div className="space-y-3">
      <div className="space-y-0.5">
        <p className="text-sm font-medium">La cuenta</p>
        <p className="text-xs text-muted-foreground">
          Con indicadores de este o de otros formatos del proyecto.
        </p>
      </div>
      {indicators === undefined ? (
        <p className="text-xs text-muted-foreground">Cargando indicadores…</p>
      ) : options.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          El proyecto todavía no tiene indicadores. Crea primero los que entran
          en la cuenta, en los resultados de su formato.
        </p>
      ) : (
        <>
          <TermRows<CompositeTerm>
            terms={terms}
            disabled={disabled}
            noun="la cuenta"
            onChange={onChange}
            operand={(term, change) =>
              term.type !== "result" ? null : (
                <SearchableSelect
                  className="w-full"
                  aria-label="Indicador"
                  placeholder="Un indicador eliminado"
                  searchPlaceholder="Buscar un indicador…"
                  value={term.resultId}
                  disabled={disabled}
                  options={options}
                  onValueChange={(resultId) =>
                    change({ type: "result", resultId })
                  }
                />
              )
            }
          />
          {hasRoom ? (
            <div className="flex flex-wrap gap-2">
              {used.size < RESULT_LIMITS.maxCompositeResults ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={disabled}
                  onClick={() =>
                    onChange(
                      appendTerm<CompositeTerm>(
                        terms,
                        {
                          type: "result",
                          resultId: (next ?? options[0]).value,
                        },
                        DIVIDED,
                      ),
                    )
                  }
                >
                  <Plus />
                  Añadir indicador
                </Button>
              ) : null}
              {terms.length > 0 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={disabled}
                  onClick={() =>
                    onChange(
                      appendTerm<CompositeTerm>(
                        terms,
                        { type: "const", value: 100 },
                        TIMES,
                      ),
                    )
                  }
                >
                  <Plus />
                  Añadir número
                </Button>
              ) : null}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
};
