# Seguimiento de hallazgos

**Fecha:** 2026-10-10 · **Estado:** aprobado (2026-10-10) · entrega 1 implementada el 2026-10-10 (`2026-10-10-seguimiento-de-hallazgos-implementation.md`, que simplifica §2: una etapa es una sección)

> Fuentes de este diseño: la reunión del 2026-10-10 con una directora de
> sistemas integrados de gestión, que señaló como lo que le falta a la
> plataforma «saber qué se hizo» con un hallazgo; el análisis de su sistema
> (matriz de acciones correctivas, plan de mejoramiento, reporte de actos y
> condiciones, investigación de accidentes); y el módulo de formatos
> (`2026-09-28-modulo-de-formatos-design.md`), del que este plan reabre dos
> decisiones: que una respuesta no se edita (§1) y que una relación sólo
> apunta a un listado (pregunta abierta 1).

## Objetivo

Que lo que un formato encuentra mal no se quede en una casilla: que cada
hallazgo tenga responsable, fecha y estado, que se pueda cerrar con evidencia,
y que en cualquier momento se sepa cuáles siguen abiertos.

## Problema

Una inspección de diez extintores encuentra tres en mal estado. La plataforma
lo cuenta —«ítems con más hallazgos»— y ahí termina. Lo que quien administra
el sistema necesita contestar es lo siguiente: qué se hizo con esos tres,
quién, cuándo, y si quedó resuelto.

El sistema analizado tampoco lo contesta, y enseña por qué:

1. **El hallazgo no tiene un sitio.** Vive en cinco: el plan de acción al pie
   de una inspección, un informe en texto libre, el plan de mejoramiento, un
   tablero de reportes y la matriz de acciones correctivas. Ninguno conoce a
   los otros.
2. **El cierre se declara, no se demuestra.** Las 82 acciones correctivas de
   dos años marcan «eficaz: sí», incluidas las tres que siguen abiertas. Un
   tablero de reportes tiene diez de once abiertos y ninguna foto de después.
3. **Lo repetido no se ve.** En una lista de chequeo de puestos, el botiquín
   salió «no» en 44 de 106 inspecciones. Son 44 casillas, no un problema
   abierto desde hace meses.
4. **Un mismo patrón, muchos formatos.** La acción correctiva, el plan de
   mejoramiento, la investigación de un accidente y la gestión de un cambio
   son lo mismo: alguien abre, otro analiza o ejecuta, otro verifica y cierra.
   Unos veinte de los 153 formatos revisados tienen esa forma.

Y la plataforma hoy lo impide por diseño: una respuesta está enviada o
anulada, no se edita, y un campo de relación no puede apuntar a otra
respuesta.

## Dirección propuesta

### 1. Una tercera clase de formato: el seguimiento

A las dos clases que existen se añade una, que se elige al crear y no cambia:

| | **Formato** (`record`) | **Listado** (`catalog`) | **Seguimiento** (`tracking`) |
|---|---|---|---|
| Qué es | Lo que la empresa hace. | Lo que la empresa tiene. | Lo que la empresa **debe resolver**. |
| Una respuesta es | Un hecho con fecha y autor. | Un elemento que se mantiene. | Un **asunto** que se abre, avanza y se cierra. |
| Después de guardar | No se edita: se anula. | Se edita y se inactiva. | Lo ya completado no se edita; **se completa la etapa siguiente**. |
| Estado | Enviada, anulada. | Activo, inactivo. | Abierto, cerrado, anulado; y **vencido**, que se deriva. |
| Se identifica por | Fecha y autor. | Su título. | Un **consecutivo** por formato y año, y su título. |
| Firma | Sí. | No. | Sí, **una por etapa** si el formato la pide. |

- *Descartado: una casilla «esta respuesta tiene estado» en la clase
  formato.* Es el mismo argumento con que el módulo descartó las casillas
  sueltas (§1): obliga a quien crea el formato a entender ajustes técnicos
  para decir «esto es un asunto que se cierra», y abre combinaciones sin
  sentido.
- *Descartado: una tabla propia de hallazgos, con sus campos fijos.* Cada
  empresa llama y describe sus hallazgos de otra manera: cinco porqués en
  una, clase A/B/C en otra. Si los campos son fijos, la segunda empresa pide
  un cambio de código.

### 2. Etapas: quién completa qué, y cuándo queda fijo

