"use client";

import { PageLoading } from "@/components/harmony/page-loading";
import {
  PageHeader,
  PageMain,
  PageShell,
} from "@/components/harmony/page-shell";
import {
  useCreateEntry,
  useGetForm,
  useGetPublishedForm,
} from "@/packages/forms/api";
import { FormCapture } from "@/packages/forms/components/form-capture";
import { formRoutes } from "@/packages/forms/lib/routes";
import { useCaptureAuthor } from "@/packages/forms/lib/use-capture-author";
import { useFormId } from "@/packages/forms/store/use-form-id";
import { useGetProject } from "@/packages/projects/api";
import { useProjectId } from "@/packages/projects/store/use-project-id";
import { Archive, Loader2, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";

/**
 * Añadir un elemento a un listado: un vehículo, un trabajador, un equipo. Se
 * llena como cualquier formato, pero lo que queda no es una respuesta sino
 * algo que la obra **tiene** y que otros formatos eligen.
 *
 * Sin borrador local: un elemento se da de alta en la oficina, de una vez, y
 * dos borradores de «vehículo nuevo» a medias confundirían más que ayudar.
 */
export default function NewEntryPage() {
  const projectId = useProjectId();
  const formId = useFormId();
  const router = useRouter();
  const { data: project } = useGetProject({ id: projectId });
  const { data: form } = useGetForm({ id: formId });
  const author = useCaptureAuthor(projectId);

  const canCreate =
    form?.kind === "catalog" &&
    form.status === "published" &&
    form.publishedVersionId !== null &&
    form.canEditEntries;
  const { data: version } = useGetPublishedForm(
    canCreate ? { id: formId } : "skip",
  );
  const { mutate: createEntry } = useCreateEntry();

  // Un formato no tiene elementos: se diligencia.
  useEffect(() => {
    if (form?.kind === "record") {
      router.replace(formRoutes.fill(projectId, formId));
    }
  }, [form?.kind, router, projectId, formId]);

  const breadcrumb = project
    ? [
        { label: project.name, href: `/projects/${projectId}` },
        { label: "Listados", href: formRoutes.list(projectId, "catalog") },
        ...(form
          ? [{ label: form.name, href: formRoutes.responses(projectId, formId) }]
          : []),
        { label: "Elemento nuevo" },
      ]
    : [];

  const notPublished = (
    <PageLoading
      icon={Archive}
      text="Este listado no está publicado o está archivado: todavía no se le pueden añadir elementos."
    />
  );
  const blocked =
    form === null ? (
      <PageLoading
        icon={Lock}
        text="Este listado no existe o no tienes acceso a él."
      />
    ) : form?.kind === "catalog" && !canCreate ? (
      form.status !== "published" || form.publishedVersionId === null ? (
        notPublished
      ) : (
        <PageLoading
          icon={Lock}
          text="No puedes añadir elementos a este listado. Pídeselo a quien administra el proyecto."
        />
      )
    ) : version === null ? (
      notPublished
    ) : author === null ? (
      <PageLoading icon={Lock} text="No perteneces a este proyecto." />
    ) : null;

  const isLoading =
    !blocked && (!form || form.kind === "record" || !version || !author);

  return (
    <PageShell>
      <PageHeader breadcrumb={breadcrumb} />
      <PageMain
        variant="documento"
        isLoading={isLoading}
        loadingText="Se está cargando el listado."
      >
        {blocked ??
          (form && version && author ? (
            <FormCapture
              formId={formId}
              name={form.name}
              code={form.code}
              description={form.description}
              versionNumber={version.number}
              eyebrow="Elemento nuevo"
              sections={version.sections}
              draftScope={null}
              author={author}
              submitLabel="Crear elemento"
              save={async (values) => {
                const entryId = await createEntry(
                  { formId, values },
                  { throwError: true },
                );
                if (!entryId) throw new Error("No se pudo crear el elemento");
                return entryId;
              }}
              onSaved={(entryId) => {
                toast.success("Elemento creado correctamente");
                router.push(formRoutes.response(projectId, formId, entryId));
              }}
            />
          ) : (
            <PageLoading icon={Loader2} iconSpin />
          ))}
      </PageMain>
    </PageShell>
  );
}
