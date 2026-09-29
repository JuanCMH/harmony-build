# Módulo de formatos

**Fecha:** 2026-09-28 · **Estado:** propuesta

> Fuentes de este diseño: los quince formatos reales del cliente
> (`SST-F-007` a `SST-F-118`, doce libros de Excel), el motor de formularios de
> Harmony (`packages/templates`, `convex/lib/field_logic.ts` y compañía) y sus
> siete planes de diseño. Lo que se hereda de Harmony se dice; lo que cambia,
> también, y por qué.

## Objetivo

Que cualquier formato que hoy se diligencia en papel o en Excel en la obra se
pueda **crear** en la plataforma sin programar, **diligenciar** desde el
teléfono las veces que haga falta, y **consultar** después respuesta por
respuesta, con los formatos relacionados entre sí: lo que un formato registra
(un equipo, un vehículo) lo puede elegir otro.

## Problema

La empresa lleva su sistema de seguridad y salud en el trabajo en hojas
impresas. Un conductor marca cada mañana sesenta y tres casillas de su
inspección preoperacional en una hoja semanal; el operario de la pulidora,
catorce; quien entrega dotación hace firmar una fila por cada elemento. Al
final del mes alguien de SST transcribe a mano lo que puede al informe de
gestión, y lo que no se transcribe no existe: no se sabe qué equipo acumuló más
hallazgos, qué vehículo no se inspeccionó el martes, ni cuándo vence el
extintor del cargador.

Los quince formatos revisados dejan ver cuatro cosas que cualquier solución
tiene que respetar:

1. **El patrón dominante es la lista de chequeo.** Diez de los quince son
   ítems en filas con una escala corta (B/M/N.A, Sí/No, C/NC) y una observación.
   Un constructor de formularios que sólo tenga campos sueltos no puede
   representarlos.
2. **El papel duplica lo que debería ser un listado.** La inspección de
   vehículos tiene hojas ocultas, una por vehículo y conductor, con la placa, el
   SOAT, la revisión técnico-mecánica y la licencia ya escritos, para no
   copiarlos cada semana. Eso es un listado de vehículos que nadie ha podido
   tener.
3. **La firma va en todos.** En los catorce formatos de captura, y en los
   preoperacionales es diaria.
4. **La hoja es semanal porque el papel lo es, no porque el dato lo sea.** Cada
   casilla es de un día y cada día firma quien operó.

Y pueden ser cientos de formatos por proyecto: además de crearlos hay que poder
encontrarlos.

## Dirección propuesta

### 1. Dos clases de formato: el que se diligencia y el listado

Un **formato** es una definición —secciones y campos— que vive en un proyecto.
Sus **respuestas** son cada vez que alguien lo diligencia. Hay dos clases, y la
clase se elige al crear y no cambia:

| | **Formato** (`record`) | **Listado** (`catalog`) |
|---|---|---|
| Qué es | Lo que la obra **hace**: una inspección, una entrega, un registro diario. | Lo que la obra **tiene**: equipos, vehículos, personas, extintores. |
| Una respuesta es | Un hecho con fecha y autor. | Un elemento que se mantiene al día. |
| Después de guardar | **No se edita.** Se anula, con motivo, y se vuelve a diligenciar. | **Se edita** cuando el dato cambia (renovó el SOAT) y se **inactiva** cuando deja de usarse. |
| Tiene título | No: se identifica por fecha, autor y sus columnas. | Sí: uno de sus campos es el **título** del elemento (la placa, el nombre del equipo). |
| Otros formatos lo eligen | No, en esta fase. | Sí: es el origen de los campos de tipo **relación** (§5). |
| Firma | Sí. | No (una firma sobre algo editable no firma nada). |

Las dos clases comparten tabla, constructor, motor y pantalla de respuestas.
La clase sólo decide las cuatro diferencias de la tabla.

- *Descartado: una sola clase con casillas «las respuestas se editan» y «tiene
  título».* Es más general y peor de explicar: obliga a quien crea el formato
  a entender tres ajustes técnicos para decir «esto es un listado». Las
  combinaciones sueltas tampoco tienen sentido —un registro firmado y
  editable— y habría que prohibirlas una a una.
