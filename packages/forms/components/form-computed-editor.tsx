"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { evaluateComputed } from "@/convex/lib/field_computed";
import { computedReferences } from "@/convex/lib/field_logic";
import { todayInColombia } from "@/convex/lib/dates";
import {
  type FieldComputed,
  type FormField,
  type FormValues,
  RECIPES_BY_TYPE,
} from "@/convex/lib/form_types";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { type ReactNode, useState } from "react";

import { RECIPE_CATALOG } from "../lib/field-catalog";
import {
  describeValue,
  newComputed,
  operandCandidates,
} from "../lib/field-rules";
import { FixedPiece, RecipePieces } from "./form-computed-pieces";
import { FormFieldInput } from "./form-field";
import { RulePiece } from "./form-rule-editor";

const PESOS = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  minimumFractionDigits: 0,
});

/** El resultado con el formato del campo que lo lleva. */
const formatResult = (
  field: FormField,
  value: number | string | null,
): string | null => {
  if (value === null) return null;
  if (field.type === "currency" && typeof value === "number") {
    return PESOS.format(value);
  }
  if (typeof value === "number") return value.toLocaleString("es-CO");
  return describeValue(field, value);
};

/** Una tarjeta del editor, con su título. */
const EditorCard = ({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) => (
  <section className="space-y-3 rounded-lg border bg-card p-4">
    <h4 className="text-sm font-medium tracking-tight">{title}</h4>
    {children}
  </section>
);

/** Las recetas que redondean. */
const ROUNDS: readonly FieldComputed["kind"][] = [
  "percent",
  "arithmetic",
  "formula",
];

/** Lo que el campo de ejemplo no debe arrastrar del de verdad: ni exigirse,
 *  ni calcularse, ni esconderse. */
const exampleField = (field: FormField): FormField => ({
  ...field,
  // Un id propio: el mismo campo está pintado en el lienzo, detrás.
  id: `example-${field.id}`,
  required: false,
  description: undefined,
  config: { ...field.config, computed: undefined, visibility: undefined },
});

const EXAMPLE_CONTEXT = { formId: null, authorName: "" };

/**
 * Cómo se calcula el valor de un campo: las recetas que caben en su tipo, los
 * selectores de la elegida y una vista previa con valores de ejemplo.
 *
 * Sin receta enseña la retícula de recetas; con una, la resume en una fila con
 * «Cambiar» y debajo las tarjetas «Cómo se calcula» y «Vista previa».
 *
 * Elegir una receta desmarca «Obligatorio»: un derivado no lo rellena nadie.
 */
export const FormComputedEditor = ({
  field,
  fields,
  onChange,
}: {
  field: FormField;
  fields: readonly FormField[];
  onChange: (field: FormField) => void;
}) => {
  const [example, setExample] = useState<FormValues>({});
  const recipes = RECIPES_BY_TYPE[field.type] ?? [];
  const recipe = field.config.computed;
  const [isChoosing, setIsChoosing] = useState(!recipe);

  const setRecipe = (next: FieldComputed | undefined) =>
    onChange({
      ...field,
      required: next ? false : field.required,
      config: { ...field.config, computed: next },
    });

  if (!recipe || isChoosing) {
    return (
      <div className="space-y-3">
        <ul className="grid gap-2 sm:grid-cols-2" aria-label="Recetas">
          {recipes.map((kind) => {
            const {
              label,
              description,
              icon: Icon,
              needs,
            } = RECIPE_CATALOG[kind];
            const isPossible =
              kind === "formula" ||
              operandCandidates(field, fields, kind).length > 0;
            const isActive = recipe?.kind === kind;
            return (
              <li key={kind} className="flex">
                <button
                  type="button"
                  aria-pressed={isActive}
                  disabled={!isPossible}
                  onClick={() => {
                    if (!isActive) {
                      setRecipe(newComputed(kind, field, fields) ?? undefined);
                    }
                    setIsChoosing(false);
                  }}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-accent/30 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
                    isActive && "border-h-indigo/40 bg-h-indigo/5",
                  )}
                >
                  <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm">{label}</span>
                    <span className="block text-xs text-muted-foreground">
                      {isPossible
                        ? description
                        : `Necesita ${needs} en el formato.`}
                    </span>
                  </span>
                  {isActive ? (
                    <Check className="mt-0.5 size-4 shrink-0" />
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
        {recipe ? (
          <Button
            size="sm"
            variant="ghost"
            className="text-muted-foreground"
            onClick={() => setIsChoosing(false)}
          >
            Volver a la receta elegida
          </Button>
        ) : null}
      </div>
    );
  }

  const operands = [...new Set(computedReferences(recipe))]
    .map((id) => fields.find((candidate) => candidate.id === id))
    .filter((candidate): candidate is FormField => !!candidate);
  const result = formatResult(
    field,
    evaluateComputed(recipe, example, {
      fields,
      today: todayInColombia(Date.now()),
    }),
  );
  const { label, description, icon: Icon } = RECIPE_CATALOG[recipe.kind];

  const rounding = !ROUNDS.includes(recipe.kind) ? null : field.type ===
    "currency" ? (
    // Un importe no redondea a decimales, pero el tercio se queda ocupado y
    // dice por qué: vacío parecía que faltaba algo.
    <RulePiece title="Decimales">
      <FixedPiece>Sin decimales, en pesos</FixedPiece>
    </RulePiece>
  ) : (
    <RulePiece title="Decimales">
      <Select
        value={String("rounding" in recipe ? (recipe.rounding ?? 0) : 0)}
        onValueChange={(digits) =>
          setRecipe({ ...recipe, rounding: Number(digits) } as FieldComputed)
        }
      >
        <SelectTrigger size="sm" aria-label="Decimales" className="h-8 w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="0">Sin decimales</SelectItem>
          <SelectItem value="1">1 decimal</SelectItem>
          <SelectItem value="2">2 decimales</SelectItem>
        </SelectContent>
      </Select>
    </RulePiece>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 rounded-lg border border-h-indigo/40 bg-h-indigo/5 p-3">
        <Icon className="size-4 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1">
          <span className="block text-sm">{label}</span>
          <span className="block text-xs text-muted-foreground">
            {description}
          </span>
        </span>
        <Button size="sm" variant="outline" onClick={() => setIsChoosing(true)}>
          Cambiar
        </Button>
      </div>

      <EditorCard title="Cómo se calcula">
        <RecipePieces
          field={field}
          fields={fields}
          recipe={recipe}
          onChange={setRecipe}
          rounding={rounding}
        />
      </EditorCard>

      {operands.length > 0 ? (
        <EditorCard title="Vista previa">
          <p className="-mt-2 text-xs text-muted-foreground">
            Escribe un valor de ejemplo en cada campo. No se guarda.
          </p>
          <div
            className={cn(
              "grid grid-cols-1 gap-4",
              operands.length === 2 || operands.length === 4
                ? "sm:grid-cols-2"
                : operands.length > 1 && "sm:grid-cols-3",
            )}
          >
            {operands.map((operand) => (
              <div key={operand.id} className="min-w-0 space-y-2">
                <Label htmlFor={`example-${operand.id}`}>{operand.label}</Label>
                <FormFieldInput
                  id={`example-${operand.id}`}
                  field={exampleField(operand)}
                  value={example[operand.id]}
                  disabled={false}
                  showMissing={false}
                  context={EXAMPLE_CONTEXT}
                  onChange={(value) =>
                    setExample((previous) => ({
                      ...previous,
                      [operand.id]: value,
                    }))
                  }
                />
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between gap-3 rounded-md bg-muted/50 px-3 py-2">
            <span className="text-ui text-muted-foreground">Resultado</span>
            <span className="text-right text-sm font-medium tabular-nums">
              {result ?? "Sin resultado con estos valores"}
            </span>
          </div>
        </EditorCard>
      ) : null}

      <Button
        size="sm"
        variant="ghost"
        className="text-muted-foreground"
        onClick={() => {
          setRecipe(undefined);
          setIsChoosing(true);
        }}
      >
        Quitar el cálculo
      </Button>
    </div>
  );
};
