# Importación de registros

**Fecha:** 2026-10-10 · **Estado:** implementado (2026-10-10)

> Fuentes de este diseño: el análisis del sistema de gestión de una empresa de
> vigilancia (153 formatos, 16 programas, un cuadro de mando de 45
> indicadores) hecho el 2026-10-10; el módulo de formatos
> (`2026-09-28-modulo-de-formatos-design.md`), que fija que la fecha de una
> respuesta la pone el servidor (§6); y `04 §7`, que pide que lo que se carga
> en bloque se pueda reconocer y retirar.
>
> Es la primera de las etapas acordadas ese día. La siguen el seguimiento de
> hallazgos (`2026-10-10-seguimiento-de-hallazgos-design.md`) y, con plan
> propio, los resúmenes que levantan el tope de cálculo de los resultados.

## Objetivo

Que una empresa llegue a la plataforma **con su pasado**: que pueda cargar
desde un archivo los elementos de sus listados y las respuestas que ya
diligenció en otra herramienta, con la fecha en que ocurrieron, y que lo
cargado se distinga siempre de lo diligenciado aquí.

## Problema

Quien adopta la plataforma no empieza de cero. Tiene un Excel con sus
vehículos y sus conductores, y un año de inspecciones diarias en un formulario
de hojas de cálculo —en el caso analizado, 3.386 respuestas—. Hoy no puede
traer nada de eso:

1. **Los listados se crean elemento a elemento.** Veintitrés vehículos se
   escriben a mano; setecientas personas, no se escriben.
2. **Una respuesta sólo puede tener la fecha de hoy.** La pone el servidor
   (`formResponses.submit`), y es correcto: quien diligencia no elige cuándo
   ocurrió. Pero eso deja el pasado fuera, y sin pasado no hay tendencia, ni
   comparación con el mes anterior, ni forma de comprobar que la plataforma da
   las mismas cifras que el Excel que viene a reemplazar.
3. **Sin esa comprobación no hay confianza.** Quien lleva el sistema en Excel
   no lo suelta hasta ver que la herramienta nueva da lo mismo. Mientras
   tanto lleva las dos, y la segunda es la que se abandona.

Lo único que hoy escribe respuestas con otra fecha es la siembra de
demostración (`demoData:seedDay`), que es interna, genera datos ficticios y no
deja marca (`2026-10-09-resultados-y-tablero-design.md`, pregunta abierta 8).

## Dirección propuesta

### 1. Importar es una operación del formato, con archivo, mapeo y revisión

Desde la pantalla de respuestas de un formato —o de elementos de un listado—,
«Importar» abre un flujo de cuatro pasos:

1. **Archivo.** Un `.xlsx` o un `.csv`. Se lee en el navegador; al servidor
   sólo viajan filas ya interpretadas.
2. **Columnas.** Cada columna del archivo se asigna a un campo del formato, o
   se ignora. La plataforma propone la asignación por nombre —sin distinguir
   mayúsculas ni tildes— y quien importa la corrige.
3. **Valores.** Para los campos de lista, de relación y los ítems de una lista
   de chequeo, se enseñan los **valores distintos** que trae el archivo y a
   qué opción o elemento corresponde cada uno. Es el paso que absorbe el
   desorden real: un mismo puesto escrito de veinte maneras se asigna veinte
   veces al mismo elemento, una sola vez.
4. **Revisión.** Cuántas filas entran, cuántas no y por qué, fila por fila.
   Nada se escribe hasta confirmar.

- *Descartado: una función interna que se ejecuta por consola* (como
  `installSst`). Resuelve el primer cliente y deja a todos los demás
  dependiendo de quien administra el deployment. Importar es algo que la
  empresa hace sola, y más de una vez.
- *Descartado: pegar desde el portapapeles.* Es cómodo para veinte filas y no
  sirve para tres mil ni conserva las fechas como fechas.

### 2. La fecha es una columna; lo importado queda marcado

En un formato (`record`), una de las columnas asignadas es **la fecha del
hecho**, obligatoria. Es la única vía por la que una respuesta recibe una
fecha de negocio que no es hoy, y por eso deja rastro:

- Cada respuesta importada guarda **a qué importación pertenece**
  (`importId`). La pantalla de la respuesta lo dice junto a la fecha:
  «Importada el 12 de octubre de 2026 por …».
- `submittedBy` es **quien importó**: es quien responde por el dato. Si el
  archivo trae quién diligenció el original, se asigna a un campo de texto del
  formato como cualquier otra columna; no se inventan usuarios.
- Una fecha futura se rechaza. Una fecha anterior a 400 días se acepta: el
  tope de rango es de los resultados, no del dato.

