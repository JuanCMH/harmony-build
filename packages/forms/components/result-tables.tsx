import { Badge } from "@/components/ui/badge";
import type { ResultData } from "@/convex/lib/result_types";
import { cn } from "@/lib/utils";

import { shortDateEs } from "../lib/date-value";
import { formatWith, measureLabel } from "../lib/result-catalog";
import { STATUS_TONE_CLASS, type StatusTone } from "../lib/status";

const HEAD =
  "px-4 py-2 text-ui font-normal whitespace-nowrap text-muted-foreground";
const CELL = "px-4 py-2 text-sm";

type TableData = Extract<ResultData, { type: "table" }>;

/** El detalle: una fila por opción o elemento, cada medida en su columna y
 *  el total al pie. */
export const ResultTable = ({ data }: { data: TableData }) => (
  // Con techo: una tabla larga se desplaza dentro de su tarjeta en vez de
  // empujar a las demás (`03 §2.3`).
  <div className="max-h-96 overflow-auto">
    <table className="w-full">
      <thead className="sticky top-0 bg-card">
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
        {data.rows.map((row) => (
          <tr key={row.key} className="transition-colors hover:bg-accent/30">
            <th scope="row" className={cn(CELL, "text-left font-normal")}>
              {row.label}
            </th>
            {row.values.map((value, index) => (
              <td
                key={`${row.key}-${index}`}
                className={cn(CELL, "text-right tabular-nums")}
              >
                {formatWith(value, { decimals: data.columns[index]?.decimals })}
              </td>
            ))}
          </tr>
        ))}
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
              {formatWith(value, { decimals: data.columns[index]?.decimals })}
            </td>
          ))}
        </tr>
      </tfoot>
    </table>
  </div>
);

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

/** Las fechas de un listado, la más próxima primero. */
export const ResultExpirations = ({ data }: { data: ExpirationsData }) => (
  <ul className="max-h-96 divide-y divide-border/60 overflow-y-auto">
    {data.rows.map((row) => {
      const state = expirationState(row.daysLeft);
      return (
        <li
          key={`${row.entryId}-${row.fieldLabel}`}
          className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2 first:pt-0 last:pb-0"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{row.title}</p>
            <p className="truncate text-xs text-muted-foreground">
              {row.fieldLabel} · {shortDateEs(row.date)}
            </p>
          </div>
          <Badge variant="outline" className={STATUS_TONE_CLASS[state.tone]}>
            {state.label}
          </Badge>
        </li>
      );
    })}
  </ul>
);
