"use client";

import type { ResultData } from "@/convex/lib/result_types";

import { shortDateEs } from "../lib/date-value";
import { formatNumber } from "../lib/result-catalog";
import { ResultFitList } from "./result-fit-list";

type CoverageData = Extract<ResultData, { type: "coverage" }>;

/**
 * Los elementos de un programa, los menos cubiertos primero: cuántas veces se
 * hizo de las que tocaba, y cuándo fue la última. Los que caben en la
 * tarjeta; los demás, mejor cubiertos, se cuentan. La barra es una magnitud,
 * no un estado: va en el acento (`03 §1.4`), y la cifra va escrita.
 */
export const ResultCoverageRows = ({
  data,
  shareSpace = false,
}: {
  data: CoverageData;
  /** Va debajo de la línea del programa: le deja el alto que no usa. */
  shareSpace?: boolean;
}) => (
  <ResultFitList
    items={data.rows}
    shareSpace={shareSpace}
    rowHeight={48}
    beyond={data.others}
    itemKey={(row) => row.key}
    more={(hidden) =>
      `y ${formatNumber(hidden, 0)} ${hidden === 1 ? "elemento más" : "elementos más"}, mejor cubiertos`
    }
    renderItem={(row) => (
      <div className="grid min-w-0 flex-1 grid-cols-[minmax(0,2fr)_minmax(0,2fr)_auto] items-center gap-x-3">
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium">
            {row.label}
          </span>
          <span className="block truncate text-xs text-muted-foreground">
            {row.last
              ? `Última: ${shortDateEs(row.last)}`
              : "Sin respuestas en el periodo"}
          </span>
        </span>
        <span
          aria-hidden
          className="h-2.5 overflow-hidden rounded-full bg-muted"
        >
          <span
            className="block h-full rounded-full bg-h-indigo"
            style={{ width: `${(row.done / row.expected) * 100}%` }}
          />
        </span>
        <span className="text-right text-ui tabular-nums">
          <span className="font-medium">{formatNumber(row.done, 0)}</span>
          <span className="text-muted-foreground">
            {" "}
            de {formatNumber(row.expected, 0)}
          </span>
        </span>
      </div>
    )}
  />
);
