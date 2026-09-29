import type { PermissionValue } from "@/packages/roles/lib/permissions";

/**
 * Las áreas de ajustes del proyecto, en el orden en que se leen.
 *
 * La lista la consumen dos sitios: el menú de ajustes, para decidir qué
 * entradas enseña, y el armazón de cada área, para decidir si quien llegó por
 * la dirección puede verla. Con la regla escrita en los dos, acabarían
 * diciendo cosas distintas.
 */
export interface SettingsAreaDefinition {
  key: "general" | "users" | "roles" | "categories";
  title: string;
  /** Lo que se añade a la dirección base. Vacío en General, que **es** la base. */
  segment: string;
  /** Basta una de estas llaves para ver el área. Sin lista, la ve todo miembro. */
  permissions?: PermissionValue[];
}

export const SETTINGS_AREAS = [
  { key: "general", title: "General", segment: "" },
  {
    key: "users",
    title: "Usuarios",
    segment: "/usuarios",
    permissions: ["inviteUsers", "expelUsers", "assignRoles"],
  },
  {
    key: "roles",
    title: "Roles",
    segment: "/roles",
    permissions: ["createRoles", "editRoles", "deleteRoles"],
  },
  {
    // Las categorías de formatos las administra quien edita formatos: es la
    // misma llave que exige el servidor para crearlas y renombrarlas.
    key: "categories",
    title: "Categorías",
    segment: "/categorias",
    permissions: ["editForms"],
  },
] as const satisfies readonly SettingsAreaDefinition[];

export type SettingsAreaKey = (typeof SETTINGS_AREAS)[number]["key"];

export const getSettingsArea = (key: SettingsAreaKey): SettingsAreaDefinition =>
  SETTINGS_AREAS.find((area) => area.key === key) ?? SETTINGS_AREAS[0];