Las secciones de un formato de seguimiento se agrupan en **etapas**
ordenadas. Las etapas son del formato y se versionan con él.

- La **primera etapa** es la apertura: quien la completa abre el asunto.
- Cada etapa siguiente se completa **una vez**, en orden. Al completarla, sus
  valores quedan fijos, con quién y cuándo. No se salta ni se reabre.
- Cada etapa declara **quién puede completarla**: cualquiera que pueda
  diligenciar el formato, o sólo ciertos roles. Es la misma audiencia que hoy
  tiene un formato, por etapa. Así «quien reporta», «quien ejecuta» y «quien
  verifica» son personas distintas sin llaves nuevas.
- Completar la **última etapa** cierra el asunto.
- Una etapa a medias se guarda como borrador en el dispositivo, igual que un
  formato.

Lo que hace que una acción correctiva sea una acción correctiva —el análisis
de causas, el plan, la verificación de eficacia— son **campos en sus etapas**,
no conceptos de la plataforma. Un seguimiento de dos etapas (reportar,
cerrar) y otro de cinco usan el mismo motor.

- *Descartado: etapas libres, en cualquier orden.* Es más flexible y deja de
  significar algo: «cerrado» tiene que querer decir que alguien verificó
  después de que alguien ejecutó.
- *Descartado: editar una etapa completada.* Si se puede corregir el plan
  después de cerrar, el cierre no demuestra nada. Lo equivocado se anula,
  con motivo, como una respuesta.

### 3. Lo que el formato declara para que el asunto se pueda seguir

Como un listado declara cuál de sus campos es el título, un seguimiento
declara hasta tres:

| Declaración | Qué es | Para qué |
|---|---|---|
| **Título** (obligatorio) | Un campo de texto de la primera etapa. | Lo que se lee en la bandeja. |
| **Fecha de compromiso** | Un campo de fecha, de cualquier etapa. | Deriva «vencido»: abierto y con la fecha pasada. |
| **Responsable** | Un campo de relación a un listado de personas. | Agrupar y filtrar la bandeja. |

La fecha de compromiso y el responsable se copian a la respuesta para poder
consultarlos sin abrirla; la fuente de verdad son los valores (`01 §7.3`).
«Vencido» **no se guarda**: se calcula al leer, contra la fecha de hoy.

### 4. De dónde nace: el origen

Un asunto puede abrirse solo —un reporte de condición insegura, una acción
que sale de una auditoría— o **a partir de una respuesta**. Cuando nace de
una respuesta guarda su **origen**: la respuesta y, si aplica, la lista de
chequeo y el ítem que salió no conforme.

- En la pantalla de una respuesta, cada ítem no conforme enseña su
  seguimiento con su estado, o la acción «Abrir seguimiento».
- Qué formato de seguimiento se abre lo declara **la lista de chequeo**: «los
  hallazgos de esta lista se siguen en…». Sin esa declaración, la lista se
  comporta como hoy.
- Al abrirlo, la plataforma **trae** lo que ya sabe: el texto del ítem, la
  observación escrita, y el elemento inspeccionado —el vehículo, el
  extintor—, si el formato de origen lo elige en un campo de relación y el
  seguimiento tiene un campo que apunta al mismo listado.
- El origen es una **instantánea con id**, como la relación a un listado: el
  id sirve para volver a la inspección; la copia, para que el asunto se
  entienda solo.

Con esto queda resuelta, para este caso, la pregunta abierta 1 del módulo de
formatos: sí hace falta apuntar a una respuesta, y se resuelve con el origen,
no con un tipo de campo.

- *Descartado: un campo «relación a una respuesta» de uso general.* Un
  selector que busca entre miles de inspecciones no tiene un título por el
  que buscar. El caso real es siempre «esto nace de aquello», y eso se sabe
  al abrir, no se elige después.

### 5. Abrir a mano o abrir solo, y lo que se repite

La lista de chequeo que declara su seguimiento elige además **cómo**:

- **A mano** (por omisión): el ítem no conforme ofrece «Abrir seguimiento».
- **Automático**: enviar la respuesta abre un asunto por cada ítem no
  conforme, con la primera etapa completada con lo que se trae.

Y una regla que vale en los dos modos: **un asunto abierto por elemento e
ítem**. Si el mismo vehículo vuelve a salir sin póliza mañana, no nace un
segundo asunto: el que ya está abierto suma una **reincidencia**, con la
fecha y la respuesta que la trae. Sólo aplica cuando el origen tiene elemento;
sin él, cada respuesta abre el suyo.

