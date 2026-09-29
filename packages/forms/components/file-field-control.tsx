"use client";

import { Button } from "@/components/ui/button";
import { DEFAULT_FILE_SIZE_MB } from "@/convex/lib/form_types";
import { isFileValue } from "@/convex/lib/stored_values";
import { cn } from "@/lib/utils";
import { Camera, Image as ImageIcon, Paperclip, Upload, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { acceptsFile, describeFormats } from "../lib/file-formats";
import { isPendingFile, type PendingFile } from "../lib/file-value";
import { TOUCH_QUERY, useMediaQuery } from "../lib/use-media-query";

interface FileFieldControlProps {
  id: string;
  /** El nombre del campo: nombra los botones para quien no los ve. */
  label: string;
  /** Una imagen se puede tomar con la cámara y se enseña en miniatura. */
  kind: "file" | "image";
  /** Extensiones o tipos MIME que admite un archivo. Sin lista, cualquiera. */
  acceptedFormats?: readonly string[];
  /** Megabytes. Por omisión, 10. */
  maxFileSize?: number;
  /** Un archivo recién elegido (`PendingFile`), uno ya guardado
   *  (`FileValue`), o nada. */
  value: unknown;
  disabled: boolean;
  invalid: boolean;
  onChange: (value: PendingFile | undefined) => void;
}

/**
 * El control de un campo de archivo o de foto: lo que hay, y cómo ponerlo,
 * cambiarlo o quitarlo.
 *
 * Portado de Harmony. El archivo elegido queda **pendiente** y se sube al
 * enviar; aquí sólo se comprueba lo que el navegador ya sabe —tipo y tamaño—,
 * y el servidor lo vuelve a comprobar.
 *
 * En el teléfono una foto se toma: «Tomar foto» abre la cámara de atrás sin
 * pasar por la galería, que es un toque menos con el guante puesto. «Elegir»
 * queda para la foto que ya se tomó.
 */
export const FileFieldControl = ({
  id,
  label,
  kind,
  acceptedFormats,
  maxFileSize,
  value,
  disabled,
  invalid,
  onChange,
}: FileFieldControlProps) => {
  const picker = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  const isTouch = useMediaQuery(TOUCH_QUERY);

  const isImage = kind === "image";
  const pending = isPendingFile(value) ? value : null;
  const stored = isFileValue(value) ? value : null;
  const name = pending?.name ?? stored?.name ?? null;
  const maxMb = maxFileSize ?? DEFAULT_FILE_SIZE_MB;
  const formats = isImage ? [] : (acceptedFormats ?? []);

  // Lo que se admite, dicho antes de elegir y no sólo en el error.
  const accepts = `${
    isImage
      ? "Imagen"
      : formats.length > 0
        ? describeFormats(formats)
        : "Cualquier formato"
  } · hasta ${maxMb} MB`;

  const [preview, setPreview] = useState<string | null>(null);
  const pendingFile = pending?.file ?? null;
  useEffect(() => {
    if (!pendingFile || !isImage) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(pendingFile);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [pendingFile, isImage]);

  const choose = (file: File | undefined) => {
    if (!file) return;
    if (isImage && !file.type.startsWith("image/")) {
      toast.error("La foto tiene que ser una imagen");
      return;
    }
    if (!acceptsFile(formats, file)) {
      toast.error(`Este campo sólo admite ${describeFormats(formats)}`);
      return;
    }
    if (file.size > maxMb * 1024 * 1024) {
      toast.error(`El archivo no puede pesar más de ${maxMb} MB`);
      return;
    }
    onChange({ file, name: file.name });
  };

  const Icon = isImage ? ImageIcon : Paperclip;
  const showCamera = isImage && isTouch;

  return (
    <div
      className={cn(
        "flex min-h-10 flex-wrap items-center gap-x-3 gap-y-2 rounded-md border px-3 py-2",
        invalid && "border-destructive",
      )}
    >
      {preview ? (
        // Un `<img>` y no `next/image`: es una URL de objeto del navegador,
        // que el optimizador de Next ni admite ni tendría qué optimizar.
        <img
          src={preview}
          alt={name ?? label}
          className="size-12 shrink-0 rounded-md border object-cover"
        />
      ) : (
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <Icon className="size-4" aria-hidden />
        </span>
      )}

      <p className="min-w-0 flex-1 basis-32 text-sm">
        {name ? (
          <span className="block truncate">{name}</span>
        ) : (
          <span className="text-muted-foreground">
            {isImage ? "Sin foto" : "Sin archivo"}
          </span>
        )}
        {/* Lo que admite sólo hace falta antes de elegir. */}
        {pending || !name ? (
          <span className="block text-xs text-muted-foreground">
            {pending ? "Se sube al enviar" : accepts}
          </span>
        ) : null}
      </p>

      <input
        ref={picker}
        id={id}
        type="file"
        className="sr-only"
        // Quien se acciona es el botón de al lado; este campo es sólo el
        // mecanismo del navegador, y dos paradas de tabulador para lo mismo
        // confunden.
        tabIndex={-1}
        accept={isImage ? "image/*" : acceptedFormats?.join(",")}
        disabled={disabled}
        onChange={(event) => {
          choose(event.target.files?.[0]);
          // Sin esto, elegir otra vez el mismo archivo no avisa.
          event.target.value = "";
        }}
      />
      {showCamera && (
        <input
          ref={camera}
          type="file"
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          accept="image/*"
          capture="environment"
          disabled={disabled}
          onChange={(event) => {
            choose(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
      )}

      <div className="flex shrink-0 items-center gap-2">
        {showCamera && (
          <Button
            type="button"
            variant="outline"
            className="h-10 sm:h-9"
            aria-label={`Tomar foto: ${label}`}
            disabled={disabled}
            onClick={() => camera.current?.click()}
          >
            <Camera />
            {name ? "Otra foto" : "Tomar foto"}
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          className="h-10 sm:h-9"
          aria-label={
            name ? `Cambiar ${name}` : `${isImage ? "Elegir foto" : "Adjuntar"}: ${label}`
          }
          disabled={disabled}
          onClick={() => picker.current?.click()}
        >
          <Upload />
          {name ? "Cambiar" : isImage ? "Elegir" : "Adjuntar"}
        </Button>
        {name ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-10 text-muted-foreground hover:text-destructive sm:size-9"
            aria-label={`Quitar ${name}`}
            disabled={disabled}
            onClick={() => onChange(undefined)}
          >
            <X />
          </Button>
        ) : null}
      </div>
    </div>
  );
};
