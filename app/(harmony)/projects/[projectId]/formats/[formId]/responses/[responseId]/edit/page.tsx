"use client";

import { PageLoading } from "@/components/harmony/page-loading";
import {
  PageHeader,
  PageMain,
  PageShell,
} from "@/components/harmony/page-shell";
import { fromStoredValues } from "@/convex/lib/stored_values";
import {
  useGetPublishedForm,
  useGetResponse,
  useUpdateEntry,
} from "@/packages/forms/api";
import { FormCapture } from "@/packages/forms/components/form-capture";
import { formRoutes } from "@/packages/forms/lib/routes";
import { useCaptureAuthor } from "@/packages/forms/lib/use-capture-author";
import { useFormId } from "@/packages/forms/store/use-form-id";
import { useResponseId } from "@/packages/forms/store/use-response-id";
import { useGetProject } from "@/packages/projects/api";
import { useProjectId } from "@/packages/projects/store/use-project-id";
import { Archive, Loader2, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { toast } from "sonner";

/**
 * Editar un elemento de un listado: el vehículo al que se le renovó el SOAT.
 *
 * Se edita **sobre la versión vigente** del listado, no sobre la que tenía:
 * al guardar, el elemento pasa a ella. Los archivos que ya tenía se
 * conservan tal cual —no se vuelven a subir—, y sin borrador local: lo
 * guardado ya está en el servidor.
 */
export default function EditEntryPage() {
  const projectId = useProjectId();
  const formId = useFormId();
  const responseId = useResponseId();
  const router = useRouter();
  const { data: project } = useGetProject({ id: projectId });
  const { data: entry } = useGetResponse({ id: responseId });
  const author = useCaptureAuthor(projectId);

  const canEdit =
    entry?.form.kind === "catalog" &&
    entry.form.status === "published" &&
    entry.canEdit;
  const { data: version } = useGetPublishedForm(
    canEdit ? { id: formId } : "skip",
  );
  const { mutate: updateEntry } = useUpdateEntry();

  const initialValues = useMemo(
    () => (entry ? fromStoredValues(entry.values) : undefined),
    [entry],
  );

  const title = entry?.title || "Elemento sin título";
  const breadcrumb = project
    ? [
        { label: project.name, href: `/projects/${projectId}` },
        { label: "Listados", href: formRoutes.list(projectId, "catalog") },
        ...(entry
          ? [
              {
                label: entry.form.name,
                href: formRoutes.responses(projectId, formId),
              },
              {
                label: title,
                href: formRoutes.response(projectId, formId, responseId),
              },
            ]
          : []),
        { label: "Editar" },
      ]
    : [];

  const blocked =
    entry === null || (entry && entry.form._id !== formId) ? (
      <PageLoading
        icon={Lock}
        text="Este elemento no existe o no tienes acceso a él."
      />
    ) : entry && entry.form.kind !== "catalog" ? (
      <PageLoading
        icon={Lock}
        text="Una respuesta no se edita: si tiene un error, se anula y se diligencia de nuevo."
      />
    ) : entry && entry.form.status !== "published" ? (
      <PageLoading
        icon={Archive}
        text="Este listado está archivado: sus elementos no se pueden editar."
      />
    ) : entry && !entry.canEdit ? (
      <PageLoading
        icon={Lock}
        text="No puedes editar los elementos de este listado. Pídeselo a quien administra el proyecto."
      />
    ) : version === null ? (
      <PageLoading
        icon={Archive}
        text="Este listado no está publicado: sus elementos no se pueden editar."
      />
    ) : author === null ? (
      <PageLoading icon={Lock} text="No perteneces a este proyecto." />
    ) : null;

  const isLoading = !blocked && (!entry || !version || !author);

  return (
    <PageShell>
      <PageHeader breadcrumb={breadcrumb} />
      <PageMain
        variant="documento"
        isLoading={isLoading}
        loadingText="Se está cargando el elemento."
      >
        {blocked ??
          (entry && version && author && initialValues ? (
            <FormCapture
              formId={formId}
              name={title}
              code={entry.form.code}
              versionNumber={version.number}
              eyebrow={`Editar elemento de «${entry.form.name}»`}
              sections={version.sections}
              initialValues={initialValues}
              draftScope={null}
              author={author}
              submitLabel="Guardar cambios"
              save={async (values) => {
                const id = await updateEntry(
                  { id: responseId, values },
                  { throwError: true },
                );
                if (!id) throw new Error("No se pudo guardar el elemento");
                return id;
              }}
              onSaved={() => {
                toast.success("Elemento actualizado correctamente");
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
