"use client";

import {
  HarmonySheet,
  HarmonySheetContent,
  HarmonySheetFooter,
  HarmonySheetHeader,
  SheetClose,
} from "@/components/harmony/harmony-sheet";
import { Button } from "@/components/ui/button";
import type {
  FormField,
  FormSection,
  VisibilityRule,
} from "@/convex/lib/form_types";
import { Plus } from "lucide-react";
import { useMemo } from "react";

import { BEHAVIOR_CATALOG } from "../../lib/field-catalog";
import {
  describeCondition,
  newRule,
  sectionControllerCandidates,
} from "../../lib/field-rules";
import { useSectionSheet } from "../../store/use-section-sheet";
import { FormRuleRow } from "../form-rule-editor";
import {
  EmptyWithAction,
  MatchToggle,
  TabHeading,
} from "./field-behavior-sheet";

/**
 * Cuándo se muestra una sección entera.
 *
 * Sus campos heredan la condición: si la sección se oculta, no se exigen y lo
 * que tuvieran no se guarda. Sólo puede mirar los datos de la respuesta y los
 * campos de secciones **anteriores**, que es lo que impide que dos secciones
 * se esperen la una a la otra (diseño §4.5).
 */
export const SectionVisibilitySheet = ({
  sections,
  contextFields,
  onChange,
}: {
  sections: readonly FormSection[];
  /** Los datos de la respuesta, como campos. */
  contextFields: readonly FormField[];
  onChange: (sectionId: string, patch: Partial<FormSection>) => void;
}) => {
  const [sectionId, setSectionId] = useSectionSheet();
  const section = sections.find((candidate) => candidate.id === sectionId);

  const fields = useMemo(
    () => [...contextFields, ...sections.flatMap((current) => current.fields)],
    [contextFields, sections],
  );
  const candidates = useMemo(
    () =>
      section
        ? sectionControllerCandidates(section, sections, contextFields)
        : [],
    [section, sections, contextFields],
  );

  const match = section?.visibility?.match ?? "all";
  const rules = section?.visibility?.rules ?? [];
  const setRules = (next: VisibilityRule[], nextMatch = match) => {
    if (!section) return;
    onChange(section.id, {
      visibility:
        next.length > 0 ? { match: nextMatch, rules: next } : undefined,
    });
  };

  const addCondition = (
    <Button
      size="sm"
      variant="outline"
      disabled={candidates.length === 0}
      onClick={() => setRules([...rules, newRule()])}
    >
      <Plus className="size-4" />
      Añadir condición
    </Button>
  );

  return (
    <HarmonySheet
      maxWidth="sm:max-w-2xl"
      open={!!section}
      onOpenChange={(open) => {
        if (!open) setSectionId(null);
      }}
    >
      {section ? (
        <>
          <HarmonySheetHeader
            icon={BEHAVIOR_CATALOG.visibility.icon}
            title={`Visibilidad de «${section.label}»`}
            description="Se guarda con el borrador del formato."
          />
          <HarmonySheetContent className="gap-4">
            <TabHeading
              status={
                describeCondition(section.visibility, fields) ??
                "Siempre visible"
              }
              help={
                rules.length > 0
                  ? "Mientras está oculta, sus campos no se exigen y lo que tuvieran escrito no se guarda."
                  : "La sección se ve siempre. Puede depender de los datos de la respuesta y de los campos de las secciones anteriores."
              }
            />
            {rules.length === 0 ? (
              <EmptyWithAction
                icon={BEHAVIOR_CATALOG.visibility.icon}
                title="Sin condiciones"
                hint="Añade una para que la sección sólo aparezca según lo que se responda antes."
              >
                {addCondition}
              </EmptyWithAction>
            ) : (
              <div className="space-y-3">
                {rules.length > 1 ? (
                  <MatchToggle
                    match={match}
                    onChange={(next) => setRules(rules, next)}
                  />
                ) : null}
                <ol className="space-y-2">
                  {rules.map((rule, index) => (
                    <FormRuleRow
                      key={index}
                      index={index}
                      rule={rule}
                      fields={fields}
                      candidates={candidates}
                      removeLabel={`Quitar la condición ${index + 1}`}
                      onChange={(next) =>
                        setRules(
                          rules.map((current, position) =>
                            position === index ? next : current,
                          ),
                        )
                      }
                      onRemove={() =>
                        setRules(
                          rules.filter((_, position) => position !== index),
                        )
                      }
                    />
                  ))}
                </ol>
                <div>{addCondition}</div>
              </div>
            )}
          </HarmonySheetContent>
          <HarmonySheetFooter className="justify-end">
            <SheetClose asChild>
              <Button size="sm">Listo</Button>
            </SheetClose>
          </HarmonySheetFooter>
        </>
      ) : null}
    </HarmonySheet>
  );
};
