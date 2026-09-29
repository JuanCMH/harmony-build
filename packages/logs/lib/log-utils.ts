import type { Doc } from "@/convex/_generated/dataModel";

type AffectedEntityType = NonNullable<Doc<"logs">["affectedEntityType"]>;
type LogType = Doc<"logs">["type"];

/** El título de la ficha de cada entidad que la auditoría sabe nombrar. Es un
 *  `Record` y no un `switch`: una entidad nueva en `affectedEntityTypes`
 *  (`convex/schema.ts`) deja de compilar aquí hasta que tenga el suyo. */
const ENTITY_TYPE_TITLES: Record<AffectedEntityType, string> = {
  project: "Detalles del proyecto",
  member: "Detalles del miembro",
  role: "Detalles del rol",
  form: "Detalles del formato",
  formResponse: "Detalles de la respuesta",
};

const LOG_TYPE_LABELS: Record<LogType, string> = {
  create: "Crear",
  update: "Actualizar",
  delete: "Eliminar",
  info: "Información",
};

const LOG_TYPE_BADGE_VARIANTS = {
  create: "default",
  update: "secondary",
  delete: "destructive",
  info: "outline",
} as const satisfies Record<LogType, string>;

export const getEntityTypeTitle = (
  entityType: AffectedEntityType | undefined,
) => (entityType ? ENTITY_TYPE_TITLES[entityType] : "Detalles de la entidad");

export const getLogTypeLabel = (type: LogType) => LOG_TYPE_LABELS[type];

export const getLogTypeBadgeVariant = (type: LogType) =>
  LOG_TYPE_BADGE_VARIANTS[type];
