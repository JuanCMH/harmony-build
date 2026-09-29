"use client";

import { CollectionEmpty } from "@/components/harmony/collection";
import {
  HarmonySheet,
  HarmonySheetContent,
  HarmonySheetFooter,
  HarmonySheetHeader,
  HarmonySheetToolbar,
  SheetClose,
} from "@/components/harmony/harmony-sheet";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
  Tabs,
  TabsContent,
  UnderlineTabsList,
  UnderlineTabsTrigger,
} from "@/components/ui/tabs";
import {
  type AutoValueRule,
  type FieldConfig,
  type FormField,
  RECIPES_BY_TYPE,
  type VisibilityRule,
} from "@/convex/lib/form_types";
import { type LucideIcon, Plus } from "lucide-react";
import { type ReactNode, useMemo } from "react";

import {
  AUTO_VALUE_TYPES,
  BEHAVIOR_CATALOG,
  FIELD_CATALOG,
} from "../../lib/field-catalog";
import {
  autoValueCandidates,
  controllerCandidates,
  describeAutoValue,
  describeComputed,
  describeVisibility,
  newRule,
} from "../../lib/field-rules";
import {
  type BehaviorFocus,
  useFieldBehaviorSheet,
} from "../../store/use-field-behavior-sheet";
import { FormComputedEditor } from "../form-computed-editor";
import { FormRuleRow, RulePiece } from "../form-rule-editor";
import { FormRuleValueInput } from "../form-rule-value-input";

interface BehaviorTab {
  id: BehaviorFocus;
  title: string;
  icon: LucideIcon;
  isConfigured: boolean;
}

/** Si el campo admite valor sugerido: sólo unos tipos, y nunca uno calculado. */
export const allowsAutoValue = (field: FormField) =>
  AUTO_VALUE_TYPES.includes(field.type) && !field.config.computed;

/** Las pestañas que caben en el tipo del campo, en su orden fijo. */
const tabsOf = (field: FormField): BehaviorTab[] => [
  {
    id: "visibility",
    title: BEHAVIOR_CATALOG.visibility.label,
    icon: BEHAVIOR_CATALOG.visibility.icon,
    isConfigured: (field.config.visibility?.rules.length ?? 0) > 0,
  },
  ...(RECIPES_BY_TYPE[field.type]
    ? [
        {
          id: "value" as const,
          title: BEHAVIOR_CATALOG.value.label,
          icon: BEHAVIOR_CATALOG.value.icon,
          isConfigured: !!field.config.computed,
        },
      ]
    : []),
  ...(allowsAutoValue(field)
    ? [
        {
          id: "autoValue" as const,
          title: BEHAVIOR_CATALOG.autoValue.label,
          icon: BEHAVIOR_CATALOG.autoValue.icon,
          isConfigured: (field.config.autoValue?.rules.length ?? 0) > 0,
        },
      ]
    : []),
];

/** Lo primero de cada pestaña: en qué estado está, y qué hace. */
export const TabHeading = ({
  status,
  help,
}: {
  status: string;
  help: string;
}) => (
  <div className="space-y-1">
    <p className="text-sm font-medium tracking-tight">{status}</p>
    <p className="text-ui text-muted-foreground">{help}</p>
  </div>
);

/** El vacío de una pestaña, con su única acción debajo. */
export const EmptyWithAction = ({
  icon,
  title,
  hint,
  children,
}: {
  icon: LucideIcon;
  title: string;
  hint: string;
  children: ReactNode;
}) => (
  <div className="flex flex-col items-center pb-6">
    <CollectionEmpty icon={icon} title={title} hint={hint} />
    <div className="-mt-4 flex flex-col items-center gap-2">{children}</div>
  </div>
);

/** «Todas» o «alguna»: cuántas condiciones deben cumplirse. */
export const MatchToggle = ({
  match,
  onChange,
}: {
  match: "all" | "any";
  onChange: (match: "all" | "any") => void;
}) => (
  <div className="flex flex-wrap items-center gap-2 text-ui text-muted-foreground">
    Se muestra cuando se cumplen
    <ButtonGroup aria-label="Cuántas condiciones deben cumplirse">
      {(["all", "any"] as const).map((option) => (
        <Button
          key={option}
          size="sm"
          variant={match === option ? "secondary" : "outline"}
          aria-pressed={match === option}
          className="h-7"
          onClick={() => onChange(option)}
        >
          {option === "all" ? "todas" : "alguna"}
        </Button>
      ))}
    </ButtonGroup>
  </div>
);

const NO_CANDIDATES = (
  <p className="text-ui text-muted-foreground">
    No hay otro campo del que este pueda depender.
  </p>
);