Es lo que convierte 740 casillas de «póliza: no» en los pocos asuntos que de
verdad son, cada uno con el número de veces que se repitió.

- *Descartado: abrir siempre automáticamente.* Una empresa que empieza ve
  aparecer cientos de asuntos el primer día y deja de mirarlos.
- *Descartado: un asunto por cada no conforme, sin agrupar.* Es correcto en
  el papel e inservible en la práctica: el indicador de cierre se hunde por
  repeticiones del mismo problema.

### 6. La bandeja

Una pantalla nueva del proyecto, **Seguimientos**: todos los asuntos, de
todos los formatos de seguimiento.

- Por omisión, **los abiertos**, los vencidos primero.
- Filtros en la dirección (`02 §8`): estado, formato, responsable, y «los que
  puedo completar yo».
- Cada fila: consecutivo, título, formato, etapa en la que está, responsable,
  fecha de compromiso y cuántas reincidencias lleva.
- Abrir un asunto enseña sus etapas en orden: las completadas, de sólo
  lectura con quién y cuándo; la que toca, lista para completar si quien mira
  puede; y su origen, con el enlace a la respuesta.

Los abiertos no dependen de un rango de fechas: un asunto de hace ocho meses
que sigue abierto es justo el que hay que ver. Se leen por un índice de
estado, y los cerrados, por rango (`01 §6`).

### 7. Un resultado nuevo: seguimiento

El décimo tipo de resultado, sólo para formatos de seguimiento:

| Tipo | Pregunta | Configura | Devuelve |
|---|---|---|---|
| **Seguimiento** (`tracking`) | ¿Se está cerrando lo que se abre? | Nada obligatorio; condiciones opcionales. | Abiertos hoy, de ellos vencidos; abiertos y cerrados en el periodo; porcentaje cerrado de lo abierto en el periodo; días promedio hasta el cierre. |

- Un asunto se imputa al periodo **en que se abrió**. El porcentaje cerrado
  de septiembre es: de lo que se abrió en septiembre, cuánto está cerrado hoy.
- Los demás tipos sirven tal cual sobre un seguimiento: una distribución por
  responsable, una tendencia de aperturas, una tabla por área.
- «Eficaz» no es un concepto del resultado: es un campo de la etapa de
  cierre, y se mide con una condición, como cualquier otro campo.

### 8. La biblioteca

La biblioteca gana tres formatos de seguimiento, como configuración: reporte
de actos y condiciones (dos etapas), plan de mejoramiento (tres) y acción
correctiva, preventiva y de mejora (cinco: hallazgo, análisis de causas, plan
de acción, seguimiento y cierre). Ninguno es código de la aplicación.

### 9. Modelo de datos

```
forms            kind: + "tracking"
                 + titleFieldId (ya existe), dueDateFieldId, responsibleFieldId
                 + nextNumber: { year, value }      el consecutivo
formVersions     + stages[]: { id, label, audience, roleIds }
                 sections[].stageId
formResponses    status: + "open", "closed"
                 + number, year                      el consecutivo
                 + stageIndex                        la etapa que toca
                 + stages[]: { stageId, completedBy, completedAt }
                 + closedAt
                 + dueDate, responsibleId            derivados (01 §7.3)
                 + origin: { responseId, formId, fieldId?, itemId?,
                             targetResponseId?, label }
                 + recurrences[]: { responseId, date }   hasta 50
```

- Índices nuevos en `formResponses`: `projectId_status_dueDate`, para la
  bandeja de abiertos; `formId_status`; y `origin.responseId`, para pintar el
  estado junto a cada ítem. La unicidad «un abierto por elemento e ítem» se
  comprueba por `origin.targetResponseId` más ítem, dentro de la mutation.
- Todo es opcional sobre lo que existe: no obliga a migrar. `status` gana dos
  literales (`01 §7.1`, sólo el paso de ensanchar).
- Ninguna tabla nueva: no cambia la purga ni la cascada.
- Las reincidencias se guardan hasta 50 por asunto; por encima se cuenta y no
  se enumera.

### 10. Qué queda fuera

- **Avisos**: que al responsable le llegue un correo cuando se le asigna o se
  vence. Va con el plan de vigencia y avisos, que el módulo de formatos dejó
  pendiente (§4.5).
