"use client";

import {
  HarmonySheet,
  HarmonySheetContent,
  HarmonySheetFooter,
  HarmonySheetHeader,
  SheetClose,
} from "@/components/harmony/harmony-sheet";
import { Button } from "@/components/ui/button";
import type { Id } from "@/convex/_generated/dataModel";
import type { FormField, FormKind } from "@/convex/lib/form_types";
import { useProjectId } from "@/packages/projects/store/use-project-id";
import { TriangleAlert } from "lucide-react";

import { useListCatalogs } from "../../api";
import { typeConfigProblems } from "../../lib/builder-problems";
import { FIELD_CATALOG } from "../../lib/field-catalog";
import { useFieldTypeSheet } from "../../store/use-field-type-sheet";
import { ChecklistEditor } from "../checklist-editor";
import { ReferenceConfigFields } from "../reference-config";
import { TableEditor } from "../table-editor";

/** Los tipos que se configuran en este sheet. */
export const TYPES_WITH_EDITOR = ["checklist", "table", "reference"] as const;

const DESCRIPTION: Record<(typeof TYPES_WITH_EDITOR)[number], string> = {
  checklist: "Sus ítems, su escala y lo que se pide por ítem.",
  table: "Sus columnas y cuántas filas admite.",
  reference: "De qué listado se elige y qué datos suyos se traen.",
};

/**
 * La configuración propia de un tipo —la lista de chequeo, la tabla, la
 * relación—, que no cabe en el panel del campo.
 *
 * Escribe directamente en el borrador, como el sheet de comportamiento: lo que
 * falta se dice abajo mientras se edita, y «Listo» sólo cierra. Nada se guarda
 * hasta «Guardar borrador».
 */
export const FieldTypeSheet = ({
  fields,
  kind,
  formId,
  onChange,
}: {
  fields: readonly FormField[];
  kind: FormKind;
  /** El formato que se construye: un listado no se relaciona consigo mismo. */
  formId: Id<"forms">;
  onChange: (field: FormField) => void;
}) => {
  const projectId = useProjectId();
  const [fieldId, setFieldId] = useFieldTypeSheet();
  const field = fields.find((candidate) => candidate.id === fieldId);
  const type = field?.type;
  const needsCatalogs = type === "reference" || type === "table";
  const { data: catalogs, isLoading } = useListCatalogs(
    needsCatalogs ? { projectId } : "skip",
  );
  const options = (catalogs ?? []).filter((catalog) => catalog._id !== formId);
  const problems = field ? typeConfigProblems(field, kind) : [];

  const setConfig = (patch: Partial<FormField["config"]>) => {
    if (field) onChange({ ...field, config: { ...field.config, ...patch } });
  };

  return (
    <HarmonySheet
      // «Colección»: una lista de chequeo son decenas de filas, y una tabla,
      // columnas con sus opciones.
      maxWidth={type === "reference" ? "sm:max-w-2xl" : "sm:max-w-3xl"}
      open={!!field}
      onOpenChange={(open) => {
        if (!open) setFieldId(null);
      }}
    >
      {field &&
      (type === "checklist" || type === "table" || type === "reference") ? (
        <>
          <HarmonySheetHeader
            icon={FIELD_CATALOG[field.type].icon}
            title={field.label || FIELD_CATALOG[field.type].label}
            description={DESCRIPTION[type]}
          />
          <HarmonySheetContent>
            {type === "checklist" && field.config.checklist ? (
              <ChecklistEditor
                config={field.config.checklist}
                onChange={(checklist) => setConfig({ checklist })}
              />
            ) : null}
            {type === "table" && field.config.table ? (
              <TableEditor
                config={field.config.table}
                kind={kind}
                catalogs={options}
                isLoadingCatalogs={isLoading}
                onChange={(table) => setConfig({ table })}
              />
            ) : null}
            {type === "reference" ? (
              <ReferenceConfigFields
                idPrefix={`reference-${field.id}`}
                value={field.config.reference ?? { formId: "", fill: [] }}
                catalogs={options}
                isLoading={isLoading}
                onChange={(reference) => setConfig({ reference })}
              />
            ) : null}
          </HarmonySheetContent>
          <HarmonySheetFooter>
            {problems.length > 0 ? (
              <div
                role="status"
                className="mr-auto flex min-w-0 items-start gap-2 text-ui text-muted-foreground"
              >
                <TriangleAlert className="mt-0.5 size-4 shrink-0 text-yellow-500" />
                <ul className="min-w-0 space-y-0.5">
                  {problems.map((problem) => (
                    <li key={problem}>{problem}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="mr-auto text-ui text-muted-foreground">
                Se guarda con el borrador del formato.
              </p>
            )}
            <SheetClose asChild>
              <Button size="sm">Listo</Button>
            </SheetClose>
          </HarmonySheetFooter>
        </>
      ) : null}
    </HarmonySheet>
  );
};