- *Descartado: listados como tablas propias del sistema* (una tabla
  `equipment`, otra `vehicles`). Cada empresa nombra y describe sus equipos de
  otra manera, y el cliente ya pidió crear el listado «como un formato más».

### 2. El formato se versiona; lo publicado no se toca

En Harmony la plantilla se edita en sitio y quitar un campo borra sus
respuestas. Allí era aceptable: una plantilla por ámbito, editada por el super
administrador, con respuestas que son una ficha. Aquí un formato acumula una
respuesta por equipo y por día, y lo edita gente que no vio las anteriores.

- Cada formato tiene **versiones numeradas e inmutables**. Se edita siempre un
  **borrador**; «Publicar» lo convierte en la versión siguiente.
- Cada respuesta guarda **con qué versión se contestó** y se lee siempre con
  ella. Quitar un campo en la versión 3 no toca las respuestas de la 2.
- Sólo se diligencia la última versión publicada. Un formato sin publicar no
  aparece para diligenciar.
- Los ids de campo se conservan entre versiones: el campo «Placa» es el mismo
  en la 1 y en la 4 aunque cambie de etiqueta. El listado de respuestas arma
  sus columnas con la última versión y rellena con lo que cada respuesta tenga.
- En un **listado**, editar un elemento lo pasa a la versión vigente: se
  conservan los valores de los campos que siguen existiendo.
- El número de versión y la fecha de publicación se ven en la respuesta, como
  en el encabezado de los formatos en papel («Versión 4 · 2026-05-15»).

- *Descartado: copiar las secciones dentro de cada respuesta.* Resuelve lo
  mismo y multiplica el almacenamiento: la definición de la inspección de
  vehículos, con sus 63 ítems, viajaría entera en cada respuesta, por treinta
  vehículos, por cada día.
- *Descartado: marcar campos como retirados en vez de borrarlos.* La
  definición crece para siempre y no resuelve que cambie la escala de una lista
  de chequeo o el orden de sus ítems.

### 3. Una respuesta es un documento; lo que se consulta, en filas

Harmony guarda una fila por valor, siempre texto. Eso le costó un listado que
lee las respuestas de una en una y le impide guardar nada que no sea un escalar
—una lista de chequeo acabaría como `"[object Object]"`—. Su regla de diseño,
sin embargo, es la correcta y se conserva: **anidado lo que se lee entero; en
filas lo que hay que consultar.**

- **La respuesta es un documento** (`formResponses`) con todos sus valores
  anidados y tipados. Abrir una respuesta es una lectura; listar cincuenta,
  una página.
- **Las relaciones van en filas** (`formResponseLinks`): una por cada campo de
  relación respondido. Es lo único que hay que consultar al revés —«todas las
  inspecciones de este vehículo», «¿alguien usa este equipo?»—.
- Los **archivos y firmas** van al almacenamiento; la respuesta guarda su id.

El valor de cada campo es una unión discriminada:

| `kind` | Forma | Tipos de campo |
|---|---|---|
| `text` | `value: string` | texto corto, texto largo, correo, teléfono, enlace, fecha (`YYYY-MM-DD`), hora (`HH:mm`), lista |
| `number` | `value: number` | número, moneda |
| `boolean` | `value: boolean` | casilla |
| `list` | `value: string[]` | lista múltiple |
| `file` | `storageId`, `name` | archivo, imagen, firma |
| `reference` | `responseId`, `label` | relación |
| `checklist` | `items: { itemId, value?, note?, quantity?, date? }[]` | lista de chequeo |
| `table` | `rows: { rowId, cells: { columnId, value }[] }[]` | tabla |

Los valores de una respuesta viajan y se guardan como **arreglo** de
`{ fieldId, value }`, no como objeto: un objeto de Convex no admite más de
1.024 claves, y Harmony ya tropezó con eso.

