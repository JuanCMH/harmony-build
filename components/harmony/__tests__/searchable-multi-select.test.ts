import { describe, expect, it } from "vitest";

import {
  type MultiSelectGroup,
  impliedValues,
  summarize,
  toggleValue,
} from "../searchable-multi-select.utils";

const grupos: MultiSelectGroup[] = [
  { label: "Adicional", all: { value: "tipo:yellow", label: "Adicional" }, options: [] },
  {
    label: "Seguimiento",
    all: { value: "tipo:sky", label: "Todas las de Seguimiento" },
    options: [
      { value: "inc", label: "Incapacidad médica" },
      { value: "vac", label: "Vacaciones" },
      { value: "per", label: "Permiso remunerado" },
    ],
  },
  {
    label: "Falta",
    all: { value: "tipo:red", label: "Todas las de Falta" },
    options: [
      { value: "cal", label: "Calamidad doméstica" },
      { value: "inj", label: "Injustificada" },
    ],
  },
];

describe("searchable-multi-select: resumen", () => {
  it("sin nada, null; con una o dos, sus nombres", () => {
    expect(summarize([], grupos)).toBeNull();
    expect(summarize(["vac"], grupos)).toBe("Vacaciones");
    expect(summarize(["vac", "inc"], grupos)).toBe("Incapacidad médica y Vacaciones");
  });

  it("con más, las dos primeras y cuántas quedan, en el orden de la lista", () => {
    expect(summarize(["cal", "per", "vac", "inc"], grupos)).toBe(
      "Incapacidad médica, Vacaciones y 2 más",
    );
  });

  it("un tipo entero se nombra como tal", () => {
    expect(summarize(["tipo:red"], grupos)).toBe("Todas las de Falta");
    expect(summarize(["tipo:yellow", "vac"], grupos)).toBe("Adicional y Vacaciones");
  });

  it("dice cuándo hay una opción que ya no existe", () => {
    expect(summarize(["vac", "borrada"], grupos)).toBe("Vacaciones y una opción eliminada");
  });
});

describe("searchable-multi-select: tipo entero", () => {
  it("marcar el tipo entero guarda sólo el tipo y deja sus opciones implícitas", () => {
    const siguiente = toggleValue(["cal", "vac"], grupos, "tipo:red");
    expect(siguiente).toEqual(["vac", "tipo:red"]);
    expect([...impliedValues(siguiente, grupos)]).toEqual(["cal", "inj"]);
  });

  it("una implícita no se desmarca sola; el tipo sí, y vuelven a estar libres", () => {
    expect(toggleValue(["tipo:red"], grupos, "cal")).toEqual(["tipo:red"]);
    expect(toggleValue(["tipo:red", "vac"], grupos, "tipo:red")).toEqual(["vac"]);
    expect(impliedValues(["vac"], grupos).size).toBe(0);
  });

  it("marca y desmarca una suelta, y ordena como la lista", () => {
    expect(toggleValue(["vac"], grupos, "inc")).toEqual(["inc", "vac"]);
    expect(toggleValue(["inc", "vac"], grupos, "inc")).toEqual(["vac"]);
  });
});
