import { api } from "@/convex/_generated/api";
import { useFetch } from "@/hooks/use-fetch";
import { useMutate } from "@/hooks/use-mutate";
import { usePaginatedFetch } from "@/hooks/use-paginated-fetch";

/**
 * El único acceso a Convex del módulo de formatos (`01 §2`).
 *
 * Las lecturas que **lanzan** sin su llave admiten `"skip"`: quien no la tiene
 * no debe pedirlas. Las que sostienen una página devuelven `null`.
 */

/** Cuántas filas trae cada página de un listado. */
export const RESPONSES_PAGE_SIZE = 50;

/* ───────────────────────────── Categorías ──────────────────────────────── */

export const useGetFormCategories = (
  data: typeof api.formCategories.get._args | "skip",
) => useFetch(api.formCategories.get, data);

export const useCreateFormCategory = () => useMutate(api.formCategories.create);

export const useUpdateFormCategory = () => useMutate(api.formCategories.update);

export const useRemoveFormCategory = () => useMutate(api.formCategories.remove);

/* ─────────────────────────────── Formatos ──────────────────────────────── */

export const useGetForms = (data: typeof api.forms.get._args | "skip") =>
  useFetch(api.forms.get, data);

/** Los formatos que quien mira puede diligenciar, el usado hace menos primero. */
export const useListFillableForms = (
  data: typeof api.forms.listFillable._args | "skip",
) => useFetch(api.forms.listFillable, data);

export const useGetForm = (data: typeof api.forms.getById._args | "skip") =>
  useFetch(api.forms.getById, data);

/** Lanza sin `editForms` ni `createForms`. */
export const useListCatalogs = (
  data: typeof api.forms.listCatalogs._args | "skip",
) => useFetch(api.forms.listCatalogs, data);

/** Qué formatos relacionan a este listado. */
export const useGetFormUsage = (
  data: typeof api.forms.getUsage._args | "skip",
) => useFetch(api.forms.getUsage, data);

export const useCreateForm = () => useMutate(api.forms.create);

export const useDuplicateForm = () => useMutate(api.forms.duplicate);

export const useUpdateFormDetails = () => useMutate(api.forms.updateDetails);

export const useSetFormTitleField = () => useMutate(api.forms.setTitleField);

export const useArchiveForm = () => useMutate(api.forms.archive);

export const useUnarchiveForm = () => useMutate(api.forms.unarchive);

export const useRemoveForm = () => useMutate(api.forms.remove);

/* ─────────────────────────────── Versiones ─────────────────────────────── */

/** Lanza sin `editForms`. */
export const useGetFormDraft = (
  data: typeof api.formVersions.getDraft._args | "skip",
) => useFetch(api.formVersions.getDraft, data);

/** La versión que se diligencia. `null` si el formato no se ha publicado. */
export const useGetPublishedForm = (
  data: typeof api.formVersions.getPublished._args | "skip",
) => useFetch(api.formVersions.getPublished, data);

export const useGetFormVersion = (
  data: typeof api.formVersions.getVersion._args | "skip",
) => useFetch(api.formVersions.getVersion, data);

export const useSaveFormDraft = () => useMutate(api.formVersions.saveDraft);

export const usePublishForm = () => useMutate(api.formVersions.publish);

export const useDiscardFormDraft = () =>
  useMutate(api.formVersions.discardDraft);

/* ─────────────────────────────── Archivos ──────────────────────────────── */

export const useGenerateFormUploadUrl = () =>
  useMutate(api.formFiles.generateUploadUrl);

/* ────────────────────────────── Respuestas ─────────────────────────────── */

export const useSubmitResponse = () => useMutate(api.formResponses.submit);

export const useVoidResponse = () => useMutate(api.formResponses.void);

/** Una respuesta o un elemento de listado. `null` sin acceso. */
export const useGetResponse = (
  data: typeof api.formResponses.getById._args | "skip",
) => useFetch(api.formResponses.getById, data);

/** Lanza sin `viewResponses` ni `fillForms`, y en un listado. */
export const useListResponses = (
  data: Omit<typeof api.formResponses.list._args, "paginationOpts"> | "skip",
) => usePaginatedFetch(api.formResponses.list, data, RESPONSES_PAGE_SIZE);

/** «Mis respuestas». Lanza sin `fillForms`. */
export const useListMyResponses = (
  data:
    | Omit<typeof api.formResponses.listMine._args, "paginationOpts">
    | "skip",
) => usePaginatedFetch(api.formResponses.listMine, data, RESPONSES_PAGE_SIZE);

