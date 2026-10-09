"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { todayInColombia } from "@/convex/lib/dates";
import { computeComputedValues } from "@/convex/lib/field_computed";
import { cascadeAutoValues } from "@/convex/lib/field_logic";
import { type FormContext, withFormContext } from "@/convex/lib/form_context";
import {
  evaluateForm,
  flattenFields,
  type VisibleSection,
  visibleSections,
} from "@/convex/lib/form_evaluation";
import type { FormSection, FormValues } from "@/convex/lib/form_types";
import { useEffect, useMemo, useState } from "react";

import {
  type FormFocusRequest,
  fieldDomId,
  problemTargets,
} from "../lib/field-dom";
import { FIELD_GRID } from "../lib/grid";
import {
  problemsBySection,
  type SubmissionProblem,
} from "../lib/submission-problems";
import { DESKTOP_QUERY, useMediaQuery } from "../lib/use-media-query";
import { FormFieldFrame } from "./form-field-frame";
import { type FormFieldContext, FormFieldInput } from "./form-field";

interface FormFormProps {
  sections: readonly FormSection[];
  values: FormValues;
  onChange: (values: FormValues) => void;
  /** Lo que los controles necesitan: el formato y quién diligencia. */
  fieldContext: FormFieldContext;
  /** La fecha y el autor, para las reglas que los miran (`@fecha`,
   *  `@autor`). */
  formContext?: FormContext;
  disabled?: boolean;
  /** Tras un intento de envío: se señala todo lo que falta. */
  showMissing: boolean;
  problems: readonly SubmissionProblem[];
  focus?: FormFocusRequest | null;
}

const FOCUSABLE =
  'input:not([disabled]):not([tabindex="-1"]), textarea:not([disabled]), button:not([disabled]), [role="combobox"]:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Lleva la vista y el foco al primer destino que exista: a su primer
 *  control, y si no tiene ninguno que se enfoque —una firma—, al bloque. */
function focusTarget(ids: readonly string[]) {
  const target = ids
    .map((id) => document.getElementById(id))
    .find((element): element is HTMLElement => element !== null);
  if (!target) return;
  target.scrollIntoView({ block: "center", behavior: "smooth" });
  const control = target.querySelector<HTMLElement>(FOCUSABLE);
  (control ?? target).focus({ preventScroll: true });
}

/**
 * El formulario de un formato, para diligenciarlo.
 *
 * Portado de `template-form.tsx` de Harmony. Aquí el motor de
 * `convex/lib/` hace su trabajo del lado del cliente con **las mismas
 * funciones** que el servidor corre al guardar: qué se ve
 * (`evaluateForm`, `visibleSections`), qué vale un derivado
 * (`computeComputedValues`) y qué valor se sugiere (`cascadeAutoValues`). Lo
 * que se ve es lo que se guarda.
 *
 * Un campo oculto no se pinta ni se exige. Las secciones van apiladas en
 * teléfono y tableta, cada una con su título —el formato se recorre hacia
 * abajo, como la hoja—, y en pestañas desde `lg` cuando hay más de una
 * (`03 §6.2`).
 */
