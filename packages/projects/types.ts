import type { api } from "@/convex/_generated/api";
import type { FunctionReturnType } from "convex/server";

/** Un proyecto tal y como lo entrega el servidor: con la URL de su logo y sin
 *  el código de unión, que se pide aparte (`api.projects.getJoinCode`). */
export type Project = NonNullable<
  FunctionReturnType<typeof api.projects.getById>
>;

/** Una fila de «mis proyectos»: el proyecto y mi rol en él. */
export type ProjectListItem = NonNullable<
  FunctionReturnType<typeof api.projects.get>
>[number];
