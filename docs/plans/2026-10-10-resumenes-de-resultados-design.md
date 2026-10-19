# Resúmenes diarios para los resultados

**Fecha:** 2026-10-10 · **Estado:** implementado (2026-10-10)

> Es el paso que `2026-10-09-resultados-y-tablero-design.md §9` dejó
> anunciado, y la forma 4 de `01 §6`. Se aprobó y se pidió construir el
> 2026-10-10, junto con la carga de un año de inspecciones importadas
> (`2026-10-10-importacion-de-registros-design.md`).

## Objetivo

Que un resultado se pueda mirar para un año entero —no sólo para el último
mes— sin que su coste crezca con el peso de cada respuesta.

## Problema

Un resultado se calcula al leer, sobre las respuestas del rango. Una
inspección de 63 ítems pesa varios kilobytes, así que el cálculo leía como
mucho 300 y decía «las cifras son de las más recientes». Con la historia de
una empresa importada —miles de inspecciones en un año— eso deja sin
respuesta la pregunta por la que se importó: ¿cuánto dio el año?

## Dirección

### 1. Se resume la respuesta, no el resultado

Al escribirse una respuesta se guarda, en el documento de **su formato y su
día** (`formDayDigests`), lo que un resultado puede necesitar de ella: los
números, lo elegido en una lista o en una relación, las fechas, las casillas,
y de cada lista de chequeo **cuántos ítems salieron conformes y cuáles no**.
Fuera quedan el texto largo, los archivos, las firmas, las tablas y la
instantánea de una relación. Son unos cientos de bytes por respuesta.

El cálculo no cambia: `computeResult` recibe las mismas respuestas, más
ligeras. Una prueba afirma que lo que sale de los resúmenes es **idéntico** a
lo que sale de leer las respuestas.

- *Descartado: un agregado por resultado y día.* Cada cambio en la definición
  de un resultado obligaría a reconstruir su historia, y un promedio o un
  «último» no se suman entre días. Resumir la respuesta no depende de ningún
  resultado: se puede crear uno nuevo hoy y verlo sobre todo el año.
- *Descartado: subir el tope.* Mueve el problema, y el tablero pagaría
  megabytes en cada apertura.

### 2. La copia sigue a su fuente (`01 §7.3`)

- La fuente de verdad es `formResponses`. El resumen se mantiene en dos
  funciones, `digestAdd` y `digestRemove` (`convex/lib/form_digests.ts`), que
  llama **toda** mutation que escribe, anula o retira una respuesta de un
  formato: `formResponses.submit` y `void`, `formImports.writeBatch` y
  `purge`, y la siembra de demostración.
- `formDigests.rebuild` (interna) rehace los resúmenes de un formato día a
  día. Cada día se rehace entero, así que es idempotente y convive con las
  escrituras que llegan mientras corre.
- `forms.digestVersion` dice con qué versión de la regla están hechos. Sin
  ella, o con otra, el cálculo **vuelve a leer las respuestas con el tope de
  300**, como antes: nunca enseña una cifra de resúmenes a medias. La primera
  respuesta de un formato lo deja al día sin más.
- Si la regla de resumen cambia, sube `DIGEST_VERSION` y se reconstruye.

### 3. Límites

| Límite | Valor | Qué pasa al alcanzarlo |
|---|---|---|
| Respuestas por cálculo | 12.000 | Entran las más recientes y se dice. |
| Respuestas resumidas por día y formato | 1.000 | El día se marca desbordado y sus cifras se dicen parciales. |
| Texto que entra en el resumen | 120 caracteres | Un texto más largo no entra: una condición sobre él no lo ve. |
| Rango | 400 días | Sin cambio. |

## Reglas de acceso

Ninguna nueva. Los resúmenes no se leen directamente: sólo a través de
`formResults.compute`, que sigue exigiendo ver las respuestas de todos. La
reconstrucción es interna.

## Desde qué tamaño se diseñó

No tiene interfaz propia. El aviso de cifras parciales es el que ya existía.

## Preguntas abiertas

1. **Condiciones sobre texto largo.** Un resultado puede condicionarse a un
   campo de texto largo, que no entra en el resumen. Hoy esa condición no se
   cumple nunca desde resúmenes. Se propone no ofrecer esos campos en el
   editor de condiciones.
2. **Listados.** Los vencimientos siguen leyendo hasta 500 elementos activos:
   un listado no crece con la operación.