const BehaviorContent = ({
  field,
  fields,
  focus,
  onFocus,
  onChange,
}: {
  field: FormField;
  fields: readonly FormField[];
  focus: BehaviorFocus;
  onFocus: (focus: BehaviorFocus) => void;
  onChange: (field: FormField) => void;
}) => {
  const candidates = useMemo(
    () => controllerCandidates(field, fields),
    [field, fields],
  );
  const autoCandidates = useMemo(
    () => autoValueCandidates(field, fields),
    [field, fields],
  );
  const tabs = tabsOf(field);
  // Si la pestaña pedida ya no cabe —se eligió una receta y el valor sugerido
  // desapareció—, se abre la primera.
  const active = tabs.some((tab) => tab.id === focus) ? focus : tabs[0].id;

  const setConfig = (patch: Partial<FieldConfig>) =>
    onChange({ ...field, config: { ...field.config, ...patch } });

  const match = field.config.visibility?.match ?? "all";
  const conditions = field.config.visibility?.rules ?? [];
  const setConditions = (next: VisibilityRule[], nextMatch = match) =>
    setConfig({
      visibility:
        next.length > 0 ? { match: nextMatch, rules: next } : undefined,
    });

  const suggested = field.config.autoValue?.rules ?? [];
  const setSuggested = (next: AutoValueRule[]) =>
    setConfig({ autoValue: next.length > 0 ? { rules: next } : undefined });

  const addCondition = (
    <Button
      size="sm"
      variant="outline"
      disabled={candidates.length === 0}
      onClick={() => setConditions([...conditions, newRule()])}
    >
      <Plus className="size-4" />
      Añadir condición
    </Button>
  );

  const addSuggestion = (
    <Button
      size="sm"
      variant="outline"
      disabled={autoCandidates.length === 0}
      onClick={() => setSuggested([...suggested, { ...newRule(), set: "" }])}
    >
      <Plus className="size-4" />
      Añadir regla
    </Button>
  );

  return (
    <Tabs
      value={active}
      onValueChange={(value) => onFocus(value as BehaviorFocus)}
      className="flex min-h-0 flex-1 flex-col gap-0"
    >
      <HarmonySheetToolbar className="border-b pt-3 pb-0">
        <UnderlineTabsList className="gap-0 border-b-0 sm:gap-1">
          {tabs.map(({ id, title, icon: Icon, isConfigured }) => (
            <UnderlineTabsTrigger
              key={id}
              value={id}
              className="min-w-fit px-3"
            >
              <Icon className="hidden size-3.5 sm:block" />
              {title}
              {isConfigured ? (
                <span
                  className="size-1.5 rounded-full bg-h-indigo"
                  role="img"
                  aria-label="configurado"
                />
              ) : null}
            </UnderlineTabsTrigger>
          ))}
        </UnderlineTabsList>
      </HarmonySheetToolbar>

      <HarmonySheetContent className="gap-4">
        <TabsContent value="visibility" className="space-y-4">
          <TabHeading
            status={describeVisibility(field, fields) ?? "Siempre visible"}
            help={
              conditions.length > 0
                ? "Mientras está oculto, el campo no se exige y lo que tuviera escrito no se guarda."
                : "El campo se ve siempre."
            }
          />
          {conditions.length === 0 ? (
            <EmptyWithAction
              icon={BEHAVIOR_CATALOG.visibility.icon}
              title="Sin condiciones"
              hint="Añade una para que el campo sólo aparezca según lo que se responda."
            >
              {addCondition}
              {candidates.length === 0 ? NO_CANDIDATES : null}
            </EmptyWithAction>
          ) : (
            <div className="space-y-3">
              {conditions.length > 1 ? (
                <MatchToggle
                  match={match}
                  onChange={(next) => setConditions(conditions, next)}
                />
              ) : null}
              <ol className="space-y-2">
                {conditions.map((rule, index) => (
                  <FormRuleRow
                    // Una regla no tiene identidad propia: su posición es su
                    // nombre.
                    key={index}
                    index={index}
                    rule={rule}
                    fields={fields}
                    candidates={candidates}
                    removeLabel={`Quitar la condición ${index + 1}`}
                    onChange={(next) =>
                      setConditions(
                        conditions.map((current, position) =>
                          position === index ? next : current,
                        ),
                      )
                    }
                    onRemove={() =>
                      setConditions(
                        conditions.filter((_, position) => position !== index),
                      )
                    }
                  />
                ))}
              </ol>
              <div>{addCondition}</div>
            </div>
          )}
        </TabsContent>

        {RECIPES_BY_TYPE[field.type] ? (
          <TabsContent value="value" className="space-y-4">
            <TabHeading
              status={
                field.config.computed
                  ? `Calculado: ${describeComputed(field, fields)}`
                  : "Lo escribe quien diligencia"
              }
              help="Un campo calculado se rellena solo a partir de otros y nadie lo escribe. Lo que depende de hoy se calcula al abrir el formato y no se guarda."
            />
            <FormComputedEditor
              field={field}
              fields={fields}
              onChange={onChange}
            />
          </TabsContent>
        ) : null}

        {allowsAutoValue(field) ? (
          <TabsContent value="autoValue" className="space-y-4">
            <TabHeading
              status={
                suggested.length === 0
                  ? "Sin valor sugerido"
                  : `${suggested.length} ${suggested.length === 1 ? "regla" : "reglas"}`
              }
              help="Rellena este campo según otra respuesta. Se aplica la primera regla que se cumpla, y quien diligencia puede cambiar el valor después."
            />
            {suggested.length === 0 ? (
              <EmptyWithAction
                icon={BEHAVIOR_CATALOG.autoValue.icon}
                title="Sin reglas"
                hint="Añade una para proponer un valor según otra respuesta."
              >
                {addSuggestion}
                {autoCandidates.length === 0 ? NO_CANDIDATES : null}
              </EmptyWithAction>
            ) : (
              <div className="space-y-3">
                <ol className="space-y-2">
                  {suggested.map((rule, index) => (
                    <FormRuleRow
                      // El orden de las reglas es su prioridad, y su identidad.
                      key={index}
                      index={index}
                      rule={rule}
                      fields={fields}
                      candidates={autoCandidates}
                      removeLabel={`Quitar la regla ${index + 1}`}
                      onChange={(next) =>
                        setSuggested(
                          suggested.map((current, position) =>
                            position === index ? next : current,
                          ),
                        )
                      }
                      onRemove={() =>
                        setSuggested(
                          suggested.filter((_, position) => position !== index),
                        )
                      }
                    >
                      <div className="flex items-start gap-2 border-t pt-3">
                        <div className="grid min-w-0 flex-1 grid-cols-1 gap-2 sm:grid-cols-3">
                          <RulePiece title="Entonces se rellena con">
                            <FormRuleValueInput
                              field={field}
                              operator="eq"
                              values={rule.set ? [rule.set] : []}
                              label="Valor con el que se rellena"
                              onChange={(values) =>
                                setSuggested(
                                  suggested.map((current, position) =>
                                    position === index
                                      ? { ...current, set: values[0] ?? "" }
                                      : current,
                                  ),
                                )
                              }
                            />
                          </RulePiece>
                          <div className="min-w-0 sm:col-span-2">
                            <RulePiece title="Se lee así">
                              <p className="flex min-h-8 items-center rounded-md bg-muted/40 px-3 py-1.5 text-ui text-muted-foreground">
                                {describeAutoValue(field, fields)[index]}
                              </p>
                            </RulePiece>
                          </div>
                        </div>
                        <span className="size-8 shrink-0" aria-hidden />
                      </div>
                    </FormRuleRow>
                  ))}
                </ol>
                <div>{addSuggestion}</div>
              </div>
            )}
          </TabsContent>
        ) : null}
      </HarmonySheetContent>
      <HarmonySheetFooter className="justify-end">
        <SheetClose asChild>
          <Button size="sm">Listo</Button>
        </SheetClose>
      </HarmonySheetFooter>
    </Tabs>
  );
};

