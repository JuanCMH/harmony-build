# Módulo de formatos — implementación

**Fecha:** 2026-09-28 · **Estado:** propuesta · **Diseño:**
`2026-09-28-modulo-de-formatos-design.md`

> Este plan no se ejecuta hasta que el diseño pase a `aprobado` (`05 §3.2`). Si
> al aprobar cambia alguna de las decisiones de las preguntas abiertas 1 a 4,
> las tareas marcadas con ◆ cambian con ella.

Contrato de datos primero, servidor después, interfaz al final. Cuatro
entregas; cada una cierra con `bun run check`, `bun run test` y su recorrido en
el navegador, **en teléfono y en escritorio**. «Portar» significa copiar de
`/home/juanc/work/harmony` y adaptar; la ruta de origen va entre paréntesis.

## Entrega 1 · Formatos y respuestas

### T1 · Tipos y límites (núcleo puro)
- `convex/lib/form_types.ts` (de `convex/lib/template_types.ts`): `FIELD_TYPES`
  con los catorce portados, `FIELD_SIZES`, operadores, recetas y sus tipos. Sin
  `TEMPLATE_SCOPES`, `templateScope` ni `FIELD_TYPE_SCOPES`. `FORM_LIMITS` con
  los techos del diseño §3. `FORM_KINDS` (`record`, `catalog`).
- La configuración de un campo deja de ser un objeto plano compartido: unión
  discriminada por tipo, para que los cuatro tipos nuevos entren sin añadir
  claves opcionales a todos los demás.
- `storedValue`: validador y tipo de la unión de valores del diseño §3, con
  sus ocho `kind`. En esta entrega se usan cinco (`text`, `number`, `boolean`,
  `list`, `file`); los otros tres se declaran ya para no migrar después.
- Sin `kind` opcional en la fórmula ni `reminderOffsetDays`: eran
  compatibilidad hacia atrás de Harmony.

### T2 · Motor de reglas
- `convex/lib/field_logic.ts` y `convex/lib/__tests__/field_logic.test.ts`,
  tal cual (no tienen dominio). Las 43 pruebas deben pasar sin tocarlas; si
  alguna cambia, se explica en el commit.
- `convex/lib/form_context.ts`: sólo el mecanismo de
  `convex/lib/incident_context.ts` (`TemplateContext`, `withTemplateContext`,
  `isReservedFieldId`), con dos campos de contexto de sólo lectura: `@fecha`
  (la fecha de negocio de la respuesta) y `@autor`.

### T3 · Validación del formato y de los valores
- `convex/lib/form_validation.ts` (de `template_validation.ts`):
  `validateForm(sections, options)` con límites, tipos admitidos y campos de
  contexto inyectados. Sin ramas de novedades. Una sección puede condicionarse
  a un campo de **otra** sección anterior; la detección de ciclos entre
  secciones entra aquí con su prueba.
- `convex/lib/value_validation.ts`, **nuevo**: `validateValues(sections,
  values)` comprueba cada valor contra su campo —forma del `kind`, formato de
  correo, enlace, fecha y hora, rango y longitud, que la opción exista—. Puro,
  con una prueba por tipo y por motivo de rechazo.
- El constructor gana los controles de `minLength`, `maxLength`, `minValue` y
  `maxValue`, que en Harmony existían en el schema y no se podían escribir.
- Errores: `formsErrors` y `formResponsesErrors` en
  `convex/lib/error_messages.ts`.

### T4 · Schema
- Tablas `formCategories`, `forms`, `formVersions` y `formResponses`, con los
  campos e índices del diseño §8. `formResponseLinks` se declara en la
  entrega 2.
- `projects.defaultRoleId` opcional.
- `affectedEntityTypes` gana `form` y `formResponse`; `logs.getLogDetails`
  resuelve los dos.
- `projects.purgeProjectData` drena las cuatro tablas y borra los archivos de
  las respuestas. `projects.getDeletionImpact` cuenta formatos y respuestas, y
  `packages/projects/lib/deletion-impact-message.ts` los nombra. Prueba de la
  cascada en `convex/__tests__/projects.test.ts`.

### T5 · Permisos
- Siete llaves nuevas en `convex/permissions.ts` y su casilla en
  `packages/roles/lib/permissions.ts`, en un grupo «Formatos».
- `convex/lib/form_access.ts`: `canFillForm` (llave más audiencia),
  `canViewResponse` (propia, o `viewResponses`), `visibleForms`. Prueba de la
  matriz del diseño («Qué ve cada quien») en
  `convex/__tests__/forms-authorization.test.ts`, incluido que dos proyectos no
  se ven entre sí.

### T6 · Formatos y versiones (servidor)
- `convex/formCategories.ts`: `get`, `create`, `update`, `remove` (se niega si
  algún formato la usa).
