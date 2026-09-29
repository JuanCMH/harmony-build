/** SST-F-007 · Entrega de dotación y elementos de protección personal.
 *
 *  El papel es una ficha que acumula las entregas de un trabajador. Aquí cada
 *  respuesta es **una entrega**, con los elementos que se dieron ese día: la
 *  fecha de entrega la pone el sistema y la ficha se reconstruye con el
 *  historial del trabajador. Diligencia quien entrega; quien recibe firma en
 *  ese mismo dispositivo, una vez por elemento, como en el papel.
 */

import { choices, column, section, sections, table } from "../builders";
import { CATEGORY, person, workCenter } from "../common";
import type { LibraryForm } from "../types";

export const SST_F_007: LibraryForm = {
  key: "sst-f-007",
  kind: "record",
  name: "Entrega de dotación y elementos de protección personal",
  code: "SST-F-007",
  category: CATEGORY.supplies,
  description:
    "El registro de una entrega de dotación o de EPP a un trabajador, con la firma de recibido por cada elemento.",
  sections: sections(
    section("identificacion", "Trabajador", [
      person("Trabajador", ["cedula", "cargo"], {
        id: "trabajador",
        showInTable: true,
      }),
      workCenter({ description: "La obra o el área donde trabaja" }),
    ]),
    section("entrega", "Entrega", [
      table(
        "Elementos entregados",
        {
          rowLabel: "Elemento entregado",
          minRows: 1,
          columns: [
            column("Cantidad", "number", { required: true }),
            column("Detalle", "text", { required: true }),
            column("Talla", "text"),
            column("Tipo de entrega", "select", {
              id: "tipo-entrega",
              required: true,
              options: choices(["Reposición", "Entrega periódica"]),
            }),
            column("Recibí a conformidad", "signature", {
              id: "recibido",
              required: true,
            }),
          ],
        },
        { id: "elementos", required: true, showInTable: true },
      ),
      person("Quien entrega", ["cargo"], {
        id: "quien-entrega",
        showInTable: true,
      }),
    ]),
  ),
};
