/** SST-F-046 · Anexo 2 · Control de ausentismo, morbilidad, incapacidad y
 *  primeros auxilios.
 *
 *  Una respuesta por evento, no una tabla del mes: el evento se registra
 *  cuando ocurre. El diagnóstico es texto corto: el catálogo CIE-10 no entra
 *  en esta fase (diseño, pregunta abierta 5).
 */

import {
  choice,
  choices,
  date,
  number,
  section,
  sections,
  select,
  text,
  textarea,
} from "../builders";
import { CATEGORY, person, workCenter } from "../common";
import type { LibraryForm } from "../types";

export const SST_F_046_A2: LibraryForm = {
  key: "sst-f-046-a2",
  kind: "record",
  name: "Anexo 2 · Control de ausentismo",
  code: "SST-F-046-A2",
  category: CATEGORY.report,
  description:
    "El registro de una ausencia, incapacidad o atención de primeros auxilios: quién, por qué, de cuándo a cuándo y qué se hizo.",
  sections: sections(
    section("identificacion", "Trabajador", [
      person("Trabajador", ["cedula", "cargo"], {
        id: "trabajador",
        showInTable: true,
      }),
      workCenter({
        showInTable: false,
        description: "El área o el proyecto donde trabaja",
      }),
      date("Fecha del evento", {
        id: "fecha-evento",
        size: "medium",
        required: true,
        showInTable: true,
      }),
      select("Género", choices(["Femenino", "Masculino"]), {
        id: "genero",
        size: "medium",
      }),
    ]),
    section("ausencia", "Ausencia", [
      select(
        "Tipo de ausencia",
        choices([
          "Incapacidad",
          "Licencia de maternidad",
          "Licencia de paternidad",
        ]),
        { id: "tipo-ausencia", required: true, showInTable: true },
      ),
      select(
        "Origen del evento",
        [choice("ATEL"), choice("ACEC"), choice("No aplica", "origen-na")],
        {
          id: "origen",
          size: "small",
          required: true,
          showInTable: true,
          description:
            "ATEL: accidente de trabajo o enfermedad laboral. ACEC: accidente común o enfermedad común",
        },
      ),
      number("Días de ausencia", {
        id: "dias-ausencia",
        required: true,
        showInTable: true,
        placeholder: "ej: 3",
      }),
      date("Fecha de inicio", { id: "fecha-inicio" }),
      date("Fecha final", { id: "fecha-final" }),
      text("Diagnóstico", {
        id: "diagnostico",
        description: "El código CIE-10 o el diagnóstico de la incapacidad",
        placeholder: "ej: M54.5 Lumbago no especificado",
      }),
    ]),
    section("descripcion", "Descripción", [
      textarea("Descripción de lo ocurrido o del motivo de la ausencia", {
        id: "descripcion",
      }),
      textarea("Descripción del primer auxilio que se prestó", {
        id: "primer-auxilio",
        description: "Sólo si se prestó",
      }),
      textarea("Observaciones", { id: "observaciones" }),
    ]),
  ),
};
