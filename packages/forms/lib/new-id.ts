/**
 * Un identificador corto y estable para una sección, un campo, un bloque, un
 * ítem, una columna o una fila.
 *
 * Se genera en el navegador porque el formato es un documento: sus campos no
 * son filas de Convex y no tienen id de base de datos. Vive solo en su módulo
 * porque lo necesitan `checklist-scales` y `field-defaults`, y el segundo
 * importa del primero: dentro de cualquiera de los dos cerraría un círculo.
 */
export const newId = (): string =>
  `f${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
