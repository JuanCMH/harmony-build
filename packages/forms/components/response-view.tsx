"use client";

import { todayInColombia } from "@/convex/lib/dates";
import type { FormSection, StoredFieldValue } from "@/convex/lib/form_types";
import { cn } from "@/lib/utils";
import { useProjectId } from "@/packages/projects/store/use-project-id";
import { usePermissions } from "@/packages/roles/store/use-permissions";
import { useMemo } from "react";

import { FIELD_GRID, FIELD_SIZE_SPAN } from "../lib/grid";
import {
  type ValueViewContext,
  fileUrlsById,
  readResponse,
} from "../lib/response-reading";
import { formRoutes } from "../lib/routes";
import { FieldValueView } from "./field-value-view";

interface ResponseViewProps {
  /** Lo que devuelve `formResponses.getById`: las secciones son las de la
   *  versión con la que se respondió. */
  response: {
    sections: FormSection[];
    values: StoredFieldValue[];
    files: { storageId: string; url: string | null }[];
    date: string;
    author: { _id: string } | null;
  };
}

/**
 * Una respuesta entera, para leerla: las secciones y los campos de **su**
 * versión, en la misma retícula que al diligenciar, como pares
 * etiqueta–valor.
 *
 * Aquí la etiqueta es lo secundario y el valor lo principal, al revés que en
 * el formulario: quien revisa ya sabe qué se pregunta, viene a leer qué se
 * respondió.
 */
export const ResponseView = ({ response }: ResponseViewProps) => {
  const projectId = useProjectId();
  const { can } = usePermissions();
  const canOpenEntries = can(["viewResponses", "editCatalogs"]);

  const { sections, values, hasSectionTitles } = useMemo(
    () =>
      readResponse(
        {
          sections: response.sections,
          values: response.values,
          date: response.date,
          authorId: response.author?._id ?? null,
        },
        todayInColombia(Date.now()),
      ),
    [response.sections, response.values, response.date, response.author?._id],
  );

  const context = useMemo<ValueViewContext>(
    () => ({
      fileUrls: fileUrlsById(response.files),
      entryHref: (catalogId, entryId) =>
        canOpenEntries
          ? formRoutes.response(projectId, catalogId, entryId)
          : undefined,
    }),
    [response.files, canOpenEntries, projectId],
  );

  if (sections.length === 0)
    return (
      <p className="text-sm text-muted-foreground">
        Esta respuesta no tiene ningún campo que enseñar.
      </p>
    );

  return (
    <div className="divide-y divide-border/60">
      {sections.map(({ section, fields }) => (
        <section
          key={section.id}
          className="space-y-4 py-6 first:pt-0 last:pb-0"
          aria-label={hasSectionTitles ? undefined : "Respuestas"}
          aria-labelledby={
            hasSectionTitles ? `section-${section.id}` : undefined
          }
        >
          {hasSectionTitles && (
            <header className="space-y-1">
              <h3
                id={`section-${section.id}`}
                className="text-base font-medium tracking-tight"
              >
                {section.label}
              </h3>
              {section.description && (
                <p className="max-w-3xl text-sm text-muted-foreground">
                  {section.description}
                </p>
              )}
            </header>
          )}

          <dl className={FIELD_GRID}>
            {fields.map((field) => (
              <div
                key={field.id}
                className={cn(
                  "min-w-0 space-y-1.5",
                  FIELD_SIZE_SPAN[field.size],
                )}
              >
                <dt className="text-xs text-muted-foreground">
                  {field.label}
                </dt>
                <dd>
                  <FieldValueView
                    field={field}
                    value={values[field.id]}
                    context={context}
                  />
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
};
