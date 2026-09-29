import { describe, expect, it } from "vitest";

import {
  buildReferenceGraph,
  collectFormReferences,
  findReferenceCycle,
  referencedFormIds,
} from "../form_references";
import { searchableText } from "../text";
import { field, oneSection, referenceField, tableField } from "./form.fixtures";

/** Un formato cuyo único contenido son relaciones a otros. */
const node = (formId: string, ...targets: string[]) => ({
  formId,
  sections: oneSection(
    field("nombre"),
    ...targets.map((target) => referenceField(`a-${target}`, target)),
  ),
});

describe("collectFormReferences", () => {
  it("recoge las relaciones de los campos y de las columnas de tabla", () => {
    const sections = oneSection(
      referenceField("vehiculo", "vehiculos", ["soat"], { label: "Vehículo" }),
      tableField(
        "entregas",
        { label: "Entregas" },
        {
          columns: [
            { id: "elemento", label: "Elemento", type: "text", required: true },
            {
              id: "trabajador",
              label: "Trabajador",
              type: "reference",
              required: true,
              reference: { formId: "personal", fill: ["cargo"] },
            },
          ],
        },
      ),
    );
    expect(collectFormReferences(sections)).toEqual([
      {
        fieldId: "vehiculo",
        label: "Vehículo",
        config: { formId: "vehiculos", fill: ["soat"] },
      },
      {
        fieldId: "entregas",
        label: "Entregas › Trabajador",
        columnId: "trabajador",
        config: { formId: "personal", fill: ["cargo"] },
      },
    ]);
    expect(referencedFormIds(sections)).toEqual(["vehiculos", "personal"]);
  });

  it("no repite un listado ni cuenta una relación sin elegir", () => {
    expect(
      referencedFormIds(
        oneSection(
          referenceField("conductor", "personal"),
          referenceField("ayudante", "personal"),
          referenceField("pendiente", ""),
        ),
      ),
    ).toEqual(["personal"]);
  });
});

describe("findReferenceCycle", () => {
  it("un listado puede relacionarse con otro", () => {
    const forms = [node("vehiculos", "personal"), node("personal")];
    expect(buildReferenceGraph(forms).get("vehiculos")).toEqual(["personal"]);
    expect(findReferenceCycle(forms)).toBeNull();
  });

  it("si A apunta a B, B no puede apuntar a A", () => {
    expect(
      findReferenceCycle([
        node("vehiculos", "personal"),
        node("personal", "vehiculos"),
      ]),
    ).toEqual(["vehiculos", "personal", "vehiculos"]);
  });

  it("ni a través de un tercero", () => {
    expect(
      findReferenceCycle([
        node("vehiculos", "personal"),
        node("personal", "contratistas"),
        node("contratistas", "vehiculos"),
      ]),
    ).toEqual(["vehiculos", "personal", "contratistas", "vehiculos"]);
  });

  it("un listado que se apunta a sí mismo es el ciclo más corto", () => {
    expect(findReferenceCycle([node("personal", "personal")])).toEqual([
      "personal",
      "personal",
    ]);
  });

  it("dos caminos al mismo listado no son un ciclo", () => {
    expect(
      findReferenceCycle([
        node("inspeccion", "vehiculos", "personal"),
        node("vehiculos", "personal"),
        node("personal"),
      ]),
    ).toBeNull();
  });

  it("el camino empieza donde empieza el ciclo, no donde se buscó", () => {
    expect(
      findReferenceCycle(
        [
          node("inspeccion", "vehiculos"),
          node("vehiculos", "personal"),
          node("personal", "vehiculos"),
        ],
        "inspeccion",
      ),
    ).toEqual(["vehiculos", "personal", "vehiculos"]);
  });

  it("con origen, ignora un ciclo que no se alcanza desde él", () => {
    const forms = [
      node("inspeccion", "extintores"),
      node("extintores"),
      node("vehiculos", "personal"),
      node("personal", "vehiculos"),
    ];
    expect(findReferenceCycle(forms, "inspeccion")).toBeNull();
    expect(findReferenceCycle(forms)).not.toBeNull();
  });

  it("un listado que no está entre los nodos no rompe nada", () => {
    expect(findReferenceCycle([node("vehiculos", "borrado")])).toBeNull();
  });
});

describe("searchableText", () => {
  it("quita tildes, mayúsculas y espacios de más", () => {
    expect(searchableText("  Inspección   de CAMIÓN ")).toBe(
      "inspeccion de camion",
    );
    expect(searchableText("SST-F-010")).toBe("sst-f-010");
    expect(searchableText("Ñoño")).toBe("nono");
  });
});