- `convex/forms.ts`: `create`, `duplicate`, `updateDetails` (nombre, código,
  descripción, categoría, audiencia), `saveDraft` (valida con `validateForm`),
  `publish` (el borrador pasa a versión N+1 y nace un borrador nuevo igual),
  `discardDraft`, `archive`, `unarchive`, `remove` (sólo sin respuestas),
  `get` (lista ligera, sin secciones, filtrada por `visibleForms`), `getById`,
  `getDraft`, `getVersion`.
- `formVersions` no tiene mutación de edición sobre una versión publicada, y
  una prueba lo afirma.
- Auditoría de cada acto de la lista del diseño.

### T7 · Respuestas (servidor)
- `convex/lib/form_values.ts` (de `form_values.ts` y `field_values.ts`):
  `resolveValues` como frontera única —poda de ocultos, cálculos,
  obligatorios visibles, validación por valor—; validación y liberación de
  archivos por referencias.
- `convex/formFiles.ts`: `generateUploadUrl` autoriza con `canFillForm`.
- `convex/formResponses.ts`: `submit` (crea contra la última versión
  publicada; la fecha de negocio la pone el servidor con
  `todayInColombia`), `void`, `getById`, `list` (paginada con
  `paginationOptsValidator`; devuelve todas o sólo las propias según la
  llave), `listMine`.
- `forms.responseCount` se mantiene en `submit` y en la purga.
- `projects.join` asigna `defaultRoleId` si existe; `projects.update` lo
  acepta, comprobando que el rol es del proyecto.
- Pruebas: `convex/__tests__/form-responses.test.ts` (envío, validación por
  valor, versión fijada, anulación, archivos) y el caso de `join` en
  `projects.test.ts`.

### T8 · Paquete `packages/forms/`
- `api.ts`, `store/use-form-id.ts`, `store/use-response-id.ts`.
- De `packages/templates/lib/`: `field-catalog`, `field-defaults`,
  `field-rules`, `grid`, `date-value`, `file-value`, `file-formats`,
  `upload-pending-files`, con sus pruebas. `removal-warning` no se porta:
  quitar un campo ya no borra nada.
- De `packages/templates/components/`: `template-builder`, `template-canvas`,
  `field-palette`, `section-tabs`, `field-config`,
  `sheets/field-behavior-sheet`, `rule-editor`, `rule-value-input`,
  `computed-editor`, `template-rules-summary`, `template-form`,
  `template-field`, `file-field-control`, `template-column-value`, renombrados
  a `form-*`. Sin las ramas por ámbito, sin vigencia.
- `components/harmony/currency-input.tsx` y `panel-card.tsx` (de Harmony), y
  `lib/currency.ts`.
- Dependencias `@dnd-kit/core`, `@dnd-kit/sortable` y `@dnd-kit/utilities`,
  con su fila en `00 §5.1`.

### T9 · Pantallas
- `app/(harmony)/projects/[projectId]/formats/page.tsx`: pestañas Formatos y
  Listados (la segunda, vacía de acciones hasta la entrega 2), buscador,
  filtro por categoría, «Crear formato».
- `formats/[formId]/edit/page.tsx`: constructor, con cabecera de nombre,
  código, categoría y audiencia; «Guardar borrador» y «Publicar»; la versión
  vigente a la vista.
- `formats/[formId]/fill/page.tsx`: diligenciar. Borrador local en
  `packages/forms/lib/use-local-draft.ts` (clave por proyecto, formato y
  versión; se descarta si la versión cambió), con su prueba.
- `formats/[formId]/page.tsx`: tabla paginada de respuestas
  (`components/responses-table.tsx`), filtros por fecha y autor en la URL con
  `nuqs`.
- `formats/[formId]/responses/[responseId]/page.tsx`: respuesta en sólo
  lectura (`components/response-view.tsx`) y «Anular».
- `ajustes/categorias/page.tsx`; rol por defecto en `ajustes/usuarios`.
- Inicio del proyecto: bloque «Para diligenciar».
- Sidebar: entrada **Formatos** en el grupo de operación.

### T10 · Directrices
- `00 §3`: el árbol del dominio con las tablas nuevas. `00 §5.1`: dnd-kit.
- `01 §5.3`: las siete llaves. `01 §6.1`: las filas de cascada.
- `03 §5.2` y `§5.5`: los glifos de Formato, Listado, Respuesta y de los
  catorce tipos; `03 §1.4`: los colores de estado de un formato (borrador,
  publicado, archivado) y de una respuesta (enviada, anulada).

### Cierre de la entrega 1
Recorrido: crear el formato «Horas hombre trabajadas» con número, fecha y un
cálculo; publicarlo; diligenciarlo desde un teléfono con un miembro que entró
por código y recibió el rol por defecto; cerrar el navegador a la mitad y
comprobar que el borrador vuelve; verlo en el listado como administrador y
comprobar que un segundo miembro sólo ve las suyas; publicar una versión 2 sin
el cálculo y comprobar que la respuesta de la versión 1 lo conserva.

## Entrega 2 · Listados y relaciones ◆

