import { describe, expect, it } from "vitest";

import {
  type SortRule,
  filterEntities,
  parseSort,
  serializeSort,
  sortEntities,
  toggleSortRule,
} from "../entity-table.utils";

const gente = [
  { name: "Ñuño", identifier: "3", active: true },
  { name: "alba", identifier: "10", active: false },
  { name: "Ana", identifier: "2", active: true },
];

describe("sortEntities", () => {
  it("ordena texto con las reglas del español", () => {
    const orden = sortEntities(gente, [{ key: "name", direction: "ascending" }]);
    // «alba» antes que «Ana» —no distingue mayúsculas— y la eñe al final.
    expect(orden.map((p) => p.name)).toEqual(["alba", "Ana", "Ñuño"]);
  });

  it("ordena los números dentro del texto como números", () => {
    const orden = sortEntities(gente, [
      { key: "identifier", direction: "ascending" },
    ]);
    // Sin `numeric`, «10» iría antes que «2».
    expect(orden.map((p) => p.identifier)).toEqual(["2", "3", "10"]);
  });

  it("invierte con «descending»", () => {
    const orden = sortEntities(gente, [{ key: "name", direction: "descending" }]);
    expect(orden.map((p) => p.name)).toEqual(["Ñuño", "Ana", "alba"]);
  });

  it("la segunda regla desempata a la primera", () => {
    const orden = sortEntities(gente, [
      { key: "active", direction: "descending" },
      { key: "name", direction: "ascending" },
    ]);
    expect(orden.map((p) => p.name)).toEqual(["Ana", "Ñuño", "alba"]);
  });

  it("un valor ausente ordena como el vacío, no al final", () => {
    const conHueco = [{ name: "b" }, { name: undefined }, { name: "a" }];
    expect(
      sortEntities(conHueco, [{ key: "name", direction: "ascending" }]).map(
        (x) => x.name,
      ),
    ).toEqual([undefined, "a", "b"]);
  });

  it("sin reglas devuelve el mismo orden, en un arreglo nuevo", () => {
    const salida = sortEntities(gente, []);
    expect(salida).toEqual(gente);
    expect(salida).not.toBe(gente);
  });

  it("no toca el arreglo que recibe", () => {
    sortEntities(gente, [{ key: "name", direction: "descending" }]);
    expect(gente[0].name).toBe("Ñuño");
  });
});

describe("toggleSortRule", () => {
  const porNombre: SortRule<"name" | "active">[] = [
    { key: "name", direction: "ascending" },
  ];

  it("un clic en otra columna la deja sola y ascendente", () => {
    expect(toggleSortRule(porNombre, "active", false)).toEqual([
      { key: "active", direction: "ascending" },
    ]);
  });

  it("un clic en la misma columna alterna el sentido", () => {
    expect(toggleSortRule(porNombre, "name", false)).toEqual([
      { key: "name", direction: "descending" },
    ]);
  });

  it("con Mayús añade la columna como desempate", () => {
    expect(toggleSortRule(porNombre, "active", true)).toEqual([
      { key: "name", direction: "ascending" },
      { key: "active", direction: "ascending" },
    ]);
  });

  it("con Mayús, el segundo clic invierte y el tercero la saca", () => {
    const dos = toggleSortRule(porNombre, "active", true);
    const invertida = toggleSortRule(dos, "active", true);
    expect(invertida[1].direction).toBe("descending");
    expect(toggleSortRule(invertida, "active", true)).toEqual(porNombre);
  });

  it("no muta las reglas que recibe", () => {
    toggleSortRule(porNombre, "name", false);
    expect(porNombre[0].direction).toBe("ascending");
  });
});

describe("serializeSort y parseSort", () => {
  const claves = ["name", "active"] as const;

  it("ida y vuelta", () => {
    const reglas: SortRule<"name" | "active">[] = [
      { key: "name", direction: "ascending" },
      { key: "active", direction: "descending" },
    ];
    const texto = serializeSort(reglas);
    expect(texto).toBe("name:asc,active:desc");
    expect(parseSort(texto, claves)).toEqual(reglas);
  });

  it("descarta claves que no existen", () => {
    // La dirección la escribe cualquiera: no debe romper el listado.
    expect(parseSort("inventada:asc,name:desc", claves)).toEqual([
      { key: "name", direction: "descending" },
    ]);
  });

  it("un sentido mal escrito se lee como ascendente", () => {
    expect(parseSort("name:patas", claves)).toEqual([
      { key: "name", direction: "ascending" },
    ]);
  });

  it("descarta claves repetidas", () => {
    expect(parseSort("name:asc,name:desc", claves)).toEqual([
      { key: "name", direction: "ascending" },
    ]);
  });

  it("sin valor no hay orden", () => {
    expect(parseSort(null, claves)).toEqual([]);
    expect(parseSort("", claves)).toEqual([]);
  });
});

describe("filterEntities", () => {
  it("no distingue mayúsculas", () => {
    expect(filterEntities(gente, "ANA", "name").map((p) => p.name)).toEqual([
      "Ana",
    ]);
  });

  it("busca por dentro, no sólo por el principio", () => {
    expect(filterEntities(gente, "lb", "name").map((p) => p.name)).toEqual([
      "alba",
    ]);
  });

  it("una búsqueda vacía o de espacios devuelve todo", () => {
    expect(filterEntities(gente, "   ", "name")).toHaveLength(3);
  });

  it("busca por el campo elegido", () => {
    expect(filterEntities(gente, "10", "identifier").map((p) => p.name)).toEqual(
      ["alba"],
    );
  });
});
