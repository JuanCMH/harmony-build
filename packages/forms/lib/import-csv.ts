/** El lector de `.csv` de una importación.
 *
 *  Propio, porque `exceljs` sólo lee `.csv` con los flujos de Node, que el
 *  navegador no tiene. Cubre lo que un lector hecho a la ligera resuelve mal:
 *  comillas, comillas dentro de comillas, saltos de línea dentro de una celda,
 *  el separador `;` con que Excel exporta en español y la marca de orden de
 *  bytes. Las fechas y los números salen como texto: interpretarlos es de
 *  `import-cells.ts`.
 */

const DELIMITERS = [",", ";", "\t"] as const;
export type CsvDelimiter = (typeof DELIMITERS)[number];

const stripBom = (text: string) =>
  text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;

/** El separador de un archivo: el que más aparece en su primera línea, fuera
 *  de comillas. En caso de empate, la coma. */
export function detectDelimiter(source: string): CsvDelimiter {
  const text = stripBom(source);
  const counts = new Map<CsvDelimiter, number>(DELIMITERS.map((d) => [d, 0]));
  let quoted = false;
  for (const char of text) {
    if (char === '"') quoted = !quoted;
    else if (!quoted && (char === "\n" || char === "\r")) break;
    else if (!quoted && counts.has(char as CsvDelimiter)) {
      counts.set(
        char as CsvDelimiter,
        (counts.get(char as CsvDelimiter) ?? 0) + 1,
      );
    }
  }
  let best: CsvDelimiter = ",";
  for (const delimiter of DELIMITERS) {
    if ((counts.get(delimiter) ?? 0) > (counts.get(best) ?? 0))
      best = delimiter;
  }
  return best;
}

/**
 * Las filas de un `.csv`, cada una con sus celdas como texto.
 *
 * Una fila vacía sale como una fila de una celda vacía: descartarla es de
 * quien arma la hoja, que necesita el número de línea de las demás.
 */
export function parseCsv(
  source: string,
  delimiter: CsvDelimiter = detectDelimiter(source),
): string[][] {
  const text = stripBom(source);
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  const endCell = () => {
    row.push(cell);
    cell = "";
  };
  const endRow = () => {
    endCell();
    rows.push(row);
    row = [];
  };

  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (quoted) {
      if (char !== '"') cell += char;
      else if (text[index + 1] === '"') {
        // Dos comillas seguidas dentro de comillas son una comilla.
        cell += '"';
        index++;
      } else quoted = false;
      continue;
    }
    if (char === '"' && cell === "") quoted = true;
    else if (char === delimiter) endCell();
    else if (char === "\n") endRow();
    else if (char === "\r") {
      if (text[index + 1] === "\n") index++;
      endRow();
    } else cell += char;
  }
  // La última línea, si el archivo no termina en salto.
  if (cell !== "" || row.length > 0) endRow();
  return rows;
}
