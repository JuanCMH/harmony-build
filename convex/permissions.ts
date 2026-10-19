import { v } from "convex/values";

/** Las llaves de un rol personalizado. Todas obligatorias: el proyecto nace
 *  sin documentos previos, así que no hay rol que pueda carecer de una. Las
 *  siete del módulo de formatos y la de importar entraron igual: al
 *  añadirlas, ningún deployment tenía un rol guardado (`01 §5.3`).
 *
 *  Una llave nueva se añade aquí **y** en `packages/roles/lib/permissions.ts`,
 *  que deja de compilar si le falta la casilla (`01 §5.3`). */
export const permissionsSchema = {
  editProject: v.boolean(),
  inviteUsers: v.boolean(),
  expelUsers: v.boolean(),
  createRoles: v.boolean(),
  editRoles: v.boolean(),
  deleteRoles: v.boolean(),
  assignRoles: v.boolean(),
  viewLogs: v.boolean(),
  createForms: v.boolean(),
  editForms: v.boolean(),
  deleteForms: v.boolean(),
  fillForms: v.boolean(),
  viewResponses: v.boolean(),
  voidResponses: v.boolean(),
  editCatalogs: v.boolean(),
  importResponses: v.boolean(),
};