- *Descartado: una fila por celda.* Es lo que permitiría contar en la base
  «cuántos “Malo” tuvo el ítem 4 este mes», y por eso se consideró en serio.
  Pero una inspección de vehículos son 63 filas por respuesta: treinta
  vehículos en un mes son 56.700, y una consulta de Convex lee como mucho
  32.000 documentos. Las mismas 900 respuestas, como documentos, se leen en una
  consulta. Cuando lleguen las gráficas y el volumen lo pida, el resumen por
  ítem será un dato derivado que se reconstruye (`01 §7`), no la forma de
  guardar.

Techos que el servidor valida al publicar, holgados frente a los de Convex
(1 MiB por documento, 8.192 elementos por arreglo):

| Límite | Valor | De dónde sale |
|---|---|---|
| Secciones por formato | 20 | Donde la barra de pestañas deja de ser manejable en teléfono. |
| Campos por formato | 200 | El mayor de los quince no llega a treinta campos, más una lista de 63 ítems. |
| Ítems por lista de chequeo | 150 | Ídem, con margen para fusionar variantes. |
| Columnas por tabla | 12 | La tabla más ancha del cliente tiene 15, ocho de ellas una lista de chequeo horizontal (§4.3). |
| Filas por tabla | 100 | La ficha de dotación trae 19; el listado de personal, unas decenas. |

### 4. Tipos de campo

Se portan de Harmony **catorce** de sus quince tipos, con su control, su
validación y sus reglas: texto corto, texto largo, correo, teléfono, enlace,
número, moneda, fecha, hora, lista, lista múltiple, casilla, archivo e imagen.
Se queda fuera el diagnóstico CIE-10 (ver preguntas abiertas). Y entran
**cuatro nuevos**, los que los formatos del cliente justifican:

#### 4.1 Lista de chequeo (`checklist`)

Es el campo de diez de los quince formatos.

- **Ítems** agrupados en **bloques** con título («1. Niveles», «2. Mecánico»),
  en el orden en que se recorre el equipo. Un ítem puede tener subítems
  («Luces frontales: altas, medias, direccionales»), que son ítems con sangría
  y se responden cada uno.
- **Escala** de opción única, propia de cada campo, con plantillas para las
  cinco que usa el cliente: B/M/N.A, Sí/No, Sí/No/N.A, C/NC, S/N/N.A. Cada
  opción declara su **sentido**: conforme, no conforme o no aplica. El sentido
  es lo que pinta el color, lo que hará posibles las gráficas («ítems no
  conformes») y lo que dispara la observación.
- **Por ítem, además de la escala**, el campo puede pedir: observación
  (nunca, opcional, u **obligatoria cuando la respuesta es no conforme**),
  cantidad y fecha. Cantidad y fecha son lo que convierte la lista en la
  «inspección de botiquín»: cantidad actual, estado y fecha de vencimiento por
  elemento.
- **Obligatorio** significa todos los ítems respondidos.
- **En teléfono** cada ítem es una fila con su texto arriba y la escala como
  botones del ancho del pulgar debajo; la observación se despliega al marcar
  no conforme. «Marcar todo conforme» en la cabecera de cada bloque, porque en
  una inspección normal casi todo lo es, y dejar al conductor pulsar sesenta y
  tres veces es la forma de que deje de inspeccionar. Quien lo use tiene que
  pulsarlo bloque a bloque, no una sola vez para todo el formato.

- *Descartado: un campo de lista por ítem.* Es lo que se podría hacer hoy con
  el motor de Harmony: 63 campos con las mismas tres opciones. El constructor
  sería inmanejable, el formulario no cabría en un teléfono y no habría forma
  de decir «marca todo».

#### 4.2 Firma (`signature`)

- Trazo sobre un lienzo, con el dedo o el ratón; se guarda como imagen por el
  mismo camino que el tipo imagen (se sube justo antes de guardar, se valida
  que sea una imagen reciente, se borra cuando nadie la referencia).
- Junto a la firma se guardan **nombre y documento de quien firma**, que el
  campo pide si quien firma no es quien diligencia (el trabajador que recibe
  dotación), y que toma de la sesión si lo es.
