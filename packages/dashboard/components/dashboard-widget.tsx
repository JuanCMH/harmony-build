"use client";

import { Hint } from "@/components/harmony/hint";
import { PanelCard } from "@/components/harmony/panel-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Id } from "@/convex/_generated/dataModel";
import type { ResultType } from "@/convex/lib/result_types";
import { useComputeFormResults } from "@/packages/forms/api";
import { ResultCard } from "@/packages/forms/components/result-card";
import { RESULT_CATALOG } from "@/packages/forms/lib/result-catalog";
import type { ResultsRange } from "@/packages/forms/lib/results-range";
import { formRoutes } from "@/packages/forms/lib/routes";
import { useProjectId } from "@/packages/projects/store/use-project-id";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

interface DashboardWidgetProps {
  widget: {
    resultId: Id<"formResults">;
    name: string;
    type: ResultType;
    formId: Id<"forms">;
    formName: string;
  };
  range: ResultsRange;
  today: string;
  className?: string;
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
      <PanelCard
        icon={RESULT_CATALOG[widget.type].icon}
        title={widget.name}
        description={widget.formName}
        className={className}
        contentClassName="p-4"
      >
        {data === undefined ? (
          // Del alto de lo que viene: la tarjeta no salta al cargar.
          <div className="space-y-3" aria-busy="true">
            <span className="sr-only">Calculando…</span>
            <Skeleton className="h-8 w-28" />
            <Skeleton
              className={
                widget.type === "trend" || widget.type === "compliance"
                  ? "h-52 w-full"
                  : "h-24 w-full"
              }
            />
          </div>
        ) : (
          <p className="flex flex-1 items-center justify-center py-8 text-center text-sm text-muted-foreground">
            No tienes acceso a las respuestas de este formato.
          </p>
        )}
      </PanelCard>
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
      className={className}
      actions={
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
      }
    />
  );
};
