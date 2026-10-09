/** Respuestas **ficticias** para enseñar un proyecto con datos: resultados,
 *  tablero, historial.
 *
 *  Es **interna** y la ejecuta quien administra el deployment, nunca la
 *  aplicación (`bunx convex run demoData:seedDay '{…}'`). No sabe nada de
 *  ningún formato: genera un valor por tipo de campo a partir de la versión
 *  publicada, así que sirve para cualquier proyecto. Lo que hace que los
 *  datos parezcan de una obra —rangos, textos, frecuencias— llega en `hints`.
 *
 *  Todo pasa por `resolveValues`, igual que una respuesta de verdad. Lo único
 *  que no es igual es la fecha de negocio, que aquí se elige: por eso se
 *  siembra del día más viejo al más nuevo, para que el orden de creación siga
 *  siendo el de las fechas (`convex/schema.ts`, índices de `formResponses`).
 */

import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import {
  type MutationCtx,
  internalAction,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { addDays } from "./lib/date_buckets";
import { flattenFields } from "./lib/form_evaluation";
import { loadPublished } from "./lib/form_store";
import type {
  ChecklistAnswer,
  ChecklistConfig,
  FieldOption,
  FormField,
  FormSection,
  FormValues,
  TableColumn,
  TableConfig,
} from "./lib/form_types";
import { resolveValues, writeLinks } from "./lib/form_values";
import { toStoredValues } from "./lib/stored_values";

/** Cómo debe salir un campo: un rango para números (o días de corrimiento
 *  para fechas) y los textos entre los que se elige. */
const fieldHint = v.object({
  min: v.optional(v.number()),
  max: v.optional(v.number()),
  texts: v.optional(v.array(v.string())),
});
/** `fieldId → pista`. */
const formHints = v.record(v.string(), fieldHint);
type Hints = Record<string, { min?: number; max?: number; texts?: string[] }>;

const plan = v.array(
  v.object({
    formId: v.id("forms"),
    count: v.number(),
    /** La probabilidad de que un ítem de una lista de chequeo no cumpla. */
    failRate: v.optional(v.number()),
    hints: v.optional(formHints),
  }),
);

const MAX_PER_DAY = 40;
const ENTRIES_PER_CATALOG = 200;
const TABLE_ROWS = 2;

const SIGNERS = [
  "Carlos Andrés Rojas",
  "Luz Marina Pérez",
  "Jhon Fredy Castaño",
  "Diana Marcela Ospina",
  "Wilson Arley Gómez",
  "Yuliana Restrepo",
];

/* ─────────────────────────────── El azar ────────────────────────────────── */

/** Un generador con semilla: la misma siembra da los mismos datos. */
function seeded(seed: string): () => number {
  let state = 2166136261;
  for (const char of seed) {
    state = Math.imul(state ^ char.charCodeAt(0), 16777619);
  }
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Un peso estable entre 0,3 y 3 para una cosa: hace que unos ítems y unos
 *  equipos fallen más que otros, que es lo que se ve en una obra. */
const weightOf = (key: string): number => 0.3 + seeded(key)() ** 2 * 2.7;

const pick = <T>(random: () => number, values: readonly T[]): T =>
  values[Math.floor(random() * values.length)];

const between = (random: () => number, min: number, max: number): number =>
  Math.round(min + random() * (max - min));

/* ──────────────────────────── Lo que se genera ──────────────────────────── */

interface Generator {
  random: () => number;
  date: string;
  hints: Hints;
  failRate: number;
  /** Los elementos activos de cada listado, por id de formato. */
  entries: Map<string, Id<"formResponses">[]>;
  /** Entrega un archivo ya subido: una firma o una imagen. */
  file: (kind: "signature" | "image") => string;
}

const rowsOf = (config: TableConfig): number =>
  Math.min(
    Math.max(config.minRows ?? 1, TABLE_ROWS),
    config.maxRows ?? TABLE_ROWS,
  );

function numberFor(g: Generator, field: FormField): number {
  const hint = g.hints[field.id];
  return between(
    g.random,
    hint?.min ?? field.config.minValue ?? 1,
    hint?.max ?? field.config.maxValue ?? 20,
  );
}

function dateFor(g: Generator, fieldId: string): string {
  const hint = g.hints[fieldId];
  return addDays(g.date, between(g.random, hint?.min ?? 0, hint?.max ?? 0));
}

function referenceFor(g: Generator, formId: string | undefined) {
  const entries = g.entries.get(formId ?? "") ?? [];
  if (entries.length === 0) return undefined;
  // Los primeros elementos salen más: una obra usa más unos equipos que otros.
  const index = Math.floor(g.random() ** 1.6 * entries.length);
  return { responseId: entries[index], label: "", snapshot: [] };
}

/** Las opciones primeras son las corrientes: salen más. */
const optionFor = (g: Generator, options: readonly FieldOption[]) =>
  options[Math.floor(g.random() ** 1.8 * options.length)]?.value;

function signatureFor(g: Generator, signer: "author" | "other") {
  const storageId = g.file("signature");
  return signer === "author"
    ? { storageId, name: "firma.png", signerName: "" }
    : {
        storageId,
        name: "firma.png",
        signerName: pick(g.random, SIGNERS),
        signerDocument: String(between(g.random, 10_000_000, 1_150_000_000)),
      };
}

function checklistFor(
  g: Generator,
  config: ChecklistConfig,
  subject: string,
): ChecklistAnswer[] {
  const of = (meaning: string) =>
    config.options.find((option) => option.meaning === meaning)?.value;
  const ok = of("ok") ?? config.options[0].value;
  const fail = of("fail");
  const na = of("na");
  const subjectWeight = weightOf(`subject:${subject}`);

  return config.blocks
    .flatMap((block) => block.items)
    .filter((item) => !item.heading)
    .map((item) => {
      const chance = g.failRate * weightOf(`item:${item.id}`) * subjectWeight;
      const roll = g.random();
      const value = fail && roll < chance ? fail : na && roll > 0.975 ? na : ok;
      return {
        itemId: item.id,
        value,
        ...(value === fail && config.note !== "never"
          ? { note: "Requiere revisión" }
          : {}),
        ...(config.quantity ? { quantity: between(g.random, 1, 6) } : {}),
        ...(config.date
          ? { date: addDays(g.date, between(g.random, 20, 400)) }
          : {}),
      };
    });
}

function cellFor(g: Generator, column: TableColumn): unknown {
  switch (column.type) {
    case "number":
      return between(g.random, 1, 4);
    case "date":
      return g.date;
    case "select":
      return optionFor(g, column.options ?? []);
    case "checkbox":
      return true;
    case "reference":
      return referenceFor(g, column.reference?.formId);
    case "image":
      return column.required
        ? { storageId: g.file("image"), name: "foto.jpg" }
        : undefined;
    case "signature":
      return signatureFor(g, "other");
    default:
      return pick(g.random, g.hints[column.id]?.texts ?? ["Sin novedad"]);
  }
}

function valueFor(g: Generator, field: FormField, subject: string): unknown {
  if (field.config.computed) return undefined;
  const texts = g.hints[field.id]?.texts;
  switch (field.type) {
    case "number":
      return numberFor(g, field);
    case "currency":
      return numberFor(g, field) * (g.hints[field.id] ? 1 : 1000);
    case "date":
      return dateFor(g, field.id);
    case "time":
      return `${String(between(g.random, 6, 9)).padStart(2, "0")}:${pick(g.random, ["00", "15", "30", "45"])}`;
    case "checkbox":
      return g.random() < 0.85;
    case "select":
      return optionFor(g, field.config.options ?? []);
    case "multiSelect": {
      const value = optionFor(g, field.config.options ?? []);
      return value ? [value] : [];
    }
    case "reference":
      return referenceFor(g, field.config.reference?.formId);
    case "checklist":
      return field.config.checklist
        ? checklistFor(g, field.config.checklist, subject)
        : undefined;
    case "signature":
      return signatureFor(g, field.config.signature?.signer ?? "author");
    case "image":
    case "file":
      // Un archivo que nadie exige no se inventa.
      return field.required && field.type === "image"
        ? { storageId: g.file("image"), name: "foto.jpg" }
        : undefined;
    case "table": {
      const table = field.config.table;
      if (!table) return undefined;
      return Array.from({ length: rowsOf(table) }, (_, index) => ({
        rowId: `fila-${index + 1}`,
        cells: table.columns.flatMap((column) => {
          const value = cellFor(g, column);
          return value === undefined ? [] : [{ columnId: column.id, value }];
        }),
      }));
    }
    case "email":
      return "demostracion@ejemplo.com";
    case "phone":
      return "3001234567";
    case "url":
      return "https://ejemplo.com";
    case "textarea":
      if (texts) return pick(g.random, texts);
      return field.required || g.random() < 0.2 ? "Sin novedad" : undefined;
    default:
      return texts ? pick(g.random, texts) : "Registro de demostración";
  }
}

/** Unas respuestas completas para un formato. La primera relación que se
 *  elige es «de quién» es la respuesta: el vehículo, el equipo. */
function generate(g: Generator, sections: readonly FormSection[]): FormValues {
  const values: FormValues = {};
  let subject = "";
  for (const field of flattenFields(sections)) {
    const value = valueFor(g, field, subject);
    if (value === undefined) continue;
    values[field.id] = value;
    if (field.type === "reference" && subject === "") {
      subject = (value as { responseId: string }).responseId;
    }
  }
  return values;
}

/** Cuántos archivos pide una respuesta de este formato: no depende del azar,
 *  así que se sabe antes de sembrar. */
function filesNeeded(sections: readonly FormSection[]) {
  const needed = { signature: 0, image: 0 };
  generate(
    {
      random: () => 0.5,
      date: "2000-01-01",
      hints: {},
      failRate: 0,
      entries: new Map(),
      file: (kind) => {
        needed[kind] += 1;
        return "";
      },
    },
    sections,
  );
  return needed;
}

/* ─────────────────────────────── Funciones ──────────────────────────────── */

/** Los archivos que hay que subir antes de sembrar un día. */
export const filesFor = internalQuery({
  args: { plan },
  handler: async (ctx, args) => {
    const needed = { signature: 0, image: 0 };
    for (const item of args.plan) {
      const form = await ctx.db.get(item.formId);
      const version = form ? await loadPublished(ctx, form) : null;
      if (!version) continue;
      const each = filesNeeded(version.sections);
      needed.signature += each.signature * item.count;
      needed.image += each.image * item.count;
    }
    return needed;
  },
});

async function activeEntries(ctx: MutationCtx, project: Doc<"projects">) {
  const entries = new Map<string, Id<"formResponses">[]>();
  const forms = await ctx.db
    .query("forms")
    .withIndex("projectId", (q) => q.eq("projectId", project._id))
    .take(1000);
  for (const form of forms.filter((form) => form.kind === "catalog")) {
    const rows = await ctx.db
      .query("formResponses")
      .withIndex("formId", (q) => q.eq("formId", form._id))
      .take(ENTRIES_PER_CATALOG);
    entries.set(
      form._id,
      rows.filter((row) => row.active !== false).map((row) => row._id),
    );
  }
  return entries;
}

/** Escribe las respuestas de un día. Los archivos ya están subidos. */
export const writeDay = internalMutation({
  args: {
    projectId: v.id("projects"),
    date: v.string(),
    plan,
    signatures: v.array(v.id("_storage")),
    images: v.array(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) throw new ConvexError("El proyecto no existe");

    const members = await ctx.db
      .query("members")
      .withIndex("projectId", (q) => q.eq("projectId", project._id))
      .take(50);
    const authors = [
      ...new Set([project.userId, ...members.map((m) => m.userId)]),
    ];
    const entries = await activeEntries(ctx, project);
    const pools = { signature: [...args.signatures], image: [...args.images] };

    let written = 0;
    for (const item of args.plan) {
      const form = await ctx.db.get(item.formId);
      if (!form || form.projectId !== project._id || form.kind !== "record") {
        throw new ConvexError("El formato no es de este proyecto");
      }
      const version = await loadPublished(ctx, form);
      if (!version) throw new ConvexError(`«${form.name}» no está publicado`);

      for (let index = 0; index < item.count; index++) {
        const random = seeded(`${form._id}:${args.date}:${index}`);
        const authorId = pick(random, authors);
        const author = await ctx.db.get(authorId);
        const values = generate(
          {
            random,
            date: args.date,
            hints: item.hints ?? {},
            failRate: item.failRate ?? 0.05,
            entries,
            file: (kind) => {
              const id = pools[kind].pop();
              if (!id) throw new ConvexError("Faltan archivos para sembrar");
              return id;
            },
          },
          version.sections,
        );
        const resolved = await resolveValues(ctx, {
          projectId: project._id,
          sections: version.sections,
          values: toStoredValues(version.sections, values) as never,
          date: args.date,
          authorId,
          signerName: author?.name?.trim() || "Usuario desconocido",
        });
        const response = {
          formId: form._id,
          projectId: project._id,
          versionId: version._id,
          date: args.date,
          submittedBy: authorId,
          status: "submitted" as const,
          values: resolved.values,
        };
        const responseId = await ctx.db.insert("formResponses", response);
        await writeLinks(ctx, { ...response, _id: responseId }, resolved.links);
        written += 1;
      }
      await ctx.db.patch(form._id, {
        responseCount: form.responseCount + item.count,
      });
    }
    return written;
  },
});

const blobOf = (base64: string, type: string): Blob => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type });
};

/**
 * Siembra un día: sube las firmas y las fotos que hacen falta y escribe las
 * respuestas. `signature` es un PNG y `image` un JPEG, en base64.
 */
export const seedDay = internalAction({
  args: {
    projectId: v.id("projects"),
    date: v.string(),
    plan,
    signature: v.string(),
    image: v.string(),
  },
  handler: async (ctx, args): Promise<number> => {
    const total = args.plan.reduce((sum, item) => sum + item.count, 0);
    if (total > MAX_PER_DAY) {
      throw new ConvexError(`Máximo ${MAX_PER_DAY} respuestas por día`);
    }
    const needed = await ctx.runQuery(internal.demoData.filesFor, {
      plan: args.plan,
    });
    const store = (count: number, base64: string, type: string) =>
      Promise.all(
        Array.from({ length: count }, () =>
          ctx.storage.store(blobOf(base64, type)),
        ),
      );
    const [signatures, images] = await Promise.all([
      store(needed.signature, args.signature, "image/png"),
      store(needed.image, args.image, "image/jpeg"),
    ]);
    return await ctx.runMutation(internal.demoData.writeDay, {
      projectId: args.projectId,
      date: args.date,
      plan: args.plan,
      signatures,
      images,
    });
  },
});
