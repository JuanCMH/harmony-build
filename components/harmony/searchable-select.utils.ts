/**
 * Desde cuántas opciones enseña el buscador un `SearchableSelect`. Con siete o
 * menos la lista se abarca de un vistazo y escribir es un paso de más
 * (`2026-09-16-formularios-ajustes-de-uso-design §1`).
 */
export const BUSQUEDA_DESDE = 7;

export const conBuscador = (opciones: number): boolean => opciones > BUSQUEDA_DESDE;

/**
 * El disparador cerrado: idéntico a un `SelectTrigger`. Lo comparten
 * `SearchableSelect` y los controles que buscan en el servidor —el diagnóstico
 * CIE-10—, para que una lista se vea igual la llene quien la llene.
 */
export const SEARCHABLE_TRIGGER_CLASS =
  "border-input data-[placeholder]:text-muted-foreground aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 focus-visible:border-ring focus-visible:ring-ring/50 dark:bg-input/30 dark:hover:bg-input/50 flex w-fit min-w-0 items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 data-[size=default]:h-9 data-[size=sm]:h-8";

/** Minúsculas y sin tildes: «Póliza» y «poliza» son la misma búsqueda. */
export const normalizarBusqueda = (texto: string): string =>
  texto.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").trim();

/** Si una opción entra en la búsqueda: cada palabra buscada tiene que estar. */
export const coincide = (texto: string, consulta: string): boolean => {
  const palabras = normalizarBusqueda(consulta).split(/\s+/).filter(Boolean);
  if (palabras.length === 0) return true;
  const donde = normalizarBusqueda(texto);
  return palabras.every((p) => donde.includes(p));
};
