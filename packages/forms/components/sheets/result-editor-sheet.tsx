"use client";

import {
  HarmonySheet,
  HarmonySheetContent,
  HarmonySheetFooter,
  HarmonySheetHeader,
  SheetClose,
} from "@/components/harmony/harmony-sheet";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Id } from "@/convex/_generated/dataModel";
import type { FormField, FormKind } from "@/convex/lib/form_types";
import {
  checklistFields,
  choiceFields,
  dateFields,
  numericFields,
  referenceFields,
  resultName,
  resultProblem,
  resultTypesFor,
} from "@/convex/lib/result_definition";
import {
  HEAT_VALUES,
  type HeatValue,
  RESULT_INTERVALS,
  RESULT_LIMITS,
  type ResultConfig,
  type ResultInterval,
  type ResultType,
} from "@/convex/lib/result_types";
import { handleConvexErrorCallback } from "@/lib/convex-error-handler";
import { Loader2, Plus, X } from "lucide-react";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";

import { useCreateFormResult, useUpdateFormResult } from "../../api";
import {
  HEAT_VALUE_LABEL,
  INTERVAL_LABEL,
  RESULT_CATALOG,
} from "../../lib/result-catalog";
import {
  type ResultDraft,
  draftConfig,
  draftFromResult,
  emptyMeasure,
  emptyResultDraft,
  withHeatValue,
  withOperation,
} from "../../lib/result-draft";
import { CoverageEditor } from "../result-editor-coverage";
import {
  CompositeEditor,
  EditorSection,
  FieldSelect,
  FiltersEditor,
  FormatFields,
  GoalEditor,
  MeasureFields,
} from "../result-editor-parts";

const FORM_ID = "result-editor-form";

interface SavedResult {
  _id: Id<"formResults">;
  name: string;
  config: ResultConfig;
}