export const FormForm = ({
  sections,
  values,
  onChange,
  fieldContext,
  formContext,
  disabled = false,
  showMissing,
  problems,
  focus,
}: FormFormProps) => {
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  const fields = useMemo(() => flattenFields(sections), [sections]);

  const evaluated = useMemo(
    () => evaluateForm(sections, values, formContext),
    [sections, values, formContext],
  );
  const visible = useMemo(
    () => visibleSections(sections, values, formContext),
    [sections, values, formContext],
  );

  // Una vista previa: quien manda es el servidor, que recalcula al guardar.
  // Los que dependen de hoy sólo existen aquí, porque no se guardan.
  const today = todayInColombia(Date.now());
  const computed = useMemo(
    () =>
      computeComputedValues(
        evaluated.fields,
        evaluated.values,
        evaluated.visibility,
        today,
      ),
    [evaluated, today],
  );

  const problemByField = useMemo(
    () => new Map(problems.map((problem) => [problem.fieldId, problem])),
    [problems],
  );
  const countBySection = useMemo(() => problemsBySection(problems), [problems]);

  const [tab, setTab] = useState<string | null>(null);
  const activeTab =
    visible.find((entry) => entry.section.id === tab)?.section.id ??
    visible[0]?.section.id ??
    "";
  const usesTabs = isDesktop && visible.length > 1;

  // Un intento de envío con algo pendiente abre la pestaña del primero y le
  // lleva la vista. Se espera un momento: la pestaña recién abierta tiene que
  // montarse antes de poder enfocar nada dentro.
  useEffect(() => {
    if (!focus) return;
    setTab(focus.problem.sectionId);
    const wait = window.setTimeout(
      () => focusTarget(problemTargets(focus.problem)),
      60,
    );
    return () => window.clearTimeout(wait);
  }, [focus]);

  const change = (fieldId: string, value: unknown) => {
    const next: FormValues = { ...values, [fieldId]: value };
    // Un valor sugerido se aplica en cascada y sigue siendo editable después.
    const withContext = withFormContext(fields, next, formContext);
    for (const [id, suggested] of cascadeAutoValues(
      withContext.fields,
      withContext.values,
      fieldId,
    )) {
      next[id] = suggested;
    }
    onChange(next);
  };

  const renderFields = ({ section, fields: shown }: VisibleSection) => (
    <div className="space-y-4">
      {section.description ? (
        <p className="text-sm text-muted-foreground">{section.description}</p>
      ) : null}
      <div className={FIELD_GRID}>
        {shown.map((field) => {
          const controlId = fieldDomId(field.id);
          return (
            <FormFieldFrame
              key={field.id}
              field={field}
              controlId={controlId}
              problem={showMissing ? problemByField.get(field.id) : undefined}
            >
              <FormFieldInput
                id={controlId}
                field={field}
                value={
                  field.config.computed
                    ? computed.get(field.id)
                    : values[field.id]
                }
                disabled={disabled}
                showMissing={showMissing}
                context={fieldContext}
                onChange={(value) => change(field.id, value)}
              />
            </FormFieldFrame>
          );
        })}
      </div>
    </div>
  );

  if (visible.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        Este formato todavía no tiene campos que diligenciar.
      </p>
    );
  }

  if (!usesTabs) {
    const titled = visible.length > 1;
    return (
      <div className="space-y-10">
        {visible.map((entry) => (
          <section
            key={entry.section.id}
            aria-labelledby={titled ? `seccion-${entry.section.id}` : undefined}
            className="space-y-4"
          >
            {titled ? (
              <h2
                id={`seccion-${entry.section.id}`}
                className="border-b pb-2 text-base font-medium tracking-tight"
              >
                {entry.section.label}
              </h2>
            ) : null}
            {renderFields(entry)}
          </section>
        ))}
      </div>
    );
  }

  return (
    <Tabs value={activeTab} onValueChange={setTab} className="gap-0">
      <TabsList aria-label="Secciones del formato">
        {visible.map(({ section }) => {
          const pending = showMissing
            ? (countBySection.get(section.id) ?? 0)
            : 0;
          return (
            <TabsTrigger key={section.id} value={section.id} className="px-3">
              {section.label}
              {pending > 0 ? (
                <span className="rounded-full bg-destructive/10 px-1.5 text-xs font-medium tabular-nums text-destructive">
                  {pending}
                  <span className="sr-only">
                    {pending === 1 ? " pendiente" : " pendientes"}
                  </span>
                </span>
              ) : null}
            </TabsTrigger>
          );
        })}
      </TabsList>
      {visible.map((entry) => (
        <TabsContent
          key={entry.section.id}
          value={entry.section.id}
          className="mt-3"
        >
          {renderFields(entry)}
        </TabsContent>
      ))}
    </Tabs>
  );
};
