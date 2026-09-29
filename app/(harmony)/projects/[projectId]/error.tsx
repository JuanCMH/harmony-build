"use client";

import { HarmonyIsotype } from "@/components/harmony/isotype";
import { projectsErrors } from "@/convex/lib/error_messages";
import { logError } from "@/lib/logging";
import { useEffect } from "react";

/** Lo que dice Convex cuando el `projectId` de la URL no tiene forma de id de
 *  proyecto: una dirección mal copiada o de otro despliegue. */
const INVALID_PROJECT_ID = 'v.id("projects")';

/**
 * Un proyecto que desaparece bajo los pies —se acaba de eliminar, el enlace es
 * viejo, la dirección está mal copiada— hacía que las consultas de la pantalla
 * fallaran y la aplicación mostrara «Algo salió mal». Aquí ese caso concreto
 * se convierte en lo que el usuario espera: volver a sus proyectos. Cualquier
 * otro error se sigue mostrando, para no esconder fallos de verdad.
 */
export default function ProjectError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isMissingProject =
    error.message.includes(projectsErrors.projectNotFound) ||
    error.message.includes(INVALID_PROJECT_ID);

  useEffect(() => {
    // Navegación dura a propósito: el árbol de esta ruta está roto —sus
    // consultas siguen preguntando por un proyecto que no existe— y sólo
    // recargando se desmonta del todo.
    if (isMissingProject) window.location.replace("/projects");
    // Un proyecto que ya no existe es un caso esperado, no un fallo.
    else logError("render.unhandled", error, { digest: error.digest });
  }, [isMissingProject, error]);

  if (isMissingProject) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background">
        <HarmonyIsotype className="size-10 animate-pulse opacity-40" />
        <p className="text-sm text-muted-foreground">
          Proyecto no encontrado. Volviendo a tus proyectos…
        </p>
      </div>
    );
  }

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
        type="button"
        onClick={reset}
        className="mt-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Intentar de nuevo
      </button>
    </div>
  );
}