interface ResultEditorSheetProps {
  formId: Id<"forms">;
  kind: FormKind;
  /** Los campos de la versión publicada: de ellos sale lo que se ofrece. */
  fields: readonly FormField[];
  /** El resultado que se edita; sin él, se crea uno. */
  result?: SavedResult;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const IntervalSelect = ({
  value,
  disabled,
  onChange,
}: {
  value: ResultInterval;
  disabled: boolean;
  onChange: (interval: ResultInterval) => void;
}) => (
  <div className="space-y-2">
    <Label htmlFor="result-interval">Cada cuánto</Label>
    <Select
      value={value}
      disabled={disabled}
      onValueChange={(interval) => onChange(interval as ResultInterval)}
    >
      <SelectTrigger id="result-interval" className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {RESULT_INTERVALS.map((interval) => (
          <SelectItem key={interval} value={interval}>
            {INTERVAL_LABEL[interval]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
);

const EditorForm = ({
  formId,
  kind,
  fields,
  result,
  onDone,
}: Omit<ResultEditorSheetProps, "open" | "onOpenChange"> & {
  onDone: () => void;
}) => {
  const [draft, setDraft] = useState<ResultDraft>(() =>
    result
      ? draftFromResult(result, kind, fields)
      : emptyResultDraft(kind, fields),
  );
  const [showProblem, setShowProblem] = useState(false);
  const { mutate: createResult, isPending: isCreating } = useCreateFormResult();
  const { mutate: updateResult, isPending: isUpdating } = useUpdateFormResult();
  const isPending = isCreating || isUpdating;

  const patch = (changes: Partial<ResultDraft>) =>
    setDraft((current) => ({ ...current, ...changes }));

  const config = draftConfig(draft);
  const problem =
    resultName(draft.name) === null
      ? `El nombre debe tener entre 2 y ${RESULT_LIMITS.maxNameLength} caracteres.`
      : resultProblem(config, kind, fields);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (problem) {
      setShowProblem(true);
      return;
    }
    const callbacks = {
      onSuccess: () => {
        toast.success(
          result
            ? "Resultado guardado correctamente"
            : "Resultado creado correctamente",
        );
        onDone();
      },
      onError: (error: Error) => handleConvexErrorCallback(error),
    };
    if (result) {
      updateResult({ id: result._id, name: draft.name, config }, callbacks);
    } else {
      createResult({ formId, name: draft.name, config }, callbacks);
    }
  };

  const choices = choiceFields(fields);
  const checklists = checklistFields(fields);

  return (
    <>
      <HarmonySheetContent>
        <form id={FORM_ID} className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="result-name">Nombre</Label>
            <Input
              id="result-name"
              maxLength={RESULT_LIMITS.maxNameLength}
              placeholder={
                kind === "tracking"
                  ? "Ej.: Cierre de hallazgos"
                  : "Ej.: Cumplimiento por semana"
              }
              value={draft.name}
              disabled={isPending}
              onChange={(event) => patch({ name: event.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="result-type">Tipo de resultado</Label>
            <Select
              value={draft.type}
              disabled={isPending}
              onValueChange={(type) => patch({ type: type as ResultType })}
            >
              <SelectTrigger id="result-type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {resultTypesFor(kind).map((type) => (
                  <SelectItem key={type} value={type}>
                    {RESULT_CATALOG[type].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {RESULT_CATALOG[draft.type].question}
            </p>
          </div>

          {draft.type === "indicator" || draft.type === "trend" ? (
            <MeasureFields
              prefix="result-measure"
              measure={draft.measure}
              fields={fields}
              disabled={isPending}
              named={draft.type === "trend" && draft.series.length > 0}
              onChange={(measure) => patch({ measure })}
            />
          ) : null}

          {draft.type === "distribution" || draft.type === "table" ? (
            <FieldSelect
              id="result-by"
              label="Repartido por"
              fields={choices}
              value={draft.byFieldId}
              disabled={isPending}
              emptyText="Este formato no tiene listas ni listados relacionados."
              onChange={(byFieldId) => patch({ byFieldId })}
            />
          ) : null}

          {draft.type === "distribution" ? (
            <MeasureFields
              prefix="result-measure"
              measure={draft.measure}
              fields={fields}
              disabled={isPending}
              onChange={(measure) => patch({ measure })}
            />
          ) : null}

          {draft.type === "table" ? (
            <div className="space-y-3">
              <p className="text-sm font-medium">Columnas</p>
              {draft.measures.map((measure, index) => (
                <div
                  // El orden es la identidad de una columna mientras se edita.
                  key={`measure-${index}`}
                  className="space-y-3 rounded-md border p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground">
                      Columna {index + 1}
                    </p>
                    {draft.measures.length > 1 ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="iconSm"
                        className="text-muted-foreground"
                        aria-label={`Quitar la columna ${index + 1}`}
                        disabled={isPending}
                        onClick={() =>
                          patch({
                            measures: draft.measures.filter(
                              (_, at) => at !== index,
                            ),
                          })
                        }
                      >
                        <X />
                      </Button>
                    ) : null}
                  </div>
                  <MeasureFields
                    prefix={`result-column-${index}`}
                    measure={measure}
                    fields={fields}
                    disabled={isPending}
                    named
                    onChange={(next) =>
                      patch({
                        measures: draft.measures.map((current, at) =>
                          at === index ? next : current,
                        ),
                      })
                    }
                  />
                </div>
              ))}
              {draft.measures.length < RESULT_LIMITS.maxMeasures ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isPending}
                  onClick={() =>
                    patch({
                      measures: [
                        ...draft.measures,
                        withOperation(
                          emptyMeasure(),
                          numericFields(fields).length > 0 ? "sum" : "count",
                          fields,
                        ),
                      ],
                    })
                  }
                >
                  <Plus />
                  Añadir columna
                </Button>
              ) : null}
            </div>
          ) : null}

          {draft.type === "composite" ? (
            <>
              <CompositeEditor
                formId={formId}
                terms={draft.compositeTerms}
                disabled={isPending}
                onChange={(compositeTerms) => patch({ compositeTerms })}
              />
              <FormatFields
                prefix="result-composite"
                unit={draft.compositeUnit}
                decimals={draft.compositeDecimals}
                disabled={isPending}
                onChange={(format) =>
                  patch({
                    compositeUnit: format.unit,
                    compositeDecimals: format.decimals,
                  })
                }
              />
            </>
          ) : null}

          {draft.type === "compliance" || draft.type === "findings" ? (
            <FieldSelect
              id="result-checklist"
              label="Lista de chequeo"
              fields={checklists}
              value={draft.checklistFieldId}
              disabled={isPending}
              emptyText="Este formato no tiene listas de chequeo."
              onChange={(checklistFieldId) => patch({ checklistFieldId })}
            />
          ) : null}

          {draft.type === "trend" || draft.type === "compliance" ? (
            <IntervalSelect
              value={draft.interval}
              disabled={isPending}
              onChange={(interval) => patch({ interval })}
            />
          ) : null}

          {draft.type === "heatmap" ? (
            <>
              <FieldSelect
                id="result-row"
                label="Una fila por cada"
                fields={referenceFields(fields)}
                value={draft.rowFieldId}
                disabled={isPending}
                emptyText="Este formato no relaciona ningún listado."
                onChange={(rowFieldId) => patch({ rowFieldId })}
              />
              <div className="space-y-2">
                <Label htmlFor="result-heat-value">Cada celda dice</Label>
                <Select
                  value={draft.heatValue}
                  disabled={isPending}
                  onValueChange={(value) =>
                    setDraft((current) =>
                      withHeatValue(current, value as HeatValue, fields),
                    )
                  }
                >
                  <SelectTrigger id="result-heat-value" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {HEAT_VALUES.map((value) => (
                      <SelectItem key={value} value={value}>
                        {HEAT_VALUE_LABEL[value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {draft.heatValue === "count" ? null : (
                <FieldSelect
                  id="result-heat-field"
                  label={
                    draft.heatValue === "sum"
                      ? "Campo numérico"
                      : "Lista de chequeo"
                  }
                  fields={
                    draft.heatValue === "sum"
                      ? numericFields(fields)
                      : checklists
                  }
                  value={draft.valueFieldId}
                  disabled={isPending}
                  emptyText="Este formato no tiene campos de esa clase."
                  onChange={(valueFieldId) => patch({ valueFieldId })}
                />
              )}
            </>
          ) : null}

          {draft.type === "coverage" ? (
            <CoverageEditor
              draft={draft}
              fields={fields}
              disabled={isPending}
              onChange={patch}
            />
          ) : null}

          {draft.type === "trend" ? (
            <EditorSection
              title="Más series"
              description="Otras medidas en la misma gráfica, con su propia línea."
            >
              {draft.series.map((measure, index) => (
                <div
                  // El orden es la identidad de una serie mientras se edita.
                  key={`series-${index}`}
                  className="space-y-3 rounded-md border p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground">
                      Serie {index + 2}
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="iconSm"
                      className="text-muted-foreground"
                      aria-label={`Quitar la serie ${index + 2}`}
                      disabled={isPending}
                      onClick={() =>
                        patch({
                          series: draft.series.filter((_, at) => at !== index),
                        })
                      }
                    >
                      <X />
                    </Button>
                  </div>
                  <MeasureFields
                    prefix={`result-series-${index}`}
                    measure={measure}
                    fields={fields}
                    disabled={isPending}
                    named
                    onChange={(next) =>
                      patch({
                        series: draft.series.map((current, at) =>
                          at === index ? next : current,
                        ),
                      })
                    }
                  />
                </div>
              ))}
              {draft.series.length < RESULT_LIMITS.maxSeries ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isPending}
                  onClick={() =>
                    patch({
                      series: [
                        ...draft.series,
                        withOperation(
                          emptyMeasure(),
                          numericFields(fields).length > 0 ? "sum" : "count",
                          fields,
                        ),
                      ],
                    })
                  }
                >
                  <Plus />
                  Añadir serie
                </Button>
              ) : null}
            </EditorSection>
          ) : null}

          {draft.type !== "expirations" && draft.type !== "composite" ? (
            <FiltersEditor
              filters={draft.filters}
              fields={fields}
              disabled={isPending}
              onChange={(filters) => patch({ filters })}
            />
          ) : null}

          {draft.type === "indicator" ||
          draft.type === "trend" ||
          draft.type === "compliance" ||
          draft.type === "coverage" ||
          draft.type === "tracking" ||
          draft.type === "composite" ? (
            <GoalEditor
              goal={draft.goal}
              disabled={isPending}
              onChange={(goal) => patch({ goal })}
            />
          ) : null}

          {draft.type === "indicator" ? (
            <EditorSection
              title="Comparar con el periodo anterior"
              description="Dice cuánto subió o bajó frente a un periodo igual de largo, justo antes."
              control={
                <Switch
                  aria-label="Comparar con el periodo anterior"
                  checked={draft.compare}
                  disabled={isPending}
                  onCheckedChange={(compare) => patch({ compare })}
                />
              }
            />
          ) : null}

          {draft.type === "expirations" ? (
            <fieldset className="space-y-3">
              <legend className="text-sm font-medium">
                Fechas que se vigilan
              </legend>
              {dateFields(fields).length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Este listado no tiene campos de fecha.
                </p>
              ) : (
                dateFields(fields).map((field) => {
                  const checked = draft.dateFieldIds.includes(field.id);
                  return (
                    <label
                      key={field.id}
                      className="flex min-h-9 items-center gap-2 text-sm"
                    >
                      <Checkbox
                        checked={checked}
                        disabled={isPending}
                        onCheckedChange={(next) =>
                          patch({
                            dateFieldIds: next
                              ? [...draft.dateFieldIds, field.id]
                              : draft.dateFieldIds.filter(
                                  (id) => id !== field.id,
                                ),
                          })
                        }
                      />
                      {field.label}
                    </label>
                  );
                })
              )}
            </fieldset>
          ) : null}
        </form>
      </HarmonySheetContent>
      <HarmonySheetFooter>
        {showProblem && problem ? (
          <p
            role="alert"
            className="mr-auto min-w-0 text-xs font-medium text-destructive"
          >
            {problem}
          </p>
        ) : null}
        <SheetClose asChild>
          <Button variant="outline" disabled={isPending}>
            Cancelar
          </Button>
        </SheetClose>
        <Button type="submit" form={FORM_ID} disabled={isPending}>
          {isPending ? <Loader2 className="animate-spin" /> : null}
          {result ? "Guardar" : "Crear resultado"}
        </Button>
      </HarmonySheetFooter>
    </>
  );
};

/**
 * Definir un resultado de un formato: su tipo y lo que pide de los campos.
 * Sólo se ofrecen los campos que sirven a cada ajuste —los numéricos para
 * sumar, las listas para repartir—. Lo que lo hace flexible son las piezas
 * que cualquier tipo admite: fórmulas, condiciones, meta y comparación.
 */
export const ResultEditorSheet = ({
  open,
  onOpenChange,
  ...props
}: ResultEditorSheetProps) => (
  <HarmonySheet open={open} onOpenChange={onOpenChange}>
    <HarmonySheetHeader
      icon={RESULT_CATALOG[props.result?.config.type ?? "indicator"].icon}
      title={props.result ? "Editar resultado" : "Añadir resultado"}
      description="Qué se calcula de las respuestas de este formato."
    />
    {/* El formulario se monta al abrir: reabrir parte de lo guardado. */}
    {open ? <EditorForm {...props} onDone={() => onOpenChange(false)} /> : null}
  </HarmonySheet>
);
