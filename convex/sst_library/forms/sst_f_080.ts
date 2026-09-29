/** SST-F-080 · Inspección preoperacional para cargador.
 *
 *  La leyenda del papel anuncia C / N.C / N.A, pero sus columnas son
 *  B / M / N.A: manda lo que se marca. Las dos preguntas Sí/No del final son
 *  una lista de chequeo corta, no casillas: una casilla sin marcar no
 *  distingue «no» de «no respondí».
 */

import {
  block,
  checklist,
  item,
  SCALE_BMNA,
  SCALE_SN,
  section,
  sections,
} from "../builders";
import { CATEGORY, closing, equipment, workCenter } from "../common";
import type { LibraryForm } from "../types";

const tireState =
  "(estado físico no lisas, sin cortaduras profundas, sin abultamientos)";

const blocks = [
  block("luces", "Luces", [
    item("Luces: delantera, trasera y de cabina", "delantera-trasera-cabina"),
  ]),
  block("cabina", "Cabina", [
    item(
      "Estado de puerta y vidrios (laterales, frontal y trasero)",
      "puerta-vidrios",
    ),
    item("Funcionamiento de plumillas (delanteras y traseras)", "plumillas"),
    item("Funcionamiento de sistema de calefacción", "calefaccion"),
    item("Cinturón de seguridad y operatividad", "cinturon"),
    item("Estado del asiento", "asiento"),
    item("Estado de espejos retrovisores", "espejos"),
    item(
      "Indicadores: aceite del motor, amperímetro, horómetro",
      "indicadores",
    ),
    item("Estado del pito", "pito"),
    item("Estado de la alarma de reversa", "alarma-reversa"),
    item("Palanca de mando de avance y retroceso", "palanca-mando"),
    item("Funcionamiento de frenos (manual y pedal)", "frenos"),
    item("Estado y funcionamiento de direccionales", "direccionales"),
    item(
      "Funcionalidad de palanca para monte y desmonte de balde y/o uñas",
      "palanca-balde",
    ),
    item(
      "Estado y aseguramiento de escalones o peldaños y puntos de agarre para acceso",
      "escalones",
    ),
    item("Aseo general del vehículo de carga", "aseo"),
  ]),
  block("mecanico", "Estado mecánico", [
    item(
      "Estado del motor (no presenta fugas, ruidos anormales, condiciones de aseo)",
      "motor",
    ),
    item("Batería (niveles, bornes, cables, tapones)", "bateria"),
    item("Estado de chasis", "chasis"),
    item(
      "Estado de mangueras y botellas (sistema hidráulico)",
      "mangueras-botellas",
    ),
    item("Estado tanque de combustible", "tanque-combustible"),
    item("Estado y funcionamiento de timón (cabrilla)", "timon"),
    item(`Llantas delanteras ${tireState}`, "llantas-delanteras"),
    item(`Llantas traseras ${tireState}`, "llantas-traseras"),
    item("Estado general de la máquina", "estado-general"),
  ]),
  block("emergencias", "Atención de emergencias", [
    item(
      "Disponibilidad de extintor, información de etiqueta y estado general del mismo",
      "extintor",
    ),
    item(
      "Disponibilidad de botiquín de primeros auxilios y revisión de elementos",
      "botiquin",
    ),
  ]),
  block("epp", "EPP del operario", [
    item("Botas de seguridad", "botas"),
    item("Guantes"),
    item("Casco"),
    item("Monogafas de seguridad", "monogafas"),
    item("Protección respiratoria", "respiratoria"),
    item("Protección auditiva (tapaoídos tipo copa)", "auditiva"),
    item(
      "Ropa de labor (pantalón jeans y camisa manga larga con reflectivo)",
      "ropa-labor",
    ),
  ]),
];

const operatorBlocks = [
  block("operario", "", [
    item(
      "El operario está en condiciones de salud para operar el vehículo",
      "condiciones-salud",
    ),
    item(
      "El operario tiene la experiencia y certificación para operar el vehículo",
      "experiencia-certificacion",
    ),
  ]),
];

export const SST_F_080: LibraryForm = {
  key: "sst-f-080",
  kind: "record",
  name: "Inspección preoperacional para cargador",
  code: "SST-F-080",
  category: CATEGORY.preoperational,
  description:
    "La inspección del cargador y de los elementos de protección de quien lo opera, antes de operar: una por máquina y por día.",
  sections: sections(
    section("identificacion", "Máquina y lugar", [
      equipment("Cargador"),
      workCenter(),
    ]),
    section("inspeccion", "Inspección", [
      checklist(
        "Inspección general del cargador",
        { scale: SCALE_BMNA, blocks },
        { id: "inspeccion" },
      ),
      checklist(
        "Condiciones del operario",
        { scale: SCALE_SN, blocks: operatorBlocks },
        { id: "condiciones-operario" },
      ),
    ]),
    closing("Firma del operador"),
  ),
};
