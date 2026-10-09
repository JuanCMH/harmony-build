/** Gestión ambiental.
 *
 *  En el papel es una hoja del informe de gestión SST (`SST-F-046`); aquí es
 *  un formato con nombre propio, que se diligencia por separado.
 *
 *  Un registro por día, con las mismas columnas de la hoja. Ninguna cantidad
 *  es obligatoria: el día que no se generó un residuo, su campo se deja vacío.
 */

import { type FieldExtras, number, section, sections } from "../builders";
import { CATEGORY, workCenter } from "../common";
import type { LibraryForm } from "../types";

const kilograms = (label: string, id: string, extras: FieldExtras = {}) =>
  number(label, { id, placeholder: "ej: 12,5", ...extras });

export const GESTION_AMBIENTAL: LibraryForm = {
  key: "gestion-ambiental",
  kind: "record",
  name: "Gestión ambiental",
  category: CATEGORY.management,
  description:
    "El registro diario de residuos generados y aprovechados, y de los consumos de agua, combustible y madera.",
  sections: sections(
    section(
      "residuos",
      "Residuos",
      [
        workCenter(),
        number("Jornadas de recolección", {
          id: "jornadas-recoleccion",
          size: "medium",
          showInTable: true,
          description:
            "Cuántas jornadas de recolección de residuos se hicieron en el día",
          placeholder: "ej: 1",
        }),
        kilograms("Cartón", "carton", { description: "Reciclable" }),
        kilograms("Plástico", "plastico", { description: "Reciclable" }),
        kilograms("Papel", "papel", { description: "Reciclable" }),
        kilograms("Medicamentos vencidos", "medicamentos-vencidos"),
        kilograms("Bolsas de cemento o endurecedor", "bolsas-cemento"),
        kilograms("Elementos de protección personal", "epp"),
        kilograms("Contaminados con derivados del petróleo", "contaminados", {
          description:
            "Recipientes y elementos contaminados con derivados del petróleo",
        }),
        kilograms("Tóner", "toner"),
        kilograms("Batería y filtros", "bateria-filtros"),
        kilograms(
          "Recipientes de sustancias químicas",
          "recipientes-quimicos",
          {
            description: "Recipientes plásticos de sustancias químicas",
          },
        ),
        kilograms("RCD", "rcd", {
          description:
            "Residuos de construcción y demolición: concreto, escombros, acero",
        }),
        kilograms("Otros", "otros-residuos"),
        number("RCD aprovechado: concreto", {
          id: "rcd-concreto",
          description: "Residuos de concreto aprovechados en obra",
        }),
        number("RCD aprovechado: acero", {
          id: "rcd-acero",
          description: "Residuos de acero aprovechados en obra",
        }),
        number("Aceites usados (galones)", { id: "aceites-usados" }),
        number("Residuos de letrinas (galones)", { id: "residuos-letrinas" }),
      ],
      "Lo generado en el día. Los residuos sólidos van en kilogramos.",
    ),
    section("consumos", "Consumos", [
      number("Agua potable (litros)", {
        id: "agua-potable",
        size: "medium",
        showInTable: true,
        description: "Agua de consumo humano",
      }),
      number("Combustible (galones)", {
        id: "combustible",
        showInTable: true,
      }),
      number("Madera (m³)", { id: "madera" }),
    ]),
  ),
};
