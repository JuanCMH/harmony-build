import { cn } from "@/lib/utils";

/** Un campo que nadie respondió. Se dice, en gris: un hueco en blanco no
 *  distingue «no se respondió» de «no ha cargado». */
export const EmptyValue = ({ className }: { className?: string }) => (
  <span className={cn("text-sm text-muted-foreground", className)}>
    Sin respuesta
  </span>
);
