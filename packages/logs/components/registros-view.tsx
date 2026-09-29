"use client";

import { DatePicker } from "@/components/harmony/date-picker";
import { MonthPicker } from "@/components/harmony/month-picker";
import { PageLoading } from "@/components/harmony/page-loading";
import type { Doc } from "@/convex/_generated/dataModel";
import { shortDateTime } from "@/lib/date-formats";
import { cn } from "@/lib/utils";
import { History, Loader2 } from "lucide-react";
import { RANGOS, useRegistrosView } from "../store/use-registros-view";
import { LogEntry } from "./log-entry";

/**
 * La auditoría del proyecto: la lista cronológica de lo que se ha hecho, por
 * día o por mes.
 */

interface RegistrosViewProps {
  logs: Doc<"logs">[] | undefined;
  isLoading: boolean;
  /** El día o el mes que se está mirando, según el rango elegido. */
  fecha: Date;
  onFechaChange: (fecha: Date) => void;
}

const contar = (n: number) => `${n} registro${n !== 1 ? "s" : ""}`;

export const RegistrosView = ({
  logs,
  isLoading,
  fecha,
  onFechaChange,
}: RegistrosViewProps) => {
  const [{ rango }, setView] = useRegistrosView();
  const total = logs?.length ?? 0;

  // `MonthPicker` habla en meses de base cero (`yyyy-00`..`yyyy-11`). Sumar
  // uno aquí mostraba el mes siguiente al que se consultaba.
  const mesValor = `${fecha.getFullYear()}-${String(fecha.getMonth()).padStart(2, "0")}`;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {/* El conteo espera a saberlo: pintar «0 registros» mientras carga es
            afirmar lo contrario de lo que se va a ver. Va a la izquierda, como
            dato, y no entre los controles (`03 §2.3`). */}
        <p className="text-ui tabular-nums text-muted-foreground">
          {isLoading ? "Contando…" : contar(total)}
        </p>

        <div className="ml-auto flex items-center gap-2">
          {rango === "dia" ? (
            <DatePicker
              date={fecha}
              className="w-auto"
              align="end"
              onSelect={(nueva) => nueva && onFechaChange(nueva)}
            />
          ) : (
            <MonthPicker
              value={mesValor}
              onChange={(valor) => {
                const [year, month] = valor.split("-");
                onFechaChange(new Date(Number(year), Number(month), 1));
              }}
            />
          )}

          <div
            role="group"
            aria-label="Rango de los registros"
            className="flex items-center gap-1 rounded-md border p-0.5"
          >
            {RANGOS.map((r) => (
              <button
                key={r}
                type="button"
                aria-pressed={rango === r}
                onClick={() => setView({ rango: r })}
                className={cn(
                  "min-h-6 rounded-sm px-2 py-1 text-xs font-medium",
                  rango === r
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {r === "dia" ? "Día" : "Mes"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto">
        {isLoading ? (
          // `Loader2` girando, no el icono quieto de la pantalla: con
          // `History` estático la carga y el «no hay nada» se veían
          // exactamente igual (`03 §2.4`).
          <PageLoading
            icon={Loader2}
            iconSpin
            text="Se están cargando los registros."
          />
        ) : total === 0 ? (
          <PageLoading
            icon={History}
            text={
              rango === "dia"
                ? "No hay registros para esta fecha. Elige otra para buscar."
                : "No hay registros para este mes. Elige otro para buscar."
            }
          />
        ) : (
          logs?.map((log) => (
            <div key={log._id} className="rounded-lg border bg-card p-3">
              <LogEntry log={log} formatTime={shortDateTime} />
            </div>
          ))
        )}
      </div>
    </div>
  );
};
