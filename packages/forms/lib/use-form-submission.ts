"use client";

import type { FormContext } from "@/convex/lib/form_context";
import { pruneFormValues } from "@/convex/lib/form_evaluation";
import type { FormSection, FormValues } from "@/convex/lib/form_types";
import type { storedFieldValues } from "@/convex/lib/form_validators";
import { toStoredValues } from "@/convex/lib/stored_values";
import { handleConvexErrorCallback } from "@/lib/convex-error-handler";
import type { Infer } from "convex/values";
import { useMemo, useRef, useState } from "react";

import type { FormFocusRequest } from "./field-dom";
import {
  collectProblems,
  problemsSummary,
  type SubmissionProblem,
} from "./submission-problems";
import {
  type GenerateUploadUrl,
  type UploadCache,
  uploadPendingFiles,
} from "./upload-pending-files";

/** Los valores como los recibe una mutación: con los `storageId` tipados. */
export type SubmittedValues = Infer<typeof storedFieldValues>;

interface FormSubmissionOptions<Result> {
  sections: readonly FormSection[] | undefined;
  values: FormValues;
  formContext?: FormContext;
  /** Pide la dirección de subida de un archivo; lanza si no se puede. */
  generateUploadUrl: GenerateUploadUrl;
  /** Guarda los valores ya convertidos; lanza si el servidor los rechaza. */
  save: (values: SubmittedValues) => Promise<Result>;
  /** Tras guardar bien: el aviso y a dónde ir. */
  onSaved: (result: Result) => void;
}

export interface FormSubmission {
  /** Lo que impide enviar ahora, en el orden del formato. Se recalcula con
   *  cada cambio: lo que se va llenando deja de señalarse. */
  problems: SubmissionProblem[];
  /** «Faltan 3 obligatorios», o `null`. */
  summary: string | null;
  /** Si ya se intentó enviar: desde entonces se señala todo lo que falta. */
  showMissing: boolean;
  focus: FormFocusRequest | null;
  isSubmitting: boolean;
  submit: () => Promise<void>;
}

/**
 * Enviar un formato: comprobar, subir lo pendiente, convertir y guardar.
 *
 * 1. Se comprueba **antes** con las reglas del servidor (`collectProblems`:
 *    obligatorios visibles, `validateValues` sobre lo podado y el primer ítem
 *    incompleto de cada lista de chequeo). Si falta algo, no se sube nada: se
 *    señala todo y la vista va al primero.
 * 2. Se suben los archivos y las firmas de lo que se ve —lo oculto no se
 *    guarda, y subirlo gastaría datos del teléfono para nada—.
 * 3. `toStoredValues` convierte, y se guarda.
 *
 * Si algo falla, el formulario se queda como estaba y el error se dice
 * (`03 §6.2`: ningún dato escrito se pierde en silencio). Lo que ya se subió
 * no se vuelve a subir en el reintento.
 */
export function useFormSubmission<Result>({
  sections,
  values,
  formContext,
  generateUploadUrl,
  save,
  onSaved,
}: FormSubmissionOptions<Result>): FormSubmission {
  const [showMissing, setShowMissing] = useState(false);
  const [focus, setFocus] = useState<FormFocusRequest | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const uploads = useRef<UploadCache>(new Map());

  const problems = useMemo(
    () => (sections ? collectProblems(sections, values, formContext) : []),
    [sections, values, formContext],
  );

  const submit = async () => {
    if (!sections || isSubmitting) return;
    if (problems.length > 0) {
      setShowMissing(true);
      setFocus((current) => ({
        problem: problems[0],
        attempt: (current?.attempt ?? 0) + 1,
      }));
      return;
    }

    setIsSubmitting(true);
    try {
      const visible = pruneFormValues(sections, values, formContext);
      const uploaded = await uploadPendingFiles(visible, generateUploadUrl, {
        cache: uploads.current,
      });
      // `toStoredValues` es puro y no conoce los `Id` de Convex: un
      // `storageId` es ahí una cadena. Todos los que lleva salen de una subida
      // recién hecha —o de lo ya guardado, al editar—, así que son ids de
      // verdad; el servidor, además, comprueba cada uno.
      const stored = toStoredValues(sections, uploaded) as SubmittedValues;
      const result = await save(stored);
      uploads.current.clear();
      onSaved(result);
    } catch (error) {
      handleConvexErrorCallback(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    problems,
    summary: problemsSummary(problems),
    showMissing,
    focus,
    isSubmitting,
    submit,
  };
}
