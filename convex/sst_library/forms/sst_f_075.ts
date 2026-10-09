/** SST-F-075 · Inspección de botiquín de centros de trabajo.
 *
 *  Las cuatro preguntas Sí/No del encabezado son una lista de chequeo corta,
 *  no casillas: una casilla sin marcar no distingue «no» de «no respondí».
 */

import {
  block,
  checklist,
  choices,
  item,
  SCALE_BM,
  SCALE_SN,
  section,
  sections,
  select,
  text,
} from "../builders";
import { CATEGORY, closing, person, workCenter } from "../common";
import type { LibraryForm } from "../types";

const conditionBlocks = [
  block("condiciones", "", [
    item("¿El botiquín se encuentra instalado en la pared?", "instalado-pared"),
    item("¿El botiquín está localizado en un lugar visible?", "lugar-visible"),
    item("¿El botiquín se encuentra libre de obstáculo?", "libre-obstaculo"),
    item("¿El botiquín se encuentra señalizado?", "senalizado"),
  ]),
];

const elementBlocks = [
  block("elementos", "", [
    item("Gasa estéril paquete x 5", "gasa-esteril"),
    item("Apósito o compresas no estériles paquete x 4", "aposito-compresas"),
    item("Esparadrapo de tela en rollo unidad x 1", "esparadrapo"),
    item("Bajalenguas paquete x 20", "bajalenguas"),
    item("Venda elástica 2x5 yardas unidad x 1", "venda-elastica-2x5"),
    item("Venda elástica 3x5 yardas unidad x 1", "venda-elastica-3x5"),
    item("Venda elástica 5x5 yardas unidad x 1", "venda-elastica-5x5"),
    item("Venda de algodón 3x5 yardas unidad x 1", "venda-algodon-3x5"),
    item("Venda de algodón 5x5 yardas unidad x 1", "venda-algodon-5x5"),
    item("Jabón líquido antibacterial unidad x 1", "jabon-liquido"),
    item("Solución salina de 250cc o 500cc unidad x 1", "solucion-salina"),
    item("Guantes de látex para examen paquete x 5 pares", "guantes-latex"),
    item("Termómetro digital unidad x 1", "termometro"),
    item("Alcohol antiséptico por 275ml unidad x 1", "alcohol"),
    item("Tijeras unidad x 1", "tijeras"),
    item("Linterna unidad x 1", "linterna"),
    item("Pilas de repuesto par x 1", "pilas-repuesto"),
    item("Collar cervical adulto unidad x 1", "collar-cervical"),
    item(
      "Inmovilizador o férula miembros superiores adulto unidad x 1",
      "ferula-superiores",
    ),
    item(
      "Inmovilizador o férula miembros inferiores adulto unidad x 1",
      "ferula-inferiores",
    ),
    item(
      "Elementos de barrera o máscara para reanimación cardiopulmonar unidad x 1",
      "mascara-reanimacion",
    ),
    item("Micropore 2.5 unidad x 1", "micropore"),
    item("Parche ocular unidad x 6", "parche-ocular"),
    item("Curas paquete x 20", "curas"),
    item("Jeringa unidad x 2", "jeringa"),
    item("Tapabocas paquete x 10", "tapabocas"),
    item("Bolso unidad x 1", "bolso"),
    item("Aplicadores paquete x 20", "aplicadores"),
    item("Libreta unidad x 1", "libreta"),
    item("Esfero unidad x 1", "esfero"),
    item("Manual de primeros auxilios unidad x 1", "manual-primeros-auxilios"),
    item("Silbato unidad x 1", "silbato"),
    item("Botella de agua 600ml unidad x 1", "botella-agua"),
  ]),
];

export const SST_F_075: LibraryForm = {
  key: "sst-f-075",
  kind: "record",
  name: "Inspección de botiquín de centros de trabajo",
  code: "SST-F-075",
  category: CATEGORY.emergency,
  description:
    "La revisión del botiquín de un centro de trabajo: dónde está, cómo está instalado y, elemento por elemento, cuánto hay, en qué estado y cuándo vence.",
  sections: sections(
    section("inspeccion", "Inspección", [
      workCenter(),
      text("Ubicación", {
        required: true,
        showInTable: true,
        description: "En qué parte del centro de trabajo está el botiquín",
        placeholder: "ej: Oficina de obra, primer piso",
      }),
      select("Tipo de botiquín", choices(["Portátil", "Fijo"]), {
        id: "tipo-botiquin",
        size: "small",
      }),
      select(
        "Presentación",
        choices(["Caja", "Bolso", "Canguro"], "presentacion"),
        { size: "small" },
      ),
      person("Responsable", ["cargo"], { id: "responsable" }),
      checklist(
        "Condiciones del botiquín",
        // La observación es opcional aquí: un botiquín portátil responde «No»
        // a «instalado en la pared» y no tiene nada que explicar.
        { scale: SCALE_SN, blocks: conditionBlocks, note: "optional" },
        { id: "condiciones-botiquin" },
      ),
      checklist(
        "Elementos del botiquín",
        {
          scale: SCALE_BM,
          blocks: elementBlocks,
          quantity: "Cantidad actual",
          date: "Fecha de vencimiento",
        },
        {
          id: "inspeccion",
          description:
            "B: existe y está en buenas condiciones. M: está en mal estado o vencido.",
        },
      ),
      ...closing("Firma del responsable"),
    ]),
  ),
};
