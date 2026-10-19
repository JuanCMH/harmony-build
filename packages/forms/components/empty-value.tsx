import { cn } from "@/lib/utils";

/** Un campo que nadie respondió. Se dice, en gris: un hueco en blanco no
 *  distingue «no se respondió» de «no ha cargado». */
export const EmptyValue = ({ className }: { className?: string }) => (
  <span className={cn("text-sm text-muted-foreground", className)}>
    Sin respuesta
  </span>
);

/** Un campo que una importación no pudo traer: una firma, una foto, un
 *  archivo o una tabla. No es que nadie lo respondiera: el archivo no lo
 *  llevaba, y se dice así. */
export const UnavailableValue = ({ className }: { className?: string }) => (
  <span className={cn("text-sm text-muted-foreground", className)}>
    No disponible en una respuesta importada
  </span>
);