- Sólo en formatos de clase **formato**, que no se editan: una firma no se
  reemplaza.

#### 4.3 Tabla (`table`)

Filas que se añaden al diligenciar, con columnas definidas en el formato.

- Columnas de los tipos escalares: texto, número, fecha, lista, casilla,
  relación, imagen y firma. La firma por fila es la entrega de dotación; la
  imagen por fila, el registro fotográfico.
- **Sin tablas dentro de tablas ni listas de chequeo dentro de tablas.** La
  inspección de extintores —una fila por extintor con ocho criterios C/NC— no
  se resuelve con una tabla sino con **una respuesta por extintor**, con el
  extintor elegido del listado: así cada extintor tiene su historial.
- **En teléfono** una fila no es una fila: es una tarjeta que se abre para
  editarla, con «Añadir fila» al final.
- Las reglas y los cálculos **no miran dentro** de una tabla en esta fase (ni
  sumas por columna). Harmony dejó los agregados por filas fuera de alcance y
  aquí se mantiene.

#### 4.4 Relación (`reference`)

El campo que une los formatos. Ver §5.

#### 4.5 Comportamiento de los campos

Se portan tres de las cuatro conductas de Harmony, con su motor y sus
editores: **visibilidad condicional**, **valor calculado** (las nueve recetas)
y **valor sugerido**. Sobre los tipos nuevos:

| Tipo | Puede condicionar a otros | Puede ser condicionado | Puede calcularse |
|---|---|---|---|
| Lista de chequeo | No, en esta fase | Sí | No |
| Firma | «está firmado / no lo está» | Sí | No |
| Tabla | «tiene filas / no tiene» | Sí | No |
| Relación | «es / no es / está vacío» | Sí | No |

Una **sección** también puede ser condicional, y a diferencia de Harmony puede
depender de la respuesta de un campo, siempre que ese campo esté en una sección
**anterior**: es la regla que impide los ciclos entre secciones sin prohibir el
caso útil («si el equipo es eléctrico, muestra la sección de conexiones»).

La cuarta conducta, **vigencia y avisos** (el correo que avisa de que una fecha
vence), se queda fuera de esta fase: son unas 1.400 líneas entre servidor,
correo y editor, y ningún formato del cliente la pide todavía —capturan fechas
de vencimiento, no piden que nadie avise—. Las fechas se guardan igual, así que
añadirla después no obliga a migrar nada.

### 5. Relación entre formatos

Un campo de tipo **relación** apunta a un **listado** del mismo proyecto. Al
diligenciar es un selector con búsqueda sobre los elementos activos de ese
listado, por su título.

**Autocompletar.** El campo puede traer consigo datos del elemento elegido:
«al elegir el vehículo, trae Tipo, Propietario, SOAT y Vigencia del SOAT». En
el constructor se eligen qué campos del listado se traen; en el formulario
aparecen debajo del selector, de sólo lectura. Es lo que hoy hacen las hojas
ocultas del Excel.

**Instantánea, no referencia viva.** La respuesta guarda el id del elemento
**y** una copia de su título y de los campos traídos, tal como estaban al
responder. La inspección del 3 de marzo dice con qué SOAT circulaba el
vehículo el 3 de marzo, aunque se haya renovado después. El id sirve para el
historial; la copia, para la evidencia.

- *Descartado: referencia viva.* Editar el listado reescribiría el pasado, que
  es lo contrario de lo que se le pide a un registro.

**Integridad.**

- Un elemento referenciado por alguna respuesta **no se borra: se inactiva**.
  Deja de aparecer en los selectores y sigue en el historial.
- Un listado que otro formato usa en su versión publicada o en su borrador no
  se puede eliminar; el aviso dice qué formatos lo usan.
- No se puede quitar de un listado un campo que otro formato trae por
  autocompletar, ni su campo de título.
- Un listado puede relacionarse con otro listado (vehículo → conductor
  habitual), pero **sin ciclos**: si A apunta a B, B no puede apuntar a A, ni
  directamente ni a través de un tercero. Se comprueba al publicar.
