"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import type { Id } from "@/convex/_generated/dataModel";
import {
  type FieldType,
  type FormField,
  type FormKind,
  type FormSection,
  fieldTypesFor,
} from "@/convex/lib/form_types";
import { ArrowLeft } from "lucide-react";

import { FIELD_CATALOG } from "../lib/field-catalog";
import type { CatalogNames } from "../lib/field-config-text";
import { describeCondition } from "../lib/field-rules";
import { useSectionSheet } from "../store/use-section-sheet";
import { CatalogTitleField } from "./catalog-title-field";
import { type TrackingDeclared, TrackingSettings } from "./tracking-settings";
import { ConfigBlock, FormFieldConfig, StatusRow } from "./form-field-config";
import { FormFieldPalette } from "./form-field-palette";
import { FormRulesSummary } from "./form-rules-summary";

/** Lo que el listado necesita para elegir su campo de título. */
export interface CatalogTitleProps {
  kind: "catalog" | "tracking";
  formId: Id<"forms">;
  /** Sólo en un seguimiento: lo que ya tiene declarado. */
  tracking?: TrackingDeclared;
  titleFieldId: string | undefined;
  savedDraft: readonly FormSection[];
  published: readonly FormSection[] | null;
}

/**
 * La columna de la derecha del constructor. Alterna entre configurar el campo
 * elegido y lo que se hace sin ninguno elegido —la sección abierta, el título
 * de un listado, la paleta y las reglas—: el lienzo **es** la vista previa, así
 * que no hace falta una tercera columna.
 */
export const FormBuilderAside = ({
  kind,
  field,
  section,
  fields,
  ruleFields,
  contextFields,
  catalogNames,
  catalogTitle,
  hasUnsavedChanges,
  isFull,
  onBack,
  onChangeField,
  onChangeSection,
  onAddField,
  onOpenRules,
}: {
  kind: FormKind;
  /** El campo elegido, o `null` para enseñar la paleta. */
  field: FormField | null;
  section: FormSection | null;
  /** Los campos del formato. */
  fields: readonly FormField[];
  /** Los del formato y los datos de la respuesta. */
  ruleFields: readonly FormField[];
  contextFields: readonly FormField[];
  catalogNames: CatalogNames;
  /** Sólo en un listado. */
  catalogTitle: CatalogTitleProps | null;
  hasUnsavedChanges: boolean;
  /** El formato llegó al máximo de campos. */
  isFull: boolean;
  onBack: () => void;
  onChangeField: (field: FormField) => void;
  onChangeSection: (sectionId: string, patch: Partial<FormSection>) => void;
  onAddField: (type: FieldType) => void;
  onOpenRules: (field: FormField) => void;
}) => {
  const [, setSectionSheet] = useSectionSheet();

  if (field) {
    const TypeIcon = FIELD_CATALOG[field.type].icon;
    return (
      <>
        <div className="flex items-center gap-2">
          <Button
            size="icon"
            variant="ghost"
            className="size-8 shrink-0 text-muted-foreground"
            aria-label="Volver a la paleta"
            onClick={onBack}
          >
            <ArrowLeft className="size-4" />
          </Button>
          <TypeIcon
            className="size-4 shrink-0 text-muted-foreground"
            aria-hidden
          />
          <h2
            className="min-w-0 truncate text-sm font-medium tracking-tight"
            title={field.label}
          >
            {field.label || FIELD_CATALOG[field.type].label}
          </h2>
          <span className="ml-auto shrink-0 text-xs text-muted-foreground">
            {FIELD_CATALOG[field.type].label}
          </span>
        </div>
        {/* `-mx-1 px-1`: los controles van de borde a borde y un contenedor
            con scroll recorta lo que sobresale; sin esos 4px el anillo de foco
            se cortaba a los lados (`03 §6.1`). */}
        <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1 pb-2">
          <FormFieldConfig
            key={field.id}
            field={field}
            fields={ruleFields}
            catalogNames={catalogNames}
            onChange={onChangeField}
          />
        </div>
      </>
    );
  }

  return (
    <div className="-mx-1 min-h-0 flex-1 space-y-5 overflow-y-auto px-1 pb-2">
      {section ? (
        <ConfigBlock title="Esta sección">
          <div className="space-y-2">
            <Label htmlFor="section-description">Descripción</Label>
            <Textarea
              key={section.id}
              id="section-description"
              className="h-16 resize-none"
              placeholder="Se muestra bajo el título de la sección. Opcional."
              value={section.description ?? ""}
              onChange={(event) =>
                onChangeSection(section.id, {
                  description: event.target.value || undefined,
                })
              }
            />
          </div>
          <div className="divide-y divide-border/60 rounded-lg border">
            <StatusRow
              title="Visibilidad"
              status={
                describeCondition(section.visibility, [
                  ...contextFields,
                  ...fields,
                ]) ?? "Siempre visible"
              }
              onOpen={() => setSectionSheet(section.id)}
            />
          </div>
        </ConfigBlock>
      ) : null}

      {catalogTitle ? (
        <>
          <Separator className="opacity-40" />
          <CatalogTitleField
            {...catalogTitle}
            hasUnsavedChanges={hasUnsavedChanges}
          />
          {catalogTitle.kind === "tracking" ? (
            <>
              <Separator className="opacity-40" />
              <TrackingSettings
                formId={catalogTitle.formId}
                declared={catalogTitle.tracking ?? {}}
                savedDraft={catalogTitle.savedDraft}
              />
            </>
          ) : null}
        </>
      ) : null}

      <Separator className="opacity-40" />
      <ConfigBlock
        title="Añadir campo"
        help={
          isFull
            ? "El formato llegó al máximo de campos."
            : "Arrástralo al lienzo o púlsalo para añadirlo al final de la sección."
        }
      >
        <FormFieldPalette
          types={fieldTypesFor(kind)}
          disabled={!section || isFull}
          onAdd={onAddField}
        />
      </ConfigBlock>

      <FormRulesSummary
        fields={fields}
        ruleFields={ruleFields}
        onOpen={onOpenRules}
      />
    </div>
  );
};
