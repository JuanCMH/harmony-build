"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle2 } from "lucide-react";

import type { ImportWizard } from "../lib/use-import-wizard";

/** Cuántas líneas se nombran de cada motivo antes de resumir. */
const LINES_SHOWN = 8;

const number = (value: number) => value.toLocaleString("es-CO");

const linesText = (lines: readonly number[]) => {
  const shown = lines.slice(0, LINES_SHOWN).join(", ");
  const rest = lines.length - LINES_SHOWN;
  return `${lines.length === 1 ? "Fila" : "Filas"} ${shown}${
    rest > 0 ? ` y ${number(rest)} más` : ""
  }`;
};

const Figure = ({ label, value }: { label: string; value: number }) => (
  <div className="min-w-0 space-y-0.5">
    <dt className="text-xs text-muted-foreground">{label}</dt>
    <dd className="font-space-grotesk text-2xl font-medium tracking-tight tabular-nums">
      {number(value)}
    </dd>
  </div>
);

/**
 * Paso 4: cuántas filas entran, cuántas no y por qué. Nada se escribe hasta
 * confirmar.
 */
export const ImportReviewStep = ({ wizard }: { wizard: ImportWizard }) => {
  const { summary, problems, isRecord } = wizard;

  return (
    <div className="space-y-6">
      <dl className="grid grid-cols-3 gap-4">
        <Figure label="Entran" value={summary.ready} />
        <Figure label="Se quedan fuera" value={summary.rejected} />
        {/* Sólo un formato admite filas repetidas: en un listado, un título
            repetido se queda fuera. */}
        {isRecord ? (
          <Figure label="Entran repetidas" value={summary.warned} />
        ) : null}
      </dl>

      {isRecord ? null : (
        <div className="space-y-2">
          <Label htmlFor="import-mode">Si el elemento ya existe</Label>
          <Select
            value={wizard.mode}
            onValueChange={(value) =>
              wizard.setMode(value === "update" ? "update" : "skip")
            }
          >
            <SelectTrigger id="import-mode" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="skip">Omitirlo</SelectItem>
              <SelectItem value="update">
                Actualizarlo con lo que trae el archivo
              </SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Se reconoce por su título, sin distinguir mayúsculas ni tildes. Al
            actualizar se cambian los campos que el archivo trae y se conservan
            los demás.
          </p>
        </div>
      )}

      {problems.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <CheckCircle2
            aria-hidden
            className="size-4 shrink-0 text-green-700 dark:text-green-400"
          />
          Todas las filas pasan la revisión.
        </p>
      ) : (
        <section className="space-y-3">
          <div>
            <h3 className="text-sm font-medium">Por qué se quedan fuera</h3>
            <p className="text-xs text-muted-foreground">
              Corrige el archivo o vuelve a los pasos anteriores. Las filas que
              entran no dependen de éstas.
            </p>
          </div>
          <ul className="divide-y divide-border/60 rounded-lg border">
            {problems.map((problem) => (
              <li key={problem.message} className="space-y-0.5 px-3 py-2">
                <p className="text-sm break-words">{problem.message}</p>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {linesText(problem.lines)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {isRecord && summary.warned > 0 ? (
        <p className="text-xs text-muted-foreground">
          Hay filas idénticas a otra del archivo. Entran todas: dos registros
          iguales el mismo día pueden ser dos hechos.
        </p>
      ) : null}
    </div>
  );
};
