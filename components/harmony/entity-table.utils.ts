/** El orden y el filtrado de un listado.
 *
 *  Estaba escrito dos veces —en el listado de personal y en el de clientes—,
 *  idéntico salvo dos nombres de variable, y sin ninguna prueba. Aquí es una
 *  función pura, que es lo que permite probarlo.
 */

export type SortDirection = "ascending" | "descending";

export interface SortRule<K extends string = string> {
  key: K;
  direction: SortDirection;
}

/** Un valor ausente ordena como el vacío de su tipo, no al final. */
const normalizar = (valor: unknown): string | number | boolean => {
  if (valor === undefined || valor === null) return "";
  if (typeof valor === "boolean" || typeof valor === "number") return valor;
  return String(valor);
};

const comparar = (a: unknown, b: unknown): number => {
  const va = normalizar(a);
  const vb = normalizar(b);

  // `localeCompare` con `es` para que la eñe y los acentos ordenen donde deben,
  // y `numeric` para que «Puesto 2» venga antes que «Puesto 10».
  if (typeof va === "string" && typeof vb === "string") {
    return va.localeCompare(vb, "es", { numeric: true, sensitivity: "base" });
  }
  if (va < vb) return -1;
  if (va > vb) return 1;
  return 0;
};

/** Ordena por varias reglas: la primera manda, las siguientes desempatan. */
export function sortEntities<T extends Record<string, unknown>>(
  items: readonly T[],
  rules: readonly SortRule[],
): T[] {
  if (rules.length === 0) return [...items];

  return [...items].sort((a, b) => {
    for (const { key, direction } of rules) {
      const orden = comparar(a[key], b[key]);
      if (orden !== 0) return direction === "ascending" ? orden : -orden;
    }
    return 0;
  });
}

/**
 * Qué pasa al pulsar una cabecera.
 *
 * Sin `Mayús` se ordena sólo por esa columna, alternando el sentido. Con
 * `Mayús` la columna se añade como desempate, y al tercer clic sale.
 */
export function toggleSortRule<K extends string>(
  rules: readonly SortRule<K>[],
  key: K,
  multi: boolean,
): SortRule<K>[] {
  if (!multi) {
    const única = rules.length === 1 && rules[0].key === key;
    return [
      {
        key,
        direction:
          única && rules[0].direction === "ascending"
            ? "descending"
            : "ascending",
      },
    ];
  }

  const i = rules.findIndex((r) => r.key === key);
  if (i === -1) return [...rules, { key, direction: "ascending" }];
  if (rules[i].direction === "ascending") {
    return rules.map((r, j) =>
      j === i ? { ...r, direction: "descending" as const } : r,
    );
  }
  return rules.filter((_, j) => j !== i);
}

/** `nombre:asc,activo:desc` — legible en la barra de direcciones. */
export const serializeSort = (rules: readonly SortRule[]): string =>
  rules
    .map((r) => `${r.key}:${r.direction === "ascending" ? "asc" : "desc"}`)
    .join(",");

/**
 * Lee el orden de la URL, descartando lo que no reconozca.
 *
 * La dirección la escribe cualquiera: una clave inventada o un sentido mal
 * escrito no deben romper el listado, sólo ignorarse.
 */
export function parseSort<K extends string>(
  valor: string | null | undefined,
  clavesValidas: readonly K[],
): SortRule<K>[] {
  if (!valor) return [];
  const vistas = new Set<string>();
  const reglas: SortRule<K>[] = [];

  for (const trozo of valor.split(",")) {
    const [key, sentido] = trozo.split(":");
    if (!clavesValidas.includes(key as K)) continue;
    if (vistas.has(key)) continue;
    vistas.add(key);
    reglas.push({
      key: key as K,
      direction: sentido === "desc" ? "descending" : "ascending",
    });
  }
  return reglas;
}

/** Filtra por el campo elegido, sin distinguir mayúsculas ni acentos. */
export function filterEntities<T extends Record<string, unknown>>(
  items: readonly T[],
  query: string,
  field: keyof T & string,
): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...items];
  return items.filter((item) =>
    String(item[field] ?? "")
      .toLowerCase()
      .includes(q),
  );
}
