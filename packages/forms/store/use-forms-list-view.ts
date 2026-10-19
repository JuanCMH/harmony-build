import type { FormKind } from "@/convex/lib/form_types";
import {
  parseAsBoolean,
  parseAsString,
  parseAsStringLiteral,
  useQueryStates,
} from "nuqs";

/**
 * El estado de la lista de formatos, en la URL.
 *
 * La pestaña, la búsqueda y los filtros viajan en la dirección: un enlace a
 * «los listados archivados de SST» reproduce esa pantalla (`02 §8`). Los
 * parámetros van en español, como lo que ve el usuario en la barra.
 */
export const FORM_CLASSES = ["formatos", "listados", "seguimientos"] as const;

export type FormClass = (typeof FORM_CLASSES)[number];

export const KIND_BY_CLASS: Record<FormClass, FormKind> = {
  formatos: "record",
  listados: "catalog",
  seguimientos: "tracking",
};

export const useFormsListView = () =>
  useQueryStates({
    clase: parseAsStringLiteral(FORM_CLASSES).withDefault("formatos"),
    buscar: parseAsString.withDefault(""),
    categoria: parseAsString.withDefault(""),
    archivados: parseAsBoolean.withDefault(false),
  });
