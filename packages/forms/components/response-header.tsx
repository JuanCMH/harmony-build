import { Badge } from "@/components/ui/badge";
import { dateText } from "@/convex/lib/field_text";
import type { FormKind, ResponseStatus } from "@/convex/lib/form_types";
import { cn } from "@/lib/utils";
import { Ban, FileUp, Info } from "lucide-react";
import type { ReactNode } from "react";

import {
  importedNotice,
  momentText,
  outdatedEntryNotice,
  personName,
  timeText,
  versionLine,
} from "../lib/response-reading";
import { INACTIVE_BADGE, STATUS_TONE_CLASS, VOIDED_BADGE } from "../lib/status";

type Person = { name?: string; email?: string } | null;

interface ResponseHeaderProps {
  /** Lo que devuelve `formResponses.getById`. */
  response: {
    _creationTime: number;
    date: string;
    status: ResponseStatus;
    form: {
      kind: FormKind;
      name: string;
      code?: string;
      publishedVersionId: string | null;
    };
    version: { _id: string; number: number; publishedAt: number | null } | null;
    author: Person;
    voided: { by: Person; at: number | null; reason: string } | null;
    /** Si se trajo de un archivo en vez de diligenciarse aquí. */
    imported: { at: number; by: Person; fileName: string | null } | null;
    title: string | null;
    active: boolean | null;
    updatedAt: number | null;
    updatedBy: Person;
  };
  /** El número de la versión vigente del listado, para decir a cuál pasará un
   *  elemento al editarlo. */
  publishedVersionNumber: number | null;
}

/**
 * La cabecera de una respuesta o de un elemento: qué es, con qué versión se
 * guardó, y quién y cuándo. Es el encabezado del formato en papel, y por eso
 * va arriba y entero: es lo que convierte una lista de valores en un
 * registro.
 */
export const ResponseHeader = ({
  response,
  publishedVersionNumber,
}: ResponseHeaderProps) => {
  const { form, voided, imported } = response;
  const isEntry = form.kind === "catalog";
  const isIssue = form.kind === "tracking";
  const notice = isEntry
    ? outdatedEntryNotice(response, publishedVersionNumber)
    : null;

  const source = [
    isEntry || isIssue ? form.name : null,
    form.code ?? null,
    versionLine(response.version),
  ].filter((part): part is string => part !== null);

  return (
    <header className="space-y-4">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h2 className="min-w-0 text-xl font-medium tracking-tight break-words">
            {isEntry
              ? response.title || "Elemento sin título"
              : isIssue
                ? response.title || "Asunto sin título"
                : form.name}
          </h2>
          {voided && (
            <Badge
              variant="outline"
              className={STATUS_TONE_CLASS[VOIDED_BADGE.tone]}
            >
              {VOIDED_BADGE.label}
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground tabular-nums">
          {source.join(" · ")}
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:flex sm:flex-wrap sm:gap-x-10">
        {isEntry ? (
          <>
            {/* Activo es lo normal y va sin color; inactivo es un estado, y
                lleva su insignia (`03 §1.4`). */}
            <Fact label="Estado">
              {response.active === false ? (
                <Badge
                  variant="outline"
                  className={STATUS_TONE_CLASS[INACTIVE_BADGE.tone]}
                >
                  {INACTIVE_BADGE.label}
                </Badge>
              ) : (
                "Activo"
              )}
            </Fact>
            <Fact label="Añadido por">{personName(response.author)}</Fact>
            <Fact label="Añadido el" numeric>
              {dateText(response.date)}
            </Fact>
            {response.updatedAt !== null && (
              <Fact label="Última modificación" numeric wide>
                {personName(response.updatedBy)} ·{" "}
                {momentText(response.updatedAt)}
              </Fact>
            )}
          </>
        ) : (
          <>
            <Fact
              label={
                isIssue
                  ? "Abierto por"
                  : imported
                    ? "Importada por"
                    : "Diligenciada por"
              }
              wide
            >
              {personName(response.author)}
            </Fact>
            <Fact label="Fecha" numeric>
              {dateText(response.date)}
            </Fact>
            {/* La hora de una respuesta importada es la de la importación,
                no la del hecho: no se enseña como si lo fuera. */}
            {imported ? null : (
              <Fact label="Hora" numeric>
                {timeText(response._creationTime)}
              </Fact>
            )}
          </>
        )}
      </dl>

      {notice && (
        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <Info aria-hidden className="mt-px size-3.5 shrink-0" />
          {notice}
        </p>
      )}

      {imported && (
        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <FileUp aria-hidden className="mt-px size-3.5 shrink-0" />
          <span className="min-w-0 break-words">
            {importedNotice(imported, isEntry)}
          </span>
        </p>
      )}

      {voided && (
        <div
          role="status"
          className={cn(
            "flex items-start gap-3 rounded-lg border p-3",
            STATUS_TONE_CLASS[VOIDED_BADGE.tone],
          )}
        >
          <Ban aria-hidden className="mt-0.5 size-4 shrink-0" />
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-medium">
              Respuesta anulada por {personName(voided.by)}
              {voided.at !== null && (
                <span className="tabular-nums">
                  {" "}
                  el {momentText(voided.at)}
                </span>
              )}
            </p>
            <p className="text-sm break-words text-foreground">
              <span className="text-muted-foreground">Motivo: </span>
              {voided.reason || "Sin motivo registrado"}
            </p>
          </div>
        </div>
      )}
    </header>
  );
};

const Fact = ({
  label,
  numeric = false,
  wide = false,
  children,
}: {
  label: string;
  numeric?: boolean;
  /** En el teléfono ocupa la fila entera: un nombre no cabe en media. */
  wide?: boolean;
  children: ReactNode;
}) => (
  <div className={cn("min-w-0 space-y-0.5", wide && "col-span-2")}>
    <dt className="text-xs text-muted-foreground">{label}</dt>
    <dd className={cn("text-sm break-words", numeric && "tabular-nums")}>
      {children}
    </dd>
  </div>
);