- El servidor comprueba al guardar que el elemento existe, es de ese listado,
  es de este proyecto y está activo. Harmony no valida que el valor de una
  lista sea una de sus opciones; aquí es imprescindible.

**Historial.** Desde un elemento de un listado se ven las respuestas de otros
formatos que lo eligieron («inspecciones de SLP-835»), y el listado de
respuestas de un formato se filtra por el elemento elegido. Las dos cosas
salen de `formResponseLinks`.

### 6. Diligenciar: una respuesta por hecho, desde el teléfono

- **Una respuesta por día y por equipo**, no una hoja semanal. La hoja
  semanal, con sus siete columnas, se reconstruye a partir de las siete
  respuestas cuando se necesite imprimir (fuera de esta fase). Razones: la
  firma del operador ya es diaria; una respuesta semanal habría que editarla
  siete veces, y aquí las respuestas no se editan; la hora real de la
  inspección es evidencia; y en el teléfono el conductor ve una lista corta,
  no una rejilla de veintiún columnas.
- Cada respuesta lleva su **fecha de negocio** (`YYYY-MM-DD`, en hora de
  Colombia), que pone el servidor. Si el formato necesita otra fecha —la de la
  entrega, la del evento— es un campo más.
- **No hay guardado parcial en el servidor.** Se guarda todo o nada, como en
  Harmony. Pero lo escrito **se conserva en el dispositivo** mientras no se
  envíe: si el conductor cierra el navegador a mitad de la inspección, al
  volver al formato encuentra lo que llevaba. El borrador es del dispositivo,
  no se sincroniza y se borra al enviar.
  - *Descartado: borradores en el servidor.* Obliga a decidir qué es una
    respuesta a medias para cada pantalla que las lista, y a limpiar las que
    nadie termina.
- **Quién diligencia cada formato.** Con cientos de formatos, el conductor no
  puede ver los del soldador. Cada formato declara su **audiencia**: todos los
  que pueden diligenciar, o los roles elegidos. La pantalla de inicio del
  proyecto, que es lo que se abre en el teléfono, lista **«Para diligenciar»**:
  los formatos de mi audiencia, los más usados primero.
- **Anular.** Una respuesta equivocada se anula con un motivo. Sigue en el
  listado, tachada, con quién la anuló y por qué; no cuenta para nada más. No
  se borra.

### 7. Encontrar un formato entre cientos

- Cada formato tiene **nombre**, **código** opcional (`SST-F-010`),
  **descripción** y **categoría** opcional. Las categorías son una lista corta
  que administra el proyecto (SST, Calidad, Ambiental, Maquinaria…).
- La pantalla de formatos tiene dos pestañas, **Formatos** y **Listados**, un
  buscador por nombre y código, y el filtro por categoría. Cada fila dice el
  estado (borrador, publicado, archivado), la versión y cuántas respuestas
  tiene.
- **Archivar** un formato lo saca de «Para diligenciar» y del listado por
  defecto, y conserva sus respuestas. **Eliminar** sólo se puede si no tiene
  respuestas; con respuestas, se archiva.
- **Duplicar** un formato crea otro en borrador con los mismos campos: las
  ocho inspecciones preoperacionales de equipos son casi la misma.

### 8. Modelo de datos

```
projects
 ├── defaultRoleId?            → rol que recibe quien entra con el código (§9)
 ├── formCategories            → name
 ├── forms                     → kind, name, code?, description?, categoryId?,
 │    │                          status (draft | published | archived),
 │    │                          titleFieldId? (sólo listados),
 │    │                          audience (all | roles) + audienceRoleIds,
 │    │                          publishedVersionId?, draftVersionId?,
 │    │                          responseCount, createdBy
 │    ├── formVersions         → number, status (draft | published),
 │    │                          sections[] (secciones → campos → config),
 │    │                          publishedAt?, publishedBy?
 │    └── formResponses        → versionId, date, submittedBy, status
 │         │                     (submitted | voided), voidedBy?, voidReason?,
 │         │                     title? y active? (sólo listados),
 │         │                     values[] ({ fieldId, value })
 │         └── formResponseLinks → fieldId, targetFormId, targetResponseId
 └── logs                      → + entidades `form` y `formResponse`
```

