/** SST-F-118 · Inspección de botiquines de vehículos.
 *
 *  Por cada elemento: la cantidad actual, el estado y la fecha de
 *  vencimiento. El texto de cada elemento trae la cantidad esperada, como en
 *  el papel.
 */

import {
  block,
  checklist,
  item,
  reference,
  SCALE_BM,
  section,
  sections,
} from "../builders";
import { CATALOG, CATEGORY, closing, observations, person } from "../common";
import type { LibraryForm } from "../types";

const blocks = [
  block("elementos", "", [
    item("6 unid. de gasa estéril", "gasa-esteril"),
    item("3 unid. de bajalenguas", "bajalenguas"),
    item("1 unid. de venda elástica de 3x5 yardas", "venda-elastica-3x5"),
    item("1 botella de agua", "botella-agua"),
    item("1 unid. de gel antibacterial pequeño", "gel-antibacterial"),
    item("1 unid. de tijeras", "tijeras"),
    item("5 unid. de guantes de látex", "guantes-latex"),
    item("1 unid. de micropore", "micropore"),
    item("3 unid. de aplicadores", "aplicadores"),
    item("2 unid. de parche ocular", "parche-ocular"),
    item("5 unid. de curas", "curas"),
    item("2 unid. de tapabocas", "tapabocas"),
    item("1 linterna", "linterna"),
    item("1 silbato", "silbato"),
    item("1 manual de primeros auxilios", "manual-primeros-auxilios"),
    item("1 bolso", "bolso"),
  ]),
];

export const SST_F_118: LibraryForm = {
  key: "sst-f-118",
  kind: "record",
  name: "Inspección de botiquines de vehículos",
  code: "SST-F-118",
  category: CATEGORY.emergency,
  description:
    "La revisión del botiquín de un vehículo, elemento por elemento: cuánto hay, en qué estado está y cuándo vence.",
  sections: sections(
    section("inspeccion", "Inspección", [
      reference("Vehículo", CATALOG.vehicles, ["tipo-vehiculo"], {
        id: "vehiculo",
        placeholder: "Busca por placa",
        required: true,
        showInTable: true,
      }),
      person("Responsable", ["cargo"], {
        id: "responsable",
        showInTable: true,
      }),
      checklist(
        "Elementos del botiquín",
        {
          scale: SCALE_BM,
          blocks,
          quantity: "Cantidad actual",
          date: "Fecha de vencimiento",
        },
        {
          id: "inspeccion",
          description:
            "B: existe y está en buenas condiciones. M: está en mal estado o está vencido.",
        },
      ),
      ...closing("Firma del responsable", observations("Comentarios")),
    ]),
  ),
};
