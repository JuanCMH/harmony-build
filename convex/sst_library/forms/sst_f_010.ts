/** SST-F-010 · Inspección preoperacional para vehículos (versión 4 del papel).
 *
 *  Nueve secciones del papel, nueve bloques de una sola lista: 63 filas que se
 *  responden. El diagrama de posición de llantas no cabe en un formato, así
 *  que cada posición dice en su etiqueta dónde está.
 */

import {
  block,
  checklist,
  date,
  group,
  item,
  number,
  reference,
  SCALE_BMNA,
  section,
  sections,
  select,
} from "../builders";
import {
  CATALOG,
  CATEGORY,
  capacityOptions,
  closing,
  person,
  workCenter,
} from "../common";
import type { LibraryForm } from "../types";

const tire = (position: number, place: string) =>
  item(`Posición ${position} · ${place}`, `posicion-${position}`);

const blocks = [
  block("niveles", "1. Niveles", [
    item("De aceite", "aceite"),
    item("De agua", "agua"),
    item("Hidráulico de la bomba de dirección", "hidraulico-direccion"),
  ]),
  block("mecanico", "2. Mecánico", [
    item("Hojas o muelles", "hojas-muelles"),
    item("Mangueras / correas / ventilador", "mangueras-correas"),
    item("Batería y cables", "bateria-cables"),
    item("Dirección (terminales, búster)", "direccion"),
    item("Freno de emergencia", "freno-emergencia"),
    item("Freno de servicio", "freno-servicio"),
    item("Freno de motor / ahogo", "freno-motor"),
  ]),
  block("carga", "3. Sistema de carga", [
    item(
      "Limpieza general del vehículo (volco, olla, carrocería, cabezote, canal de descargue)",
      "limpieza-general",
    ),
    item(
      "Estado general del vehículo (volco, olla, carrocería, canal de descargue, canales auxiliares, tapa ecológica, puertas, pines de seguridad)",
      "estado-general",
    ),
    item("Tolva (sellos y tapas)", "tolva"),
    item("Escaleras y barandas", "escaleras-barandas"),
  ]),
  block("interior", "4. Interior del vehículo", [
    item("Limpiabrisas / agua", "limpiabrisas"),
    item("Vidrio frontal", "vidrio-frontal"),
    item("Asientos", "asientos"),
    item("Tableros / indicadores", "tableros"),
    item("Timón", "timon"),
    item("Iluminación de cabinas", "iluminacion-cabinas"),
    item("Medidor de combustible", "medidor-combustible"),
    item("Alarma de retroceso", "alarma-retroceso"),
    item("Espejos retrovisores", "espejos"),
    group("Pedales", "pedales", [
      item("Acelerador"),
      item("Clutch"),
      item("Frenos"),
    ]),
  ]),
  block("exterior", "5. Exterior del vehículo", [
    item("Pintura general", "pintura"),
    item("Puertas", "puertas"),
    item("Tanque de combustible", "tanque-combustible"),
    item("Tubo de escape (exhosto)", "tubo-escape"),
    item("Defensa frontal", "defensa-frontal"),
    item("Defensa trasera", "defensa-trasera"),
    item("Señalización de la tolva", "senalizacion-tolva"),
    group("Luces frontales", "luces-frontales", [
      item("Altas"),
      item("Medias"),
      item("Direccionales"),
    ]),
    group("Luces traseras", "luces-traseras", [
      item("Stop"),
      item("De reversa", "reversa"),
      item("Luces estacionarias", "estacionarias"),
    ]),
  ]),
  block("llantas", "6. Llantas según las posiciones", [
    tire(1, "Delantera izquierda"),
    tire(2, "Delantera derecha"),
    tire(3, "Primer eje trasero, izquierda exterior"),
    tire(4, "Primer eje trasero, izquierda interior"),
    tire(5, "Primer eje trasero, derecha interior"),
    tire(6, "Primer eje trasero, derecha exterior"),
    tire(7, "Segundo eje trasero, izquierda exterior"),
    tire(8, "Segundo eje trasero, izquierda interior"),
    tire(9, "Segundo eje trasero, derecha interior"),
    tire(10, "Segundo eje trasero, derecha exterior"),
    tire(11, "Repuesto"),
    item("Rines"),
    item("Suspensión", "suspension"),
  ]),
  block("contingencia", "7. Equipo de contingencia", [
    item("Linterna"),
    item("Extintor"),
  ]),
  block("seguridad", "8. Sistema de seguridad", [
    item("Cinturón de seguridad 1", "cinturon-1"),
    item("Cinturón de seguridad 2", "cinturon-2"),
  ]),
  block("carretera", "9. Equipo de carretera", [
    item("Botiquín", "botiquin"),
    item("Triángulos o conos (2)", "triangulos-conos"),
    item("Tacos (2)", "tacos"),
    item("Copa artillera y palanca", "copa-palanca"),
    item("Gato"),
    item("Herramientas"),
    item("Chaleco reflectivo", "chaleco"),
  ]),
];

export const SST_F_010: LibraryForm = {
  key: "sst-f-010",
  kind: "record",
  name: "Inspección preoperacional para vehículos",
  code: "SST-F-010",
  category: CATEGORY.preoperational,
  description:
    "La inspección que hace el conductor antes de salir: una por vehículo y por día. Para volqueta o mezcladora, con once posiciones de llanta.",
  sections: sections(
    section("identificacion", "Vehículo y conductor", [
      reference(
        "Vehículo",
        CATALOG.vehicles,
        [
          "tipo-vehiculo",
          "propietario",
          "soat-numero",
          "soat-vigencia",
          "tarjeta-propiedad",
          "rtm-numero",
          "rtm-vigencia",
          "seguro-terceros",
        ],
        {
          id: "vehiculo",
          placeholder: "Busca por placa",
          required: true,
          showInTable: true,
        },
      ),
      person(
        "Conductor",
        [
          "cedula",
          "licencia-numero",
          "licencia-categoria",
          "licencia-vigencia",
          "arl",
          "eps",
          "afp",
        ],
        { id: "conductor", showInTable: true },
      ),
      workCenter({ fill: ["ciudad"] }),
      number("Kilometraje u horómetro", {
        id: "kilometraje",
        required: true,
        showInTable: true,
        description:
          "Lectura del odómetro (km) o del horómetro (horas) al iniciar la jornada",
        placeholder: "ej: 45.230",
      }),
      date("Último pago de seguridad social", {
        id: "pago-seguridad-social",
        description: "Fecha del último pago de la planilla del conductor",
      }),
    ]),
    section("inspeccion", "Inspección", [
      checklist(
        "Estado del vehículo",
        { scale: SCALE_BMNA, blocks },
        {
          id: "estado-vehiculo",
          description:
            "B: bueno. M: malo. N.A: el vehículo no lo tiene. Las posiciones de las llantas se cuentan mirando el vehículo desde arriba, con la cabina al frente.",
        },
      ),
      date("Vencimiento del extintor", {
        id: "extintor-vencimiento",
        size: "medium",
        description: "La fecha que indica la etiqueta del extintor",
      }),
      select("Capacidad del extintor", capacityOptions(), {
        id: "extintor-capacidad",
        size: "medium",
      }),
    ]),
    closing("Firma del conductor"),
  ),
};