- El documento `forms` **no lleva las secciones**: son de `formVersions`. Así
  listar quinientos formatos lee quinientos documentos pequeños.
- Todas las tablas nuevas llevan `projectId`, con índice, y entran en
  `projects.purgeProjectData` en el mismo cambio que las crea (`01 §6.1`).
- Todo índice que filtre por campo empieza por `formId`: los ids de campo se
  generan en el navegador y se repiten entre formatos (Harmony tuvo una fuga
  entre organizaciones por esto).
- Índices de `formResponses`: por formato (el orden de creación da «lo más
  reciente primero»), por formato y autor («mis respuestas»), por formato y
  fecha de negocio, y uno de búsqueda sobre `title` filtrado por formato, que
  es el que alimenta el selector de relación.
- El servidor **valida cada valor** contra su campo al guardar —formato de
  correo, rango de un número, que la opción exista, que la lista de chequeo
  esté completa, que el elemento relacionado sea válido— en un módulo puro con
  sus pruebas. En Harmony eso sólo lo hacía el navegador.

### 9. Entrar con el código y poder trabajar

Hoy quien entra a un proyecto con el código queda como miembro **sin rol**: ve
el proyecto y no puede hacer nada hasta que alguien le asigne uno. Con
cuarenta conductores eso es cuarenta asignaciones a mano.

El proyecto tendrá un **rol por defecto** (Ajustes → Usuarios): quien entra
con el código lo recibe. Sin rol por defecto configurado, se comporta como
hoy.

### 10. Rutas y pantallas

| Ruta | Pantalla | Se diseña primero para |
|---|---|---|
| `/projects/[id]` | Inicio: **Para diligenciar**, y lo que ya tiene. | Teléfono |
| `/projects/[id]/formats` | Formatos y listados del proyecto. | Escritorio |
| `/projects/[id]/formats/[formId]` | Respuestas del formato, o elementos del listado: tabla paginada con las columnas elegidas, filtros por fecha, autor y elemento relacionado. | Escritorio |
| `/projects/[id]/formats/[formId]/edit` | Constructor (variante de página *Editor*, `03 §2.1`). | Escritorio |
| `/projects/[id]/formats/[formId]/fill` | Diligenciar. Pantalla propia, no modal: una inspección no cabe en uno. | Teléfono |
| `/projects/[id]/formats/[formId]/responses/[responseId]` | Una respuesta, en sólo lectura, con su versión, autor, fecha y, si está anulada, el motivo. En un listado, con «Editar» e historial. | Las dos |
| `/projects/[id]/ajustes/categorias` | Categorías de formatos. | Escritorio |

El segmento es `formats` y no `formatos` por la regla de `00 §6`: las rutas de
primer nivel van en inglés. Sus hijas, también.

Componentes que **no existen** y este módulo crea (`05 §3`, paso 3): el
control de lista de chequeo, el lienzo de firma, el control de tabla, el
selector de relación, la tabla paginada de respuestas y la vista de sólo
lectura de una respuesta. El resto sale de `components/harmony` y del paquete
portado.

### 11. Qué se porta de Harmony y qué no

| Se porta tal cual | Se generaliza | Se deja |
|---|---|---|
| `field_logic.ts` y sus 43 pruebas (visibilidad, cálculos, valores sugeridos, ciclos) | `template_types.ts` y `template_validation.ts`: sin ámbitos, con límites y tipos inyectados | Todo lo de novedades (`incident_*`, «Pedir en», modal falseado) |
| El patrón de archivos: subir justo antes de guardar, validar que sea reciente, borrar por referencias | El constructor: recibe un formato, no un ámbito; gana nombre, código, categoría, clase y audiencia | CIE-10 (catálogo de 850 KiB) |
| Los controles de los catorce tipos y los editores de reglas y recetas | El formulario de captura: gana los cuatro tipos nuevos y el borrador local | Vigencia y avisos por correo |
| La frontera única `resolveValues`: una sola función decide qué se guarda | Lectura y escritura de respuestas: de tres tablas de filas a un documento | Exportación a Excel y PDF (atada a personas y clientes) |

