import type { permissionsSchema } from "@/convex/permissions";

/** El tipo se deriva del schema —fuente única, `01 §5.3`— y la comprobación de
 *  exhaustividad del final del archivo rompe la compilación si el catálogo de
 *  la interfaz y el del servidor se separan: una llave sin casilla no se puede
 *  activar nunca.
 *
 *  Es `import type`: no emite import en runtime, así que no abre un canal de
 *  datos ni infringe `01 §2.2`. */
export type PermissionValue = keyof typeof permissionsSchema;

export const permissionsGroups = ["Proyecto", "Roles", "Registros"] as const;

export type PermisionGroup = (typeof permissionsGroups)[number];

export const listOfPermissions = [
  // Proyecto
  { name: "Editar proyecto", group: "Proyecto", value: "editProject" },
  { name: "Invitar usuarios", group: "Proyecto", value: "inviteUsers" },
  { name: "Expulsar usuarios", group: "Proyecto", value: "expelUsers" },

  // Roles
  { name: "Crear roles", group: "Roles", value: "createRoles" },
  { name: "Editar roles", group: "Roles", value: "editRoles" },
  { name: "Eliminar roles", group: "Roles", value: "deleteRoles" },
  { name: "Asignar roles", group: "Roles", value: "assignRoles" },

  // Registros
  { name: "Ver registros", group: "Registros", value: "viewLogs" },
] as const satisfies readonly {
  name: string;
  group: PermisionGroup;
  value: PermissionValue;
}[];

export const permissionsKeys = listOfPermissions.map((role) => role.value);

/** Un rol con todas sus llaves apagadas: el punto de partida de un rol nuevo. */
export const emptyPermissions = (): Record<PermissionValue, boolean> => ({
  editProject: false,
  inviteUsers: false,
  expelUsers: false,
  createRoles: false,
  editRoles: false,
  deleteRoles: false,
  assignRoles: false,
  viewLogs: false,
});

/** Si `convex/permissions.ts` gana una llave que esta lista no ofrece, esto
 *  deja de compilar con el nombre de la llave que falta. Es la red que faltaba:
 *  una llave sin casilla no se puede activar, y una llave que no se puede
 *  activar es una promesa vacía (`01 §5.3`). */
type PermissionsMissingFromUI = Exclude<
  PermissionValue,
  (typeof listOfPermissions)[number]["value"]
>;

const _everyPermissionIsOffered: PermissionsMissingFromUI extends never
  ? true
  : ["Faltan llaves en la UI de roles:", PermissionsMissingFromUI] = true;
void _everyPermissionIsOffered;
