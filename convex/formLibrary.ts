/** Instala la biblioteca de formatos SST en un proyecto.
 *
 *  Es **interna**: no la llama la aplicación, la ejecuta quien administra el
 *  deployment (`bunx convex run formLibrary:installSst '{"projectId":"…"}'`).
 *  Instalar quince formatos de golpe en el proyecto de otro no es un acto de
 *  usuario, y una función pública tendría que decidir quién puede.
 *
 *  Es idempotente: un formato que ya está —por su clave de biblioteca, que se
 *  guarda en el código o en el nombre— no se vuelve a crear.
 */

import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { internalMutation, type MutationCtx } from "./_generated/server";
import { entryTitle } from "./lib/entry_title";
import { todayInColombia } from "./lib/dates";
import { insertForm } from "./lib/form_details";
import { flattenFields } from "./lib/form_evaluation";
import {
  deriveReferencedForms,
  isSameValue,
  loadPublished,
  projectForms,
} from "./lib/form_store";
import type { FormSection, FormValues } from "./lib/form_types";
import { validateForm } from "./lib/form_validation";
import { brandValues, resolveValues, writeLinks } from "./lib/form_values";
import { toStoredValues } from "./lib/stored_values";
import { isSameName } from "./lib/text";
import { writeSystemLog } from "./logs";
import { dashboardOf } from "./dashboards";
import { resultsOf } from "./formResults";
import { SST_LIBRARY } from "./sst_library";
import { SST_DASHBOARD, SST_RESULTS } from "./sst_library/results";
import {
  LIBRARY_REFERENCE_PREFIX,
  type LibraryEntry,
  type LibraryForm,
} from "./sst_library/types";

/** Lo instalado de cada clave de la biblioteca: el formato y, si es un
 *  listado con ejemplos, sus elementos por título. */
interface Installed {
  formId: Id<"forms">;
  entries: Map<string, Id<"formResponses">>;
}

/** La misma definición, con cada `@clave` cambiada por el id del listado ya
 *  instalado en este proyecto. */
function resolveSections(
  library: LibraryForm,
  installed: Map<string, Installed>,
): FormSection[] {
  const resolve = (formId: string) => {
    if (!formId.startsWith(LIBRARY_REFERENCE_PREFIX)) return formId;
    const target = installed.get(formId.slice(LIBRARY_REFERENCE_PREFIX.length));
    if (!target) {
      throw new ConvexError(
        `«${library.name}» relaciona el listado ${formId}, que no está instalado`,
      );
    }
    return target.formId;
  };

  return library.sections.map((section) => ({
    ...section,
    fields: section.fields.map((field) => ({
      ...field,
      config: {
        ...field.config,
        ...(field.config.reference
          ? {
              reference: {
                ...field.config.reference,
                formId: resolve(field.config.reference.formId),
              },
            }
          : {}),
        ...(field.config.table
          ? {
              table: {
                ...field.config.table,
                columns: field.config.table.columns.map((column) =>
                  column.reference
                    ? {
                        ...column,
                        reference: {
                          ...column.reference,
                          formId: resolve(column.reference.formId),
                        },
                      }
                    : column,
                ),
              },
            }
          : {}),
      },
    })),
  }));
}

async function findOrCreateCategory(
  ctx: MutationCtx,
  projectId: Id<"projects">,
  name: string,
) {
  const categories = await ctx.db
    .query("formCategories")
    .withIndex("projectId", (q) => q.eq("projectId", projectId))
    .collect();
  const existing = categories.find((category) =>
    isSameName(category.name, name),
  );
  return (
    existing?._id ??
    (await ctx.db.insert("formCategories", { projectId, name }))
  );
}

/** El formato del proyecto que ya es este de la biblioteca: el mismo código
 *  o, en lo que no lo lleva, la misma clase y el mismo nombre. */
const findInstalled = (forms: Doc<"forms">[], library: LibraryForm) =>
  forms.find((form) =>
    library.code
      ? form.code === library.code
      : form.kind === library.kind && isSameName(form.name, library.name),
  );

/** Un elemento de ejemplo como valores del formulario: la relación llega con
 *  el título del elemento relacionado y sale con su id. */
