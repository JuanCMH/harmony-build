import type { SignatureValue } from "@/convex/lib/form_types";
import { cn } from "@/lib/utils";

interface SignatureValueViewProps {
  value: SignatureValue;
  /** La dirección firmada de la imagen; sin ella, la imagen ya no está. */
  url: string | undefined;
  /** Dentro de la celda de una tabla: el recuadro, más bajo. */
  compact?: boolean;
}

/**
 * Una firma, leída: el trazo sobre fondo blanco —también en tema oscuro, la
 * tinta es oscura—, y debajo quién firma y su documento.
 */
export const SignatureValueView = ({
  value,
  url,
  compact = false,
}: SignatureValueViewProps) => (
  <figure className={cn("space-y-1.5", compact ? "w-40" : "w-full max-w-sm")}>
    <div className="overflow-clip rounded-md border bg-white">
      {url ? (
        // Un `<img>` y no `next/image`: es una dirección firmada del
        // almacenamiento, que caduca y cambia de una lectura a otra.
        <img
          src={url}
          alt={`Firma de ${value.signerName}`}
          loading="lazy"
          className="block aspect-[3/1] w-full object-contain"
        />
      ) : (
        <p className="flex aspect-[3/1] items-center justify-center px-3 text-center text-xs text-gray-600">
          La imagen de la firma ya no está disponible
        </p>
      )}
    </div>
    <figcaption className="space-y-0.5">
      <p className={cn("break-words", compact ? "text-ui" : "text-sm")}>
        Firmado por {value.signerName}
      </p>
      {value.signerDocument && (
        <p className="text-xs text-muted-foreground tabular-nums">
          Documento {value.signerDocument}
        </p>
      )}
    </figcaption>
  </figure>
);
