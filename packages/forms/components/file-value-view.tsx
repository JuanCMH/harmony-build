import type { FileValue } from "@/convex/lib/form_types";
import { cn } from "@/lib/utils";
import { Download, Paperclip } from "lucide-react";

interface FileValueViewProps {
  value: FileValue;
  /** La dirección firmada del archivo; sin ella, el archivo ya no está. */
  url: string | undefined;
  kind: "file" | "image";
  /** Dentro de la celda de una tabla: la miniatura, más pequeña. */
  compact?: boolean;
}

/**
 * Un archivo o una imagen de una respuesta, para abrirlos.
 *
 * La imagen es una miniatura que abre la imagen entera en otra pestaña; el
 * archivo, su nombre con el enlace de descarga. Los dos abren fuera: quien
 * revisa una inspección no debe perder la página por mirar una foto.
 */
export const FileValueView = ({
  value,
  url,
  kind,
  compact = false,
}: FileValueViewProps) => {
  if (!url)
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Paperclip aria-hidden className="size-4 shrink-0" />
        <span className="min-w-0 break-words">
          {value.name} · ya no está disponible
        </span>
      </p>
    );

  if (kind === "image")
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="group inline-flex max-w-full items-center gap-3 rounded-md focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        {/* Un `<img>` y no `next/image`: es una dirección firmada del
            almacenamiento, que caduca y cambia de una lectura a otra. */}
        <img
          src={url}
          alt={value.name}
          loading="lazy"
          className={cn(
            "shrink-0 rounded-md border bg-muted object-cover",
            compact ? "size-12" : "size-24",
          )}
        />
        <span className="min-w-0 text-ui text-muted-foreground group-hover:text-foreground">
          <span className="line-clamp-2 break-all">{value.name}</span>
          <span className="sr-only"> (se abre en una pestaña nueva)</span>
        </span>
      </a>
    );

  return (
    <a
      href={url}
      download={value.name}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex max-w-full items-center gap-2 rounded-md text-sm underline-offset-4 hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <Paperclip aria-hidden className="size-4 shrink-0 text-muted-foreground" />
      <span className="min-w-0 break-all">{value.name}</span>
      <Download aria-hidden className="size-4 shrink-0 text-muted-foreground" />
      <span className="sr-only">Descargar</span>
    </a>
  );
};
