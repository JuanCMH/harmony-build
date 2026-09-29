/** Compone el aviso previo a eliminar un proyecto.
 *
 *  La política de `01 §6.1` es cascada **con aviso**: se da la magnitud de lo
 *  que se va —miembros, roles, formatos y respuestas— y se dice sin rodeos que
 *  los registros de auditoría se van con ellos.
 */

type CappedCount = { count: number; capped: boolean };

export type ProjectDeletionImpact = {
  members: CappedCount;
  roles: CappedCount;
  /** Formatos y listados: las dos clases son formatos (diseño §1). */
  forms: CappedCount;
  /** Respuestas de los formatos y elementos de los listados, sumados. */
  responses: CappedCount;
};

const formatNumber = (value: number) =>
  new Intl.NumberFormat("es-CO").format(value);

const formatCapped = ({ count, capped }: CappedCount) =>
  capped ? `más de ${formatNumber(count)}` : formatNumber(count);

const pluralize = (count: number, singular: string, plural: string) =>
  count === 1 ? singular : plural;

/** «A», «A y B», «A, B y C». */
const joinWithAnd = (parts: string[]) =>
  parts.length <= 1
    ? (parts[0] ?? "")
    : `${parts.slice(0, -1).join(", ")} y ${parts[parts.length - 1]}`;

const LOGS_WARNING = "junto con todos los registros del proyecto";

const IRREVERSIBLE = "Esta acción no se puede deshacer.";

const FALLBACK = `Se eliminará el proyecto con sus miembros, sus roles, sus formatos y sus respuestas, ${LOGS_WARNING}. ${IRREVERSIBLE}`;

export function buildProjectDeletionMessage(
  impact?: ProjectDeletionImpact,
): string {
  if (!impact) return FALLBACK;

  // De quién entra a qué se pierde: las personas primero, y al final lo que
  // más duele, que son las respuestas ya diligenciadas.
  const counted = [
    { value: impact.members, singular: "miembro", plural: "miembros" },
    { value: impact.roles, singular: "rol", plural: "roles" },
    { value: impact.forms, singular: "formato", plural: "formatos" },
    { value: impact.responses, singular: "respuesta", plural: "respuestas" },
  ].filter(({ value }) => value.count > 0);

  if (counted.length === 0)
    return `Se eliminará el proyecto con todos sus registros. ${IRREVERSIBLE}`;

  const parts = counted.map(
    ({ value, singular, plural }) =>
      `${formatCapped(value)} ${pluralize(value.count, singular, plural)}`,
  );

  // «Se eliminará 1 miembro», pero «Se eliminarán 1 miembro y 2 roles».
  const isSingular = counted.length === 1 && counted[0].value.count === 1;

  return `${isSingular ? "Se eliminará" : "Se eliminarán"} ${joinWithAnd(parts)}, ${LOGS_WARNING}. ${IRREVERSIBLE}`;
}