function sampleValues(
  sections: readonly FormSection[],
  library: LibraryForm,
  sample: LibraryEntry,
  installed: Map<string, Installed>,
): FormValues {
  const fields = new Map(
    flattenFields(sections).map((field) => [field.id, field]),
  );
  const originals = new Map(
    library.sections.flatMap((section) =>
      section.fields.map((field) => [field.id, field] as const),
    ),
  );

  const values: FormValues = {};
  for (const [fieldId, value] of Object.entries(sample)) {
    if (fields.get(fieldId)?.type !== "reference") {
      values[fieldId] = value;
      continue;
    }
    const key = originals
      .get(fieldId)
      ?.config.reference?.formId.slice(LIBRARY_REFERENCE_PREFIX.length);
    const responseId = key
      ? installed.get(key)?.entries.get(String(value))
      : undefined;
    if (responseId) values[fieldId] = { responseId, label: "", snapshot: [] };
  }
  return values;
}

/** Publica la definición de la biblioteca como versión nueva de un formato ya
 *  instalado, si difiere de la publicada. Devuelve si publicó. */
async function republish(
  ctx: MutationCtx,
  form: Doc<"forms">,
  library: LibraryForm,
  installed: Map<string, Installed>,
): Promise<boolean> {
  if (form.status !== "published" || form.hasDraftChanges) return false;
  const current = await loadPublished(ctx, form);
  const sections = resolveSections(library, installed);
  if (!current || isSameValue(current.sections, sections)) return false;

  const [problem] = validateForm(sections, {
    kind: form.kind,
    titleFieldId: form.titleFieldId,
  });
  if (problem) throw new ConvexError(`«${library.name}»: ${problem.message}`);

  const number = (form.publishedVersionNumber ?? 0) + 1;
  const publishedVersionId = await ctx.db.insert("formVersions", {
    formId: form._id,
    projectId: form.projectId,
    number,
    status: "published",
    sections,
    publishedAt: Date.now(),
    publishedBy: form.createdBy,
  });
  if (form.draftVersionId)
    await ctx.db.patch(form.draftVersionId, { sections });
  await ctx.db.patch(form._id, {
    publishedVersionId,
    publishedVersionNumber: number,
    referencedFormIds: deriveReferencedForms(ctx, sections),
  });
  return true;
}

/**
 * Instala los resultados de la biblioteca en los formatos ya instalados y, si
 * el proyecto todavía no tiene tablero, el de la biblioteca. Un resultado que
 * ya está —mismo formato y mismo nombre— no se vuelve a crear, y un tablero
 * que alguien armó no se pisa.
 */
async function installResults(
  ctx: MutationCtx,
  project: Doc<"projects">,
  installed: Map<string, Installed>,
) {
  const ids = new Map<string, Id<"formResults">>();
  let created = 0;
  // Las cifras compuestas van al final: nombran otros resultados de la
  // biblioteca, que para entonces ya tienen su identificador.
  const ordered = [
    ...SST_RESULTS.filter((library) => library.config.type !== "composite"),
    ...SST_RESULTS.filter((library) => library.config.type === "composite"),
  ];
  for (const library of ordered) {
    const formId = installed.get(library.form)?.formId;
    if (!formId) continue;
    const existing = await resultsOf(ctx, formId);
    const already = existing.find((result) =>
      isSameName(result.name, library.name),
    );
    if (already) {
      ids.set(library.key, already._id);
      continue;
    }
    let config = library.config;
    if (config.type === "composite") {
      const terms = config.terms.map((term) =>
        term.type === "result"
          ? { ...term, resultId: ids.get(term.resultId) ?? "" }
          : term,
      );
      // Sin alguno de sus indicadores no hay cuenta que hacer.
      if (
        terms.some((term) => term.type === "result" && term.resultId === "")
      ) {
        continue;
      }
      config = { ...config, terms };
    }
    ids.set(
      library.key,
      await ctx.db.insert("formResults", {
        projectId: project._id,
        formId,
        name: library.name,
        config,
        createdBy: project.userId,
      }),
    );
    created += 1;
  }

  let dashboard = false;
  if (!(await dashboardOf(ctx, project._id))) {
    await ctx.db.insert("dashboards", {
      projectId: project._id,
      tabs: SST_DASHBOARD.map((tab) => ({
        id: tab.id,
        label: tab.label,
        widgets: tab.widgets.flatMap((widget, index) => {
          const resultId = ids.get(widget.result);
          return resultId
            ? [{ id: `${tab.id}-${index}`, resultId, size: widget.size }]
            : [];
        }),
      })),
    });
    dashboard = true;
  }
  return { created, dashboard };
}

