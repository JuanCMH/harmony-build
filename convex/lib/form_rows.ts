/** Una respuesta como fila de un listado: quién, cuándo, con qué versión y
 *  sus columnas ya como texto.
 *
 *  Lo comparten el listado de respuestas de un formato, el de elementos de un
 *  listado y el historial de un elemento: la fila tiene que decir lo mismo en
 *  los tres.
 */

import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { fieldText } from "./field_text";
import { flattenFields } from "./form_evaluation";
import { loadPublished } from "./form_store";
import type { FormField } from "./form_types";
import { fromStoredValues } from "./stored_values";

interface ReadVersion {
  number: number;
  fields: Map<string, FormField>;
}

const readVersion = (version: Doc<"formVersions">): ReadVersion => ({
  number: version.number,
  fields: new Map(
    flattenFields(version.sections).map((field) => [field.id, field]),
  ),
});

/** Los nombres de las personas que aparecen en una página, leídos una vez
 *  cada uno. */
export function nameReader(ctx: QueryCtx) {
  const names = new Map<Id<"users">, string>();
  return async (userId: Id<"users">): Promise<string> => {
    const known = names.get(userId);
    if (known !== undefined) return known;
    const user = await ctx.db.get(userId);
    const name = user?.name ?? "Usuario desconocido";
    names.set(userId, name);
    return name;
  };
}

/**
 * Prepara la lectura de las filas de un formato y devuelve la función que
 * convierte cada respuesta.
 *
 * Las columnas son los campos `showInTable` de la **última versión
 * publicada**; una respuesta de otra versión rellena lo que tenga, y cada
 * valor se lee con la definición de su propia versión —la etiqueta de una
 * opción es la que tenía cuando se respondió— (diseño §2).
 */
export async function rowReader(ctx: QueryCtx, form: Doc<"forms">) {
  const published = await loadPublished(ctx, form);
  const columns = flattenFields(published?.sections ?? []).filter(
    (field) => field.showInTable,
  );

  const versions = new Map<Id<"formVersions">, ReadVersion>();
  if (published) versions.set(published._id, readVersion(published));
  const versionOf = async (id: Id<"formVersions">) => {
    const known = versions.get(id);
    if (known) return known;
    const version = await ctx.db.get(id);
    const read = version
      ? readVersion(version)
      : { number: 0, fields: new Map() };
    versions.set(id, read);
    return read;
  };

  const nameOf = nameReader(ctx);

  return async (response: Doc<"formResponses">) => {
    const version = await versionOf(response.versionId);
    const values = fromStoredValues(response.values);

    return {
      _id: response._id,
      _creationTime: response._creationTime,
      formId: response.formId,
      date: response.date,
      status: response.status,
      author: {
        _id: response.submittedBy,
        name: await nameOf(response.submittedBy),
      },
      voided:
        response.status === "voided"
          ? {
              by: response.voidedBy ? await nameOf(response.voidedBy) : null,
              at: response.voidedAt ?? null,
              reason: response.voidReason ?? "",
            }
          : null,
      /** Si la trajo una importación en vez de diligenciarse aquí. */
      imported: response.importId !== undefined,
      versionId: response.versionId,
      versionNumber: version.number,
      // Sólo en los elementos de un listado.
      title: response.title ?? null,
      active: response.active ?? null,
      updatedAt: response.updatedAt ?? null,
      columns: columns.map((column) => ({
        fieldId: column.id,
        text: fieldText(
          version.fields.get(column.id) ?? column,
          values[column.id],
        ),
      })),
    };
  };
}
