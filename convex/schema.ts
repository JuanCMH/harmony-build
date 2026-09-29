import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { customColors } from "./colors";
import { permissionsSchema } from "./permissions";

/** Sobre qué actuó una entrada de auditoría. Cada literal nombra una tabla:
 *  `logs.getLogDetails` lo usa para resolver la entidad relacionada. */
export const affectedEntityTypes = v.union(
  v.literal("project"),
  v.literal("member"),
  v.literal("role"),
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
});

export default schema;