- **Plazos automáticos por clasificación** (clase A, 24 horas). Hoy se
  resuelve con un valor sugerido sobre la fecha de compromiso.
- **Escalar** un seguimiento a otro —de plan de mejoramiento a acción
  correctiva—. El origen ya admite que un asunto nazca de otro; la regla de
  cuándo, no.
- **Cadenas entre formatos corrientes** (incidente → investigación →
  lección aprendida). Ver preguntas abiertas.

## Reglas de acceso

No hay llaves nuevas. Las etapas usan la audiencia que ya existe.

| Llave | Permite | Función |
|---|---|---|
| `createForms`, `editForms` | Crear un formato de seguimiento y definir sus etapas. | `forms.create`, `formVersions.saveDraft`, `publish` |
| `fillForms` + audiencia de la etapa | Abrir un asunto (primera etapa) y completar la etapa que toca. | `formTrackings.open`, `completeStage` |
| `viewResponses` | Ver todos los asuntos del proyecto y la bandeja completa. | `formTrackings.list`, `getById` |
| `voidResponses` | Anular un asunto, con motivo. | `formResponses.void` |

| | Sin rol | `fillForms` | `+ viewResponses` | Administrador y propietario |
|---|---|---|---|---|
| Bandeja | No | Los que abrió, los que tiene como responsable y los que puede completar | Todos | Todos |
| Abrir | No | Si la audiencia de la primera etapa lo incluye | Igual | Sí |
| Completar una etapa | No | Si la audiencia de esa etapa lo incluye | Igual | Sí |
| Anular | No | No | Con `voidResponses` | Sí |

- Quien completa una etapa **ve las anteriores**, aunque no tenga
  `viewResponses`: no se puede verificar un plan que no se puede leer.
- «Responsable» es un dato, no un permiso: ser responsable deja ver el
  asunto, no completar una etapa que su rol no puede.
- Un asunto que se abre solo, al enviar una respuesta, lo abre **quien envió
  la respuesta**, y no exige que esa persona esté en la audiencia de la
  primera etapa: no eligió abrirlo.
- El ámbito sale del documento: el proyecto de un asunto es el de su formato,
  y su origen demuestra que es del mismo proyecto (`01 §5.6`).
- Abrir, completar una etapa y cerrar **no** escriben auditoría, como una
  respuesta: el asunto ya dice quién y cuándo. Anular, sí.

## Desde qué tamaño se diseñó

Dos pantallas, dos tamaños (`02 §7.1`):

- **Completar una etapa** es captura: se decide a **390 px**. Quien cierra un
  hallazgo está junto al extintor, con la foto de después en el teléfono.
- **La bandeja** es consulta: se decide en escritorio, y en teléfono cada
  asunto es una tarjeta.

## Decisiones cerradas al aprobar

Las preguntas abiertas de la propuesta se cerraron el 2026-10-10 con la
respuesta que cada una proponía:

1. **El responsable es una persona de un listado**, no un miembro del
   proyecto: muchas veces no tiene cuenta. La bandeja filtra por responsable;
   el filtro «los míos» por responsable **no entra** hasta que exista la unión
   entre un miembro y su fila del listado. «Los que puedo completar yo» sí
   entra: sale de la audiencia de la etapa.
2. **Una etapa no se devuelve.** Quien verifica y encuentra que la acción no
   sirvió cierra el asunto como no eficaz —un campo de la etapa de cierre— y
   abre otro con origen en éste.
3. **Una etapa no se repite.** Las varias visitas de un seguimiento son filas
   de una tabla dentro de la etapa.
4. **El origen se ofrece sólo en seguimientos.** El modelo admite que un
   formato corriente nazca de otra respuesta; no se construye en este plan.
5. **El elemento de una reincidencia** es el primer campo de relación del
   formato de origen. Si es el puesto, el puesto es el elemento.
6. **El consecutivo es por formato y año**, con un prefijo que define el
   formato: «AC-2026-014».
7. **Un asunto anulado libera la unicidad**: la siguiente no conformidad abre
   uno nuevo.
8. **Un asunto sigue con la versión con que se abrió**, etapas incluidas,
   aunque el formato publique otra.

## Preguntas abiertas

1. **Unir a un miembro con su fila del listado de personas.** Es lo que
   falta para «mis asuntos», y lo necesitarán también los avisos. Va con el
   plan de vigencia y avisos.
