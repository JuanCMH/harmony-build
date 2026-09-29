/**
 * El proyecto que se abre cuando no se ha elegido ninguno: el primero activo
 * y, si todos están archivados, el primero.
 *
 * Un proyecto archivado se conserva y se puede leer, pero no es donde se
 * aterriza por defecto.
 */
export const pickDefaultProject = <T extends { active: boolean }>(
  projects: readonly T[],
): T | undefined => projects.find((project) => project.active) ?? projects[0];