export const installSst = internalMutation({
  args: {
    projectId: v.id("projects"),
    /** Instala además los elementos **ficticios** de los listados. */
    withSamples: v.optional(v.boolean()),
    /** A lo ya instalado cuya definición cambió en la biblioteca le publica
     *  una versión nueva. Las respuestas de la anterior se siguen leyendo con
     *  la anterior (diseño §2). Un formato con cambios sin publicar no se
     *  toca: son de alguien. */
    update: v.optional(v.boolean()),
  },
  returns: v.object({
    created: v.array(v.string()),
    updated: v.array(v.string()),
    skipped: v.array(v.string()),
    entries: v.number(),
    /** Cuántos resultados se crearon, y si se instaló el tablero. */
    results: v.object({ created: v.number(), dashboard: v.boolean() }),
  }),
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) throw new ConvexError("Proyecto no encontrado");

    // Lo que la biblioteca crea queda a nombre de quien es propietario.
    const authorId = project.userId;
    const date = todayInColombia(Date.now());
    const existing = await projectForms(ctx, args.projectId);

    const installed = new Map<string, Installed>();
    const created: string[] = [];
    const updated: string[] = [];
    const skipped: string[] = [];
    let entries = 0;

    for (const library of SST_LIBRARY) {
      const already = findInstalled(existing, library);
      if (already) {
        installed.set(library.key, { formId: already._id, entries: new Map() });
        // La descripción se lee sobre el formulario: si la biblioteca la
        // corrigió, la instalada no puede seguir diciendo lo de antes.
        if (args.update && already.description !== library.description) {
          await ctx.db.patch(already._id, { description: library.description });
        }
        const republished =
          args.update && (await republish(ctx, already, library, installed));
        (republished ? updated : skipped).push(library.name);
        continue;
      }

      const sections = resolveSections(library, installed);
      const [problem] = validateForm(sections, {
        kind: library.kind,
        titleFieldId: library.titleFieldId,
      });
      if (problem) {
        throw new ConvexError(`«${library.name}»: ${problem.message}`);
      }

      const formId = await insertForm(
        ctx,
        {
          projectId: args.projectId,
          kind: library.kind,
          name: library.name,
          code: library.code,
          description: library.description,
          categoryId: await findOrCreateCategory(
            ctx,
            args.projectId,
            library.category,
          ),
          titleFieldId: library.titleFieldId,
          audience: "all",
          audienceRoleIds: [],
          createdBy: authorId,
        },
        sections,
      );

      const versionId = await ctx.db.insert("formVersions", {
        formId,
        projectId: args.projectId,
        number: 1,
        status: "published",
        sections,
        publishedAt: Date.now(),
        publishedBy: authorId,
      });
      await ctx.db.patch(formId, {
        status: "published",
        publishedVersionId: versionId,
        publishedVersionNumber: 1,
        hasDraftChanges: false,
        referencedFormIds: deriveReferencedForms(ctx, sections),
      });

      const record: Installed = { formId, entries: new Map() };
      installed.set(library.key, record);
      created.push(library.name);

      if (!args.withSamples || library.kind !== "catalog") continue;

      const form = await ctx.db.get(formId);
      if (!form) continue;
      for (const sample of library.sampleEntries ?? []) {
        const resolved = await resolveValues(ctx, {
          projectId: args.projectId,
          sections,
          values: brandValues(
            ctx,
            toStoredValues(
              sections,
              sampleValues(sections, library, sample, installed),
            ),
          ),
          date,
          authorId,
          signerName: "",
        });
        const { title, titleSearch } = entryTitle(
          form,
          sections,
          resolved.values,
        );
        const entry = {
          formId,
          projectId: args.projectId,
          versionId,
          date,
          submittedBy: authorId,
          status: "submitted" as const,
          title,
          titleSearch,
          active: true,
          values: resolved.values,
        };
        const entryId = await ctx.db.insert("formResponses", entry);
        await writeLinks(ctx, { ...entry, _id: entryId }, resolved.links);
        record.entries.set(title, entryId);
        entries += 1;
      }
      await ctx.db.patch(formId, { responseCount: record.entries.size });
    }

    const results = await installResults(ctx, project, installed);

    if (updated.length > 0) {
      await writeSystemLog(ctx, {
        description: `Biblioteca de formatos SST actualizada: ${updated.join(", ")}`,
        type: "update",
        projectId: args.projectId,
        affectedEntityType: "project",
        affectedEntityId: args.projectId,
      });
    }

    if (created.length > 0) {
      await writeSystemLog(ctx, {
        description: `Biblioteca de formatos SST instalada: ${created.length} formatos y listados`,
        type: "create",
        projectId: args.projectId,
        affectedEntityType: "project",
        affectedEntityId: args.projectId,
      });
    }

    return { created, updated, skipped, entries, results };
  },
});
