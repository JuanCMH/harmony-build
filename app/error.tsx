"use client";

import { HarmonyIsotype } from "@/components/harmony/isotype";
import { logError } from "@/lib/logging";
import { useEffect } from "react";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // El límite de error de Next traga la excepción: sin esto un fallo de
    // render que llega hasta aquí no deja rastro en ningún sitio.
    logError("render.unhandled", error, { digest: error.digest });
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
      <HarmonyIsotype className="size-10 opacity-40" />
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Algo salió mal
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ocurrió un error inesperado.
        </p>
      </div>
      <button
        onClick={reset}
        className="mt-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Intentar de nuevo
      </button>
    </div>
  );
}
