# Importación de registros — implementación

**Fecha:** 2026-10-10 · **Estado:** implementado (2026-10-10) · **Diseño:**
`2026-10-10-importacion-de-registros-design.md`

> El diseño se aprobó el 2026-10-10 con las respuestas propuestas a sus
> preguntas abiertas. Tres precisiones salieron al planificar y quedan
> escritas aquí y en el diseño:
>
> 1. **`exceljs` no lee `.csv` en el navegador** (su lector usa flujos de
>    Node). El `.xlsx` lo lee `exceljs`; el `.csv`, un lector propio y puro,
>    con su suite: comillas, saltos de línea dentro de una celda, separador
>    `,` o `;` y marca de orden de bytes.
> 2. **La observación obligatoria de un ítem no conforme no se exige** en una
>    respuesta importada: una exportación de formulario trae la opción, no la
>    nota. Es la misma exención que la firma.
> 3. **La llave entra obligatoria.** Ningún deployment tiene roles guardados
>    (se comprobó el de desarrollo el 2026-10-10), así que no hace falta el
>    paso de ensanchar de `01 §7.1`.

Contrato de datos primero, servidor después, interfaz al final. Una entrega,
que cierra con `bun run check`, `bun run test` y su recorrido en el navegador.

## T1 · Reglas compartidas (núcleo puro)

- `convex/lib/import_types.ts`, **nuevo** y puro (`01 §2.2`):
  `IMPORT_LIMITS` (5.000 filas, lotes de 50, 300 valores distintos, 10 MB),
  `IMPORT_MODES` (`add` en un formato; `skip` y `update` en un listado),
  `IMPORT_STATUSES`, `isImportExempt(field)` —firma, imagen, archivo y tabla—
  y `importSections(sections)`: las secciones como las exige una importación
  —lo exento y las listas de chequeo dejan de ser obligatorios; la nota
  `onFail` pasa a opcional—.
- `convex/lib/__tests__/import_types.test.ts`.
- `formImportsErrors` en `convex/lib/error_messages.ts`.

## T2 · Schema y permisos

- `convex/schema.ts`: tabla `formImports` (`formId`, `projectId`, `versionId`,
  `createdBy`, `fileName`, `fingerprint`, `mode`, `counts`, `status`,
  `finishedAt`, `revertedBy`, `revertedAt`) con índices `projectId` y
  `formId`. `formResponses.importId` opcional, con índice `importId`. El
  comentario del índice `formId_date` deja de decir que fecha y creación
  coinciden.
- `convex/permissions.ts`: `importResponses`, con su casilla «Importar
  registros» en `packages/roles/lib/permissions.ts`, `emptyPermissions` y
  `NO_PERMISSIONS` de las pruebas.
- `convex/projects.ts`: `formImports` entra en `LIGHT_TABLES`.
  `convex/forms.ts`: `remove` se lleva las importaciones del formato (las
  deshechas son lo único que puede quedar en un formato sin respuestas).

## T3 · Servidor

- `convex/lib/form_values.ts`: `replaceLinks` sale de `formEntries.ts` para
  compartirse.
- `convex/formImports.ts`, **nuevo**:
  - `start` — llave, formato publicado, modo acorde a la clase, total dentro
    del tope. Fija la versión de toda la importación y escribe la auditoría.
  - `writeBatch` — hasta 50 filas. Cada una pasa por `resolveValues` con
    `importSections`; la que falla **no tumba el lote**: vuelve con su motivo
    y suma a `counts.rejected`. En un formato exige la fecha de la fila, real
    y no futura. En un listado busca el título por `formId_titleSearch` y
    omite o actualiza según el modo.
  - `finish` — cierra la importación.
  - `revert` — marca `reverted`, escribe la auditoría y agenda `purge`.
  - `purge` (interna) — por lotes, re-agendándose: borra las respuestas de la
    importación y sus relaciones y resta del contador. En un listado conserva
    el elemento que alguna respuesta ya eligió.
  - `list` — las últimas importaciones de un formato, con su autor.
  - `entryTitles` — los títulos de un listado, paginados, para que el paso de
    valores resuelva las relaciones sin exigir `viewResponses`.
