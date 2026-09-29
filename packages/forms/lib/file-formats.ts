/**
 * Los formatos que un campo de archivo puede exigir, agrupados como los piensa
 * quien diseña el formato: «PDF», «Word»… y no como extensiones sueltas.
 *
 * Se guardan como extensiones (`.pdf`): el servidor compara el nombre del
 * archivo y un tipo MIME exacto, y un grupo como «Imágenes» no tiene un único
 * MIME que lo cubra.
 */
export const FILE_FORMAT_GROUPS = [
  { id: "pdf", label: "PDF", extensions: [".pdf"] },
  { id: "word", label: "Word", extensions: [".doc", ".docx"] },
  { id: "excel", label: "Excel", extensions: [".xls", ".xlsx"] },
  {
    id: "images",
    label: "Imágenes",
    extensions: [".jpg", ".jpeg", ".png", ".webp"],
  },
] as const;

export type FileFormatGroup = (typeof FILE_FORMAT_GROUPS)[number];

export const hasFormatGroup = (
  formats: readonly string[],
  group: FileFormatGroup,
) => group.extensions.every((extension) => formats.includes(extension));

/** Enciende o apaga un grupo. Sin ninguno, `undefined`: se admite cualquiera. */
export const toggleFormatGroup = (
  formats: readonly string[],
  group: FileFormatGroup,
): string[] | undefined => {
  const extensions: readonly string[] = group.extensions;
  const next = hasFormatGroup(formats, group)
    ? formats.filter((format) => !extensions.includes(format))
    : [...new Set([...formats, ...extensions])];
  return next.length > 0 ? next : undefined;
};

/** «PDF o Word», para decir qué se admite. */
export const describeFormats = (formats: readonly string[]): string => {
  const groups = FILE_FORMAT_GROUPS.filter((group) =>
    hasFormatGroup(formats, group),
  );
  const covered = new Set<string>(groups.flatMap((group) => group.extensions));
  const parts = [
    ...groups.map((group) => group.label),
    ...formats.filter((format) => !covered.has(format)),
  ];
  return parts.length <= 1
    ? (parts[0] ?? "")
    : `${parts.slice(0, -1).join(", ")} o ${parts.at(-1)}`;
};

/** Si un archivo entra en los formatos pedidos. Sin lista, entra cualquiera. */
export const acceptsFile = (
  formats: readonly string[],
  file: { name: string; type: string },
) =>
  formats.length === 0 ||
  formats.some((format) =>
    format.startsWith(".")
      ? file.name.toLowerCase().endsWith(format.toLowerCase())
      : file.type === format,
  );
