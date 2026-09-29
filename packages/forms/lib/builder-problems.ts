import {
  createIdRegistry,
  validateTypeConfig,
} from "@/convex/lib/field_config_validation";
import { formProblems, formsErrors } from "@/convex/lib/error_messages";
import { flattenFields } from "@/convex/lib/form_evaluation";
import type { FormField, FormKind, FormSection } from "@/convex/lib/form_types";
import { validateForm } from "@/convex/lib/form_validation";

import { type LocatedProblem, locateProblems } from "./builder-sections";

/**
 * Lo que el constructor enseña que está mal, separado por lo que impide.
 *
 * `save` es lo que `validateForm` rechaza: con uno solo, el borrador no se
 * guarda. `publish` es lo que sólo comprueba `formVersions.publish` —un
 * formato sin campos, un listado sin título—: el borrador se puede guardar a
 * medias, pero no publicar. Enseñarlo antes de pulsar evita que «Publicar»
 * sea la forma de enterarse.
 */
export interface BuilderProblems {
  save: LocatedProblem[];
  publish: string[];
}

export const builderProblems = (
  sections: readonly FormSection[],
  options: { kind: FormKind; titleFieldId?: string },
): BuilderProblems => {
  const save = locateProblems(validateForm(sections, options), sections);
  const publish: string[] = [];
  if (flattenFields(sections).length === 0) publish.push(formsErrors.emptyForm);
  if (options.kind === "catalog" && !options.titleFieldId) {
    publish.push(formsErrors.titleFieldRequired);
  }
  return { save, publish };
};

/**
 * Los problemas de la configuración propia de un campo —su lista de chequeo,
 * su tabla, su relación—, sin repetir, para enseñarlos dentro de su editor.
 *
 * Se mira el campo solo: que un id de ítem choque con el de otra lista del
 * formato lo dice la cabecera, y es un caso que el editor no puede producir
 * porque genera ids nuevos.
 */
export const typeConfigProblems = (
  field: FormField,
  kind: FormKind,
): string[] => [
  ...new Set(
    validateTypeConfig(field, kind, createIdRegistry()).map(
      (code) => formProblems[code],
    ),
  ),
];

/** «1 problema», «3 problemas». */
export const countProblems = (count: number): string =>
  `${count} ${count === 1 ? "problema" : "problemas"}`;
