import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface ListEmptyProps {
  icon: LucideIcon;
  /** Qué falta, dicho como frase: no «sin resultados» (`03 §2.3`). */
  title: string;
  hint?: string;
  /** Lo que resuelve el vacío: «Diligenciar», «Quitar filtros». */
  action?: ReactNode;
}

/**
 * El vacío de la tabla de respuestas o de elementos.
 *
 * Tiene la silueta de `CollectionEmpty` y le añade la acción: una tabla vacía
 * de un formato que se acaba de publicar no se resuelve leyendo, se resuelve
 * diligenciando, y el botón tiene que estar donde se mira.
 */
export const ListEmpty = ({
  icon: Icon,
  title,
  hint,
  action,
}: ListEmptyProps) => (
  <div className="flex flex-col items-center justify-center px-8 py-10 text-center">
    <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
      <Icon className="size-5" />
    </div>
    <p className="text-sm text-muted-foreground">{title}</p>
    {hint ? (
      <p className="mt-1 max-w-md text-xs text-muted-foreground">{hint}</p>
    ) : null}
    {action ? <div className="mt-4">{action}</div> : null}
  </div>
);
