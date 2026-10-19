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
import { todayInColombia } from "@/convex/lib/dates";
import { stagesOf } from "@/convex/lib/tracking";
import {
  useCompleteTrackingStage,
  useGetForm,
  useGetResponse,
} from "@/packages/forms/api";
import { FormCapture } from "@/packages/forms/components/form-capture";
import { TrackingProgress } from "@/packages/forms/components/tracking-progress";
import { KIND_TEXT } from "@/packages/forms/lib/kind-text";
import { useCaptureAuthor } from "@/packages/forms/lib/use-capture-author";
import { toast } from "sonner";
import { EntryActions } from "@/packages/forms/components/entry-actions";
import { EntryHistory } from "@/packages/forms/components/entry-history";
import { VoidResponseModal } from "@/packages/forms/components/modals/void-response-modal";
import { ResponseHeader } from "@/packages/forms/components/response-header";
import { ResponseView } from "@/packages/forms/components/response-view";
import { useListCrumb } from "@/packages/forms/lib/use-list-crumb";
import { formRoutes } from "@/packages/forms/lib/routes";
import { useFormId } from "@/packages/forms/store/use-form-id";
import { useResponseId } from "@/packages/forms/store/use-response-id";
import { useGetProject } from "@/packages/projects/api";
import { useProjectId } from "@/packages/projects/store/use-project-id";
import { usePermissions } from "@/packages/roles/store/use-permissions";
import { Ban, Lock } from "lucide-react";
import { useMemo, useState } from "react";

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
  const listCrumb = useListCrumb(response?.form.kind ?? "record", "response");
  const { can } = usePermissions();
  const [voidOpen, setVoidOpen] = useState(false);

  // La versión vigente del listado, para decir a cuál pasará un elemento
  // guardado con otra al editarlo.
  const isEntry = response?.form.kind === "catalog";
  const tracking = response?.tracking ?? null;
  const author = useCaptureAuthor(projectId);
  const { mutate: completeStage } = useCompleteTrackingStage();
  const today = useMemo(() => todayInColombia(Date.now()), []);

  // De un asunto se lee lo ya completado, y se completa la etapa que toca.
  const stages = useMemo(
    () => (response && tracking ? stagesOf(response.sections) : []),
    [response, tracking],
  );
  const doneCount = tracking
    ? tracking.stages.filter((stage) => stage.completedAt !== null).length
    : 0;
  const nextStage = tracking?.canComplete ? stages[doneCount] : undefined;
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
                ...(listCrumb ? [listCrumb] : []),
                {
                  label: response.form.name,
                  href: formRoutes.responses(projectId, ownFormId),
                },
                {
                  label: isEntry
                    ? response.title || "Elemento sin título"
                    : tracking
                      ? tracking.code || response.title || "Asunto"
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
            {tracking ? (
              <TrackingProgress
                status={response.status}
                tracking={tracking}
                today={today}
              />
            ) : null}
            <Separator className="opacity-40" />
            <ResponseView
              response={
                tracking
                  ? { ...response, sections: stages.slice(0, doneCount) }
                  : response
              }
            />
            {nextStage && author ? (
              <>
                <Separator className="opacity-40" />
                <FormCapture
                  key={nextStage.id}
                  formId={ownFormId}
                  name={nextStage.label}
                  versionNumber={null}
                  eyebrow={`Etapa ${doneCount + 1} de ${stages.length}`}
                  description={nextStage.description}
                  sections={[nextStage]}
                  draftScope={null}
                  author={author}
                  submitLabel={
                    doneCount + 1 === stages.length
                      ? "Completar y cerrar"
                      : "Completar etapa"
                  }
                  save={async (values) => {
                    const id = await completeStage(
                      { id: response._id, values },
                      { throwError: true },
                    );
                    if (!id) throw new Error("No se pudo completar la etapa");
                    return id;
                  }}
                  onSaved={() =>
                    toast.success(
                      doneCount + 1 === stages.length
                        ? "Asunto cerrado correctamente"
                        : "Etapa completada correctamente",
                    )
                  }
                />
              </>
            ) : null}
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
