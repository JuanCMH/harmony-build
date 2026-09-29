/** SST-F-065 · Inspección a kit de derrames. */

import {
  block,
  checklist,
  item,
  SCALE_SNNA,
  section,
  sections,
} from "../builders";
import { CATEGORY, closing, observations, person, workCenter } from "../common";
import type { LibraryForm } from "../types";

const blocks = [
  block("kit", "", [
    item(
      "El kit de derrames se encuentra ubicado en un sitio seguro, protegido de las condiciones ambientales y de fácil acceso",
      "sitio-seguro",
    ),
    item(
      "El kit se encuentra señalizado y visible para los demás",
      "senalizado-visible",
    ),
    item("El kit se encuentra en buen estado para su uso", "buen-estado"),
    item(
      "Contiene barrera absorbente - tela oleofílica e hidrofóbica BIOABSORB (de 1.20 m x 2 pulgadas)",
      "barrera-absorbente",
    ),
    item("Contiene paños oleofílicos (de 38 cm x 43 cm)", "panos-oleofilicos"),
    item("Contiene material granulado absorbente", "material-granulado"),
    item("Contiene balde plástico", "balde-plastico"),
    item("Contiene pala antichispa", "pala-antichispa"),
    item("Contiene recogedor de mano", "recogedor"),
    item("Contiene martillo de madera con punta de goma", "martillo"),
    item("Contiene bolsas rojas tipo industrial", "bolsas-rojas"),
    item("Contiene cinta de señalización", "cinta-senalizacion"),
    item("Contiene manila (5 m)", "manila"),
    item("Contiene cuñas de madera", "cunas-madera"),
    item("Contiene masilla epóxica de 50 gr", "masilla-epoxica"),
    item("Contiene desengrasante biodegradable", "desengrasante"),
    item(
      "Contiene chaleco, tyvek, guantes de nitrilo, gafas y respirador con filtros para gases y vapores",
      "elementos-proteccion",
    ),
    item("La maleta se encuentra en buen estado", "maleta"),
  ]),
];

export const SST_F_065: LibraryForm = {
  key: "sst-f-065",
  kind: "record",
  name: "Inspección a kit de derrames",
  code: "SST-F-065",
  category: CATEGORY.emergency,
  description:
    "La revisión del kit de derrames de un centro de trabajo: dónde está, en qué estado y si tiene todo lo que debe contener.",
  sections: sections(
    section("identificacion", "Lugar y responsable", [
      workCenter(),
      person("Responsable de la inspección", ["cargo"], {
        id: "responsable",
        showInTable: true,
      }),
    ]),
    section("inspeccion", "Inspección", [
      checklist(
        "Estado y contenido del kit",
        { scale: SCALE_SNNA, blocks },
        { id: "inspeccion" },
      ),
    ]),
    closing(
      "Firma de quien realiza la inspección",
      observations("Recomendaciones"),
    ),
  ),
};