- *Descartado: permitir elegir la fecha al diligenciar.* Abre a todo el que
  diligencia la posibilidad de fechar hacia atrás, que es justo lo que una
  auditoría busca. La fecha editable existe sólo aquí, detrás de una llave y
  con marca.
- *Descartado: atribuir cada respuesta al usuario que coincida por nombre.*
  El archivo trae nombres en texto libre; adivinar la persona es fabricar
  autoría.

### 3. Lo que un archivo no puede traer se exime, y se dice

Una hoja de cálculo no trae firmas, fotos ni archivos. Una respuesta importada
pasa por la misma resolución que una diligenciada (`resolveValues`), con una
diferencia: **los campos de firma, imagen y archivo no se exigen**, aunque el
formato los marque obligatorios. La respuesta los enseña como «No disponible
en una respuesta importada».

Todo lo demás se valida igual: una opción que no existe, un número que no es
número o un elemento que no está en el listado dejan la fila fuera, con su
motivo.

- **Lista de chequeo.** Cada ítem es un destino asignable: es la forma que
  tiene una exportación de formulario, una columna por pregunta. Los ítems sin
  columna quedan sin responder, y la lista **no se exige completa** en una
  importación.
- **Relación.** El texto de la celda se resuelve contra los títulos del
  listado en el paso de valores. **No se crean elementos al vuelo**: lo que no
  tiene correspondencia deja la fila fuera. Primero se importa el listado.
  Se admite un elemento **inactivo**: lo que se importa pasó cuando ese
  vehículo todavía rodaba. Diligenciando sigue sin poder elegirse.
- **Observación de un ítem no conforme.** Tampoco se exige, aunque la lista
  la pida: una exportación trae la opción de cada pregunta, no su nota.
- **Los ítems de una lista comparten correspondencia.** «Sí», «No» y «N/A»
  se asignan una vez para toda la lista, no una por pregunta.
- **Tabla.** No se importa en esta fase (ver preguntas abiertas).

- *Descartado: crear los elementos que falten.* Convierte cada error de
  digitación en un elemento nuevo del listado, que es el problema que se
  viene a resolver.

### 4. En un listado, importar también actualiza

En un listado (`catalog`) no hay columna de fecha: un elemento no es un hecho.
Hay, en cambio, una decisión por importación: qué pasa con una fila cuyo
título **ya existe**.

- «Omitir las que ya existen» (por omisión).
- «Actualizar las que ya existen»: se sobrescriben los campos que el archivo
  trae y se conservan los demás. Es como se renueva de una vez la fecha del
  SOAT de toda la flota.

El título se compara como se busca: sin mayúsculas ni tildes
(`searchableText`). Dos filas del archivo con el mismo título son un error del
archivo y se dice.

### 5. Una importación es un registro, y se puede deshacer

Cada importación queda en una tabla nueva, `formImports`: el formato, quién,
cuándo, el nombre del archivo, cuántas filas entraron y cuántas no, y su
estado (`running`, `done`, `reverted`).

- La escritura va **por lotes** desde el cliente, para no acercarse a los
  límites de una transacción. Si se interrumpe, la importación queda a medias,
  visible y deshacible.
- **Deshacer** borra las respuestas de esa importación y sus relaciones, y
  resta del contador del formato. Es el único borrado de respuestas que
  existe, y es de la importación entera: no se borra una fila suelta —para
  eso está anular—.
- En un listado, deshacer **no** revierte actualizaciones: sólo retira los
  elementos que la importación creó y que ninguna respuesta usa. Lo dice antes
  de confirmar.
- Volver a subir el mismo archivo se avisa: la importación guarda una huella
  del contenido, y si coincide con una anterior sin deshacer, se pregunta
  antes de seguir.
- Importar, y deshacer, quedan en la auditoría sobre el formato. Las filas no:
  la importación ya es el registro.

- *Descartado: importar en una acción del servidor que recibe el archivo.*
  Obliga a subir el archivo entero, interpretarlo donde no se puede enseñar
  nada a quien importa, y repetir en el servidor el mapeo que ya se hizo.
- *Descartado: marcar con un prefijo en vez de con un id.* Un prefijo en un
  campo de texto se edita; el `importId` no.

### 6. Leer Excel: una dependencia que ya estaba decidida

`00 §5.1` reserva `exceljs` para **escribir** Excel, sin instalar. Esta
importación es su primer consumidor y amplía el propósito a **leer y
escribir**. Entra con este cambio, se carga sólo al abrir un `.xlsx`, y su
fila pasa a la tabla de instaladas.

