import type { FormField } from "@/convex/lib/form_types";

import { CHECKLIST_SCALES, matchScale } from "./checklist-scales";
import { countChecklistItems } from "./checklist-editing";

/**
 * La configuración propia de un campo, dicha en una línea: lo que el panel del
 * campo y el lienzo enseñan de una lista de chequeo, una tabla o una relación
 * sin abrir su editor.
 */

const plural = (count: number, one: string, many: string) =>
  `${count} ${count === 1 ? one : many}`;

/** Los nombres de los listados, por id: una relación guarda el id y se lee el
 *  nombre. */
export type CatalogNames = ReadonlyMap<string, string>;

/**
 * «63 ítems en 7 bloques · B / M / N.A», «3 columnas · cada fila es un
 * elemento entregado», «Del listado «Vehículos» · trae 4 datos». `null` en los
 * tipos que no tienen configuración propia.
 */
export const describeTypeConfig = (
  field: FormField,
  catalogNames: CatalogNames,
): string | null => {
  const { checklist, table, reference, signature } = field.config;

  if (field.type === "checklist" && checklist) {
    const items = countChecklistItems(checklist);
    if (items === 0) return "Sin ítems todavía";
    const scaleId = matchScale(checklist.options);
    const scale = scaleId
      ? CHECKLIST_SCALES.find((candidate) => candidate.id === scaleId)?.label
      : checklist.options.map((option) => option.short).join(" / ");
    const blocks =
      checklist.blocks.length > 1
        ? ` en ${plural(checklist.blocks.length, "bloque", "bloques")}`
        : "";
    return `${plural(items, "ítem", "ítems")}${blocks} · ${scale}`;
  }

  if (field.type === "table" && table) {
    const rows = table.rowLabel.trim();
    return `${plural(table.columns.length, "columna", "columnas")}${rows ? ` · cada fila: ${rows}` : ""}`;
  }

  if (field.type === "reference" && reference) {
    if (reference.formId === "") return "Sin listado elegido";
    const name = catalogNames.get(reference.formId);
    const source = name
      ? `Del listado «${name}»`
      : "De un listado que ya no está publicado";
    return reference.fill.length > 0
      ? `${source} · trae ${plural(reference.fill.length, "dato", "datos")}`
      : source;
  }

  if (field.type === "signature" && signature) {
    return signature.signer === "author"
      ? "Firma quien diligencia"
      : "Firma otra persona, con su nombre y documento";
  }

  return null;
};

/**
 * Un número escrito en un ajuste —una longitud, un mínimo—: vacío es «sin
 * límite», y lo que no es número también. Con `integer`, se trunca.
 */
export const parseOptionalNumber = (
  text: string,
  integer = false,
): number | undefined => {
  if (text.trim() === "") return undefined;
  const value = Number(text);
  if (!Number.isFinite(value)) return undefined;
  return integer ? Math.trunc(value) : value;
};
