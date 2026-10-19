import { type PermissionValue, permissionsKeys } from "./permissions";

type CaptureViewArgs = {
  role: string;
  customRole?: Partial<Record<PermissionValue, boolean>> | null;
};

/**
 * Si quien mira tiene la vista de captura: la de quien sólo diligencia.
 *
 * No es un tipo de usuario ni un interruptor: sale de las llaves de su rol.
 * Un rol con `fillForms` y ninguna otra llave diligencia y nada más; con
 * cualquier otra —ver las respuestas de todos, mantener un listado, ver la
 * auditoría— ya gestiona algo y tiene la vista completa. Propietario y
 * administrador, siempre la completa.
 *
 * Decide qué se **enseña** (el menú, el inicio, adónde llevan las migas).
 * Lo que cada quien puede leer o hacer lo sigue decidiendo el servidor.
 */
export const isCaptureView = ({ role, customRole }: CaptureViewArgs) =>
  role === "member" &&
  customRole?.fillForms === true &&
  permissionsKeys.every(
    (key) => key === "fillForms" || customRole[key] !== true,
  );
