"use client";

import { PageLoading } from "@/components/harmony/page-loading";
import {
  PageHeader,
  PageMain,
  PageShell,
} from "@/components/harmony/page-shell";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { dateText } from "@/convex/lib/field_text";
import { useGetForm, useGetResponse } from "@/packages/forms/api";
import { EntryActions } from "@/packages/forms/components/entry-actions";
import { EntryHistory } from "@/packages/forms/components/entry-history";
import { VoidResponseModal } from "@/packages/forms/components/modals/void-response-modal";
import { ResponseHeader } from "@/packages/forms/components/response-header";
import { ResponseView } from "@/packages/forms/components/response-view";
import { formRoutes } from "@/packages/forms/lib/routes";
import { useFormId } from "@/packages/forms/store/use-form-id";
import { useResponseId } from "@/packages/forms/store/use-response-id";
import { useGetProject } from "@/packages/projects/api";
import { useProjectId } from "@/packages/projects/store/use-project-id";
import { usePermissions } from "@/packages/roles/store/use-permissions";
import { Ban, Lock } from "lucide-react";
import { useState } from "react";

/**
 * Una respuesta, o un elemento de un listado, en sólo lectura.
 *
 * Lo que se puede hacer con ella lo dice el servidor en la propia lectura
 * (`canVoid`, `canEdit`): la pantalla no pregunta por llaves para decidirlo.
 */
export default function ResponsePage() {
  const projectId = useProjectId();
  const formId = useFormId();
  const responseId = useResponseId();
  const { data: project } = useGetProject({ id: projectId });
  const { data: response } = useGetResponse({ id: responseId });
  const { can } = usePermissions();
  const [voidOpen, setVoidOpen] = useState(false);

  // La versión vigente del listado, para decir a cuál pasará un elemento
  // guardado con otra al editarlo.
  const isEntry = response?.form.kind === "catalog";
  const { data: form } = useGetForm(isEntry ? { id: formId } : "skip");

  const isLoading = response === undefined;
  const ownFormId = response?.form._id ?? formId;

  const actions = !response ? null : isEntry ? (
    <EntryActions
      entry={{
        _id: response._id,
        title: response.title,
        active: response.active,
      }}
      editHref={
        response.canEdit && response.form.status === "published"
          ? formRoutes.editEntry(projectId, ownFormId, response._id)
          : undefined
      }
      canToggle={response.canEdit && response.form.status !== "archived"}
    />
  ) : response.canVoid ? (
    <Button size="sm" variant="outline" onClick={() => setVoidOpen(true)}>
      <Ban />
      Anular
    </Button>
  ) : null;

  return (
    <PageShell>
      <PageHeader
        breadcrumb={
          project && response
            ? [
                { label: project.name, href: `/projects/${projectId}` },
                {
                  label: isEntry ? "Listados" : "Formatos",
                  href: formRoutes.list(projectId, response.form.kind),
                },
                {
                  label: response.form.name,
                  href: formRoutes.responses(projectId, ownFormId),
                },
                {
                  label: isEntry
                    ? response.title || "Elemento sin título"
                    : `Respuesta del ${dateText(response.date)}`,
                },
              ]
            : []
        }
        actions={actions}
      />
      <PageMain
        variant="documento"
        isLoading={isLoading}
        loadingText="Se está cargando la respuesta."
      >
        {response === null ? (
          <PageLoading
            icon={Lock}
            text="Esta respuesta no existe o no tienes acceso a ella."
          />
        ) : response ? (
          <>
            <ResponseHeader
              response={response}
              publishedVersionNumber={form?.publishedVersionNumber ?? null}
            />
            <Separator className="opacity-40" />
            <ResponseView response={response} />
            {isEntry && can(["viewResponses", "fillForms"]) ? (
              <>
                <Separator className="opacity-40" />
                <EntryHistory
                  entryId={response._id}
                  seesAll={can(["viewResponses"])}
                />
              </>
            ) : null}
          </>
        ) : null}
      </PageMain>

      {response && response.canVoid ? (
        <VoidResponseModal
          responseId={response._id}
          open={voidOpen}
          onOpenChange={setVoidOpen}
        />
      ) : null}
    </PageShell>
  );
}
