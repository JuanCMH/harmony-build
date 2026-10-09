"use client";

import { PanelCard } from "@/components/harmony/panel-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useProjectId } from "@/packages/projects/store/use-project-id";
import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { useListFillableForms } from "../api";
import { ENTITY_ICONS } from "../lib/field-catalog";
import { lastFilledText } from "../lib/relative-day";
import { formRoutes } from "../lib/routes";

/**
 * «Para diligenciar», lo primero del inicio de un proyecto (decisiones §7):
 * los formatos que quien mira puede diligenciar, el que usó hace menos
 * primero. Para el conductor que abre la aplicación a las seis de la mañana,
 * la inspección de su vehículo está a un toque.
 *
 * Quien no puede diligenciar nada no ve el panel: una tarjeta vacía en su
 * inicio sólo le diría lo que no puede hacer.
 */
export const FillableFormsPanel = ({ className }: { className?: string }) => {
  const projectId = useProjectId();
  const { data: forms } = useListFillableForms({ projectId });

  if (forms === null || forms?.length === 0) return null;

  const now = Date.now();

  return (
    <PanelCard
      icon={ENTITY_ICONS.form}
      title="Para diligenciar"
      description="Tus formatos, el más reciente primero"
      className={className}
    >
      {forms === undefined ? (
        <div className="divide-y divide-border/60" aria-busy="true">
          <span className="sr-only">Cargando los formatos…</span>
          {[0, 1, 2].map((row) => (
            <div
              key={row}
              className="flex min-h-14 flex-col justify-center gap-1.5 px-4 py-2"
            >
              <Skeleton className="h-4 w-56" />
              <Skeleton className="h-3 w-40" />
            </div>
          ))}
        </div>
      ) : (
        <ul className="max-h-96 divide-y divide-border/60 overflow-y-auto">
          {forms.map((form) => (
            <li key={form._id}>
              <Link
                href={formRoutes.fill(projectId, form._id)}
                className="flex min-h-14 items-center gap-3 px-4 py-2 transition-colors outline-none hover:bg-accent/40 focus-visible:bg-accent/40 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:ring-inset"
              >
                <span className="min-w-0 flex-1">
                  {/* Dos líneas: en el teléfono «Inspección preoperacional para
                      vehíc…» no decía cuál era. */}
                  <span className="line-clamp-2 text-sm font-medium">
                    {form.name}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground tabular-nums">
                    {form.code ? `${form.code} · ` : ""}
                    {lastFilledText(
                      { date: form.lastResponseDate, at: form.lastResponseAt },
                      now,
                    )}
                  </span>
                </span>
                <ChevronRight
                  className="size-4 shrink-0 text-muted-foreground"
                  aria-hidden
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </PanelCard>
  );
};