/**
 * Lo que un campo **hace**: cuándo se muestra, cómo se calcula y qué valor
 * sugiere.
 *
 * Es un sheet y no un bloque del panel porque es contenido de longitud
 * variable que se edita mientras se sigue viendo el lienzo (`03 §3.0`). Va por
 * pestañas, una por conducta, y la pestaña abierta es el `focus` del átomo: la
 * fila del panel que se pulsa decide dónde se abre.
 *
 * Escribe sobre el borrador del constructor: nada se guarda hasta «Guardar
 * borrador», y la cabecera sigue diciendo si falta algo.
 */
export const FieldBehaviorSheet = ({
  fields,
  onChange,
}: {
  /** Los datos de la respuesta delante de los campos del formato. */
  fields: readonly FormField[];
  onChange: (field: FormField) => void;
}) => {
  const [state, setState] = useFieldBehaviorSheet();
  const field = state
    ? fields.find((candidate) => candidate.id === state.fieldId)
    : undefined;

  return (
    // «Detalle»: a 512px la frase de una regla —campo, condición y valor— no
    // cabía en una línea.
    <HarmonySheet
      maxWidth="sm:max-w-2xl"
      open={!!field}
      onOpenChange={(open) => {
        if (!open) setState(null);
      }}
    >
      {field && state ? (
        <>
          <HarmonySheetHeader
            icon={FIELD_CATALOG[field.type].icon}
            title={`Comportamiento de «${field.label}»`}
            description="Se guarda con el borrador del formato."
          />
          <BehaviorContent
            // Otro campo, otro sheet: que no herede lo desplegado del anterior.
            key={field.id}
            field={field}
            fields={fields}
            focus={state.focus}
            onFocus={(focus) => setState({ fieldId: field.id, focus })}
            onChange={onChange}
          />
        </>
      ) : null}
    </HarmonySheet>
  );
};
