interface FillHeaderProps {
  name: string;
  code?: string;
  /** La versión publicada que se diligencia. */
  versionNumber: number | null;
  description?: string;
  /** Lo que se está haciendo, cuando no es diligenciar: «Elemento nuevo». */
  eyebrow?: string;
}

/**
 * La cabecera de la hoja: qué formato es, con su código y su versión, como en
 * el encabezado del papel. El código va delante porque es como lo nombra la
 * obra («la diez», «la SST-F-010»).
 */
export const FillHeader = ({
  name,
  code,
  versionNumber,
  description,
  eyebrow,
}: FillHeaderProps) => {
  const meta = [
    eyebrow,
    code,
    versionNumber !== null ? `Versión ${versionNumber}` : null,
  ].filter(Boolean);

  return (
    <header className="space-y-1">
      {meta.length > 0 ? (
        <p className="text-xs text-muted-foreground tabular-nums">
          {meta.join(" · ")}
        </p>
      ) : null}
      <h2 className="text-xl font-medium tracking-tight text-balance">
        {name}
      </h2>
      {description ? (
        <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
      ) : null}
    </header>
  );
};
