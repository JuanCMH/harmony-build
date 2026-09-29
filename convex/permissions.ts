import { v } from "convex/values";

/** Las llaves de un rol personalizado. Todas obligatorias: el proyecto nace
 *  sin documentos previos, así que no hay rol que pueda carecer de una.
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
};
