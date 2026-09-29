import { describe, expect, it } from "vitest";

import {
  FIELD_TYPES,
  NEVER_CONTROLLERS,
  UNARY_ONLY_CONTROLLERS,
  VISIBILITY_OPERATORS,
} from "@/convex/lib/form_types";

import {
  BEHAVIOR_CATALOG,
  ENTITY_ICONS,
  FIELD_CATALOG,
  FORM_ACTION_ICONS,
  OPERATORS_BY_TYPE,
  OPERATOR_LABEL,
  RECIPE_CATALOG,
} from "../field-catalog";

/** Cada lista cerrada, con los glifos que pinta. */
const CLOSED_LISTS = {
  entidades: Object.values(ENTITY_ICONS),
  acciones: Object.values(FORM_ACTION_ICONS),
  "tipos de campo": Object.values(FIELD_CATALOG).map((entry) => entry.icon),
  "marcas de comportamiento": Object.values(BEHAVIOR_CATALOG).map(
    (entry) => entry.icon,
  ),
  recetas: Object.values(RECIPE_CATALOG).map((entry) => entry.icon),
};

describe("glifos del módulo de formatos", () => {
  for (const [name, icons] of Object.entries(CLOSED_LISTS)) {
    it(`ningún glifo se repite entre ${name}`, () => {
      expect(new Set(icons).size).toBe(icons.length);
    });
  }

  it("una entidad no comparte glifo con un tipo de campo ni con una marca", () => {
    const entities = new Set<unknown>(CLOSED_LISTS.entidades);
    const shared = [
      ...CLOSED_LISTS["tipos de campo"],
      ...CLOSED_LISTS["marcas de comportamiento"],
      ...CLOSED_LISTS.recetas,
    ].filter((icon) => entities.has(icon));
    expect(shared).toEqual([]);
  });
});

describe("FIELD_CATALOG", () => {
  it("presenta los dieciocho tipos, cada uno con nombre y descripción", () => {
    expect(Object.keys(FIELD_CATALOG).sort()).toEqual([...FIELD_TYPES].sort());
    for (const type of FIELD_TYPES) {
      expect(FIELD_CATALOG[type].label.trim()).not.toBe("");
      expect(FIELD_CATALOG[type].description.trim()).not.toBe("");
    }
  });

  it("no hay dos tipos con el mismo nombre", () => {
    const labels = FIELD_TYPES.map((type) => FIELD_CATALOG[type].label);
    expect(new Set(labels).size).toBe(labels.length);
  });
});

describe("OPERATORS_BY_TYPE", () => {
  it("una lista de chequeo no puede ser controlador", () => {
    for (const type of NEVER_CONTROLLERS) {
      expect(OPERATORS_BY_TYPE[type]).toEqual([]);
    }
  });

  it("de una firma, una tabla, un archivo y una imagen sólo se pregunta si están", () => {
    for (const type of UNARY_ONLY_CONTROLLERS) {
      expect(OPERATORS_BY_TYPE[type]).toEqual(["isEmpty", "isNotEmpty"]);
    }
  });

  it("de una relación se pregunta además cuál elemento es", () => {
    expect(OPERATORS_BY_TYPE.reference).toEqual([
      "eq",
      "neq",
      "anyOf",
      "isEmpty",
      "isNotEmpty",
    ]);
  });

  it("todo operador tiene su frase", () => {
    for (const operator of VISIBILITY_OPERATORS) {
      expect(OPERATOR_LABEL[operator].trim()).not.toBe("");
    }
  });
});
