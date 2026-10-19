"use client";

import {
  HarmonyModal,
  HarmonyModalContent,
  HarmonyModalFooter,
  HarmonyModalHeader,
} from "@/components/harmony/harmony-modal";
import { Button } from "@/components/ui/button";
import type { Id } from "@/convex/_generated/dataModel";
import type { FormSection } from "@/convex/lib/form_types";
import { FileUp } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";

import { useListEntryTitles, useListImports } from "../../api";
import { createdText } from "../../lib/import-history";
import { entryChoices } from "../../lib/import-mapping";
import {
  type CatalogEntries,
  type ImportForm,
  type ImportStep,
  useImportWizard,
} from "../../lib/use-import-wizard";
import { ImportColumnsStep } from "../import-columns-step";
import { ImportFileStep } from "../import-file-step";
import { ImportProgress } from "../import-progress";
import { ImportReviewStep } from "../import-review-step";
import { ImportValuesStep } from "../import-values-step";

const STEP_LABEL: Record<ImportStep, string> = {
  file: "Paso 1 de 4 · El archivo",
  columns: "Paso 2 de 4 · A qué campo va cada columna",
  values: "Paso 3 de 4 · A qué opción corresponde cada valor",
  review: "Paso 4 de 4 · Revisión: nada se escribe hasta confirmar",
  running: "Escribiendo las filas",
  done: "Resultado",
};

/**
 * Lee, sin pintar nada, todos los títulos de un listado: son las opciones de
 * una relación en el paso de valores. Trae una página y pide la siguiente
 * hasta acabar.
 */
const CatalogEntriesLoader = ({
  catalogId,
  onChange,
}: {
  catalogId: string;
  onChange: (catalogId: string, entries: CatalogEntries) => void;
}) => {
  const { data, isLoading, isLoadingMore, canLoadMore, loadMore } =
    useListEntryTitles({ formId: catalogId as Id<"forms"> });
  const report = useRef(onChange);
  report.current = onChange;

  // `loadMore` cambia en cada render: lo que manda es que haya más.
  useEffect(() => {
    if (canLoadMore) loadMore();
  }, [canLoadMore, data.length]);

  const complete = !isLoading && !isLoadingMore && !canLoadMore;
  useEffect(() => {
    report.current(catalogId, { choices: entryChoices(data), complete });
  }, [catalogId, data, complete]);

  return null;
};

interface ImportModalProps {
  form: ImportForm;
  /** Las secciones de la versión publicada. */
  sections: readonly FormSection[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Importar registros desde un archivo: respuestas con la fecha en que
 * ocurrieron, o elementos de un listado
 * (`docs/plans/2026-10-10-importacion-de-registros-design.md`).
 *
 * Cuatro pasos —archivo, columnas, valores, revisión— y la escritura por
 * lotes. Es un modal amplio (`03 §3.1`): una tarea finita que se completa y
 * se cierra.
 */
export const ImportModal = ({
  form,
  sections,
  open,
  onOpenChange,
}: ImportModalProps) => {
  const wizard = useImportWizard(form, sections);
  const { step, file, outcome } = wizard;
  const isRunning = step === "running";

  const { data: imports } = useListImports(
    open ? { formId: form._id } : "skip",
  );
  const previous = useMemo(() => {
    if (!file) return null;
    const match = imports?.find(
      (record) =>
        record.fingerprint === file.fingerprint && record.status !== "reverted",
    );
    return match
      ? {
          _creationTime: match._creationTime,
          author: match.author,
          created: match.counts.created,
        }
      : null;
  }, [imports, file]);

  const catalogIds = useMemo(
    () => [
      ...new Set(
        wizard.groupStates
          .map((state) => state.group.catalogId)
          .filter((id): id is string => id !== null),
      ),
    ],
    [wizard.groupStates],
  );

  const handleOpenChange = (next: boolean) => {
    // Cerrar a media escritura dejaría la importación sin terminar.
    if (!next && isRunning) return;
    if (!next) wizard.reset();
    onOpenChange(next);
  };

  const noun = form.kind === "catalog" ? "elementos" : "respuestas";

  return (
    <HarmonyModal
      open={open}
      onOpenChange={handleOpenChange}
      maxWidth="sm:max-w-2xl"
    >
      <HarmonyModalHeader
        icon={FileUp}
        title={`Importar ${noun} en ${form.name}`}
        description={STEP_LABEL[step]}
      />
      <HarmonyModalContent>
        {open
          ? catalogIds.map((catalogId) => (
              <CatalogEntriesLoader
                key={catalogId}
                catalogId={catalogId}
                onChange={wizard.setCatalogEntries}
              />
            ))
          : null}
        {step === "file" ? (
          <ImportFileStep wizard={wizard} previous={previous} />
        ) : step === "columns" ? (
          <ImportColumnsStep wizard={wizard} />
        ) : step === "values" ? (
          <ImportValuesStep wizard={wizard} />
        ) : step === "review" ? (
          <ImportReviewStep wizard={wizard} />
        ) : outcome ? (
          <ImportProgress
            outcome={outcome}
            kind={form.kind}
            isRunning={isRunning}
          />
        ) : null}
      </HarmonyModalContent>
      <HarmonyModalFooter>
        {step === "done" ? (
          <Button onClick={() => handleOpenChange(false)}>Cerrar</Button>
        ) : (
          <>
            <Button
              variant="outline"
              disabled={isRunning}
              onClick={() =>
                step === "file" ? handleOpenChange(false) : wizard.back()
              }
            >
              {step === "file" ? "Cancelar" : "Atrás"}
            </Button>
            {step === "review" || isRunning ? (
              <Button
                disabled={!wizard.canContinue || isRunning}
                onClick={() => void wizard.run()}
              >
                Importar {createdText(wizard.summary.ready, form.kind)}
              </Button>
            ) : (
              <Button disabled={!wizard.canContinue} onClick={wizard.next}>
                Continuar
              </Button>
            )}
          </>
        )}
      </HarmonyModalFooter>
    </HarmonyModal>
  );
};
