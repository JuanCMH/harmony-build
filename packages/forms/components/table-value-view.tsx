import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fieldText } from "@/convex/lib/field_text";
import type {
  CellValue,
  TableColumn,
  TableConfig,
  TableRow as TableRowValue,
} from "@/convex/lib/form_types";
import {
  isBlankCell,
  isFileValue,
  isReferenceValue,
  isSignatureValue,
} from "@/convex/lib/stored_values";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

import {
  type ValueViewContext,
  columnAsField,
} from "../lib/response-reading";
import { EmptyValue } from "./empty-value";
import { FileValueView } from "./file-value-view";
import { ReferenceValueView } from "./reference-value-view";
import { SignatureValueView } from "./signature-value-view";

interface TableValueViewProps {
  config: TableConfig;
  rows: readonly TableRowValue[];
  context: ValueViewContext;
}

const NUMERIC_COLUMNS: ReadonlyArray<TableColumn["type"]> = ["number"];

/**
 * Una tabla respondida, para leerla: una tabla de verdad desde `lg`, y en el
 * teléfono una tarjeta por fila con sus celdas apiladas, que es como se
 * diligenció (`03 §6.2`).
 */
export const TableValueView = ({
  config,
  rows,
  context,
}: TableValueViewProps) => {
  const rowLabel = config.rowLabel || "Fila";
  const cellOf = (row: TableRowValue, column: TableColumn) =>
    row.cells.find((cell) => cell.columnId === column.id)?.value;

  return (
    <>
      <div className="hidden overflow-clip rounded-lg border bg-card lg:block">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-10 text-ui font-normal text-muted-foreground">
                <span className="sr-only">{rowLabel}</span>
                <span aria-hidden>N.º</span>
              </TableHead>
              {config.columns.map((column) => (
                <TableHead
                  key={column.id}
                  className={cn(
                    "text-ui font-normal text-muted-foreground",
                    NUMERIC_COLUMNS.includes(column.type) && "text-right",
                  )}
                >
                  {column.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, index) => (
              <TableRow key={row.rowId} className="hover:bg-transparent">
                <TableCell className="align-top text-ui text-muted-foreground tabular-nums">
                  {index + 1}
                </TableCell>
                {config.columns.map((column) => (
                  <TableCell
                    key={column.id}
                    className={cn(
                      "min-w-24 align-top whitespace-normal",
                      NUMERIC_COLUMNS.includes(column.type) &&
                        "text-right tabular-nums",
                    )}
                  >
                    <CellValueView
                      column={column}
                      value={cellOf(row, column)}
                      context={context}
                      empty={
                        <span className="text-muted-foreground">
                          <span aria-hidden>—</span>
                          <span className="sr-only">Sin respuesta</span>
                        </span>
                      }
                    />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ol className="space-y-3 lg:hidden">
        {rows.map((row, index) => (
          <li key={row.rowId} className="rounded-lg border bg-card">
            <p className="border-b px-3 py-2 text-sm font-medium">
              {rowLabel} {index + 1}
            </p>
            <dl className="space-y-3 p-3">
              {config.columns.map((column) => (
                <div key={column.id} className="min-w-0 space-y-0.5">
                  <dt className="text-xs text-muted-foreground">
                    {column.label}
                  </dt>
                  <dd>
                    <CellValueView
                      column={column}
                      value={cellOf(row, column)}
                      context={context}
                      empty={<EmptyValue />}
                    />
                  </dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ol>
    </>
  );
};

/** El valor de una celda. Se lee como el campo que sería su columna si
 *  estuviera suelta, con las piezas grandes —firma, imagen— en su tamaño de
 *  celda. */
const CellValueView = ({
  column,
  value,
  context,
  empty,
}: {
  column: TableColumn;
  value: CellValue | undefined;
  context: ValueViewContext;
  empty: ReactNode;
}) => {
  if (value === undefined || isBlankCell(value)) return <>{empty}</>;

  if (column.type === "signature" && isSignatureValue(value))
    return (
      <SignatureValueView
        value={value}
        url={context.fileUrls.get(value.storageId)}
        compact
      />
    );

  if (column.type === "image" && isFileValue(value))
    return (
      <FileValueView
        value={value}
        url={context.fileUrls.get(value.storageId)}
        kind="image"
        compact
      />
    );

  if (column.type === "reference" && isReferenceValue(value))
    return (
      <ReferenceValueView
        value={value}
        href={
          column.reference
            ? context.entryHref(column.reference.formId, value.responseId)
            : undefined
        }
        compact
      />
    );

  return (
    <span className="text-sm break-words">
      {fieldText(columnAsField(column), value)}
    </span>
  );
};
