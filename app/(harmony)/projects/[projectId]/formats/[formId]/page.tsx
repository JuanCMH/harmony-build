"use client";

import { PageLoading } from "@/components/harmony/page-loading";
import {
  PageHeader,
  PageMain,
  PageShell,
} from "@/components/harmony/page-shell";
import { Button } from "@/components/ui/button";
import { useGetForm, useGetPublishedForm } from "@/packages/forms/api";
import { CatalogUsage } from "@/packages/forms/components/catalog-usage";
import { EntriesTable } from "@/packages/forms/components/entries-table";
import { FormSummary } from "@/packages/forms/components/form-summary";
import { ListEmpty } from "@/packages/forms/components/list-empty";
import { ResponsesTable } from "@/packages/forms/components/responses-table";
import { ENTITY_ICONS } from "@/packages/forms/lib/field-catalog";
import { formRoutes } from "@/packages/forms/lib/routes";
import { useFormId } from "@/packages/forms/store/use-form-id";
import { useGetProject } from "@/packages/projects/api";
import { useProjectId } from "@/packages/projects/store/use-project-id";
import { usePermissions } from "@/packages/roles/store/use-permissions";
import { Lock, Pencil, PenLine, Plus } from "lucide-react";
import Link from "next/link";

/**
 * Las respuestas de un formato, o los elementos de un listado.
 *
 * Las dos tablas **lanzan** sin su llave, así que sólo se montan para quien
 * la tiene: a quien no, se le dice por qué no ve nada.
 */
export default function FormResponsesPage() {
  const projectId = useProjectId();
  const formId = useFormId();
  const { data: project } = useGetProject({ id: projectId });
  const { data: form } = useGetForm({ id: formId });
  const { can, isLoading: isLoadingPermissions } = usePermissions();

  const wasPublished = !!form && form.publishedVersionNumber !== null;
  const { data: published } = useGetPublishedForm(
    wasPublished ? { id: formId } : "skip",
  );

  const isLoading =
    form === undefined ||
    isLoadingPermissions ||
    (wasPublished && published === undefined);

  const isCatalog = form?.kind === "catalog";
  const isPublished = form?.status === "published";
  const canFillNow = !!form && !isCatalog && isPublished && form.canFill;
  const canAddNow = !!form && isCatalog && isPublished && form.canEditEntries;
  const canEditForm = !!form && form.canEdit && form.status !== "archived";
  // Quien sólo diligencia ve las suyas; un listado pide ver o gestionar.
  const canList = !!form && (form.canViewAll || (!isCatalog && can(["fillForms"])));

  const actions = form ? (
    <>
      {canEditForm ? (
        <Button size="sm" variant="outline" asChild>
          <Link href={formRoutes.edit(projectId, formId)}>
            <Pencil />
            <span className="sr-only sm:not-sr-only">
              {isCatalog ? "Editar listado" : "Editar formato"}
            </span>
          </Link>
        </Button>
      ) : null}
      {canFillNow ? (
        <Button size="sm" asChild>
          <Link href={formRoutes.fill(projectId, formId)}>
            <PenLine />
            Diligenciar
          </Link>
        </Button>
      ) : null}
      {canAddNow ? (
        <Button size="sm" asChild>
          <Link href={formRoutes.newEntry(projectId, formId)}>
            <Plus />
            <span className="sr-only sm:not-sr-only">Añadir elemento</span>
          </Link>
        </Button>
      ) : null}
    </>
  ) : null;

  const lead = form ? <FormSummary form={form} /> : null;

  const content = () => {
    if (!form)
      return (
        <PageLoading
          icon={Lock}
          text="Este formato no existe o no tienes acceso a él."
        />
      );

    if (!published)
      return (
        <div className="space-y-3">
          {lead}
          <div className="rounded-lg border bg-card">
            <ListEmpty
              icon={ENTITY_ICONS[isCatalog ? "catalog" : "form"]}
              title={
                isCatalog
                  ? "Este listado todavía no se ha publicado."
                  : "Este formato todavía no se ha publicado."
              }
              hint={
                canEditForm
                  ? isCatalog
                    ? "Publícalo desde el constructor para poder añadirle elementos."
                    : "Publícalo desde el constructor para poder diligenciarlo."
                  : "Cuando quien lo diseña lo publique, podrá usarse."
              }
              action={
                canEditForm ? (
                  <Button size="sm" asChild>
                    <Link href={formRoutes.edit(projectId, formId)}>
                      <Pencil />
                      Abrir el constructor
                    </Link>
                  </Button>
                ) : null
              }
            />
          </div>
        </div>
      );

    if (!canList)
      return (
        <PageLoading
          icon={Lock}
          text={
            isCatalog
              ? "No tienes permiso para ver los elementos de este listado. Pídeselo a quien administra el proyecto."
              : "No tienes permiso para ver las respuestas de este formato. Pídeselo a quien administra el proyecto."
          }
        />
      );

    return isCatalog ? (
      <>
        <EntriesTable
          formId={formId}
          sections={published.sections}
          titleFieldId={form.titleFieldId}
          canAdd={canAddNow}
          lead={lead}
        />
        <CatalogUsage formId={formId} />
      </>
    ) : (
      <ResponsesTable
        formId={formId}
        sections={published.sections}
        canViewAll={form.canViewAll}
        canFill={canFillNow}
        lead={lead}
      />
    );
  };

  return (
    <PageShell>
      <PageHeader
        breadcrumb={
          project && form
            ? [
                { label: project.name, href: `/projects/${projectId}` },
                {
                  label: isCatalog ? "Listados" : "Formatos",
                  href: formRoutes.list(projectId, form.kind),
                },
                { label: form.name },
              ]
            : []
        }
        actions={actions}
      />
      <PageMain
        variant="listado"
        isLoading={isLoading}
        loadingText={
          isCatalog
            ? "Se están cargando los elementos."
            : "Se están cargando las respuestas."
        }
      >
        {isLoading ? null : content()}
      </PageMain>
    </PageShell>
  );
}
