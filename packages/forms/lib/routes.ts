/** Las direcciones del módulo de formatos, todas bajo
 *  `/projects/[projectId]/formats`. Un enlace escrito a mano en cada pantalla
 *  acaba apuntando a una ruta que ya cambió. */
export const formRoutes = {
  list: (projectId: string, kind: "record" | "catalog" = "record") =>
    `/projects/${projectId}/formats${kind === "catalog" ? "?clase=listados" : ""}`,
  responses: (projectId: string, formId: string) =>
    `/projects/${projectId}/formats/${formId}`,
  edit: (projectId: string, formId: string) =>
    `/projects/${projectId}/formats/${formId}/edit`,
  fill: (projectId: string, formId: string) =>
    `/projects/${projectId}/formats/${formId}/fill`,
  newEntry: (projectId: string, formId: string) =>
    `/projects/${projectId}/formats/${formId}/entries/new`,
  response: (projectId: string, formId: string, responseId: string) =>
    `/projects/${projectId}/formats/${formId}/responses/${responseId}`,
  editEntry: (projectId: string, formId: string, responseId: string) =>
    `/projects/${projectId}/formats/${formId}/responses/${responseId}/edit`,
};
