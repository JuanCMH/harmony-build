import type { FormKind, FormStatus } from "@/convex/lib/form_types";

/**
 * Qué se puede hacer con un formato desde la lista, según quién mira.
 *
 * Puro: la lista pinta lo que sale de aquí y no pregunta por ninguna llave
 * por su cuenta. El servidor vuelve a comprobarlo todo al escribir; esto sólo
 * decide qué se **ofrece**, para no enseñar una acción que va a fallar.
 */

/** Lo que la lista sabe de cada formato (`forms.get`). */
export interface FormRowState {
  kind: FormKind;
  status: FormStatus;
  publishedVersionNumber: number | null;
  responseCount: number;
  canFill: boolean;
  canEdit: boolean;
}

/** Las llaves de quien mira que no vienen ya resueltas en la fila. */
export interface FormViewerKeys {
  createForms: boolean;
  deleteForms: boolean;
  fillForms: boolean;
  viewResponses: boolean;
  editCatalogs: boolean;
}

export const FORM_ROW_ACTIONS = [
  "fill",
  "addEntry",
  "responses",
  "edit",
  "duplicate",
  "archive",
  "unarchive",
  "remove",
] as const;

export type FormRowActionKey = (typeof FORM_ROW_ACTIONS)[number];

export interface FormRowAction {
  key: FormRowActionKey;
  /** Por qué se enseña apagada. Una acción que el servidor va a rechazar
   *  siempre se dice antes, no después de confirmar. */
  blockedReason?: string;
}

const isPublished = (row: FormRowState) => row.status === "published";

/** Si alguna vez se publicó: sólo entonces puede tener respuestas. */
const wasPublished = (row: FormRowState) => row.publishedVersionNumber !== null;

/**
 * Si quien mira puede abrir las respuestas del formato, o los elementos del
 * listado. Quien sólo diligencia ve las suyas, así que también entra; los
 * elementos de un listado piden `viewResponses` o `editCatalogs`.
 */
export const canOpenResponses = (
  row: FormRowState,
  keys: FormViewerKeys,
): boolean => {
  if (!wasPublished(row)) return false;
  return row.kind === "record"
    ? keys.viewResponses || keys.fillForms
    : keys.viewResponses || keys.editCatalogs;
};

const canFillNow = (row: FormRowState) =>
  row.kind === "record" && isPublished(row) && row.canFill;

const canEditNow = (row: FormRowState) =>
  row.canEdit && row.status !== "archived";

export const REMOVE_BLOCKED_REASON =
  "Tiene respuestas: se archiva, no se elimina";

export const REMOVE_BLOCKED_REASON_CATALOG =
  "Tiene elementos: se archiva, no se elimina";

/** Las acciones del menú de una fila, en el orden en que se leen. */
export const formRowActions = (
  row: FormRowState,
  keys: FormViewerKeys,
): FormRowAction[] => {
  const actions: FormRowAction[] = [];
  const isArchived = row.status === "archived";

  if (canFillNow(row)) actions.push({ key: "fill" });
  if (row.kind === "catalog" && isPublished(row) && keys.editCatalogs) {
    actions.push({ key: "addEntry" });
  }
  if (canOpenResponses(row, keys)) actions.push({ key: "responses" });
  if (canEditNow(row)) actions.push({ key: "edit" });
  if (keys.createForms) actions.push({ key: "duplicate" });

  if (keys.deleteForms) {
    actions.push({ key: isArchived ? "unarchive" : "archive" });
    actions.push(
      row.responseCount > 0
        ? {
            key: "remove",
            blockedReason:
              row.kind === "record"
                ? REMOVE_BLOCKED_REASON
                : REMOVE_BLOCKED_REASON_CATALOG,
          }
        : { key: "remove" },
    );
  }

  return actions;
};

/**
 * A dónde lleva pulsar la fila. Quien diligencia, a diligenciar; quien
 * consulta, a las respuestas; quien sólo construye, al constructor. `null` si
 * la fila no lleva a ningún sitio para quien mira.
 */
export const primaryRowAction = (
  row: FormRowState,
  keys: FormViewerKeys,
): Extract<FormRowActionKey, "fill" | "responses" | "edit"> | null => {
  if (canFillNow(row)) return "fill";
  if (canOpenResponses(row, keys)) return "responses";
  if (canEditNow(row)) return "edit";
  return null;
};

/** Cómo se llama cada acción, según la clase del formato. */
export const formRowActionLabel = (
  key: FormRowActionKey,
  kind: FormKind,
): string => {
  switch (key) {
    case "fill":
      return "Diligenciar";
    case "addEntry":
      return "Añadir elemento";
    case "responses":
      return kind === "record" ? "Ver respuestas" : "Ver elementos";
    case "edit":
      return "Editar";
    case "duplicate":
      return "Duplicar";
    case "archive":
      return "Archivar";
    case "unarchive":
      return "Reactivar";
    case "remove":
      return "Eliminar";
  }
};

/** «19 formatos», «1 listado». */
export const countForms = (count: number, kind: FormKind): string => {
  const [one, many] =
    kind === "record" ? ["formato", "formatos"] : ["listado", "listados"];
  return `${new Intl.NumberFormat("es-CO").format(count)} ${count === 1 ? one : many}`;
};
