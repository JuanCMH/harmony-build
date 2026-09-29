import type { ReferenceValue } from "@/convex/lib/form_types";
import Link from "next/link";

interface ReferenceValueViewProps {
  value: ReferenceValue;
  /** La dirección del elemento, si quien mira puede abrirlo. */
  href?: string;
  /** Dentro de la celda de una tabla: los datos traídos, en una línea. */
  compact?: boolean;
}

/**
 * Una relación respondida: el elemento elegido y, debajo, los datos que se
 * trajeron de él **tal como estaban al responder**. La inspección del 3 de
 * marzo dice con qué SOAT circulaba el vehículo el 3 de marzo, y la nota lo
 * advierte: el elemento puede decir hoy otra cosa.
 */
export const ReferenceValueView = ({
  value,
  href,
  compact = false,
}: ReferenceValueViewProps) => {
  const title = value.label || "Elemento sin título";
  const heading = href ? (
    <Link
      href={href}
      className="rounded-sm font-medium underline-offset-4 hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      {title}
    </Link>
  ) : (
    <span className="font-medium">{title}</span>
  );

  if (value.snapshot.length === 0)
    return <p className="text-sm break-words">{heading}</p>;

  if (compact)
    return (
      <div className="space-y-0.5">
        <p className="text-sm break-words">{heading}</p>
        <p className="text-xs text-muted-foreground">
          {value.snapshot
            .map((entry) => `${entry.label}: ${entry.text || "sin dato"}`)
            .join(" · ")}
        </p>
      </div>
    );

  return (
    <div className="space-y-2">
      <p className="text-sm break-words">{heading}</p>
      <div className="space-y-2 rounded-md border bg-muted/40 p-3">
        <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {value.snapshot.map((entry) => (
            <div key={entry.fieldId} className="min-w-0 space-y-0.5">
              <dt className="text-xs text-muted-foreground">{entry.label}</dt>
              <dd className="text-sm break-words">
                {entry.text || (
                  <span className="text-muted-foreground">Sin dato</span>
                )}
              </dd>
            </div>
          ))}
        </dl>
        <p className="text-xs text-muted-foreground">
          Datos al momento de responder
        </p>
      </div>
    </div>
  );
};
