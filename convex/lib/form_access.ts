/** Quién ve y quién hace qué en el módulo de formatos.
 *
 *  Es la tabla «Qué ve cada quien» del diseño, escrita una sola vez:
 *
 *  |                     | Sin rol | `fillForms`          | + `viewResponses` | Admin o propietario |
 *  |---------------------|---------|----------------------|-------------------|---------------------|
 *  | Lista de formatos   | No      | Su audiencia, publicados | Publicados y archivados | Todos, también borradores |
 *  | Diligenciar         | No      | Los de su audiencia  | Ídem              | Todos               |
 *  | Respuestas          | No      | **Sólo las suyas**   | Todas             | Todas               |
 *  | Elementos de un listado | No  | Los activos, para elegirlos | Todos      | Todos               |
 *  | Constructor         | No      | No                   | No                | Sí (o con `editForms`) |
 *
 *  La pertenencia y las llaves se leen **una vez** (`loadViewer`) y las
 *  preguntas son funciones sobre lo leído: una lista de doscientos formatos
 *  decide qué enseña de cada fila sin volver a la base.
 *
 *  Nadie pregunta aquí por el rol a mano: propietario y administrador lo
 *  pueden todo porque `ProjectAccess.can` ya lo dice (`01 §5.1`).
 */

import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import {
  type PermissionKey,
  type ProjectAccess,
  loadProjectAccess,
} from "../roles";

/** Quien pregunta, con lo que puede en el proyecto. */
export interface FormViewer {
  userId: Id<"users">;
  access: ProjectAccess;
}

type Form = Doc<"forms">;
type Response = Doc<"formResponses">;

/** Quien pregunta, o `null` si no pertenece al proyecto. */
export async function loadViewer(
  ctx: QueryCtx,
  userId: Id<"users">,
  projectId: Id<"projects">,
): Promise<FormViewer | null> {
  const access = await loadProjectAccess(ctx, userId, projectId);
  return access ? { userId, access } : null;
}

/* ─────────────────────────────── Preguntas ──────────────────────────────── */

/** Quien construye formatos los ve todos, también los borradores: crear,
 *  editar o archivar exige poder abrir lo que se crea, edita o archiva. */
const managesForms = ({ access }: FormViewer): boolean =>
  access.can("createForms") ||
  access.can("editForms") ||
  access.can("deleteForms");

/** Un formato se diligencia si es un formato —no un listado—, está publicado
 *  y no está archivado. */
export const isFillable = (form: Form): boolean =>
  form.kind === "record" &&
  form.status === "published" &&
  form.publishedVersionId !== undefined;

/**
 * Si quien pregunta es de los que diligencian este formato: tiene la llave y
 * está en su audiencia. Propietario y administrador diligencian todos.
 *
 * No mira el estado del formato: eso es `isFillable`. Van aparte para que
 * quien no puede reciba «no tienes permiso», y quien sí puede, «el formato
 * está archivado».
 */
export function mayFill({ access }: FormViewer, form: Form): boolean {
  if (access.isElevated) return true;
  if (!access.can("fillForms")) return false;
  if (form.audience === "all") return true;
  const roleId = access.member.customRoleId;
  return roleId !== undefined && form.audienceRoleIds.includes(roleId);
}

export const canFillForm = (viewer: FormViewer, form: Form): boolean =>
  isFillable(form) && mayFill(viewer, form);

/** Un seguimiento admite asuntos nuevos si está publicado y sin archivar. */
export const isTrackable = (form: Form): boolean =>
  form.kind === "tracking" &&
  form.status === "published" &&
  form.publishedVersionId !== undefined;

/** Si puede abrir un asunto, o completar la etapa que toca: tiene la llave de
 *  diligenciar y está en la audiencia del seguimiento. */
export const canOpenTracking = (viewer: FormViewer, form: Form): boolean =>
  isTrackable(form) && mayFill(viewer, form);

/** Si ve **todas** las respuestas del formato, o todos los elementos del
 *  listado. La audiencia no cuenta: restringe a quien diligencia, no a quien
 *  consulta. */
export const canViewAll = ({ access }: FormViewer, form: Form): boolean =>
  access.can("viewResponses") ||
  (form.kind === "catalog" && access.can("editCatalogs"));