Dependencias que entran con este módulo, anotadas en `00 §5` en el mismo
cambio: `@dnd-kit/core`, `@dnd-kit/sortable` y `@dnd-kit/utilities`, para el
constructor. La firma no necesita librería.

### 12. Entregas

Cuatro, cada una utilizable al cerrarse. El detalle, en
`2026-09-28-modulo-de-formatos-implementation.md`.

| Entrega | Qué se puede hacer al cerrarla | Formatos del cliente que ya se pueden construir |
|---|---|---|
| **1 · Formatos y respuestas** | Crear, versionar y publicar formatos con los catorce tipos portados; categorías, búsqueda y audiencia; diligenciar desde el teléfono con borrador local; listar, ver y anular respuestas. | Los anexos diarios del informe de gestión: horas hombre trabajadas, capacitación, gestión ambiental. |
| **2 · Listados y relaciones** | Crear listados, mantener sus elementos, relacionarlos desde otros formatos con autocompletar, ver el historial de un elemento. | Los listados de equipos, vehículos, personal y extintores. |
| **3 · Inspecciones** | Lista de chequeo y firma. | Trece: las ocho preoperacionales (010, 031, 038, 080, 083, 090, 115, 116), camilla (066), kit de derrames (065), botiquines (075, 118) y extintores (074, una respuesta por extintor). |
| **4 · Tablas** | Tabla con filas repetibles. | Entrega de dotación y EPP (007), control de ausentismo y registro fotográfico del informe de gestión. |

Queda **fuera de este plan**, cada cosa con el suyo cuando toque: las gráficas
del panel; la revisión semanal con las firmas de quien autoriza y quien
verifica; la vista semanal reconstruida y su impresión; la exportación a Excel
y PDF; la vigencia y los avisos de vencimiento; el consolidado del informe de
gestión (`SST-F-046`), que es una vista calculada y no un formato; y el uso
sin conexión.

## Reglas de acceso

Siete llaves nuevas, que se suman a las ocho del proyecto. Propietario y
administrador las tienen todas, como siempre (`01 §5.1`).

| Llave | Permite |
|---|---|
| `createForms` | Crear formatos y listados, y duplicarlos. |
| `editForms` | Editar el borrador de un formato, publicarlo, y administrar las categorías. |
| `deleteForms` | Archivar, reactivar y eliminar formatos. |
| `fillForms` | Diligenciar los formatos de su audiencia. |
| `viewResponses` | Ver las respuestas de **todos**. |
| `voidResponses` | Anular respuestas. |
| `editCatalogs` | Crear, editar e inactivar elementos de los listados. |

Qué ve cada quien:

| | Sin rol | `fillForms` | `+ viewResponses` | Administrador o propietario |
|---|---|---|---|---|
| Lista de formatos | No | Los de su audiencia, publicados | Todos los publicados y archivados | Todos, también borradores |
| Diligenciar | No | Los de su audiencia | Ídem | Todos |
| Respuestas de un formato | No | **Sólo las suyas** | Todas | Todas |
| Elementos de un listado | No | Los activos, para elegirlos | Todos | Todos |
| Constructor | No | No | No | Sí (o con `editForms`) |

- La audiencia de un formato **restringe a quien diligencia, no a quien
  consulta**: `viewResponses` ve las respuestas de todos los formatos.
- Las llaves de lectura se comprueban **dentro de la consulta** (`01 §5.2`):
  el listado de respuestas devuelve las propias o todas según la llave, y no
  confía en que la pantalla lo filtre.
- El ámbito de toda escritura se deriva del documento cargado —el proyecto de
  una respuesta sale de su formato—, nunca de un argumento (`01 §4`).
