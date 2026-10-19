"use client";

import { Badge } from "@/components/ui/badge";
import type { ResultData } from "@/convex/lib/result_types";
import { cn } from "@/lib/utils";

import { shortDateEs } from "../lib/date-value";
import { formatNumber, formatWith, measureLabel } from "../lib/result-catalog";
import { STATUS_TONE_CLASS, type StatusTone } from "../lib/status";
import { useFitRows } from "../lib/use-fit-rows";
import { ResultFitList } from "./result-fit-list";

const HEAD =
  "h-9 px-4 text-ui font-normal whitespace-nowrap text-muted-foreground";
const CELL = "h-9 px-4 text-sm whitespace-nowrap";
/** Cada fila de la tabla, la cabecera y el total miden lo mismo. */
const TABLE_ROW = 36;

type TableData = Extract<ResultData, { type: "table" }>;

/**
 * El detalle: una fila por opción o elemento, cada medida en su columna y el
 * total al pie. Enseña las filas que caben en su tarjeta; las demás se dicen
 * en una fila más, y el total sigue siendo el de todas.
 */
export const ResultTable = ({ data }: { data: TableData }) => {
  // La cabecera y el total no cuentan como filas.
  const { ref, visible, hidden } = useFitRows(
    data.rows.length + 2,
    TABLE_ROW,
    TABLE_ROW,
  );
  const shown = Math.max(0, visible - 2);
  return (
    <div ref={ref} className="min-h-0 flex-1 basis-0 overflow-hidden">
      {/* De lado sí: unas columnas que no caben en un teléfono se leen
          desplazando, no partidas. */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th scope="col" className={cn(HEAD, "text-left")}>
                {data.groupLabel || <span className="sr-only">Grupo</span>}
              </th>
              {data.columns.map((column, index) => (
                <th
                  // Dos medidas pueden ser iguales salvo por el campo.
                  key={`${column.operation}-${column.fieldLabel}-${index}`}
                  scope="col"
                  className={cn(HEAD, "text-right")}
                >
                  {measureLabel(column, column.fieldLabel)}
                  {column.unit ? ` (${column.unit})` : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {data.rows.slice(0, shown).map((row) => (
              <tr
                key={row.key}
                className="transition-colors hover:bg-accent/30"
              >
                <th
                  scope="row"
                  className={cn(
                    CELL,
                    "max-w-56 truncate text-left font-normal",
                  )}
                  title={row.label}
                >
                  {row.label}
                </th>
                {row.values.map((value, index) => (
                  <td
                    key={`${row.key}-${index}`}
                    className={cn(CELL, "text-right tabular-nums")}
                  >
                    {formatWith(value, {
                      decimals: data.columns[index]?.decimals,
                    })}
                  </td>
                ))}
              </tr>
            ))}
            {hidden > 0 ? (
              <tr>
                <td
                  colSpan={data.columns.length + 1}
                  className={cn(CELL, "text-xs text-muted-foreground")}
                >
                  y {formatNumber(hidden, 0)}{" "}
                  {hidden === 1 ? "fila más" : "filas más"}
                </td>
              </tr>
            ) : null}
          </tbody>
          <tfoot>
            <tr className="border-t bg-muted/40">
              <th scope="row" className={cn(CELL, "text-left font-medium")}>
                Total
              </th>
              {data.totals.map((value, index) => (
                <td
                  key={`total-${index}`}
                  className={cn(CELL, "text-right font-medium tabular-nums")}
                >
                  {formatWith(value, {
                    decimals: data.columns[index]?.decimals,
                  })}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

type ExpirationsData = Extract<ResultData, { type: "expirations" }>;

/** Qué tan cerca está una fecha, dicho con palabras además del color
 *  (`03 §6.1`). */
const expirationState = (
  daysLeft: number,
): { label: string; tone: StatusTone } => {
  if (daysLeft < 0) {
    const days = Math.abs(daysLeft);
    return {
      label: `Venció hace ${days} ${days === 1 ? "día" : "días"}`,
      tone: "red",
    };
  }
  if (daysLeft === 0) return { label: "Vence hoy", tone: "red" };
  if (daysLeft <= 30) {
    return {
      label: `Vence en ${daysLeft} ${daysLeft === 1 ? "día" : "días"}`,
      tone: "yellow",
    };
  }
  return { label: "Vigente", tone: "green" };
};

/** Las fechas de un listado, la más próxima primero: las que caben. */
export const ResultExpirations = ({ data }: { data: ExpirationsData }) => (
  <ResultFitList
    items={data.rows}
    rowHeight={48}
    itemKey={(row) => `${row.entryId}-${row.fieldLabel}`}
    more={(hidden) => {
      const expired = data.rows
        .slice(data.rows.length - hidden)
        .filter((row) => row.daysLeft < 0).length;
      return `y ${formatNumber(hidden, 0)} más${
        expired > 0
          ? `, ${formatNumber(expired, 0)} ${expired === 1 ? "vencido" : "vencidos"}`
          : ""
      }`;
    }}
    renderItem={(row) => {
      const state = expirationState(row.daysLeft);
      return (
        <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{row.title}</p>
            <p className="truncate text-xs text-muted-foreground">
              {row.fieldLabel} · {shortDateEs(row.date)}
            </p>
          </div>
          <Badge
            variant="outline"
            className={cn("shrink-0", STATUS_TONE_CLASS[state.tone])}
          >
            {state.label}
          </Badge>
        </div>
      );
    }}
  />
);
