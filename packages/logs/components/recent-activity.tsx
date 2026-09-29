"use client";

import { PageLoading } from "@/components/harmony/page-loading";
import { PanelCard } from "@/components/harmony/panel-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { fullTime } from "@/lib/date-formats";
import { useProjectId } from "@/packages/projects/store/use-project-id";
import { History } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useGetLogsByProject } from "../api";
import { dayRange } from "../lib/log-ranges";
import { LogEntry } from "./log-entry";

/** Cuántas entradas caben antes de mandar a la pantalla de registros. */
const VISIBLE_ENTRIES = 8;

const describe = (total: number) =>
  total === 0
    ? "Lo que se ha hecho hoy en el proyecto"
    : `${total} registro${total !== 1 ? "s" : ""} hoy`;

/**
 * Lo que se ha hecho hoy en el proyecto.
 *
 * Se monta sólo para quien tiene la llave `viewLogs`: la consulta lanza sin
 * ella. «Hoy» es el día de quien mira —se calcula en el navegador— y se fija
 * al montar: recalcularlo en cada render cambiaría los argumentos de la
 * consulta y la volvería a suscribir sin parar.
 */
export const RecentActivity = ({ className }: { className?: string }) => {
  const projectId = useProjectId();
  const [today] = useState(() => dayRange(new Date()));

  const { data: logs, isLoading } = useGetLogsByProject({
    projectId,
    ...today,
  });

  const total = logs?.length ?? 0;
  const visible = logs?.slice(0, VISIBLE_ENTRIES) ?? [];

  return (
    <PanelCard
      icon={History}
      title="Actividad reciente"
      description={
        isLoading ? "Lo que se ha hecho hoy en el proyecto" : describe(total)
      }
      className={className}
      actions={
        <Button asChild variant="ghost" size="sm">
          <Link href={`/projects/${projectId}/registros`}>Ver registros</Link>
        </Button>
      }
    >
      {isLoading ? (
        <div
          className="divide-y divide-border/60"
          aria-busy="true"
          aria-live="polite"
        >
          <span className="sr-only">Cargando la actividad de hoy…</span>
          {[0, 1, 2].map((index) => (
            <div key={index} className="flex items-start gap-3 px-4 py-3">
              <Skeleton className="size-4 shrink-0 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3.5 w-1/3" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : total === 0 ? (
        <PageLoading
          icon={History}
          text="Hoy todavía no hay actividad en el proyecto. Lo que haga el equipo aparecerá aquí."
          className="h-auto"
        />
      ) : (
        <>
          <ul className="divide-y divide-border/60">
            {visible.map((log) => (
              <li key={log._id} className="px-4 py-3">
                <LogEntry log={log} formatTime={fullTime} />
              </li>
            ))}
          </ul>
          {total > visible.length ? (
            <p className="border-t border-border/60 px-4 py-3 text-ui text-muted-foreground">
              Se muestran los {visible.length} más recientes de {total}.
            </p>
          ) : null}
        </>
      )}
    </PanelCard>
  );
};
