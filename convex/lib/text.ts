/** Recorta y colapsa espacios internos. Es la forma en la que se guarda todo
 *  nombre escrito por una persona: sin ella, "Residente" y "Residente " son dos
 *  registros distintos para la base y el mismo para el usuario. */
export const normalizeText = (value: string) => value.trim().replace(/\s+/g, " ");

/** Compara dos nombres como los compara una persona: sin distinguir mayúsculas
 *  ni acentos. */
export const isSameName = (a: string, b: string) =>
  a.localeCompare(b, "es", { sensitivity: "base" }) === 0;
