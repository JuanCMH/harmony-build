/** Compone el aviso previo a eliminar un proyecto.
 *
 *  La política de `01 §6.1` es cascada **con aviso**: se da la magnitud de lo
 *  que se va —miembros y roles— y se dice sin rodeos que los registros de
 *  auditoría se van con ellos.
 */

type CappedCount = { count: number; capped: boolean };

export type ProjectDeletionImpact = {
  members: CappedCount;
  roles: CappedCount;
};

const formatNumber = (value: number) =>
  new Intl.NumberFormat("es-CO").format(value);

const formatCapped = ({ count, capped }: CappedCount) =>
  capped ? `más de ${formatNumber(count)}` : formatNumber(count);

const pluralize = (count: number, singular: string, plural: string) =>
  count === 1 ? singular : plural;

const LOGS_WARNING = "junto con todos los registros del proyecto";

const IRREVERSIBLE = "Esta acción no se puede deshacer.";

const FALLBACK = `Se eliminará el proyecto con sus miembros y sus roles, ${LOGS_WARNING}. ${IRREVERSIBLE}`;

export function buildProjectDeletionMessage(
  impact?: ProjectDeletionImpact,
): string {
  if (!impact) return FALLBACK;

  const counted = [
    { value: impact.members, singular: "miembro", plural: "miembros" },
    { value: impact.roles, singular: "rol", plural: "roles" },
  ].filter(({ value }) => value.count > 0);

  if (counted.length === 0)
    return `Se eliminará el proyecto con todos sus registros. ${IRREVERSIBLE}`;

  const parts = counted.map(
    ({ value, singular, plural }) =>
      `${formatCapped(value)} ${pluralize(value.count, singular, plural)}`,
  );

  // «Se eliminará 1 miembro», pero «Se eliminarán 1 miembro y 2 roles».
  const isSingular = counted.length === 1 && counted[0].value.count === 1;

  return `${isSingular ? "Se eliminará" : "Se eliminarán"} ${parts.join(" y ")}, ${LOGS_WARNING}. ${IRREVERSIBLE}`;
}
