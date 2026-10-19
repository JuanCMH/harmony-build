"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SignatureConfig } from "@/convex/lib/form_types";
import { cn } from "@/lib/utils";
import { Eraser } from "lucide-react";
import { type PointerEvent, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { isPendingSignature, type PendingSignature } from "../lib/file-value";
import {
  isSignatureDrawn,
  signatureFileName,
  type SignaturePoint,
  type SignatureStroke,
  strokeToPath,
} from "../lib/signature";

/** El lienzo se dibuja en estas coordenadas, mida lo que mida en pantalla: así
 *  la firma del teléfono y la del escritorio guardan una imagen igual. */
const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 200;
/** Al doble, para que no salga borrosa al ampliarla en un informe. */
const EXPORT_SCALE = 2;
const INK = "#111827";

interface SignatureFieldControlProps {
  id: string;
  config: SignatureConfig;
  /** Una firma recién trazada (`PendingSignature`), o nada. */
  value: unknown;
  /** Quién diligencia: es quien firma cuando `signer` es `author`. */
  authorName: string;
  disabled: boolean;
  invalid: boolean;
  onChange: (value: PendingSignature | undefined) => void;
}

/**
 * El campo de firma: un recuadro donde se traza con el dedo, y —cuando firma
 * otra persona— su nombre y su documento.
 *
 * Una firma no se edita: se borra y se vuelve a trazar. Y no se sube al
 * trazarla sino al enviar, como cualquier archivo del formulario.
 */
export const SignatureFieldControl = ({
  id,
  config,
  value,
  authorName,
  disabled,
  invalid,
  onChange,
}: SignatureFieldControlProps) => {
  const pending = isPendingSignature(value) ? value : null;
  const signsOther = config.signer === "other";

  const [strokes, setStrokes] = useState<SignatureStroke[]>([]);
  const [signerName, setSignerName] = useState(pending?.signerName ?? "");
  const [signerDocument, setSignerDocument] = useState(
    pending?.signerDocument ?? "",
  );
  const drawing = useRef(false);

  // Al volver a una sección ya firmada, el campo se monta de nuevo: los trazos
  // se fueron con el montaje anterior, pero la firma sigue en el formulario.
  // Se enseña su imagen en vez de un recuadro vacío que invitaría a firmar
  // otra vez.
  const [preview, setPreview] = useState<string | null>(null);
  const pendingFile = pending?.file ?? null;
  useEffect(() => {
    if (!pendingFile) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(pendingFile);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [pendingFile]);
  const showsPreview = strokes.length === 0 && preview !== null;

  const effectiveName = signsOther ? signerName.trim() : authorName;

  const publish = async (
    nextStrokes: SignatureStroke[],
    name: string,
    document: string,
  ) => {
    if (!isSignatureDrawn(nextStrokes)) {
      onChange(undefined);
      return;
    }
    const file = await renderSignature(nextStrokes, signatureFileName(name));
    if (!file) {
      toast.error("No se pudo guardar la firma. Vuelve a trazarla");
      return;
    }
    onChange({
      file,
      name: file.name,
      signerName: name,
      ...(document.trim() ? { signerDocument: document.trim() } : {}),
    });
  };

  const pointFrom = (event: PointerEvent<SVGSVGElement>): SignaturePoint => {
    const box = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.round(((event.clientX - box.left) / box.width) * CANVAS_WIDTH),
      y: Math.round(((event.clientY - box.top) / box.height) * CANVAS_HEIGHT),
    };
  };

  const handleDown = (event: PointerEvent<SVGSVGElement>) => {
    // Sobre una firma ya hecha no se dibuja: primero se borra.
    if (disabled || showsPreview) return;
    // Sin esto, al salir el dedo del recuadro el trazo se corta.
    event.currentTarget.setPointerCapture(event.pointerId);
    drawing.current = true;
    // El punto se lee aquí y no dentro del actualizador: React lo ejecuta
    // después, cuando `event.currentTarget` ya es `null`.
    const point = pointFrom(event);
    setStrokes((current) => [...current, [point]]);
  };

  const handleMove = (event: PointerEvent<SVGSVGElement>) => {
    if (!drawing.current) return;
    const point = pointFrom(event);
    setStrokes((current) => {
      const last = current[current.length - 1];
      return [...current.slice(0, -1), [...last, point]];
    });
  };

  const handleUp = () => {
    if (!drawing.current) return;
    drawing.current = false;
    void publish(strokes, effectiveName, signerDocument);
  };

  const handleClear = () => {
    setStrokes([]);
    onChange(undefined);
  };

  const isEmpty = strokes.length === 0 && !showsPreview;

  return (
    <div className="space-y-3">
      {signsOther && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor={`${id}-name`}>Nombre de quien firma</Label>
            <Input
              id={`${id}-name`}
              value={signerName}
              disabled={disabled}
              autoComplete="off"
              className="h-10 sm:h-9"
              maxLength={80}
              aria-invalid={invalid && !signerName.trim()}
              onChange={(event) => setSignerName(event.target.value)}
              onBlur={() =>
                void publish(strokes, effectiveName, signerDocument)
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${id}-document`}>Documento</Label>
            <Input
              id={`${id}-document`}
              value={signerDocument}
              disabled={disabled}
              inputMode="numeric"
              autoComplete="off"
              className="h-10 sm:h-9"
              maxLength={20}
              onChange={(event) => setSignerDocument(event.target.value)}
              onBlur={() =>
                void publish(strokes, effectiveName, signerDocument)
              }
            />
          </div>
        </div>
      )}

      <div
        className={cn(
          "relative overflow-clip rounded-md border bg-white",
          invalid && "border-destructive",
          disabled && "opacity-50",
        )}
      >
        <svg
          id={id}
          role="img"
          aria-label={isEmpty ? "Recuadro para firmar, vacío" : "Firma trazada"}
          viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
          // `touch-none`: si no, arrastrar el dedo desplaza la página en vez
          // de dibujar.
          className="block aspect-[3/1] w-full touch-none select-none"
          onPointerDown={handleDown}
          onPointerMove={handleMove}
          onPointerUp={handleUp}
          onPointerCancel={handleUp}
        >
          <line
            x1={40}
            x2={CANVAS_WIDTH - 40}
            y1={CANVAS_HEIGHT - 40}
            y2={CANVAS_HEIGHT - 40}
            stroke="#9ca3af"
            strokeWidth={1}
            strokeDasharray="4 4"
          />
          {strokes.map((stroke, index) => (
            <path
              key={index}
              d={strokeToPath(stroke)}
              fill="none"
              stroke={INK}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        </svg>

        {showsPreview && (
          // Un `<img>` y no `next/image`: es una URL de objeto del navegador,
          // que el optimizador de Next ni admite ni tendría qué optimizar.
          <img
            src={preview}
            alt={`Firma de ${pending?.signerName ?? "quien firma"}`}
            className="absolute inset-0 size-full object-contain"
          />
        )}

        {isEmpty && (
          <p className="pointer-events-none absolute inset-x-0 top-1/3 text-center text-sm text-gray-400">
            Firma aquí con el dedo
          </p>
        )}
      </div>

      <div className="flex items-center justify-between gap-2">
        <p className="min-w-0 truncate text-xs text-muted-foreground">
          {effectiveName
            ? `Firma ${effectiveName}`
            : "Escribe el nombre de quien firma"}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-10 sm:h-9"
          disabled={disabled || isEmpty}
          onClick={handleClear}
        >
          <Eraser />
          Borrar
        </Button>
      </div>
    </div>
  );
};

/** Pinta los trazos en un lienzo fuera de pantalla y lo devuelve como PNG. */
async function renderSignature(
  strokes: SignatureStroke[],
  fileName: string,
): Promise<File | null> {
  const canvas = document.createElement("canvas");
  canvas.width = CANVAS_WIDTH * EXPORT_SCALE;
  canvas.height = CANVAS_HEIGHT * EXPORT_SCALE;
  const context = canvas.getContext("2d");
  if (!context) return null;

  // Fondo blanco: un PNG transparente sale negro sobre negro en tema oscuro y
  // en más de un visor de PDF.
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.scale(EXPORT_SCALE, EXPORT_SCALE);
  context.strokeStyle = INK;
  context.lineWidth = 2.5;
  context.lineCap = "round";
  context.lineJoin = "round";
  for (const stroke of strokes)
    context.stroke(new Path2D(strokeToPath(stroke)));

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/png"),
  );
  return blob ? new File([blob], fileName, { type: "image/png" }) : null;
}
