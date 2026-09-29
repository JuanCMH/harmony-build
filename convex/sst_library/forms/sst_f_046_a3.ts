/** SST-F-046 · Anexo 3 · Seguimiento de capacitación y charlas de seguridad.
 *
 *  Una respuesta por capacitación o charla. La columna «Total de horas» de la
 *  hoja repite las horas (`=F9`), así que no es un campo: el total del mes es
 *  una suma de respuestas.
 */

import { number, section, sections, text } from "../builders";
import { CATEGORY, workCenter } from "../common";
import type { LibraryForm } from "../types";

export const SST_F_046_A3: LibraryForm = {
  key: "sst-f-046-a3",
  kind: "record",
  name: "Anexo 3 · Capacitación y charlas",
  code: "SST-F-046-A3",
  category: CATEGORY.report,
  description:
    "El registro de una capacitación o charla de seguridad: el tema, cuántas personas participaron y cuánto duró.",
  sections: sections(
    section("capacitacion", "Capacitación o charla", [
      text("Capacitación o charla", {
        id: "tema",
        required: true,
        showInTable: true,
        description: "El tema que se trató",
        placeholder: "ej: Trabajo seguro en alturas",
      }),
      workCenter(),
      number("Participantes", {
        size: "medium",
        required: true,
        showInTable: true,
        placeholder: "ej: 18",
      }),
      number("Horas", {
        size: "medium",
        required: true,
        showInTable: true,
        description: "Lo que duró la capacitación",
        placeholder: "ej: 1,5",
      }),
    ]),
  ),
};
