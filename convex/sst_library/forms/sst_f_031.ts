/** SST-F-031 · Inspección preoperacional para soldadura eléctrica.
 *
 *  El papel numera los ítems y salta el 8: aquí no se numeran.
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
  block("soldadura", "Equipo de soldadura", [
    item("Estado general del equipo", "estado-general"),
    item("Condiciones del sistema de refrigeración", "refrigeracion"),
    item("Sistema eléctrico (cables)", "sistema-electrico"),
    item("Sistema de aislamiento (revestimiento cables)", "aislamiento"),
    item("Conexión a tierra (cable a tierra)", "conexion-tierra"),
    item("Sistema de conexión (enchufes, etc.)", "sistema-conexion"),
    item("Estado de la pinza (conexión al cable)", "pinza"),
  ]),
  block("proteccion", "Protección personal", [
    item(
      "El trabajador cuenta y usa adecuadamente la mascarilla para humo metálico y careta para soldar",
      "mascarilla-careta",
    ),
    item(
      "El trabajador posee la dotación necesaria para el desarrollo de sus actividades (pantalón jeans, chaqueta, polainas, guantes de carnaza y delantal de carnaza)",
      "dotacion",
    ),
  ]),
  block("general", "General", [
    item(
      "El soldador está capacitado y certificado para realizar actividad en soldadura",
      "soldador-certificado",
    ),
    item(
      "Se le ha divulgado a todo el personal los riesgos a los cuales están expuestos",
      "riesgos-divulgados",
    ),
    item("Cuenta en el área de trabajo con un extintor", "extintor"),
    item(
      "Área de trabajo libre de sustancias inflamables y demás materiales que puedan arder (alrededor de 10.7 m)",
      "libre-inflamables",
    ),
    item("Área de trabajo en condiciones de orden y aseo", "orden-aseo"),
    item("Área de trabajo señalizada", "senalizada"),
    item(
      "Se requiere supervisión constante de la actividad",
      "supervision-constante",
    ),
  ]),
];

export const SST_F_031: LibraryForm = {
  key: "sst-f-031",
  kind: "record",
  name: "Inspección preoperacional para soldadura eléctrica",
  code: "SST-F-031",
  category: CATEGORY.preoperational,
  description:
    "La inspección del equipo de soldadura, de la protección del soldador y del área de trabajo antes de soldar: una por equipo y por día.",
  sections: sections(
    section("inspeccion", "Inspección", [
      equipment("Equipo de soldadura"),
      workCenter(),
      checklist(
        "Estado del equipo y del área",
        { scale: SCALE_BMNA, blocks },
        { id: "inspeccion" },
      ),
      ...closing("Firma del operador"),
    ]),
  ),
};
