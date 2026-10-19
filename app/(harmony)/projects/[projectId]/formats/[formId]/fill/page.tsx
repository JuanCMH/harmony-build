"use client";

import { PageLoading } from "@/components/harmony/page-loading";
import {
  PageHeader,
  PageMain,
  PageShell,
} from "@/components/harmony/page-shell";
import { stagesOf } from "@/convex/lib/tracking";
import {
  useGetForm,
  useGetPublishedForm,
  useOpenTracking,
  useSubmitResponse,
} from "@/packages/forms/api";
import { FormCapture } from "@/packages/forms/components/form-capture";
import { formRoutes } from "@/packages/forms/lib/routes";
import { useCaptureAuthor } from "@/packages/forms/lib/use-capture-author";
import { useFormId } from "@/packages/forms/store/use-form-id";
import { useGetProject } from "@/packages/projects/api";
import { useProjectId } from "@/packages/projects/store/use-project-id";
import { Archive, Loader2, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { toast } from "sonner";

/**
 * Diligenciar un formato: la pantalla más usada del producto, y la que se usa
 * en el teléfono, en la obra, con prisa (`03 §6.2`).
 *
 * Un listado no se diligencia: sus elementos se añaden. Quien llega aquí con
 * un listado va a «Elemento nuevo».
 */
export default function FillFormPage() {
  const projectId = useProjectId();
  const formId = useFormId();
  const router = useRouter();
  const { data: project } = useGetProject({ id: projectId });
  const { data: form } = useGetForm({ id: formId });
  const author = useCaptureAuthor(projectId);

  // Un seguimiento no se diligencia entero: aquí se abre un asunto, que es
  // completar su primera etapa.
  const isTracking = form?.kind === "tracking";
  const isFillable =
    !!form &&
    form.kind !== "catalog" &&
    form.status === "published" &&
    form.publishedVersionId !== null &&
    (isTracking ? form.canOpen : form.canFill);
  const { data: version } = useGetPublishedForm(
    isFillable ? { id: formId } : "skip",
  );
  const { mutate: submitResponse } = useSubmitResponse();
  const { mutate: openTracking } = useOpenTracking();
  const sections = useMemo(
    () =>
      version
        ? isTracking
          ? stagesOf(version.sections).slice(0, 1)
          : version.sections
        : [],
    [version, isTracking],
  );

  useEffect(() => {
    if (form?.kind === "catalog") {
      router.replace(formRoutes.newEntry(projectId, formId));
    }
  }, [form?.kind, router, projectId, formId]);

  const draftScope = useMemo(
    () =>
      version ? { projectId, formId, versionNumber: version.number } : null,
    [projectId, formId, version],
  );

  const breadcrumb = project
    ? [
        { label: project.name, href: `/projects/${projectId}` },
        {
          label: isTracking ? "Seguimientos" : "Formatos",
          href: formRoutes.list(projectId, isTracking ? "tracking" : "record"),
        },
        ...(form
          ? [
              {
                label: form.code ?? form.name,
                href: formRoutes.responses(projectId, formId),
              },
            ]
          : []),
        { label: isTracking ? "Abrir asunto" : "Diligenciar" },
      ]
    : [];

  const blocked =
    form === null ? (
      <PageLoading
        icon={Lock}
        text="Este formato no existe o no tienes acceso a él."
      />
    ) : form && form.kind !== "catalog" && !isFillable ? (
      form.status !== "published" || form.publishedVersionId === null ? (
        <PageLoading
          icon={Archive}
          text="Este formato no está publicado o está archivado: todavía no se puede diligenciar."
        />
      ) : (
        <PageLoading
          icon={Lock}
          text="Este formato no es para tu rol. Si debes diligenciarlo, pídeselo a quien administra el proyecto."
        />
      )
    ) : version === null ? (
      <PageLoading
        icon={Archive}
        text="Este formato no está publicado o está archivado: todavía no se puede diligenciar."
      />
    ) : author === null ? (
      <PageLoading icon={Lock} text="No perteneces a este proyecto." />
    ) : null;

  const isLoading =
    !blocked && (!form || form.kind === "catalog" || !version || !author);

  return (
    <PageShell>
      <PageHeader breadcrumb={breadcrumb} />
      <PageMain
        variant="documento"
        isLoading={isLoading}
        loadingText="Se está cargando el formato."
      >
        {blocked ??
          (form && version && author ? (
            <FormCapture
              formId={formId}
              name={form.name}
              code={form.code}
              description={form.description}
              versionNumber={version.number}
              eyebrow={
                isTracking ? `Abrir asunto · ${sections[0]?.label ?? ""}` : undefined
              }
              sections={sections}
              draftScope={draftScope}
              author={author}
              submitLabel={isTracking ? "Abrir asunto" : "Enviar"}
              save={async (values) => {
                const responseId = await (isTracking
                  ? openTracking({ formId, values }, { throwError: true })
                  : submitResponse({ formId, values }, { throwError: true }));
                if (!responseId) throw new Error("No se pudo enviar");
                return responseId;
              }}
              onSaved={(responseId) => {
                toast.success(
                  isTracking
                    ? "Asunto abierto correctamente"
                    : "Respuesta enviada correctamente",
                );
                router.push(formRoutes.response(projectId, formId, responseId));
              }}
            />
          ) : (
            <PageLoading icon={Loader2} iconSpin />
          ))}
      </PageMain>
    </PageShell>
  );
}
