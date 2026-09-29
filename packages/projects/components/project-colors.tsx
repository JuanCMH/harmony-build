import { bgCustomColors, type CustomColor } from "@/lib/custom-colors";
import { cn } from "@/lib/utils";

/** Los dos colores del proyecto, en una barra: identifican, no decoran. */
export const ProjectColors = ({
  primaryColor,
  secondaryColor,
  className,
}: {
  primaryColor: CustomColor;
  secondaryColor: CustomColor;
  className?: string;
}) => (
  <span
    aria-hidden
    className={cn("flex h-1.5 overflow-hidden rounded-full", className)}
  >
    <span className={cn("flex-1", bgCustomColors[primaryColor])} />
    <span className={cn("flex-1", bgCustomColors[secondaryColor])} />
  </span>
);
