"use client";

import { SearchableSelect } from "@/components/harmony/searchable-select";
import { Label } from "@/components/ui/label";
import { TriangleAlert } from "lucide-react";
import { useMemo } from "react";

import { cellText, isBlankCell } from "../lib/import-cells";
import type { ImportWizard } from "../lib/use-import-wizard";
import { Notice } from "./import-file-step";

/** «No importar» necesita un valor propio: la lista no elige el vacío. */
const SKIP = "@skip";

/** El primer dato que trae cada columna: ayuda a reconocerla. */
const sampleOf = (wizard: ImportWizard, column: number): string => {
  for (const row of wizard.file?.sheet.rows ?? []) {
    const cell = row.cells[column] ?? null;
    if (!isBlankCell(cell)) return cellText(cell);
  }
  return "";
};

/**
 * Paso 2: a qué campo va cada columna. La plataforma propone por nombre y
 * quien importa corrige.
 */
export const ImportColumnsStep = ({ wizard }: { wizard: ImportWizard }) => {
  const { file, targets, mapping, isRecord, dateColumn, columnsProblem } =
    wizard;
  const headers = file?.sheet.headers ?? [];

  const targetOptions = useMemo(
    () => [
      { value: SKIP, label: "No importar" },
      ...targets.map((target) => ({ value: target.key, label: target.label })),
    ],
    [targets],
  );
  const columnOptions = useMemo(
    () =>
      headers.map((header, index) => ({ value: String(index), label: header })),
    [headers],
  );
  const samples = useMemo(
    () => headers.map((_, index) => sampleOf(wizard, index)),
    // Sólo cambian con el archivo, y `headers` cambia con él.
    [headers],
  );
  const assigned = Object.keys(mapping).length;

  return (
    <div className="space-y-4">
      {isRecord ? (
        <div className="space-y-2">
          <Label htmlFor="import-date-column">Fecha del hecho</Label>
          <SearchableSelect
            id="import-date-column"
            value={dateColumn === null ? undefined : String(dateColumn)}
            onValueChange={(value) => wizard.setDateColumn(Number(value))}
            options={columnOptions}
            placeholder="Elige la columna"
            searchPlaceholder="Buscar columna…"
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">
            El día en que ocurrió cada fila. Es la fecha con que la respuesta
            entra en los resultados; si trae hora, se ignora.
          </p>
        </div>
      ) : null}

      <div className="space-y-3">
        <div className="flex items-baseline gap-2">
          <h3 className="text-sm font-medium">Columnas</h3>
          <p className="text-sm text-muted-foreground tabular-nums">
            {assigned} de {headers.length} asignadas
          </p>
        </div>
        <ul className="divide-y divide-border/60 rounded-lg border">
          {headers.map((header, column) => (
            <li
              // La columna es su posición: no se reordena.
              key={column}
              className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-center gap-3 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm" title={header}>
                  {header}
                </p>
                <p
                  className="truncate text-xs text-muted-foreground"
                  title={samples[column]}
                >
                  {samples[column] === "" ? "Sin datos" : samples[column]}
                </p>
              </div>
              <SearchableSelect
                aria-label={`Destino de la columna ${header}`}
                size="sm"
                value={mapping[column] ?? SKIP}
                onValueChange={(value) =>
                  wizard.setColumn(column, value === SKIP ? null : value)
                }
                options={targetOptions}
                searchPlaceholder="Buscar campo…"
                className="w-full"
                align="end"
              />
            </li>
          ))}
        </ul>
      </div>

      {columnsProblem ? (
        <Notice tone="yellow" icon={TriangleAlert}>
          {columnsProblem}
        </Notice>
      ) : null}
    </div>
  );
};
