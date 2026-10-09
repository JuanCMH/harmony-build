import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { customColors } from "./colors";
import {
  formAudience,
  formKind,
  formSections,
  formStatus,
  responseStatus,
  storedFieldValues,
} from "./lib/form_validators";
import { dashboardTabs, resultConfig } from "./lib/result_validators";
import { permissionsSchema } from "./permissions";

/** Sobre qué actuó una entrada de auditoría. Cada literal nombra una tabla:
 *  `logs.getLogDetails` lo usa para resolver la entidad relacionada. */
export const affectedEntityTypes = v.union(
  v.literal("project"),
  v.literal("member"),
  v.literal("role"),
  v.literal("form"),
  v.literal("formResponse"),
);

/** Los tres niveles de identidad dentro de un proyecto (`01 §5.1`). */
export const memberRoles = v.union(
  v.literal("owner"),
  v.literal("admin"),
  v.literal("member"),
);

const schema = defineSchema({
  ...authTables,
  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    mainImage: v.optional(v.id("_storage")),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
  }).index("email", ["email"]),

  projects: defineTable({
    name: v.string(),
    /** El código con el que la empresa nombra la obra. Texto libre. */
    code: v.optional(v.string()),
    /** Quien es propietario hoy. Coincide con la fila `owner` de `members`;
     *  `projects.transfer` mueve las dos cosas a la vez. */
    userId: v.id("users"),
    joinCode: v.string(),
    /** Un proyecto archivado se conserva y se puede leer, pero no se abre por
     *  defecto en el conmutador. */
    active: v.boolean(),
    primaryColor: v.union(...customColors),
    secondaryColor: v.union(...customColors),
    logo: v.optional(v.id("_storage")),
    /** El rol que recibe quien entra con el código de unión (diseño §9). Es
     *  opcional porque el proyecto sobrevive a ese rol: al eliminarlo,
     *  `roles.remove` lo anula y entrar vuelve a dejar un miembro sin rol. */
    defaultRoleId: v.optional(v.id("roles")),
  })
    .index("userId", ["userId"])
    .index("joinCode", ["joinCode"]),

  members: defineTable({
    userId: v.id("users"),
    projectId: v.id("projects"),
    role: memberRoles,
    customRoleId: v.optional(v.id("roles")),
  })
    .index("userId", ["userId"])
    .index("customRoleId", ["customRoleId"])
    .index("projectId", ["projectId"])
    .index("projectId_userId", ["projectId", "userId"]),

  roles: defineTable({
    name: v.string(),
    projectId: v.id("projects"),
    ...permissionsSchema,
  }).index("projectId", ["projectId"]),

  logs: defineTable({
    description: v.string(),
    userName: v.string(),
    userId: v.optional(v.id("users")),
    type: v.union(
      v.literal("create"),
      v.literal("update"),
      v.literal("delete"),
      v.literal("info"),
    ),
    /** Opcional por una sola razón: la entrada que deja constancia de que un
     *  proyecto se eliminó no puede colgar de él, o la purga se la llevaría. */
    projectId: v.optional(v.id("projects")),
    affectedEntityType: v.optional(affectedEntityTypes),
    affectedEntityId: v.optional(v.string()),
  })
    .index("projectId", ["projectId"])
    .index("userId", ["userId"]),

  /* ─────────────────────────── Módulo de formatos ───────────────────────── */

  /** La lista corta con que el proyecto ordena sus formatos: SST, Calidad,
   *  Maquinaria. */
  formCategories: defineTable({
    projectId: v.id("projects"),
    name: v.string(),
  }).index("projectId", ["projectId"]),

  /** Un formato o un listado. **No lleva las secciones**: son de
   *  `formVersions`, y así listar quinientos formatos lee quinientos
   *  documentos pequeños (diseño §8). */
  forms: defineTable({
    projectId: v.id("projects"),
    /** Se elige al crear y no cambia. */
    kind: formKind,
    name: v.string(),
    code: v.optional(v.string()),
    description: v.optional(v.string()),
    /** Opcional: el formato sobrevive a su categoría. */
    categoryId: v.optional(v.id("formCategories")),
    status: formStatus,
    /** Sólo en listados: el campo que titula cada elemento. */
    titleFieldId: v.optional(v.string()),
    audience: formAudience,
    /** Los roles que lo diligencian cuando `audience` es `roles`. */
    audienceRoleIds: v.array(v.id("roles")),
    /** La última versión publicada, que es la única que se diligencia. */
    publishedVersionId: v.optional(v.id("formVersions")),
    /** El borrador. Sólo falta durante la mutation que crea el formato: la
     *  versión necesita el id del formato, y el formato el de la versión. */
    draftVersionId: v.optional(v.id("formVersions")),
    createdBy: v.id("users"),

    /* Derivados (`01 §7.3`). La fuente es la que se nombra en cada uno, y los
     * mantiene la misma mutation que la escribe. */

    /** `formVersions.number` de `publishedVersionId`. */
    publishedVersionNumber: v.optional(v.number()),
    /** Si las secciones del borrador difieren de las publicadas. */
    hasDraftChanges: v.boolean(),
    /** Cuántas respuestas —o elementos— tiene. Fuente: `formResponses`. */
    responseCount: v.number(),
    /** Nombre y código, como se buscan (`searchableText`). */
    nameSearch: v.string(),
    /** Los listados a los que apuntan las relaciones del borrador y de la
     *  versión publicada. Fuente: `formVersions.sections`. Es lo que permite
     *  saber quién usa un listado sin leer las secciones de todo el proyecto. */
    referencedFormIds: v.array(v.id("forms")),
  })
    .index("projectId", ["projectId"])
    .index("projectId_kind", ["projectId", "kind"])
    .index("categoryId", ["categoryId"])
    .searchIndex("search_name", {
      searchField: "nameSearch",
      filterFields: ["projectId", "kind"],
    }),

  /** La definición de un formato. El borrador (`number: 0`) se reescribe; una
   *  versión publicada es **inmutable**: cada respuesta se lee siempre con la
   *  versión con que se contestó (diseño §2). */
  formVersions: defineTable({
    formId: v.id("forms"),
    projectId: v.id("projects"),
    /** 0 para el borrador; 1, 2, 3… para las publicadas. */
    number: v.number(),
    status: v.union(v.literal("draft"), v.literal("published")),
    sections: formSections,
    publishedAt: v.optional(v.number()),
    publishedBy: v.optional(v.id("users")),
  })
    .index("projectId", ["projectId"])
    .index("formId_status", ["formId", "status"])
    .index("formId_number", ["formId", "number"]),

  /** Una respuesta de un formato, o un elemento de un listado. Un documento
   *  con todos sus valores: abrirla es una lectura (diseño §3). */
  formResponses: defineTable({
    formId: v.id("forms"),
    projectId: v.id("projects"),
    /** La versión con que se contestó. En un listado, la vigente cuando se
     *  guardó el elemento por última vez. */
    versionId: v.id("formVersions"),
    /** La fecha de negocio, `YYYY-MM-DD` en Colombia. La pone el servidor. */
    date: v.string(),
    submittedBy: v.id("users"),
    status: responseStatus,
    voidedBy: v.optional(v.id("users")),
    voidedAt: v.optional(v.number()),
    voidReason: v.optional(v.string()),

    /* Sólo en los elementos de un listado. */

    /** El valor de su campo de título. Derivado de `values`. */
    title: v.optional(v.string()),
    /** `title` como se busca (`searchableText`). */
    titleSearch: v.optional(v.string()),
    /** Un elemento inactivo deja de aparecer en los selectores y sigue en el
     *  historial. */
    active: v.optional(v.boolean()),
    updatedAt: v.optional(v.number()),
    updatedBy: v.optional(v.id("users")),

    values: storedFieldValues,
  })
    .index("projectId", ["projectId"])
    // El orden de creación da «lo más reciente primero».
    .index("formId", ["formId"])
    // La fecha de negocio sale del instante de creación, así que ordenar por
    // ella es ordenar por creación: los dos índices sirven con y sin rango.
    .index("formId_submittedBy_date", ["formId", "submittedBy", "date"])
    .index("formId_date", ["formId", "date"])
    // Los elementos de un listado, por título: los activos para el selector,
    // y todos para quien los mantiene.
    .index("formId_active_titleSearch", ["formId", "active", "titleSearch"])
    .index("formId_titleSearch", ["formId", "titleSearch"])
    .searchIndex("search_title", {
      searchField: "titleSearch",
      filterFields: ["formId", "active"],
    }),

  /** Las relaciones de una respuesta, en filas: es lo único que hay que
   *  consultar al revés —«todas las inspecciones de este vehículo»—.
   *
   *  Una fila por **elemento distinto** que la respuesta relaciona: si dos
   *  campos eligen el mismo vehículo, la respuesta sale una vez en su
   *  historial, no dos. */
  formResponseLinks: defineTable({
    projectId: v.id("projects"),
    /** El formato de la respuesta que relaciona. */
    formId: v.id("forms"),
    responseId: v.id("formResponses"),
    /** El primer campo de la respuesta que eligió el elemento. */
    fieldId: v.string(),
    targetFormId: v.id("forms"),
    targetResponseId: v.id("formResponses"),
    /** Copias de la respuesta, para filtrar sin cargarla. No cambian: una
     *  respuesta no cambia de autor ni de fecha. */
    date: v.string(),
    submittedBy: v.id("users"),
  })
    .index("projectId", ["projectId"])
    .index("responseId", ["responseId"])
    .index("targetFormId", ["targetFormId"])
    .index("targetResponseId", ["targetResponseId"])
    .index("targetResponseId_formId_date", [
      "targetResponseId",
      "formId",
      "date",
    ]),

  /* ──────────────────────── Resultados y tablero ────────────────────────── */

  /** Lo que un formato entrega a partir de sus respuestas: un indicador, una
   *  tendencia, un mapa de calor. **No guarda datos**: es la definición de un
   *  cálculo, que se aplica al rango de fechas que se mire
   *  (`docs/plans/2026-10-09-resultados-y-tablero-design.md`). */
  formResults: defineTable({
    projectId: v.id("projects"),
    /** Requerida: un resultado no existe sin su formato (`01 §6.1`). */
    formId: v.id("forms"),
    name: v.string(),
    config: resultConfig,
    createdBy: v.id("users"),
  })
    .index("projectId", ["projectId"])
    .index("formId", ["formId"]),

  /** El tablero del proyecto: uno, con sus pestañas y los resultados que
   *  enseña cada una. */
  dashboards: defineTable({
    projectId: v.id("projects"),
    tabs: dashboardTabs,
  }).index("projectId", ["projectId"]),
});

export default schema;
