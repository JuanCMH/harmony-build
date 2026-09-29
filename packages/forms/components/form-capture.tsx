"use client";

import type { Id } from "@/convex/_generated/dataModel";
import { todayInColombia } from "@/convex/lib/dates";
import { formContext } from "@/convex/lib/form_context";
import type { FormSection, FormValues } from "@/convex/lib/form_types";
import { useCallback, useMemo, useState } from "react";

import { useGenerateFormUploadUrl } from "../api";
import type { DraftScope } from "../lib/local-draft";
import {
  type SubmittedValues,
  useFormSubmission,
} from "../lib/use-form-submission";
import { useLocalDraft } from "../lib/use-local-draft";
import { DraftBanner } from "./draft-banner";
import { FillHeader } from "./fill-header";
import { FormForm } from "./form-form";
import { SubmitBar } from "./submit-bar";

interface FormCaptureProps<Result> {
  formId: Id<"forms">;
  name: string;
  code?: string;
  description?: string;
  versionNumber: number | null;
  /** «Elemento nuevo», «Editar elemento». Diligenciar no lo necesita. */
  eyebrow?: string;
  sections: readonly FormSection[];
  /** Lo que ya tiene: los valores de un elemento que se edita. */
  initialValues?: FormValues;
  /** Dónde guardar el borrador local; `null`, sin borrador (editar un
   *  elemento: lo guardado ya está en el servidor). */
  draftScope: DraftScope | null;
  author: { id: string; name: string };
  submitLabel: string;
  save: (values: SubmittedValues) => Promise<Result>;
  onSaved: (result: Result) => void;
}

/**
 * Una hoja para diligenciar, entera: cabecera, franja del borrador,
 * formulario y barra de envío. La usan las tres pantallas de captura
 * —diligenciar un formato, crear un elemento de un listado y editarlo—, que
 * sólo difieren en qué guardan y a dónde van después.
 */
export function FormCapture<Result>({
  formId,
  name,
  code,
  description,
  versionNumber,
  eyebrow,
  sections,
  initialValues,
  draftScope,
  author,
  submitLabel,
  save,
  onSaved,
}: FormCaptureProps<Result>) {
  const [values, setValues] = useState<FormValues>(initialValues ?? {});
  // «Empezar de cero» monta el formulario de nuevo: una firma a medio trazar
  // guarda sus trazos dentro de su control, no en los valores.
  const [generation, setGeneration] = useState(0);
  const { mutate: generateUploadUrl } = useGenerateFormUploadUrl();

  // La fecha y el autor de la respuesta, para las reglas que los miran. La
  // fecha es la de hoy en Colombia, la misma que pondrá el servidor.
  const context = useMemo(
    () =>
      formContext({ date: todayInColombia(Date.now()), authorId: author.id }),
    [author.id],
  );
  const fieldContext = useMemo(
    () => ({ formId, authorName: author.name }),
    [formId, author.name],
  );

  const draft = useLocalDraft({
    scope: draftScope,
    sections,
    values,
    onRestore: setValues,
  });

  const submission = useFormSubmission({
    sections,
    values,
    formContext: context,
    generateUploadUrl: useCallback(
      () => generateUploadUrl({ formId }, { throwError: true }),
      [generateUploadUrl, formId],
    ),
    save,
    onSaved: (result) => {
      draft.clear();
      onSaved(result);
    },
  });

  return (
    <>
      <FillHeader
        name={name}
        code={code}
        versionNumber={versionNumber}
        description={description}
        eyebrow={eyebrow}
      />
      {draft.recovered ? (
        <DraftBanner
          draft={draft.recovered}
          disabled={submission.isSubmitting}
          onDiscard={() => {
            draft.discard();
            setValues({});
            setGeneration((current) => current + 1);
          }}
        />
      ) : null}
      <FormForm
        key={generation}
        sections={sections}
        values={values}
        onChange={setValues}
        fieldContext={fieldContext}
        formContext={context}
        disabled={submission.isSubmitting}
        showMissing={submission.showMissing}
        problems={submission.problems}
        focus={submission.focus}
      />
      <SubmitBar
        summary={submission.summary}
        showMissing={submission.showMissing}
        isSubmitting={submission.isSubmitting}
        label={submitLabel}
        onSubmit={submission.submit}
      />
    </>
  );
}
