/** Lo que se repite entre los formatos SST: las claves de los listados, las
 *  categorías y los campos que todos comparten (el centro de trabajo, el
 *  equipo, quien inspecciona, las observaciones y la firma).
 */

import type { FieldOption, FormField } from "../lib/form_types";
import {
  choice,
  type FieldExtras,
  reference,
  signature,
  textarea,
} from "./builders";

/** Las claves de los cinco listados, que son también el destino de las
 *  relaciones (`@vehiculos`). */
export const CATALOG = {
  workCenters: "centros-de-trabajo",
  staff: "personal",
  vehicles: "vehiculos",
  equipment: "equipos",
  extinguishers: "extintores",
} as const;

export const CATEGORY = {
  catalogs: "Listados maestros",
  preoperational: "Inspecciones preoperacionales",
  emergency: "Inspecciones de emergencia",
  supplies: "Dotación",
  management: "Gestión SST",
} as const;

/** Las tres capacidades de extintor que trae el papel. */
export const capacityOptions = (): FieldOption[] => [
  choice("10 lb", "10-lb"),
  choice("20 lb", "20-lb"),
  choice("30 lb", "30-lb"),
];

/** «Proyecto», «obra», «centro de trabajo» y «obra o área» del papel son este
 *  campo: una relación al listado de centros de trabajo. */
export const workCenter = (
  extras: FieldExtras & { fill?: string[] } = {},
): FormField => {
  const { fill, ...rest } = extras;
  return reference("Centro de trabajo", CATALOG.workCenters, fill ?? [], {
    id: "centro-trabajo",
    placeholder: "Busca por nombre",
    required: true,
    showInTable: true,
    ...rest,
  });
};

/** El equipo que se inspecciona, con la marca y la referencia que el papel
 *  pedía copiar a mano. */
export const equipment = (
  label: string,
  extras: FieldExtras & { fill?: string[] } = {},
): FormField => {
  const { fill, ...rest } = extras;
  return reference(label, CATALOG.equipment, fill ?? ["marca", "referencia"], {
    id: "equipo",
    placeholder: "Busca por nombre del equipo",
    required: true,
    showInTable: true,
    ...rest,
  });
};

/** Una persona del listado de personal, con los datos suyos que pide el
 *  papel junto al nombre: el cargo, la cédula. */
export const person = (
  label: string,
  fill: string[],
  extras: FieldExtras = {},
): FormField =>
  reference(label, CATALOG.staff, fill, {
    placeholder: "Busca por nombre",
    required: true,
    ...extras,
  });

export const observations = (
  label = "Observaciones generales",
  extras: FieldExtras = {},
): FormField => textarea(label, { id: "observaciones", ...extras });

/** La firma de quien diligencia: su nombre sale de la sesión. */
export const authorSignature = (label: string): FormField =>
  signature(label, "author", { id: "firma", required: true });

/** Lo último de toda inspección: las observaciones generales, que no son
 *  obligatorias, y la firma, que sí. Van al final de la misma sección que la
 *  lista de chequeo: una inspección se recorre de arriba abajo, sin pestañas. */
export const closing = (
  signatureLabel: string,
  notes: FormField = observations(),
): FormField[] => [notes, authorSignature(signatureLabel)];
