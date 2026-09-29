/** SST-F-046 · Anexo 1 · Horas hombre trabajadas.
 *
 *  Un registro por día. Las HHT se calculan como en la hoja:
 *  personas × horas × días + tiempo extra.
 */

import {
  formula,
  number,
  operand,
  PLUS,
  section,
  sections,
  TIMES,
} from "../builders";
import { CATEGORY, workCenter } from "../common";
import type { LibraryForm } from "../types";

export const SST_F_046_A1: LibraryForm = {
  key: "sst-f-046-a1",
  kind: "record",
  name: "Anexo 1 · Horas hombre trabajadas",
  code: "SST-F-046-A1",
  category: CATEGORY.report,
  description:
    "El registro diario de personas y horas trabajadas, del que salen las horas hombre trabajadas (HHT) del informe de gestión.",
  sections: sections(
    section("horas", "Horas hombre trabajadas", [
      workCenter(),
      number("N.º de personas", {
        id: "personas",
        required: true,
        showInTable: true,
        placeholder: "ej: 24",
      }),
      number("Horas laboradas en el día", {
        id: "horas",
        required: true,
        showInTable: true,
        placeholder: "ej: 8",
      }),
      number("Días laborados", {
        id: "dias",
        required: true,
        description:
          "Los días que cubre este registro. Si es el de un solo día, escribe 1",
        placeholder: "ej: 1",
      }),
      number("Tiempo extra", {
        id: "tiempo-extra",
        description: "Horas extra de todas las personas, sumadas",
        placeholder: "ej: 6",
      }),
      formula(
        "HHT",
        [
          operand("personas"),
          TIMES,
          operand("horas"),
          TIMES,
          operand("dias"),
          PLUS,
          operand("tiempo-extra"),
        ],
        {
          id: "hht",
          size: "medium",
          showInTable: true,
          rounding: 1,
          description:
            "Horas hombre trabajadas: personas × horas × días + tiempo extra",
        },
      ),
    ]),
  ),
};