- Quedan en auditoría (`01 §5.5`): crear, publicar, archivar, reactivar y
  eliminar un formato; anular una respuesta; crear, editar, inactivar y
  reactivar un elemento de un listado. **Diligenciar no escribe una entrada de
  auditoría**: la respuesta ya es el registro de quién, qué y cuándo, y cien
  inspecciones diarias enterrarían todo lo demás.
- No hay ninguna superficie sin sesión. Un formato no se diligencia con un
  enlace público.

## Preguntas abiertas

Las cuatro primeras cambian el diseño y conviene resolverlas antes de aprobar.
Cada una lleva la respuesta que este plan asume.

1. **¿Un campo de relación puede apuntar a un formato que no sea listado?**
   Por ejemplo, un «reporte de hallazgo» que apunte a la inspección que lo
   originó. *Se asume que no en esta fase*: los quince formatos sólo piden
   elegir cosas de listados. El modelo de datos no lo impide si luego hace
   falta.
2. **¿Las respuestas de un formato de verdad no se editan?** El papel tampoco
   se edita, y la firma lo exige. Pero si SST necesita corregir una respuesta
   ajena sin anularla, hace falta una llave más y un rastro de qué cambió.
   *Se asume anular y volver a diligenciar.*
3. **«Proyecto», «obra», «centro de trabajo» y «obra o área»** aparecen en los
   formatos como cuatro nombres. ¿Son lo mismo? Si el proyecto de la
   plataforma **es** la obra, ese campo sobra en todos los formatos (la
   respuesta ya sabe de qué proyecto es). Si un proyecto tiene varios centros
   de trabajo, es un listado más. *Se asume lo segundo*: un listado «Centros de
   trabajo» que crea cada proyecto.
4. **¿Quien diligencia tiene siempre cuenta?** El trabajador que recibe
   dotación firma, pero puede no ser usuario de la plataforma. *Se asume que
   diligencia quien entrega*, y quien recibe firma en el dispositivo de quien
   entrega, con su nombre y documento escritos.
5. **Diagnóstico CIE-10.** Sólo lo usa el control de ausentismo del informe
   de gestión. Portarlo es un catálogo de 850 KiB en el servidor. *Se asume que
   no entra*; ese campo sería texto corto hasta que se decida.
6. **Una respuesta por día y por equipo: ¿se impide la segunda?** Si el mismo
   vehículo se inspecciona dos veces el mismo día —cambió de conductor—, ¿es un
   error o es correcto? *Se asume que se permite y no se avisa.* Avisar o
   impedir es un ajuste del formato que puede llegar con la revisión semanal.
7. **Sin conexión.** La aplicación se instala en el teléfono pero hoy no
   funciona sin red: no se puede abrir un formato ni enviarlo. El borrador
   local protege lo escrito, no permite enviar. Si en la obra no hay señal,
   esto deja de ser una pregunta y pasa a ser un plan propio, y no pequeño.
8. **Variantes de un mismo formato.** La inspección de vehículos tiene tres
   (furgón con 7 llantas, mezcladora con 11, tráiler con las posiciones 12 a
   22). *Se asume un formato por variante*, creado con «Duplicar». La
   alternativa es que un ítem de la lista de chequeo se muestre o no según el
   tipo de vehículo; en esta fase las reglas no entran dentro de una lista de
   chequeo (§4.5), así que no es posible.
9. **Inconsistencias de los formatos en papel** que alguien de SST tiene que
   resolver antes de digitalizarlos, porque la plataforma no debe heredarlas:
   el archivo de herramientas neumáticas (`SST-F-115`) dice `SST-F-116` en su
   encabezado, que es el código de la planta de concreto; el compresor
   (`SST-F-083`) dice versión 2 en el encabezado y 3 en su control de cambios;
   el cargador (`SST-F-080`) anuncia la escala C/NC/N.A y sus columnas son
   B/M/N.A; y en soldadura (`SST-F-031`) y planta de concreto (`SST-F-116`) la
   numeración de los ítems se salta un número.
