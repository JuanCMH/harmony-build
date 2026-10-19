/** Lo que se lee de una importación ya hecha: su recuento, su estado y lo
 *  que se lleva deshacerla. Puro. */

import type { FormKind } from "@/convex/lib/form_types";
import type { ImportStatus } from "@/convex/lib/import_types";

import type { StatusBadge } from "./status";

export interface ImportCounts {
  total: number;
  created: number;
  updated: number;
  skipped: number;
  rejected: number;
}

const number = (value: number) => value.toLocaleString("es-CO");

const counted = (count: number, singular: string, plural: string) =>
  `${number(count)} ${count === 1 ? singular : plural}`;

/** Lo que crea una importación, contado: «3.386 respuestas», «1 elemento». */
export const createdText = (count: number, kind: FormKind): string =>
  kind === "catalog"
    ? counted(count, "elemento", "elementos")
    : counted(count, "respuesta", "respuestas");

/** «3.386 respuestas · 12 rechazadas», sin las partes que son cero. */
export function importCountsText(counts: ImportCounts, kind: FormKind): string {
  const parts = [createdText(counts.created, kind)];
  if (counts.updated > 0) {
    parts.push(counted(counts.updated, "actualizado", "actualizados"));
  }
  if (counts.skipped > 0) {
    parts.push(counted(counts.skipped, "omitido", "omitidos"));
  }
  if (counts.rejected > 0) {
    parts.push(counted(counts.rejected, "fila rechazada", "filas rechazadas"));
  }
  return parts.join(" · ");
}

/** Cuántas filas anunciadas no llegaron a enviarse. Más de cero es una
 *  importación que se quedó a medias. */
export const pendingRows = (counts: ImportCounts): number =>
  Math.max(
    0,
    counts.total -
      counts.created -
      counts.updated -
      counts.skipped -
      counts.rejected,
  );

/** La insignia de una importación. Terminada es lo normal y va sin ella
 *  (`03 §1.4`). */
export const importStatusBadge = (status: ImportStatus): StatusBadge | null => {
  if (status === "running") return { label: "Sin terminar", tone: "yellow" };
  if (status === "reverted") return { label: "Deshecha", tone: "gray" };
  return null;
};

/** El aviso de deshacer, con su recuento (`01 §6.1`). */
export function revertMessage(counts: ImportCounts, kind: FormKind): string {
  const end = "Esta acción no se puede deshacer.";
  if (kind === "record") {
    return `Se eliminarán ${
      counts.created === 1
        ? "la respuesta"
        : `las ${createdText(counts.created, kind)}`
    } que trajo esta importación, y los resultados dejarán de contarlas. ${end}`;
  }
  const kept =
    counts.updated > 0
      ? ` ${
          counts.updated === 1
            ? "El elemento que actualizó conserva"
            : `Los ${number(counts.updated)} que actualizó conservan`
        } sus cambios.`
      : "";
  return `Se retirarán ${
    counts.created === 1
      ? "el elemento"
      : `los ${createdText(counts.created, kind)}`
  } que creó esta importación, salvo los que alguna respuesta ya eligió.${kept} ${end}`;
}
