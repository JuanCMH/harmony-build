"use client";

import type { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { useProjectId } from "@/packages/projects/store/use-project-id";
import Link from "next/link";

import { useGetFormUsage } from "../api";
import { formRoutes } from "../lib/routes";

/**
 * Qué formatos eligen elementos de este listado: lo que se rompe si se toca.
 *
 * Una línea bajo la tabla, no una tarjeta: es contexto para quien mantiene el
 * listado, no el trabajo de la pantalla. Sin nadie que lo use, se dice.
 */
export const CatalogUsage = ({ formId }: { formId: Id<"forms"> }) => {
  const projectId = useProjectId();
  const { data: usage } = useGetFormUsage({ id: formId });

  if (!usage) return null;

  return (
    <section
      aria-labelledby="catalog-usage-title"
      className="space-y-1.5 px-1 text-ui"
    >
      <h2 id="catalog-usage-title" className="text-muted-foreground">
        {usage.length === 0
          ? "Ningún formato usa todavía este listado."
          : usage.length === 1
            ? "Lo usa 1 formato:"
            : `Lo usan ${usage.length} formatos:`}
      </h2>
      {usage.length > 0 ? (
        <ul className="flex flex-wrap gap-x-4 gap-y-1">
          {usage.map((form) => (
            <li key={form._id}>
              <Link
                href={formRoutes.responses(projectId, form._id)}
                className={cn(
                  "rounded-sm underline decoration-border underline-offset-4 hover:decoration-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
                  form.status === "archived" && "text-muted-foreground",
                )}
              >
                {form.name}
                {form.code ? (
                  <span className="ml-1.5 text-muted-foreground tabular-nums">
                    {form.code}
                  </span>
                ) : null}
                {form.status === "archived" ? " (archivado)" : null}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
};
