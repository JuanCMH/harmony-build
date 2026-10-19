"use client";

import { Button } from "@/components/ui/button";
import { dateText } from "@/convex/lib/field_text";
import { todayInColombia } from "@/convex/lib/dates";
import { IMPORT_LIMITS } from "@/convex/lib/import_types";
import { cn } from "@/lib/utils";
import { FileUp, Loader2, OctagonAlert, TriangleAlert } from "lucide-react";
import { useRef } from "react";

import { IMPORT_ACCEPT } from "../lib/import-file";
import { createdText } from "../lib/import-history";
import { STATUS_TONE_CLASS } from "../lib/status";
import type { ImportWizard } from "../lib/use-import-wizard";

/** Una importación anterior del mismo archivo, sin deshacer. */
export interface PreviousImport {
  _creationTime: number;
  author: string;
  created: number;
}

interface ImportFileStepProps {
  wizard: ImportWizard;
  /** Si este mismo archivo ya se importó aquí. */
  previous: PreviousImport | null;
}

/**
 * Paso 1: el archivo. Se lee en el navegador; al servidor sólo viajarán las
 * filas ya interpretadas.
 */
export const ImportFileStep = ({ wizard, previous }: ImportFileStepProps) => {
  const input = useRef<HTMLInputElement>(null);
  const { file, fileError, isReading, isRecord } = wizard;

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed px-6 py-8 text-center">
        <div className="flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <FileUp className="size-5" />
        </div>
        {file ? (
          <div className="space-y-0.5">
            <p className="text-sm font-medium break-all">{file.name}</p>
            <p className="text-xs text-muted-foreground tabular-nums">
              {file.sheet.rows.length.toLocaleString("es-CO")}{" "}
              {file.sheet.rows.length === 1 ? "fila" : "filas"} ·{" "}
              {file.sheet.headers.length}{" "}
              {file.sheet.headers.length === 1 ? "columna" : "columnas"}
            </p>
          </div>
        ) : (
          <div className="space-y-0.5">
            <p className="text-sm">
              Un archivo <span className="font-medium">.xlsx</span> o{" "}
              <span className="font-medium">.csv</span>, con los encabezados en
              la primera fila.
            </p>
            <p className="text-xs text-muted-foreground">
              Hasta {IMPORT_LIMITS.maxRows.toLocaleString("es-CO")} filas y{" "}
              {IMPORT_LIMITS.maxFileMb} MB.
            </p>
          </div>
        )}
        <input
          ref={input}
          type="file"
          accept={IMPORT_ACCEPT}
          className="sr-only"
          aria-label="Archivo que se importa"
          disabled={isReading}
          onChange={(event) => {
            const chosen = event.target.files?.[0];
            // Elegir el mismo archivo otra vez tiene que volver a leerlo.
            event.target.value = "";
            if (chosen) void wizard.chooseFile(chosen);
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isReading}
          onClick={() => input.current?.click()}
        >
          {isReading ? <Loader2 className="animate-spin" /> : null}
          {isReading
            ? "Leyendo el archivo…"
            : file
              ? "Elegir otro archivo"
              : "Elegir archivo"}
        </Button>
      </div>

      {fileError ? (
        <Notice tone="red" icon={OctagonAlert}>
          {fileError}
        </Notice>
      ) : null}

      {previous ? (
        <Notice tone="yellow" icon={TriangleAlert}>
          Este mismo archivo ya se importó aquí el{" "}
          {dateText(todayInColombia(previous._creationTime))}, por{" "}
          {previous.author}:{" "}
          {createdText(previous.created, isRecord ? "record" : "catalog")}. Si
          sigues, sus filas entrarán otra vez.
        </Notice>
      ) : null}

      <p className="text-xs text-muted-foreground">
        {isRecord
          ? "Cada fila será una respuesta, con la fecha en que ocurrió. Las firmas, las fotos, los archivos y las tablas no se importan: la respuesta dirá que es importada."
          : "Cada fila será un elemento del listado. Las fotos, los archivos y las tablas no se importan."}
      </p>
    </div>
  );
};

/** Un aviso dentro del flujo, con el color de su estado y su icono
 *  (`03 §1.4`: el color nunca va solo). */
export const Notice = ({
  tone,
  icon: Icon,
  children,
}: {
  tone: "red" | "yellow" | "gray";
  icon: typeof OctagonAlert;
  children: React.ReactNode;
}) => (
  <div
    role={tone === "red" ? "alert" : "status"}
    className={cn(
      "flex items-start gap-2 rounded-lg border p-3 text-sm",
      STATUS_TONE_CLASS[tone],
    )}
  >
    <Icon aria-hidden className="mt-0.5 size-4 shrink-0" />
    <p className="min-w-0 break-words text-foreground">{children}</p>
  </div>
);
