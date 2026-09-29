/** SST-F-074 · Inspección de extintores.
 *
 *  El papel es una hoja con una fila por extintor y ocho criterios en
 *  columnas. Aquí es **una respuesta por extintor**, elegido del listado: así
 *  cada extintor tiene su historial (diseño §4.3).
 */

import {
  block,
  checklist,
  date,
  item,
  reference,
  SCALE_CNC,
  section,
  sections,
} from "../builders";
import { CATALOG, CATEGORY, closing, person, workCenter } from "../common";
import type { LibraryForm } from "../types";

const blocks = [
  block("criterios", "", [
    item("Estado de manguera, corneta o boquilla", "manguera-boquilla"),
    item("Válvulas (mecanismos de seguro)", "valvulas"),
    item(
      "Estado de manómetro (señalador inmóvil, atascado o perdido. Cristal deformado o roto. Carátula ilegible. Corrosión. Cubierta)",
      "manometro",
    ),
    item("Manija de transporte", "manija"),
    item(
      "Estado del cilindro (libre de corrosión, abolladuras o golpes)",
      "cilindro",
    ),
    item("Extintor libre de obstáculos y señalizado", "libre-senalizado"),
    item(
      "Altura de instalación (sobre base soporte con distancia de piso)",
      "altura-instalacion",
    ),
    item(
      "Se encuentra con el nivel indicado de presurización",
      "presurizacion",
    ),
  ]),
];

export const SST_F_074: LibraryForm = {
  key: "sst-f-074",
  kind: "record",
  name: "Inspección de extintores",
  code: "SST-F-074",
  category: CATEGORY.emergency,
  description:
    "La revisión de un extintor con sus ocho criterios. Se diligencia una vez por cada extintor, y cada uno conserva su historial.",
  sections: sections(
    section("identificacion", "Extintor e inspector", [
      reference(
        "Extintor",
        CATALOG.extinguishers,
        ["tipo-extintor", "capacidad", "ubicacion"],
        {
          id: "extintor",
          placeholder: "Busca por número",
          required: true,
          showInTable: true,
        },
      ),
      workCenter(),
      person("Quien inspecciona", ["cargo"], { id: "responsable" }),
    ]),
    section("inspeccion", "Inspección", [
      checklist(
        "Criterios de inspección",
        { scale: SCALE_CNC, blocks },
        { id: "inspeccion", description: "C: conforme. NC: no conforme." },
      ),
      date("Fecha de próxima recarga", {
        id: "proxima-recarga",
        size: "medium",
        showInTable: true,
        description: "La que indica la etiqueta del extintor",
      }),
    ]),
    closing("Firma de quien inspecciona"),
  ),
};
