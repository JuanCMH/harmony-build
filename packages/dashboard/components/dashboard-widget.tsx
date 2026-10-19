"use client";

import { Hint } from "@/components/harmony/hint";
import { WidgetCard } from "@/components/harmony/widget-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Id } from "@/convex/_generated/dataModel";
import type { ResultData, ResultType } from "@/convex/lib/result_types";
import type { WidgetHeight } from "@/convex/lib/result_validators";
import { useComputeFormResults } from "@/packages/forms/api";
import { ResultCard } from "@/packages/forms/components/result-card";
import { RESULT_CATALOG } from "@/packages/forms/lib/result-catalog";
import type { ResultsRange } from "@/packages/forms/lib/results-range";
import { formRoutes } from "@/packages/forms/lib/routes";
import { useProjectId } from "@/packages/projects/store/use-project-id";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

interface DashboardWidgetProps {
  widget: {
    resultId: Id<"formResults">;
    name: string;
    type: ResultType;
    formId: Id<"forms">;
    formName: string;
    height: WidgetHeight;
  };
  range: ResultsRange;
  today: string;
  /** El sitio en la retícula: columnas y pisos. */
  className?: string;
  /** Al editar el tablero, su menú ocupa el sitio de «Ver en el formato»:
   *  la tarjeta conserva su alto, y lo que se ve al editar es lo que queda. */
  editMenu?: (data: ResultData | undefined) => ReactNode;
}

/**
 * Un resultado en el tablero. Pide los resultados de **su formato** para el
 * rango de la pestaña y se queda con el suyo: dos resultados del mismo
 * formato comparten la consulta, y sus respuestas se leen una sola vez.
 */
export const DashboardWidget = ({
  widget,
  range,
  today,
  className,
  editMenu,
}: DashboardWidgetProps) => {
  const projectId = useProjectId();
  const { data } = useComputeFormResults({
    formId: widget.formId,
    ...range,
    today,
  });
  const result = data?.results.find((one) => one._id === widget.resultId);

  if (!result) {
    return (
      <WidgetCard
        icon={RESULT_CATALOG[widget.type].icon}
        title={widget.name}
        caption={widget.formName}
        className={className}
        actions={editMenu?.(undefined)}
      >
        {data === undefined ? (
          // Del alto de su tarjeta: no salta al cargar.
          <div className="flex flex-1 flex-col gap-3" aria-busy="true">
            <span className="sr-only">Calculando…</span>
            <Skeleton className="h-8 w-28" />
            <Skeleton className="w-full flex-1" />
          </div>
        ) : (
          <p className="flex flex-1 items-center justify-center text-center text-sm text-muted-foreground">
            No tienes acceso a las respuestas de este formato.
          </p>
        )}
      </WidgetCard>
    );
  }

  return (
    <ResultCard
      name={result.name}
      caption={widget.formName}
      // Con el tope alcanzado las cifras son de una parte del periodo, y se
      // dice dentro de la tarjeta: en la cabecera se cortaba.
      notice={
        data?.capped
          ? "Sólo entran las respuestas más recientes del periodo."
          : undefined
      }
      config={result.config}
      data={result.data}
      problem={result.problem}
      today={today}
      range={range}
      height={widget.height}
      className={className}
      actions={
        editMenu ? (
          editMenu(result.data)
        ) : (
          <Hint label="Ver en el formato" align="end">
            <Button
              variant="ghost"
              size="iconSm"
              className="text-muted-foreground"
              asChild
            >
              <Link
                href={formRoutes.results(projectId, widget.formId)}
                aria-label={`Ver ${result.name} en su formato`}
              >
                <ArrowUpRight />
              </Link>
            </Button>
          </Hint>
        )
      }
    />
  );
};
