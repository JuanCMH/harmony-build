/** SST-F-083 · Inspección preoperacional para compresor. */

import {
  block,
  checklist,
  item,
  SCALE_BMNA,
  section,
  sections,
} from "../builders";
import { CATEGORY, closing, equipment, workCenter } from "../common";
import type { LibraryForm } from "../types";

const blocks = [
  block("compresor", "", [
    item("Estado de conexiones eléctricas", "conexiones-electricas"),
    item("Estado interruptor de encendido y/o apagado", "interruptor"),
    item(
      "Estado de manguera de aire (sin fisuras, ajuste de acoples, abrazaderas, entre otros)",
      "manguera-aire",
    ),
    item(
      "Estado de llantas y soportes (dispositivo de amortiguación sonora y aislante)",
      "llantas-soportes",
    ),
    item(
      "Estado de cilindro para almacenamiento de aire comprimido (aseo, pintura, sin abolladuras)",
      "cilindro",
    ),
    item(
      "Instalación de sistema de protección de correas",
      "proteccion-correas",
    ),
    item("Fijación de soportes para desplazamiento", "fijacion-soportes"),
    item("Estado del motor eléctrico", "motor-electrico"),
    item("Nivel de aceite", "nivel-aceite"),
    item("Estado de acoples o empaques (fugas)", "acoples-empaques"),
    item("Estado y funcionamiento de manómetro", "manometro"),
    item("Estado de reguladores (salida y presión del aire)", "reguladores"),
    item(
      "Estado general del equipo (fisuras, rupturas, aseo, entre otros)",
      "estado-general",
    ),
    item("Se utilizan adecuadamente los EPP para la labor", "epp"),
  ]),
];

export const SST_F_083: LibraryForm = {
  key: "sst-f-083",
  kind: "record",
  name: "Inspección preoperacional para compresor",
  code: "SST-F-083",
  category: CATEGORY.preoperational,
  description:
    "La inspección del compresor antes de encenderlo: una por equipo y por día.",
  sections: sections(
    section("inspeccion", "Inspección", [
      equipment("Compresor"),
      workCenter(),
      checklist(
        "Estado del compresor",
        { scale: SCALE_BMNA, blocks },
        { id: "inspeccion" },
      ),
      ...closing("Firma del operador"),
    ]),
  ),
};
