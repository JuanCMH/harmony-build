/** SST-F-046 · Anexo 6 · Registro fotográfico.
 *
 *  Una tabla con una fila por fotografía. El papel las numera y las agrupa
 *  por semana reportada, cinco por semana: aquí el número es el de la fila y
 *  la semana, dos fechas.
 */

import { column, date, section, sections, table } from "../builders";
import { CATEGORY, workCenter } from "../common";
import type { LibraryForm } from "../types";

export const SST_F_046_A6: LibraryForm = {
  key: "sst-f-046-a6",
  kind: "record",
  name: "Anexo 6 · Registro fotográfico",
  code: "SST-F-046-A6",
  category: CATEGORY.report,
  description:
    "Las fotografías de la semana reportada, cada una con el lugar donde se tomó y sus observaciones.",
  sections: sections(
    section("identificacion", "Lugar y semana reportada", [
      workCenter(),
      date("Semana reportada: desde", {
        id: "semana-desde",
        showInTable: true,
      }),
      date("Semana reportada: hasta", {
        id: "semana-hasta",
        showInTable: true,
      }),
    ]),
    section("fotografias", "Fotografías", [
      table(
        "Fotografías",
        {
          rowLabel: "Fotografía",
          minRows: 1,
          columns: [
            column("Fotografía", "image", { id: "imagen", required: true }),
            column("Lugar", "text", { required: true }),
            column("Observaciones", "text", { id: "observaciones-foto" }),
          ],
        },
        { id: "fotografias", required: true, showInTable: true },
      ),
    ]),
  ),
};
