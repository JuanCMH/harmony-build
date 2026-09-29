/** La forma de un formato de la biblioteca SST: lo que hace falta para
 *  instalarlo en un proyecto.
 *
 *  La biblioteca son **datos**, no código: cada formato es un objeto que
 *  `validateForm` tiene que aceptar, y una prueba lo comprueba uno por uno.
 */

import type { FormKind, FormSection } from "../lib/form_types";

/** El prefijo con el que un campo de relación nombra su listado dentro de la
 *  biblioteca: `reference.formId: "@vehiculos"`. Al instalar, se sustituye por
 *  el id del listado ya creado en el proyecto. */
export const LIBRARY_REFERENCE_PREFIX = "@";

/** Un elemento de ejemplo de un listado: `fieldId → valor`. Sólo escalares. */
export type LibraryEntry = Record<string, string | number | boolean>;

export interface LibraryForm {
  /** Estable y único en la biblioteca: `vehiculos`, `sst-f-010`. */
  key: string;
  kind: FormKind;
  name: string;
  /** El código del documento en el sistema de gestión: `SST-F-010`. */
  code?: string;
  /** El nombre de la categoría; se crea en el proyecto si no existe. */
  category: string;
  description?: string;
  /** Sólo en listados: el campo que titula cada elemento. */
  titleFieldId?: string;
  sections: FormSection[];
  /** Sólo en listados, y sólo se instalan si se piden: elementos **ficticios**
   *  para poder probar los formatos que los relacionan. */
  sampleEntries?: LibraryEntry[];
}
