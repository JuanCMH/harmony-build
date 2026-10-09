/** Registro fotográfico.
 *
 *  En el papel es una hoja del informe de gestión SST (`SST-F-046`); aquí es
 *  un formato con nombre propio, que se diligencia por separado.
 *
 *  Una tabla con una fila por fotografía. El papel las numera y las agrupa
 *  por semana reportada, cinco por semana: aquí el número es el de la fila y
 *  la semana, dos fechas.
 */

import { column, date, section, sections, table } from "../builders";
import { CATEGORY, workCenter } from "../common";
import type { LibraryForm } from "../types";

export const REGISTRO_FOTOGRAFICO: LibraryForm = {
  key: "registro-fotografico",
  kind: "record",
  name: "Registro fotográfico",
  category: CATEGORY.management,
  description:
    "Las fotografías de la semana reportada, cada una con el lugar donde se tomó y sus observaciones.",
  sections: sections(
    section("fotografias", "Fotografías", [
      workCenter(),
      date("Semana reportada: desde", {
        id: "semana-desde",
        showInTable: true,
      }),
      date("Semana reportada: hasta", {
        id: "semana-hasta",
        showInTable: true,
      }),
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
