/** SST-F-066 · Inspección de camilla de primeros auxilios. */

import {
  block,
  checklist,
  item,
  SCALE_SN,
  section,
  sections,
} from "../builders";
import { CATEGORY, closing, observations, person, workCenter } from "../common";
import type { LibraryForm } from "../types";

const blocks = [
  block("camilla", "", [
    item(
      "¿Está ubicada en un lugar seguro (protegida de factores ambientales) y de fácil acceso en caso de necesitarla?",
      "lugar-seguro",
    ),
    item("¿Está la camilla debidamente señalizada?", "senalizada"),
    item("¿Se encuentra en buenas condiciones de aseo?", "aseo"),
    item("¿Posee inmovilizador cervical?", "posee-inmovilizador"),
    item(
      "¿Se encuentra en buen estado el inmovilizador cervical?",
      "estado-inmovilizador",
    ),
    item(
      "¿Se encuentran en buen estado correas de seguridad?",
      "correas-seguridad",
    ),
    item(
      "¿Se encuentran en buen estado los sujetadores para agarre?",
      "sujetadores",
    ),
    item(
      "¿Se encuentran en buen estado los soportes de descanso?",
      "soportes-descanso",
    ),
    item("¿Se encuentra en buen estado general la camilla?", "estado-general"),
  ]),
];

export const SST_F_066: LibraryForm = {
  key: "sst-f-066",
  kind: "record",
  name: "Inspección de camilla de primeros auxilios",
  code: "SST-F-066",
  category: CATEGORY.emergency,
  description:
    "La revisión de la camilla de un centro de trabajo: ubicación, señalización, aseo y estado de sus partes.",
  sections: sections(
    section("inspeccion", "Inspección", [
      workCenter(),
      person("Quien inspecciona", ["cargo"], {
        id: "responsable",
        showInTable: true,
      }),
      checklist(
        "Estado de la camilla",
        { scale: SCALE_SN, blocks },
        { id: "inspeccion" },
      ),
      ...closing(
        "Firma del inspector",
        observations("Novedades encontradas para ser corregidas", {
          description:
            "Las novedades encontradas deberán estar solucionadas antes de la próxima inspección.",
        }),
      ),
    ]),
  ),
};