- `convex/formResponses.ts`: `list` ordena siempre por `formId_date`;
  `getById` devuelve `imported` (cuándo, quién, archivo); la fila de
  `rowReader` dice si es importada.
- `convex/__tests__/form-imports.test.ts`: la matriz de la llave; alguien de
  otro proyecto; fechas hacia atrás y rechazo de futuras; exenciones; una
  fila mala no tumba el lote; relación resuelta y con su instantánea;
  listado en modo omitir y actualizar; deshacer en formato y en listado; la
  purga del proyecto y el borrado del formato se llevan lo suyo.

## T4 · Lógica del cliente (pura, con suite)

En `packages/forms/lib/`:

- `import-csv.ts` — el lector de `.csv`.
- `import-cells.ts` — de una celda al valor de un campo, por tipo: número con
  coma o punto decimal, fecha día-primero o ISO, hora con a. m./p. m., sí/no.
- `import-mapping.ts` — los destinos que ofrece un formato (un campo, o un
  ítem de lista de chequeo, o la fecha del hecho), la asignación sugerida por
  nombre y la de valores por etiqueta.
- `import-rows.ts` — de filas y asignaciones a lo que se envía, con los
  motivos de lo que se queda fuera: usa `importSections`, `validateValues` y
  `missingRequired`, las mismas reglas del servidor.
- `import-file.ts` — lee el archivo (carga `exceljs` sólo al abrir un
  `.xlsx`) y calcula su huella.
- Dependencia `exceljs`, con su fila en `00 §5.1`.

## T5 · Interfaz

- `packages/forms/api.ts`: los hooks de `formImports`.
- `components/modals/import-modal.tsx` (amplio, `03 §3.1`) con sus cuatro
  pasos en `components/import-*-step.tsx`, el progreso de escritura por lotes
  y el resumen final.
- `components/sheets/imports-sheet.tsx`: las importaciones de un formato y
  «Deshacer», con `useConfirm` y su recuento.
- «Importar» en la pantalla de respuestas de un formato y en la de elementos
  de un listado, tras `RoleGate`, sólo desde `md`.
- `response-header.tsx`: «Importada el … por …». `field-value-view.tsx`: un
  campo exento sin valor se lee «No disponible en una respuesta importada».

## T6 · Directrices

- `00 §5.1`: `exceljs` instalada, para leer y escribir.
- `01 §3`: `formImports.ts` e `import_types.ts` en el árbol. `01 §5.3`: la
  decimosexta llave. `01 §5.6`: la primera mutation por lotes. `01 §6.1`:
  `formImports` en la tabla de cascadas. `01 §2.2`: `import_types.ts`.
- `03 §5.3`: `FileUp` importar.
- `04 §3`: la suite nueva.

## Cierre

Recorrido: importar un listado de vehículos; importar un año de inspecciones
con la relación resuelta por placa y la lista de chequeo columna a columna;
comprobar que un resultado del formato da para un mes lo mismo que el Excel
de origen; deshacer la importación y comprobar que el contador y los
resultados vuelven a su sitio.

## Cómo cerró

Hecho el 2026-10-10 con un archivo sintético en el proyecto de pruebas del
deployment de desarrollo: 17 vehículos, y 1.020 inspecciones con tres
relaciones y doce ítems de lista de chequeo, en 13 segundos. Las filas con
fecha vacía o futura, kilometraje que no es número, placa sin elemento y
opción fuera de la escala se quedaron fuera con su motivo. Al deshacer las
dos, los contadores y las respuestas volvieron a como estaban.

Tres ajustes salieron del recorrido: «Importada» en el sitio de la hora del
listado, porque la hora de creación no es la del hecho; un obligatorio cuya
celda no valió ya no sale además como faltante; y los valores sin
correspondencia van arriba en el paso de valores.

Queda sin hacer, y anotado: la comparación contra un Excel de origen real
—pide cargar datos de una empresa, que es decisión suya— y el recorrido a
390 px, que aquí sólo comprueba que el botón no se ofrece.
