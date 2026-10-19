import { Badge } from "@/components/ui/badge";
import { dateText } from "@/convex/lib/field_text";
import { isOverdue } from "@/convex/lib/tracking";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

import { momentText, personName } from "../lib/response-reading";
import { STATUS_TONE_CLASS, trackingStatusBadge } from "../lib/status";

type Person = { name?: string; email?: string } | null;

interface TrackingProgressProps {
  status: string;
  /** Lo que devuelve `formResponses.getById` en `tracking`. */
  tracking: {
    code: string;
    dueDate: string | null;
    responsible: string | null;
    stages: {
      sectionId: string;
      label: string;
      completedAt: number | null;
      completedBy: Person;
    }[];
  };
  today: string;
}

/**
 * Dónde va un asunto: su consecutivo, su estado, su compromiso, y sus etapas
 * en orden —las completadas con quién y cuándo, y la que toca—.
 */
export const TrackingProgress = ({
  status,
  tracking,
  today,
}: TrackingProgressProps) => {
  const badge = trackingStatusBadge(
    status,
    isOverdue({ status, dueDate: tracking.dueDate }, today),
  );
  const current =
    status === "open"
      ? tracking.stages.findIndex((stage) => stage.completedAt === null)
      : -1;

  return (
    <section aria-label="Estado del asunto" className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <span className="font-medium tabular-nums">{tracking.code}</span>
        <Badge variant="outline" className={STATUS_TONE_CLASS[badge.tone]}>
          {badge.label}
        </Badge>
        {tracking.responsible ? (
          <span className="text-muted-foreground">
            Responsable: {tracking.responsible}
          </span>
        ) : null}
        {tracking.dueDate ? (
          <span className="text-muted-foreground tabular-nums">
            Compromiso: {dateText(tracking.dueDate)}
          </span>
        ) : null}
      </div>

      <ol className="divide-y divide-border/60 rounded-lg border">
        {tracking.stages.map((stage, index) => {
          const done = stage.completedAt !== null;
          return (
            <li key={stage.sectionId} className="flex items-start gap-3 p-3">
              <span
                aria-hidden
                className={cn(
                  "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border text-2xs tabular-nums",
                  done
                    ? STATUS_TONE_CLASS.green
                    : index === current
                      ? STATUS_TONE_CLASS.yellow
                      : "text-muted-foreground",
                )}
              >
                {done ? <Check className="size-3" /> : index + 1}
              </span>
              <div className="min-w-0 space-y-0.5">
                <p className="text-sm font-medium break-words">{stage.label}</p>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {stage.completedAt !== null
                    ? `Completada por ${personName(stage.completedBy)} el ${momentText(stage.completedAt)}`
                    : index === current
                      ? "Es la etapa que toca"
                      : "Pendiente"}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
};
