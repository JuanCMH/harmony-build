/** SST-F-115 · Inspección preoperacional para herramientas neumáticas.
 *
 *  El encabezado del papel dice SST-F-116, que es el código de la planta de
 *  concreto: aquí lleva el del nombre del archivo, 115.
 *
 *  La hoja cubre cuatro equipos. Cada uno es un bloque de la misma lista, y
 *  los tres que en el papel tienen referencia y marca se eligen del listado
 *  de equipos.
 */

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
  block("pulidora", "Pulidora neumática", [
    item("Estado del equipo", "estado-equipo"),
    item("Estado de los conectores o acoples", "conectores"),
    item("Cuenta con acoples adecuados para los accesorios", "acoples"),
    item("Se verificó el estado del interruptor de encendido", "interruptor"),
    item(
      "Se verificó el estado general de la pulidora (fisuras, roturas, aseo, etc.)",
      "estado-general",
    ),
    item("Se verificó el estado del disco", "disco"),
  ]),
  block("pistola", "Pistola neumática", [
    item("Estado de los cabezales o copas", "cabezales"),
    item("Estado de interruptor de encendido", "interruptor"),
    item("Estado general de la pistola", "estado-general"),
    item("Estado de accesorios", "accesorios"),
    item("Estado mango agarradera lateral", "mango"),
    item("Estado de los conectores o acoples", "conectores"),
  ]),
  block("motortool", "Motortool", [
    item("Estado general del motortool", "estado-general"),
    item(
      "Estado de los reguladores de salida y presión de aire",
      "reguladores",
    ),
    item("Estado de los accesorios a utilizar", "accesorios"),
    item("Estado de los acoples o conectores", "acoples"),
  ]),
  block("compresor", "Compresor", [
    item("Estado interruptor de encendido y/o apagado", "interruptor"),
    item(
      "Estado de cilindro para almacenamiento de aire comprimido (aseo, pintura, sin abolladuras)",
      "cilindro",
    ),
    item(
      "Instalación del sistema de protección de correas",
      "proteccion-correas",
    ),
    item(
      "Estado de manguera de aire (sin fisuras, ajuste de acoples, abrazaderas, entre otros)",
      "manguera-aire",
    ),
    item("Estado del motor eléctrico", "motor-electrico"),
    item("Estado y funcionamiento de manómetro", "manometro"),
    item("Estado de reguladores (salida y presión del aire)", "reguladores"),
    item("Estado de acoples o empaques (fugas)", "acoples-empaques"),
  ]),
  block("general", "General", [
    item("Se utilizan adecuadamente los EPP y dotación para la labor", "epp"),
    item("Está disponible en el lugar de trabajo el extintor", "extintor"),
  ]),
];

export const SST_F_115: LibraryForm = {
  key: "sst-f-115",
  kind: "record",
  name: "Inspección preoperacional para herramientas neumáticas",
  code: "SST-F-115",
  category: CATEGORY.preoperational,
  description:
    "La inspección de la pulidora neumática, la pistola neumática, el motortool y el compresor que los alimenta, antes de usarlos: una por día.",
  sections: sections(
    section("inspeccion", "Inspección", [
      workCenter(),
      equipment("Pulidora neumática", {
        id: "equipo-pulidora",
        required: false,
      }),
      equipment("Pistola neumática", {
        id: "equipo-pistola",
        required: false,
      }),
      equipment("Compresor", { id: "equipo-compresor", required: false }),
      checklist(
        "Estado de las herramientas",
        { scale: SCALE_BMNA, blocks },
        {
          id: "inspeccion",
          description:
            "Si hoy no se usa alguno de los equipos, marca N.A en los ítems de su bloque.",
        },
      ),
      ...closing("Firma del operario"),
    ]),
  ),
};
