import type { FormKind } from "@/convex/lib/form_types";

/**
 * Cómo se nombra cada clase de formato y lo que guarda. Tres clases dichas en
 * veinte sitios con un ternario acaban llamando «formato» a un seguimiento:
 * aquí se dice una vez.
 */
export const KIND_TEXT: Record<
  FormKind,
  {
    /** «formato», «formatos», «Formato». */
    one: string;
    many: string;
    title: string;
    /** La pestaña de la lista: «Formatos». */
    listLabel: string;
    /** Lo que guarda: «Respuestas», «Elementos», «Asuntos». */
    itemsLabel: string;
  }
> = {
  record: {
    one: "formato",
    many: "formatos",
    title: "Formato",
    listLabel: "Formatos",
    itemsLabel: "Respuestas",
  },
  catalog: {
    one: "listado",
    many: "listados",
    title: "Listado",
    listLabel: "Listados",
    itemsLabel: "Elementos",
  },
  tracking: {
    one: "seguimiento",
    many: "seguimientos",
    title: "Seguimiento",
    listLabel: "Seguimientos",
    itemsLabel: "Asuntos",
  },
};
