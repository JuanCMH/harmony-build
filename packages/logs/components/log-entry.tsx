import type { Doc } from "@/convex/_generated/dataModel";
import { getLogTypeIcon } from "../lib/log-icons";

/**
 * Una entrada de auditoría: quién, cuándo y qué.
 *
 * No lleva caja: la pone quien la lista. En la pantalla de registros cada
 * entrada es una tarjeta; dentro de un bloque, las separa un hairline
 * (`03 §2.3`).
 */
export const LogEntry = ({
  log,
  formatTime,
}: {
  log: Doc<"logs">;
  /** Hora sola si el contexto ya dice el día; día y hora si no. */
  formatTime: (date: Date) => string;
}) => (
  <div className="flex items-start gap-3">
    <div className="mt-0.5 shrink-0">{getLogTypeIcon(log.type)}</div>
    <div className="min-w-0 flex-1">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm font-medium">{log.userName}</span>
        <time
          dateTime={new Date(log._creationTime).toISOString()}
          className="shrink-0 text-xs tabular-nums text-muted-foreground"
        >
          {formatTime(new Date(log._creationTime))}
        </time>
      </div>
      <p className="mt-1 text-sm break-words text-muted-foreground">
        {log.description}
      </p>
    </div>
  </div>
);
