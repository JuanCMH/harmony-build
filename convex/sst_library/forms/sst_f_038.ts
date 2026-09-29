/** SST-F-038 · Inspección preoperacional para pulidora.
 *
 *  Los ítems de pila y cargador sólo aplican a la pulidora inalámbrica. Las
 *  reglas no entran dentro de una lista de chequeo, así que se quedan en la
 *  lista y en la eléctrica se responden «N.A».
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
  block("pulidora", "", [
    item("Se verificó el estado de pila", "pila"),
    item("Se verificó el estado del cargador", "cargador"),
    item(
      "Se verificó el estado de conexiones eléctricas (extensiones, cables, toma)",
      "conexiones-electricas",
    ),
    item(
      "Se verificó el estado de instalación del disco (inserción)",
      "instalacion-disco",
    ),
    item("Cuenta con acoples adecuados para los accesorios", "acoples"),
    item("Se verificó el estado e instalación del mango", "mango"),
    item("Se verificó el estado del interruptor de encendido", "interruptor"),
    item("Posee protector de disco", "protector-disco"),
    item("Se utilizan accesorios apropiados para la tarea", "accesorios"),
    item(
      "Se verificó el estado general de la pulidora (fisuras, roturas, aseo, etc.)",
      "estado-general",
    ),
    item("Se utilizan adecuadamente los EPP para la labor", "epp"),
    item("Se verificó el estado del disco", "estado-disco"),
    item("Se posee llave para desmonte de disco", "llave-desmonte"),
    item("Está disponible en el lugar de trabajo el extintor", "extintor"),
  ]),
];

export const SST_F_038: LibraryForm = {
  key: "sst-f-038",
  kind: "record",
  name: "Inspección preoperacional para pulidora",
  code: "SST-F-038",
  category: CATEGORY.preoperational,
  description:
    "La inspección de la pulidora, inalámbrica o eléctrica, antes de usarla: una por equipo y por día.",
  sections: sections(
    section("identificacion", "Equipo y lugar", [
      equipment("Pulidora", {
        fill: ["tipo-pulidora", "marca", "referencia"],
      }),
      workCenter(),
    ]),
    section("inspeccion", "Inspección", [
      checklist(
        "Estado de la pulidora",
        { scale: SCALE_BMNA, blocks },
        {
          id: "inspeccion",
          description:
            "La pila y el cargador sólo aplican a la pulidora inalámbrica: en la eléctrica, marca N.A.",
        },
      ),
    ]),
    closing("Firma del operador"),
  ),
};