/* ─────────────────────────────── Resultados ────────────────────────────── */

/** Las definiciones de los resultados de un formato. `null` sin acceso. */
/** Los indicadores del proyecto, para armar una cifra compuesta. */
export const useGetProjectIndicators = (
  data: typeof api.formResults.indicators._args | "skip",
) => useFetch(api.formResults.indicators, data);

export const useGetFormResults = (
  data: typeof api.formResults.get._args | "skip",
) => useFetch(api.formResults.get, data);

/**
 * Los resultados de un formato, calculados para un rango de fechas. `null`
 * sin `viewResponses` o con un rango que no es válido.
 *
 * Todos los resultados del formato salen de la misma consulta: varias
 * tarjetas del mismo formato comparten la suscripción y las respuestas se
 * leen una sola vez.
 */
export const useComputeFormResults = (
  data: typeof api.formResults.compute._args | "skip",
) => useFetch(api.formResults.compute, data);

export const useCreateFormResult = () => useMutate(api.formResults.create);

export const useUpdateFormResult = () => useMutate(api.formResults.update);

export const useRemoveFormResult = () => useMutate(api.formResults.remove);

/* ──────────────────────── Elementos de un listado ──────────────────────── */

export const useCreateEntry = () => useMutate(api.formEntries.createEntry);

export const useUpdateEntry = () => useMutate(api.formEntries.updateEntry);

export const useSetEntryActive = () =>
  useMutate(api.formEntries.setEntryActive);

/** Lanza sin `viewResponses` ni `editCatalogs`. */
export const useListEntries = (
  data:
    | Omit<typeof api.formEntries.listEntries._args, "paginationOpts">
    | "skip",
) => usePaginatedFetch(api.formEntries.listEntries, data, RESPONSES_PAGE_SIZE);

/** Hasta treinta elementos activos por título: alimenta el selector de una
 *  relación. */
export const useSearchEntries = (
  data: typeof api.formEntries.searchEntries._args | "skip",
) => useFetch(api.formEntries.searchEntries, data);

/** El título y los datos que el servidor traería de un elemento, para
 *  enseñarlos bajo el selector antes de enviar. */
export const useGetReferencePreview = (
  data: typeof api.formEntries.getReferencePreview._args | "skip",
) => useFetch(api.formEntries.getReferencePreview, data);

/** Las respuestas de otros formatos que eligieron este elemento. */
export const useListEntryHistory = (
  data:
    | Omit<typeof api.formEntries.listEntryHistory._args, "paginationOpts">
    | "skip",
) =>
  usePaginatedFetch(
    api.formEntries.listEntryHistory,
    data,
    RESPONSES_PAGE_SIZE,
  );

/* ───────────────────────────── Importaciones ───────────────────────────── */

/** Cuántos títulos de un listado trae cada página al resolver relaciones. */
export const IMPORT_TITLES_PAGE_SIZE = 200;

export const useStartImport = () => useMutate(api.formImports.start);

export const useWriteImportBatch = () => useMutate(api.formImports.writeBatch);

export const useFinishImport = () => useMutate(api.formImports.finish);

export const useRevertImport = () => useMutate(api.formImports.revert);

/** Las últimas importaciones de un formato. Lanza sin `importResponses` ni
 *  la llave de ver sus respuestas o sus elementos. */
export const useListImports = (
  data: typeof api.formImports.list._args | "skip",
) => useFetch(api.formImports.list, data);

/** Los títulos de los elementos de un listado. Lanza sin `importResponses`. */
export const useListEntryTitles = (
  data:
    | Omit<typeof api.formImports.entryTitles._args, "paginationOpts">
    | "skip",
) =>
  usePaginatedFetch(api.formImports.entryTitles, data, IMPORT_TITLES_PAGE_SIZE);

/* ────────────────────────────── Seguimientos ───────────────────────────── */

export const useConfigureTracking = () =>
  useMutate(api.formTrackings.configure);

export const useOpenTracking = () => useMutate(api.formTrackings.open);

export const useCompleteTrackingStage = () =>
  useMutate(api.formTrackings.completeStage);

/** La bandeja: los asuntos abiertos, o los cerrados, de un proyecto o de uno
 *  de sus seguimientos. Lanza sin `viewResponses` ni `fillForms`. */
export const useListTrackings = (
  data: typeof api.formTrackings.list._args | "skip",
) => useFetch(api.formTrackings.list, data);
