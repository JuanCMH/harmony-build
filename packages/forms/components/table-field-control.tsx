"use client";

import { Button } from "@/components/ui/button";
import type { TableColumn, TableConfig } from "@/convex/lib/form_types";
import { isBlankCell } from "@/convex/lib/stored_values";
import { cn } from "@/lib/utils";
import { Plus, Trash2 } from "lucide-react";
import type { ReactNode } from "react";

import { cellDomId, cellFrameId } from "../lib/field-dom";
import {
  addRow,
  canAddRow,
  canRemoveRow,
  cellValue,
  type DraftRow,
  ensureRows,
  isEmptyRow,
  removeRow,
  setCell,
} from "../lib/table";
import { DESKTOP_QUERY, useMediaQuery } from "../lib/use-media-query";

/** Lo que necesita quien pinta el control de una celda. */
export interface TableCellRenderProps {
  id: string;
  column: TableColumn;
  value: unknown;
  invalid: boolean;
  onChange: (value: unknown) => void;
}

interface TableFieldControlProps {
  id: string;
  label: string;
  config: TableConfig;
  required: boolean;
  value: unknown;
  disabled: boolean;
  showMissing: boolean;
  onChange: (rows: DraftRow[]) => void;
  /** El control de cada celda, según su columna. Lo pone `FormFieldInput`:
   *  una celda es un campo pequeño y se pinta con los mismos controles. */
  renderCell: (props: TableCellRenderProps) => ReactNode;
}

/**
 * Una tabla para diligenciar: filas que se añaden y se quitan, cada celda con
 * el control de su tipo.
 *
 * En el teléfono cada fila es una tarjeta —«Elemento entregado 2»—, con sus
 * celdas una debajo de otra y «Quitar» al pie: una tabla de cinco columnas no
 * cabe en 390px y desplazarla de lado con el pulgar es la manera de saltarse
 * una celda. Desde `lg`, una tabla de verdad (`03 §6.2`). Se monta **una** de
 * las dos, no las dos con una oculta: los `id` de las celdas y el trazo de
 * cada firma no pueden estar dos veces.
 */
export const TableFieldControl = ({
  id,
  label,
  config,
  required,
  value,
  disabled,
  showMissing,
  onChange,
  renderCell,
}: TableFieldControlProps) => {
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  const rows = ensureRows(value, config, required);
  const canRemove = !disabled && canRemoveRow(rows, config, required);
  const rowLabel = config.rowLabel || "Fila";

  // Una celda obligatoria falta cuando su fila tiene algo escrito: una fila
  // vacía no se guarda. La primera de una tabla obligatoria se exige siempre.
  const isCellMissing = (row: DraftRow, index: number, column: TableColumn) =>
    showMissing &&
    column.required &&
    isBlankCell(cellValue(row, column.id)) &&
    (!isEmptyRow(row) || (required && index === 0));

  const cellProps = (row: DraftRow, index: number, column: TableColumn) => ({
    id: cellDomId(id, row.rowId, column.id),
    column,
    value: cellValue(row, column.id),
    invalid: isCellMissing(row, index, column),
    onChange: (next: unknown) =>
      onChange(setCell(rows, config, row.rowId, column.id, next)),
  });

  const remove = (rowId: string) =>
    onChange(removeRow(rows, config, required, rowId));

  const addButton = canAddRow(rows, config) ? (
    <Button
      type="button"
      variant="outline"
      className="h-10 w-full sm:h-9"
      disabled={disabled}
      onClick={() => onChange(addRow(rows, config))}
    >
      <Plus />
      Añadir {rowLabel.toLowerCase()}
    </Button>
  ) : (
    <p className="text-center text-xs text-muted-foreground">
      Ya están las {rows.length} filas que admite «{label}».
    </p>
  );

  if (isDesktop) {
    return (
      <div className="space-y-3">
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th
                  scope="col"
                  className="w-10 px-3 py-2 text-left text-ui font-normal text-muted-foreground"
                >
                  <span className="sr-only">Número</span>
                </th>
                {config.columns.map((column) => (
                  <th
                    key={column.id}
                    scope="col"
                    className={cn(
                      "px-2 py-2 text-left text-ui font-normal text-muted-foreground",
                      column.type === "signature" && "min-w-64",
                      column.type === "reference" && "min-w-56",
                      // El nombre del archivo y su botón, en una línea.
                      // Ancho fijo: un nombre de archivo largo se recorta
                      // en vez de quitarle el sitio a las demás columnas.
                      column.type === "image" && "w-72 min-w-64",
                      // Un texto de 90px se lee «Botas de se»: el detalle es
                      // lo que más se escribe en una fila.
                      column.type === "text" && "min-w-40",
                    )}
                  >
                    {column.label}
                    {column.required ? (
                      <>
                        <span aria-hidden className="text-destructive">
                          {" "}
                          *
                        </span>
                        <span className="sr-only"> (obligatorio)</span>
                      </>
                    ) : null}
                  </th>
                ))}
                <th scope="col" className="w-12">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {rows.map((row, index) => (
                <tr key={row.rowId} className="align-top">
                  <td className="px-3 py-3 text-ui text-muted-foreground tabular-nums">
                    {index + 1}
                  </td>
                  {config.columns.map((column) => (
                    <td
                      key={column.id}
                      id={cellFrameId(id, row.rowId, column.id)}
                      className="scroll-mt-28 px-2 py-2"
                      aria-label={`${column.label}, ${rowLabel.toLowerCase()} ${index + 1}`}
                    >
                      {renderCell(cellProps(row, index, column))}
                    </td>
                  ))}
                  <td className="px-2 py-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-9 text-muted-foreground hover:text-destructive"
                      aria-label={`Quitar ${rowLabel.toLowerCase()} ${index + 1}`}
                      disabled={!canRemove}
                      onClick={() => remove(row.rowId)}
                    >
                      <Trash2 />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {addButton}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((row, index) => (
        <section
          key={row.rowId}
          aria-label={`${rowLabel} ${index + 1}`}
          className="space-y-4 rounded-lg border bg-card p-3"
        >
          <p className="text-sm font-medium">
            {rowLabel}{" "}
            <span className="text-muted-foreground tabular-nums">
              {index + 1}
            </span>
          </p>
          {config.columns.map((column) => {
            const props = cellProps(row, index, column);
            return (
              <div
                key={column.id}
                id={cellFrameId(id, row.rowId, column.id)}
                className="scroll-mt-28 space-y-1.5"
              >
                <label htmlFor={props.id} className="block text-sm font-medium">
                  {column.label}
                  {column.required ? (
                    <>
                      <span aria-hidden className="text-destructive">
                        {" "}
                        *
                      </span>
                      <span className="sr-only"> (obligatorio)</span>
                    </>
                  ) : null}
                </label>
                {renderCell(props)}
                {props.invalid ? (
                  <p className="text-xs font-medium text-destructive">
                    Falta este dato
                  </p>
                ) : null}
              </div>
            );
          })}
          {canRemove ? (
            <Button
              type="button"
              variant="ghost"
              className="h-10 w-full text-muted-foreground hover:text-destructive"
              onClick={() => remove(row.rowId)}
            >
              <Trash2 />
              Quitar
            </Button>
          ) : null}
        </section>
      ))}
      {addButton}
    </div>
  );
};
