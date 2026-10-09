"use client";

import { PageLoading } from "@/components/harmony/page-loading";
import {
  PageHeader,
  PageMain,
  PageShell,
} from "@/components/harmony/page-shell";
import { AddToDashboardMenu } from "@/packages/dashboard/components/add-to-dashboard-menu";
import { Button } from "@/components/ui/button";
import {
  useGetForm,
  useGetFormResults,
  useGetPublishedForm,
} from "@/packages/forms/api";
import { ListEmpty } from "@/packages/forms/components/list-empty";
import { useResultEditorSheet } from "@/packages/forms/store/use-result-editor-sheet";
import { FormTabs } from "@/packages/forms/components/form-tabs";
import { ResultsBoard } from "@/packages/forms/components/results-board";
import { formRoutes } from "@/packages/forms/lib/routes";
import { useFormId } from "@/packages/forms/store/use-form-id";
import { useGetProject } from "@/packages/projects/api";
import { useProjectId } from "@/packages/projects/store/use-project-id";
import { ChartLine, Lock, Pencil, Plus } from "lucide-react";
import Link from "next/link";

/**
 * Los resultados de un formato: lo que se calcula de sus respuestas, y dónde
 * se definen. Es la otra mitad del constructor: allí se dice qué se pregunta;
 * aquí, qué se quiere saber.
 */
export default function FormResultsPage() {
  const projectId = useProjectId();
  const formId = useFormId();
  const { data: project } = useGetProject({ id: projectId });
  const { data: form } = useGetForm({ id: formId });
  const wasPublished = !!form && form.publishedVersionNumber !== null;
  const { data: published } = useGetPublishedForm(
    wasPublished ? { id: formId } : "skip",
  );

  // «Añadir resultado» va en la barra (`03 §2.2`) cuando ya hay alguno; sin
  // ninguno, el vacío trae su propio botón y dos serían uno de más.
  const { data: defined } = useGetFormResults(
    wasPublished ? { formId } : "skip",
  );
  const hasResults = (defined?.length ?? 0) > 0;
  const [, setEditing] = useResultEditorSheet();

  const isLoading =
    form === undefined || (wasPublished && published === undefined);

  return (
    <PageShell>
      <PageHeader
        breadcrumb={
          project && form
            ? [
                { label: project.name, href: `/projects/${projectId}` },
                {
                  label: form.kind === "catalog" ? "Listados" : "Formatos",
                  href: formRoutes.list(projectId, form.kind),
                },
                // Las mismas migas en las tres pestañas del formato: cuál se
                // mira ya lo dice la pestaña.
                { label: form.name },
              ]
            : []
        }
        actions={
          form?.canEdit && published && hasResults ? (
            <Button size="sm" onClick={() => setEditing("new")}>
              <Plus />
              <span className="sr-only sm:not-sr-only">Añadir resultado</span>
            </Button>
          ) : null
        }
      />
      {form ? (
        <FormTabs formId={formId} active="results" form={form} canList />
      ) : null}
      <PageMain
        variant="compuesta"
        className="overflow-y-auto"
        isLoading={isLoading}
        loadingText="Se están cargando los resultados."
      >
        {isLoading ? null : !form ? (
          <PageLoading
            icon={Lock}
            text="Este formato no existe o no tienes acceso a él."
          />
        ) : !published ? (
          <div className="rounded-lg border bg-card">
            <ListEmpty
              icon={ChartLine}
              title={
                form.kind === "catalog"
                  ? "Este listado todavía no se ha publicado."
                  : "Este formato todavía no se ha publicado."
              }
              hint="Publícalo desde el diseño para poder definir sus resultados."
              action={
                form.canEdit ? (
                  <Button size="sm" asChild>
                    <Link href={formRoutes.edit(projectId, formId)}>
                      <Pencil />
                      Abrir el diseño
                    </Link>
                  </Button>
                ) : null
              }
            />
          </div>
        ) : (
          // `shrink-0`: dentro de una compuesta, un contenedor se encoge al
          // alto disponible y sus tarjetas quedarían recortadas (`03 §2.3`).
          <div className="shrink-0 space-y-4">
            <ResultsBoard
              formId={formId}
              kind={form.kind}
              sections={published.sections}
              canEdit={form.canEdit}
              menuItems={(result) => (
                <AddToDashboardMenu
                  resultId={result._id}
                  name={result.name}
                  type={result.config.type}
                  withSeparator={form.canEdit}
                />
              )}
            />
          </div>
        )}
      </PageMain>
    </PageShell>
  );
}
