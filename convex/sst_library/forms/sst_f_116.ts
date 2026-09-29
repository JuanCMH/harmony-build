/** SST-F-116 · Inspección preoperacional para planta de concreto.
 *
 *  Su escala es S / N / N.A. El papel numera los ítems y salta el 9: aquí no
 *  se numeran. Varios ítems son de periodicidad semanal («cada semana»): los
 *  días que no toca se responden «N.A».
 */

import {
  block,
  checklist,
  item,
  SCALE_SNNA,
  section,
  sections,
} from "../builders";
import { CATEGORY, closing, equipment, person, workCenter } from "../common";
import type { LibraryForm } from "../types";

const blocks = [
  block("motor", "Estado del motor y equipo en general", [
    item(
      "El manual de seguridad está completo, y se encuentra ubicado en el armario de documentación",
      "manual-seguridad",
    ),
    item(
      "Se han verificado los niveles de aceite (mediante ojos de buey o tapones de aceite)",
      "niveles-aceite",
    ),
    item(
      "Se realiza la verificación semanal de uniones elásticas entre reductor y eje",
      "uniones-elasticas",
    ),
    item(
      "Se engrasan todos los rodamientos de los mecanismos de la planta",
      "engrase-rodamientos",
    ),
    item("Se realiza limpieza de los filtros cada semana", "limpieza-filtros"),
    item(
      "Se verifica el consumo del aceite del vaso lubricador del cuadro neumático",
      "vaso-lubricador",
    ),
    item(
      "Se purga el vaso de decantación del cuadro neumático y compresor cada semana",
      "vaso-decantacion",
    ),
    item(
      "Se realiza la verificación de presiones de trabajo de las líneas neumáticas",
      "presiones-trabajo",
    ),
  ]),
  block("banda", "Banda transportadora", [
    item("Se verifica el estado de los rodamientos (engrase)", "rodamientos"),
    item("La banda tolva báscula se encuentra en buen estado", "tolva-bascula"),
    item("La banda de descargue se encuentra en buen estado", "descargue"),
    item("Se verifica el estado de los rodillos (estado)", "rodillos"),
  ]),
  block("electrica", "Instalación eléctrica y básculas", [
    item(
      "Se realiza verificación de los cables de los botones de la cabina de la planta",
      "cables-botones",
    ),
    item(
      "Se realiza verificación del funcionamiento de toda la parte eléctrica de la planta y se encuentra debidamente señalizado",
      "parte-electrica",
    ),
    item(
      "Se ha verificado que las básculas estén libres de obstáculos, sin fisuras y golpes",
      "basculas",
    ),
  ]),
  block("operador", "Operador", [
    item(
      "¿Ha leído debidamente el manual de operación de la planta? Está seguro que pueda operarlo debidamente",
      "manual-operacion",
    ),
    item(
      "En caso de daño se cuenta con un personal capacitado para la reparación de la planta",
      "personal-reparacion",
    ),
    item(
      "El personal mantiene su área de trabajo en total orden y aseo",
      "orden-aseo",
    ),
    item(
      "El personal usa adecuadamente todos los elementos de protección personal adecuados para la actividad",
      "epp",
    ),
    item(
      "El personal tiene experiencia y/o está autorizado para operar la planta",
      "experiencia-autorizacion",
    ),
  ]),
];

export const SST_F_116: LibraryForm = {
  key: "sst-f-116",
  kind: "record",
  name: "Inspección preoperacional para planta de concreto",
  code: "SST-F-116",
  category: CATEGORY.preoperational,
  description:
    "La inspección de la planta de concreto antes de operarla: motor, banda transportadora, instalación eléctrica, básculas y operador. Una por día.",
  sections: sections(
    section("identificacion", "Planta y operador", [
      equipment("Planta de concreto"),
      workCenter(),
      person("Operador", ["cedula"], {
        id: "persona-operador",
        showInTable: true,
      }),
    ]),
    section("inspeccion", "Inspección", [
      checklist(
        "Estado de la planta",
        { scale: SCALE_SNNA, blocks },
        {
          id: "inspeccion",
          description:
            "Los ítems que se hacen «cada semana» se responden N.A los días en que no corresponden.",
        },
      ),
    ]),
    closing("Firma del operador"),
  ),
};