/** Si el formato le sale en la lista y lo puede abrir. */
export function canSeeForm(viewer: FormViewer, form: Form): boolean {
  if (managesForms(viewer)) return true;
  // Un borrador que nunca se publicó sólo existe para quien lo construye.
  if (form.status === "draft") return false;
  if (canViewAll(viewer, form)) return true;
  return canFillForm(viewer, form) || canOpenTracking(viewer, form);
}

/** Si puede abrir esta respuesta: todas con la llave, o la suya. Quien perdió
 *  la llave de diligenciar deja de ver también lo que diligenció. */
export function canViewResponse(
  viewer: FormViewer,
  form: Form,
  response: Response,
): boolean {
  if (canViewAll(viewer, form)) return true;
  return (
    form.kind !== "catalog" &&
    response.submittedBy === viewer.userId &&
    viewer.access.can("fillForms")
  );
}

/** Si mantiene los elementos de este listado. */
export const canEditEntries = ({ access }: FormViewer, form: Form): boolean =>
  form.kind === "catalog" && access.can("editCatalogs");

/** Lo que quien pregunta puede hacer con un formato: lo que la interfaz
 *  necesita para decidir qué acciones enseña. Es sólo UX; cada mutation
 *  vuelve a comprobarlo. */
export const formPermissions = (viewer: FormViewer, form: Form) => ({
  canFill: canFillForm(viewer, form),
  canEdit: viewer.access.can("editForms"),
  canDelete: viewer.access.can("deleteForms"),
  canViewAll: canViewAll(viewer, form),
  canVoid: form.kind !== "catalog" && viewer.access.can("voidResponses"),
  /** Si puede abrir un asunto de este seguimiento ahora. */
  canOpen: canOpenTracking(viewer, form),
  canEditEntries: canEditEntries(viewer, form),
});

/* ───────────────── El principio de un handler (`01 §4.3`) ────────────────── */

/** Los mensajes que comparten los catálogos del módulo. */
interface AccessErrors {
  userNotAuthenticated: string;
  insufficientPermissions: string;
  formNotFound: string;
}

/** 1 · Identidad. */
export async function requireUser(
  ctx: QueryCtx,
  errors: AccessErrors,
): Promise<Id<"users">> {
  const userId = await getAuthUserId(ctx);
  if (userId === null) throw new ConvexError(errors.userNotAuthenticated);
  return userId;
}

/** Quien llama, como miembro del proyecto. Quien no pertenece recibe lo mismo
 *  que quien no tiene la llave: no se le dice que el proyecto existe. */
export async function requireViewer(
  ctx: QueryCtx,
  projectId: Id<"projects">,
  errors: AccessErrors,
): Promise<FormViewer> {
  const userId = await requireUser(ctx, errors);
  const viewer = await loadViewer(ctx, userId, projectId);
  if (!viewer) throw new ConvexError(errors.insufficientPermissions);
  return viewer;
}

/**
 * Los tres primeros pasos de un handler sobre un formato: identidad,
 * existencia y permiso, **con el proyecto derivado del formato** y nunca de
 * un argumento.
 *
 * Con varias llaves basta una: es lo que pide una lectura que sirve a dos
 * oficios (`listCatalogs` a quien crea y a quien edita).
 */
export async function requireForm(
  ctx: QueryCtx,
  formId: Id<"forms">,
  permissions: PermissionKey | readonly PermissionKey[],
  errors: AccessErrors,
): Promise<{ viewer: FormViewer; form: Form }> {
  const userId = await requireUser(ctx, errors);

  const form = await ctx.db.get(formId);
  if (!form) throw new ConvexError(errors.formNotFound);

  const viewer = await loadViewer(ctx, userId, form.projectId);
  const keys = typeof permissions === "string" ? [permissions] : permissions;
  if (!viewer || !keys.some((key) => viewer.access.can(key))) {
    throw new ConvexError(errors.insufficientPermissions);
  }
  return { viewer, form };
}

/** Lo mismo para una lectura que sostiene una página: `null` en vez de
 *  lanzar, porque que el formato no exista o no sea de quien pregunta es un
 *  estado por el que se pasa al navegar (`01 §4.2`). */
export async function findVisibleForm(
  ctx: QueryCtx,
  formId: Id<"forms">,
): Promise<{ viewer: FormViewer; form: Form } | null> {
  const userId = await getAuthUserId(ctx);
  if (userId === null) return null;

  const form = await ctx.db.get(formId);
  if (!form) return null;

  const viewer = await loadViewer(ctx, userId, form.projectId);
  if (!viewer || !canSeeForm(viewer, form)) return null;
  return { viewer, form };
}
