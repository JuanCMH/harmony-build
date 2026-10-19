"use client";

import { SearchableSelect } from "@/components/harmony/searchable-select";
import { Skeleton } from "@/components/ui/skeleton";
import { IMPORT_LIMITS } from "@/convex/lib/import_types";
import { useMemo } from "react";

import { BLANK_CHOICE } from "../lib/import-mapping";
import type { ImportWizard } from "../lib/use-import-wizard";

/** «Sin correspondencia» necesita un valor propio: la lista no elige el
 *  vacío. */
const UNMATCHED = "@unmatched";

type GroupState = ImportWizard["groupStates"][number];

const ValueGroupBlock = ({
  state,
  wizard,
}: {
  state: GroupState;
  wizard: ImportWizard;
}) => {
  const { group, values, choices, map, unmatched } = state;
  const isReference = group.catalogId !== null;

  const options = useMemo(
    () => [
      {
        value: UNMATCHED,
        label: "Sin correspondencia",
        description: "Sus filas se quedan fuera",
      },
      {
        value: BLANK_CHOICE,
        label: "Dejar vacío",
        description: "La fila entra sin este dato",
      },
      ...choices.map((choice) => ({
        value: choice.value,
        label: choice.label,
      })),
    ],
    [choices],
  );

  const columns =
    group.columns.length === 1
      ? "1 columna"
      : `${group.columns.length} columnas`;

  return (
    <section className="space-y-3">
      <div>
        <div className="flex items-baseline gap-2">
          <h3 className="min-w-0 truncate text-sm font-medium">
            {group.label}
          </h3>
          <p className="shrink-0 text-sm text-muted-foreground tabular-nums">
            {values.length}{" "}
            {values.length === 1 ? "valor distinto" : "valores distintos"}
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          {isReference ? "Elementos del listado" : "Opciones del campo"} ·{" "}
          {columns}
          {unmatched > 0
            ? ` · ${unmatched} sin correspondencia`
            : " · todos con correspondencia"}
        </p>
      </div>

      {state.isLoading ? (
        <div aria-busy="true" className="space-y-2">
          <span className="sr-only">Cargando los elementos del listado…</span>
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      ) : state.tooMany ? (
        <p className="rounded-lg border p-3 text-sm text-muted-foreground">
          Son más de {IMPORT_LIMITS.maxDistinctValues} valores distintos: no se
          asignan a mano. Entran los que coinciden con{" "}
          {isReference ? "el título de un elemento" : "una opción"}; las filas
          de los demás se quedan fuera, y la revisión dice cuáles.
        </p>
      ) : (
        <ul className="divide-y divide-border/60 rounded-lg border">
          {values.map((value) => (
            <li
              key={value.key}
              className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-center gap-3 px-3 py-2"
            >
              <div className="flex min-w-0 items-baseline gap-2">
                <p className="truncate text-sm" title={value.text}>
                  {value.text}
                </p>
                <p className="shrink-0 text-xs text-muted-foreground tabular-nums">
                  {value.count.toLocaleString("es-CO")}{" "}
                  {value.count === 1 ? "vez" : "veces"}
                </p>
              </div>
              <SearchableSelect
                aria-label={`Correspondencia de ${value.text}`}
                size="sm"
                value={map[value.key] ?? UNMATCHED}
                onValueChange={(choice) =>
                  wizard.setValueChoice(
                    group.key,
                    value.key,
                    choice === UNMATCHED ? "" : choice,
                  )
                }
                options={options}
                searchPlaceholder={
                  isReference ? "Buscar elemento…" : "Buscar opción…"
                }
                className="w-full"
                align="end"
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

/**
 * Paso 3: a qué opción o a qué elemento corresponde cada valor distinto del
 * archivo. Es el que absorbe el desorden real: un puesto escrito de veinte
 * maneras se asigna veinte veces al mismo elemento, una sola vez.
 */
export const ImportValuesStep = ({ wizard }: { wizard: ImportWizard }) => (
  <div className="space-y-6">
    <p className="text-sm text-muted-foreground">
      Lo que coincide por nombre ya está asignado. Revisa el resto: un valor sin
      correspondencia deja sus filas fuera.
    </p>
    {wizard.groupStates.map((state) => (
      <ValueGroupBlock key={state.group.key} state={state} wizard={wizard} />
    ))}
  </div>
);
