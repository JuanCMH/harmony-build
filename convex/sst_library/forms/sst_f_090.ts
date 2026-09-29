/** SST-F-090 · Inspección preoperacional para prensa hidráulica. */

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
  block("prensa", "", [
    item(
      "Aseguramiento de la broca fija y funcionamiento de la broca móvil",
      "brocas",
    ),
    item("Visualización de la guía (estado)", "guia"),
    item(
      "Aseguramiento y estado de manivela (desgastada, con superficies filosas o ásperas)",
      "manivela",
    ),
    item("Fijación del eje (sostenibilidad de la manivela)", "fijacion-eje"),
    item("Instalación de base de fijación", "base-fijacion"),
    item(
      "Se verificó que la mesa y los pernos de soporte estén firmes y nivelados",
      "mesa-pernos",
    ),
    item(
      "Estado de las mangueras y conexiones (cilindros, sellos)",
      "mangueras-conexiones",
    ),
    item("Estado de nivel de aceite", "nivel-aceite"),
    item(
      "Estado del manómetro (la aguja se mueve suavemente y marca correctamente la presión aplicada)",
      "manometro",
    ),
    item(
      "Estado de la válvula de alivio (verificar que la válvula de liberación abra y cierre suavemente para despresurizar el sistema)",
      "valvula-alivio",
    ),
    item("Estado de las guardas", "guardas"),
    item("Estado de pedales", "pedales"),
    item(
      "Estado de conexiones eléctricas (cableado, tomas)",
      "conexiones-electricas",
    ),
    item("Estado del control manual", "control-manual"),
    item(
      "Estado general de la prensa (fisuras, rupturas, aseo, entre otros)",
      "estado-general",
    ),
    item("Se utilizan adecuadamente los EPP para la labor", "epp"),
  ]),
];

export const SST_F_090: LibraryForm = {
  key: "sst-f-090",
  kind: "record",
  name: "Inspección preoperacional para prensa hidráulica",
  code: "SST-F-090",
  category: CATEGORY.preoperational,
  description:
    "La inspección de la prensa hidráulica antes de usarla: una por equipo y por día.",
  sections: sections(
    section("identificacion", "Equipo y lugar", [
      equipment("Prensa hidráulica"),
      workCenter(),
    ]),
    section("inspeccion", "Inspección", [
      checklist(
        "Estado de la prensa",
        { scale: SCALE_BMNA, blocks },
        { id: "inspeccion" },
      ),
    ]),
    closing("Firma del operador"),
  ),
};