`exceljs` **no lee `.csv` en el navegador** —su lector usa flujos de Node—,
así que el `.csv` lo lee un lector propio y puro
(`packages/forms/lib/import-csv.ts`), con su suite sobre los casos que uno
hecho a la ligera resuelve mal: comillas, saltos de línea dentro de una celda,
separador `;` y marca de orden de bytes. Las fechas y los números los
interpreta `import-cells.ts`, igual para los dos formatos.

- *Descartado: aceptar sólo `.csv`.* Obliga a quien importa a exportar antes,
  y en ese paso Excel cambia las fechas al formato de la máquina.

### 7. Modelo de datos

```
projects
 └── forms
      ├── formImports      → formId, projectId, createdBy, fileName,
      │                       fingerprint, mode, counts, status
      └── formResponses    + importId (opcional)
```

- `formImports` lleva `projectId` con índice y entra en
  `projects.purgeProjectData` y en la cascada de `forms.remove` en el mismo
  cambio que la crea (`01 §6.1`).
- `formResponses.importId` es opcional: no obliga a migrar lo que existe. Un
  índice `importId` sirve al deshacer.
- **Consecuencia sobre el orden.** El schema anota que «ordenar por fecha de
  negocio es ordenar por creación». Con respuestas importadas deja de ser
  cierto: el listado de respuestas pasa a ordenarse siempre por el índice
  `formId_date`, y a igual fecha, por creación.

### 8. Límites

| Límite | Valor | Qué pasa al alcanzarlo |
|---|---|---|
| Filas por archivo | 5.000 | El archivo se rechaza y se pide partirlo. |
| Columnas asignables | 200 | Las del formato (`maxFields`). |
| Filas por lote | 50 | — |
| Valores distintos por campo en el paso de valores | 300 | Por encima, el campo se trata como texto libre y se dice. |
| Tamaño del archivo | 10 MB | Se rechaza antes de leerlo. |

## Reglas de acceso

Una llave nueva, la decimosexta: **`importResponses`**. Importar no es
diligenciar: escribe cientos de registros de una vez, con fecha elegida y sin
firma. Darlo a quien tiene `fillForms` sería darlo a todo el que inspecciona.

| Llave | Permite | Función |
|---|---|---|
| `importResponses` | Importar respuestas en un formato y elementos en un listado; deshacer una importación. | `formImports.start`, `writeBatch`, `finish`, `revert` |
| `viewResponses` / `editCatalogs` | Ver la lista de importaciones de un formato o de un listado. | `formImports.list` |

| | Sin rol | Miembro con `fillForms` | `+ importResponses` | Administrador y propietario |
|---|---|---|---|---|
| Importar | No | No | Sí | Sí |
| Deshacer una importación | No | No | Sí, cualquiera del proyecto | Sí |
| Ver que una respuesta es importada | — | En las suyas | En todas las que ve | Sí |

- La llave se declara en `convex/permissions.ts` con su casilla en
  `packages/roles/lib/permissions.ts` en el mismo cambio (`01 §5.3`). Si algún
  deployment tiene roles guardados, entra como opcional y se rellena antes de
  hacerla obligatoria (`01 §7.1`).
- El ámbito sale del formato: cada lote demuestra que su importación es de ese
  formato y ese proyecto (`01 §5.6`).
- Importar exige además que el formato esté publicado: se importa contra la
  versión vigente.
- No hay superficie sin sesión.

## Desde qué tamaño se diseñó

Escritorio. Importar es una tarea de administración, con una tabla de
columnas y otra de valores que no caben en un teléfono. En teléfono el botón
no se ofrece.

## Decisiones cerradas al aprobar

Las preguntas abiertas de la propuesta se cerraron el 2026-10-10 con la
respuesta que cada una proponía:

1. **Tablas.** Quedan fuera de la importación en esta fase. Un campo de tabla
   no se ofrece como destino, y si el formato lo marca obligatorio, se exime
   como una firma.
2. **Filas idénticas en el archivo.** Se avisan en la revisión y entran: dos
   inspecciones del mismo vehículo el mismo día son dos hechos.
3. **Hora.** La fecha de negocio no tiene hora. La hora del archivo se
   conserva sólo si se asigna a un campo de hora del formato.
4. **Quién puede deshacer.** Cualquiera con `importResponses` en el proyecto.
5. **Respuestas importadas en los resultados.** Cuentan como cualquier otra;
   no hay un interruptor para excluirlas.

## Preguntas abiertas

1. **La siembra de demostración** podría reescribirse sobre esta misma
   tubería y ganar marca y deshacer (`2026-10-09`, pregunta abierta 8). Queda
   fuera de este plan.
