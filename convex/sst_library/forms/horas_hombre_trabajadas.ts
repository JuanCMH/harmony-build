/** Horas hombre trabajadas.
 *
 *  En el papel es una hoja del informe de gestión SST (`SST-F-046`); aquí es
 *  un formato con nombre propio, que se diligencia por separado.
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

export const HORAS_HOMBRE_TRABAJADAS: LibraryForm = {
  key: "horas-hombre-trabajadas",
  kind: "record",
  name: "Horas hombre trabajadas",
  category: CATEGORY.management,
  description:
    "El registro diario de personas y horas trabajadas, del que salen las horas hombre trabajadas (HHT).",
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
