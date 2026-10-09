/** SST-F-007 · Entrega de dotación y elementos de protección personal.
 *
 *  El papel es una ficha que acumula las entregas de un trabajador. Aquí cada
 *  respuesta es **una entrega**, con los elementos que se dieron ese día: la
 *  fecha de entrega la pone el sistema y la ficha se reconstruye con el
 *  historial del trabajador. Diligencia quien entrega; quien recibe firma en
 *  ese mismo dispositivo, una vez por entrega.
 */

import {
  choices,
  column,
  section,
  sections,
  signature,
  table,
} from "../builders";
import { CATEGORY, person, workCenter } from "../common";
import type { LibraryForm } from "../types";

export const SST_F_007: LibraryForm = {
  key: "sst-f-007",
  kind: "record",
  name: "Entrega de dotación y elementos de protección personal",
  code: "SST-F-007",
  category: CATEGORY.supplies,
  description:
    "El registro de una entrega de dotación o de EPP a un trabajador, con su firma de recibido.",
  sections: sections(
    // Una sola sección: es un formato corto, y partirlo en dos obligaba a
    // cambiar de pestaña para tres campos.
    section("entrega", "Entrega", [
      person("Trabajador", ["cedula", "cargo"], {
        id: "trabajador",
        showInTable: true,
      }),
      person("Quien entrega", ["cargo"], {
        id: "quien-entrega",
        showInTable: true,
      }),
      workCenter({
        size: "full",
        description: "La obra o el área donde trabaja",
      }),
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
          ],
        },
        { id: "elementos", required: true, showInTable: true },
      ),
      // Una sola firma por entrega. El papel pide una por fila porque su hoja
      // acumula entregas de meses; aquí cada entrega es una respuesta, y todo
      // lo de la tabla se recibe en el mismo momento.
      signature("Recibí a conformidad", "other", {
        id: "recibido",
        required: true,
        description: "Firma el trabajador que recibe",
      }),
    ]),
  ),
};