### T11 · Listados
- `forms.kind = "catalog"` deja de estar oculto en «Crear». `titleFieldId`
  obligatorio para publicar un listado; sólo puede ser un campo de texto
  corto, obligatorio y sin condición.
- `convex/formResponses.ts`: `createEntry`, `updateEntry` (pasa el elemento a
  la versión vigente), `setEntryActive`, con `editCatalogs`. `title` se
  recalcula al guardar. Índice de búsqueda sobre `title`.
- `validateForm` rechaza el tipo firma en un listado.

### T12 · Tipo relación
- Tipo `reference` en `form_types.ts`: `config.source` (`formId`) y
  `config.fill` (qué campos del listado se traen).
- `convex/lib/form_references.ts`, puro: grafo de relaciones entre formatos y
  detección de ciclos. `forms.publish` lo comprueba contra la base, junto con
  que el listado de origen existe, es del proyecto, es un listado y está
  publicado.
- Tabla `formResponseLinks` e índices por respuesta y por elemento
  relacionado. `submit` y `updateEntry` las escriben; la purga las drena.
- `value_validation` comprueba el elemento relacionado; la instantánea
  (título y campos traídos) la compone el **servidor**, no el navegador.
- Integridad: `setEntryActive`, `forms.remove` y `forms.saveDraft` aplican
  las cuatro reglas del diseño §5, con el nombre de quien estorba en el error.
- `convex/__tests__/form-references.test.ts`.

### T13 · Interfaz
- `packages/forms/components/reference-field-control.tsx`: selector con
  búsqueda remota y `useDebounce` (patrón del control de diagnóstico de
  Harmony), con los campos traídos debajo, de sólo lectura.
- Configuración del campo en el constructor: elegir listado y campos a traer.
- Pestaña Listados operativa; pantalla de elementos con «Añadir», «Editar»,
  «Inactivar» y filtro de inactivos; historial de un elemento en su detalle.
- Filtro «por elemento» en la tabla de respuestas.

### Cierre de la entrega 2
Recorrido: crear el listado «Vehículos» con placa como título, SOAT y
vigencia; añadir tres; crear un formato que lo relacione trayendo SOAT;
diligenciarlo; renovar el SOAT de un vehículo y comprobar que la respuesta
anterior conserva el viejo; inactivar un vehículo y comprobar que desaparece
del selector y sigue en el historial; intentar eliminar el listado.

## Entrega 3 · Inspecciones

### T14 · Lista de chequeo
- Tipo `checklist`: bloques, ítems, subítems, escala con sentido por opción,
  extras por ítem. Plantillas de las cinco escalas del cliente en
  `packages/forms/lib/checklist-scales.ts`.
- `value_validation`: ítems completos si es obligatorio; observación
  obligatoria cuando la opción es no conforme; que cada `itemId` y cada opción
  existan.
- `packages/forms/components/checklist-field-control.tsx` (captura, con
  «Marcar todo conforme» por bloque) y `checklist-editor.tsx` (constructor:
  pegar una lista de ítems desde el portapapeles, una línea por ítem, para no
  teclear sesenta y tres).
- Lectura: en el detalle, los no conformes primero y destacados; en la tabla
  de respuestas, una columna resumen («61 conformes · 2 no conformes»).

### T15 · Firma
- Tipo `signature`. `packages/forms/components/signature-pad.tsx`: lienzo con
  eventos de puntero, «Borrar», exporta PNG; sin librería.
- Nombre y documento de quien firma, de la sesión o escritos.
- El servidor exige imagen reciente, como en el tipo imagen.

### T16 · Directrices
- `03 §5.5`: glifos de lista de chequeo y firma. `03 §1.4`: los tres sentidos
  de una opción (conforme, no conforme, no aplica) como colores de estado del
  dominio. `03 §6`: reglas de captura en teléfono que salgan del recorrido.

### Cierre de la entrega 3
Recorrido: construir la inspección preoperacional de vehículos (`SST-F-010`,
versión 4) completa, con sus nueve bloques y 63 ítems, relacionada con los
listados de vehículos y conductores; diligenciarla en un teléfono real,
cronometrando; comprobar la observación obligatoria al marcar «Malo».

## Entrega 4 · Tablas ◆

### T17 · Tabla
- Tipo `table`: columnas tipadas, filas mínimas y máximas.
- `value_validation` recorre filas y celdas; los archivos y firmas de las
  celdas entran en la validación y en la liberación por referencias.
- `packages/forms/components/table-field-control.tsx` (tarjetas en teléfono,
  tabla en escritorio) y `table-editor.tsx`.
- Relaciones dentro de una fila: escriben su `formResponseLinks`.

### Cierre de la entrega 4
Recorrido: construir la entrega de dotación y EPP (`SST-F-007`), con firma por
fila, y diligenciarla con tres elementos.

## Al terminar

- Los dos planes pasan a `implementado` con la fecha (`05 §3`, paso 6).
- Queda anotado qué formato del cliente no se pudo construir, si alguno, y por
  qué: es la entrada del plan siguiente.
