"use client";

import { CollectionEmpty } from "@/components/harmony/collection";
import { PanelCard } from "@/components/harmony/panel-card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { normalizeText } from "@/convex/lib/text";
import { cn } from "@/lib/utils";
import { useProjectId } from "@/packages/projects/store/use-project-id";
import { ChevronRight, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { useListFillableForms } from "../api";
import { ENTITY_ICONS } from "../lib/field-catalog";
import { lastFilledText } from "../lib/relative-day";
import { formRoutes } from "../lib/routes";

/** A partir de cuántos formatos se ofrece el buscador: con menos, la lista
 *  entera cabe en la pantalla del teléfono. */
const SEARCH_FROM = 8;

/**
 * «Para diligenciar», lo primero del inicio de un proyecto (decisiones §7):
 * los formatos que quien mira puede diligenciar y los seguimientos en que
 * puede abrir un asunto, el que usó hace menos primero. Para el conductor que
 * abre la aplicación a las seis de la mañana, la inspección de su vehículo
 * está a un toque.
 *
 * Quien no puede diligenciar nada no ve el panel: una tarjeta vacía en su
 * inicio sólo le diría lo que no puede hacer.
 *
 * `page` es el inicio de la vista de captura, donde el panel es la pantalla:
 * sin techo de altura, y con buscador cuando la lista ya no cabe a la vista.
 */
export const FillableFormsPanel = ({
  className,
  page = false,
}: {
  className?: string;
  page?: boolean;
}) => {
  const projectId = useProjectId();
  const { data: forms } = useListFillableForms({ projectId });
  const [search, setSearch] = useState("");

  if (forms === null || forms?.length === 0) {
    // En el inicio de captura el panel es la pantalla: vacía, diría nada.
    return page ? (
      <PanelCard
        icon={ENTITY_ICONS.form}
        title="Para diligenciar"
        className={className}
      >
        <CollectionEmpty
          icon={ENTITY_ICONS.form}
          title="Todavía no tienes formatos para diligenciar."
          hint="Cuando se publique uno para tu rol, aparecerá aquí."
        />
      </PanelCard>
    ) : null;
  }

  const now = Date.now();
  const query = normalizeText(search.trim());
  const shown =
    forms && query
      ? forms.filter((form) =>
          normalizeText(`${form.name} ${form.code ?? ""}`).includes(query),
        )
      : forms;
  const withSearch = page && (forms?.length ?? 0) > SEARCH_FROM;

  return (
    <PanelCard
      icon={ENTITY_ICONS.form}
      title="Para diligenciar"
      description="Tus formatos, el más reciente primero"
      className={className}
      actions={
        withSearch ? (
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-10 pl-8 sm:h-9"
              placeholder="Buscar por nombre o código"
              aria-label="Buscar por nombre o código"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        ) : undefined
      }
    >
      {shown === undefined ? (
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
      ) : shown.length === 0 ? (
        <CollectionEmpty
          icon={Search}
          title={`Nada coincide con «${search.trim()}»`}
          hint="Prueba con otra palabra."
        />
      ) : (
        <ul
          className={cn(
            "divide-y divide-border/60",
            !page && "max-h-96 overflow-y-auto",
          )}
        >
          {shown.map((form) => {
            const Icon =
              form.kind === "tracking"
                ? ENTITY_ICONS.tracking
                : ENTITY_ICONS.form;
            return (
              <li key={form._id}>
                <Link
                  href={formRoutes.fill(projectId, form._id)}
                  className="flex min-h-14 items-center gap-3 px-4 py-2 transition-colors outline-none hover:bg-accent/40 focus-visible:bg-accent/40 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:ring-inset"
                >
                  {/* Distingue el seguimiento, que no se diligencia: se abre
                      un asunto. */}
                  <Icon
                    className="size-4 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1">
                    {/* Dos líneas: en el teléfono «Inspección preoperacional
                        para vehíc…» no decía cuál era. */}
                    <span className="line-clamp-2 text-sm font-medium">
                      {form.name}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground tabular-nums">
                      {form.code ? `${form.code} · ` : ""}
                      {lastFilledText(
                        {
                          date: form.lastResponseDate,
                          at: form.lastResponseAt,
                        },
                        now,
                        form.kind === "tracking" ? "tracking" : "record",
                      )}
                    </span>
                  </span>
                  <ChevronRight
                    className="size-4 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </PanelCard>
  );
};
