/** Seguimiento de hallazgos.
 *
 *  No sale de una hoja del papel: sale de lo que al papel le falta. Ninguna
 *  inspección tiene dónde anotar quién corrige lo que salió mal ni cuándo; la
 *  de camilla sólo dice que las novedades «deberán estar solucionadas antes
 *  de la próxima inspección».
 *
 *  Es un seguimiento de dos etapas. Lo abre quien encuentra el hallazgo, con
 *  su responsable y su fecha de compromiso; lo cierra quien lo corrige, con
 *  lo que hizo y la foto de después.
 */

import {
  choices,
  date,
  image,
  reference,
  section,
  sections,
  select,
  text,
  textarea,
} from "../builders";
import { CATALOG, CATEGORY, person, workCenter } from "../common";
import type { LibraryForm } from "../types";

export const SEGUIMIENTO_DE_HALLAZGOS: LibraryForm = {
  key: "seguimiento-de-hallazgos",
  kind: "tracking",
  name: "Seguimiento de hallazgos",
  category: CATEGORY.tracking,
  description:
    "Lo que una inspección o un recorrido encontró mal, con su responsable y su fecha de compromiso, hasta que se corrige.",
  titleFieldId: "hallazgo",
  tracking: {
    dueDateFieldId: "fecha-compromiso",
    responsibleFieldId: "responsable",
    numberPrefix: "H",
  },
  sections: sections(
    section(
      "hallazgo",
      "Hallazgo",
      [
        text("Hallazgo", {
          size: "full",
          required: true,
          showInTable: true,
          description: "Qué se encontró, en una frase",
          placeholder: "ej: Extintor del cargador sin presión",
        }),
        select(
          "De dónde sale",
          choices(
            [
              "Inspección preoperacional",
              "Inspección de emergencia",
              "Recorrido de seguridad",
              "Reporte de un trabajador",
              "Otro",
            ],
            "origen",
          ),
          { id: "origen", required: true },
        ),
        select("Prioridad", choices(["Alta", "Media", "Baja"], "prioridad"), {
          required: true,
          showInTable: true,
          description:
            "Alta: hay que parar o corregir hoy. Media: esta semana. Baja: puede programarse",
        }),
        workCenter(),
        select(
          "Clase",
          choices(
            [
              "Condición insegura",
              "Acto inseguro",
              "Elemento faltante o vencido",
              "Daño de equipo o vehículo",
            ],
            "clase",
          ),
          { id: "clase" },
        ),
        reference("Vehículo", CATALOG.vehicles, ["tipo-vehiculo"], {
          id: "vehiculo",
          placeholder: "Busca por placa",
          description: "Sólo si el hallazgo es de un vehículo",
        }),
        reference("Equipo", CATALOG.equipment, ["marca", "referencia"], {
          id: "equipo",
          placeholder: "Busca por nombre del equipo",
          description: "Sólo si el hallazgo es de un equipo",
        }),
        textarea("Descripción", {
          id: "descripcion",
          description: "Dónde está, qué riesgo trae y lo que haga falta saber",
        }),
        image("Foto del hallazgo", { id: "foto-hallazgo" }),
        person("Responsable", ["cargo"], {
          id: "responsable",
          showInTable: true,
          description: "Quien responde por corregirlo",
        }),
        date("Fecha de compromiso", {
          id: "fecha-compromiso",
          size: "medium",
          required: true,
          showInTable: true,
          description: "Hasta cuándo hay plazo para corregirlo",
        }),
      ],
      "Lo que se encontró, quién lo corrige y para cuándo.",
    ),
    section(
      "cierre",
      "Cierre",
      [
        textarea("Qué se hizo", {
          id: "accion",
          required: true,
          description: "La acción con que se corrigió",
        }),
        image("Foto de la corrección", { id: "foto-correccion" }),
        select("¿Quedó solucionado?", choices(["Sí", "No"], "solucionado"), {
          id: "solucionado",
          required: true,
          description:
            "Si no, este asunto se cierra igual y se abre otro para lo que falta",
        }),
        date("Fecha de la corrección", {
          id: "fecha-correccion",
          size: "medium",
        }),
        textarea("Observaciones del cierre", { id: "observaciones-cierre" }),
      ],
      "Lo completa quien corrigió el hallazgo.",
    ),
  ),
};
