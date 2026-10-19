# Programa de inspecciones y cierre de hallazgos en los resultados

**Fecha:** 2026-10-12 · **Estado:** implementado (2026-10-12)

> Quien dirige el producto pidió el 2026-10-12 revisar el tablero de la
> biblioteca SST con lo aprendido al montar el sistema de una segunda empresa,
> y dio la orden de proceder sin revisión intermedia. Este documento se
> escribió **antes** del código y recoge lo que se decidió; quien dirige el
> producto lo revisa con el resultado delante, y lo que no comparta se
> corrige aquí primero.
>
> Fuentes: los doce archivos de la empresa para la que nació la biblioteca
> (diez formatos, el libro de inspecciones de emergencia y el informe de
> gestión `SST-F-046`); la reunión del 2026-09-29 con su responsable de SST;
> la reunión del 2026-10-10 con una directora de sistemas integrados de
> gestión; el tablero que se armó con un año de inspecciones reales de esa
> segunda empresa; y `2026-10-10-seguimiento-de-hallazgos-design.md`, del que
> este plan construye el §7 y parte del §8.

## Objetivo

Que el tablero conteste las dos preguntas que una inspección deja abiertas
—¿se inspeccionó todo lo que tocaba? y ¿se corrigió lo que salió mal?—, y que
el tablero de la biblioteca SST nazca ordenado por lo que su responsable
reporta, no por lo que la plataforma sabía graficar.

## Problema

Lo que enseñaron los archivos de origen:

1. **Ningún archivo calcula nada de las inspecciones.** Los diez formatos y
   el libro de emergencia son plantillas; el único que totaliza es el informe
   de gestión, y sólo horas hombre, ausentismo, capacitación y residuos, por
   semana y por mes. Lo que su responsable quiere de las inspecciones no está
   escrito en una fórmula: hay que deducirlo de cómo es el papel.
2. **El papel es una hoja semanal con una columna por día y la firma diaria
   del operador.** Lo que la hoja deja ver de un vistazo es el día en blanco.
   La pregunta de fondo es «¿se hizo?», antes que «¿cómo salió?».
3. **Ningún formato tiene responsable ni fecha de cierre.** La inspección de
   camilla dice que las novedades «deberán estar solucionadas antes de la
   próxima inspección», y no hay dónde anotar que se solucionaron.

Y lo que enseñaron la segunda empresa y sus datos reales:

4. **Los dos indicadores que pide gerencia** son el cumplimiento del programa
   —si hay diez vehículos, los diez inspeccionados— y la eficacia —de lo que
   salió mal, cuánto se cerró—.
5. **Lo que no se inspecciona no aparece.** En un año real, 17 de 23
   vehículos tienen alguna inspección: los otros seis no salen en ninguna
   gráfica, porque todas parten de las respuestas. El mapa de calor enseña
   los doce elementos con más respuestas, que es lo contrario de lo que se
   busca.
6. **Una flota no se inspecciona entera cada día.** La mediana real es de
   seis vehículos distintos por día, con la mitad de actividad el fin de
   semana. Un indicador que exija todos los elementos todos los días no baja
   de rojo nunca: la frecuencia y los días que cuentan son del programa de
   cada empresa.
7. **Lo que sirvió**: una fila de cifras que se comparan con el periodo
   anterior, el cumplimiento con su meta, lo que más falla y los vencimientos.

## Dirección aprobada

### 1. Un tipo de resultado: programa (`coverage`)

El décimo tipo. Responde **¿se inspeccionó todo lo que tocaba?**

| Configura | Qué es |
|---|---|
| Una relación a un listado | Los elementos que hay que inspeccionar: los vehículos, los extintores, los centros de trabajo. |
| Cada cuánto | Cada día, cada semana o cada mes. |
| Qué días cuentan | Sólo si es cada día: de lunes a domingo, los que se marquen. |
| A quién se espera | **Todos los elementos activos del listado**, o **sólo los que tienen alguna respuesta en el periodo**. |
| Meta y condiciones | Las de cualquier resultado. |

Devuelve el porcentaje —cuántas veces se inspeccionó sobre cuántas tocaba—,
su evolución, los elementos **menos** cubiertos primero —hasta doce, con
cuántas veces se hicieron, cuántas tocaban y la fecha de la última— y cuántos
no tienen ninguna respuesta en el periodo.

- **Lo que está en curso no cuenta como falta.** La semana que no ha
  terminado, o el día de hoy, sólo suman a lo esperado donde ya se hizo.
- **A quién se espera** existe porque un listado suele mezclar clases: el de
  equipos tiene la planta, el cargador y las pulidoras, y a la inspección de
  la planta no se le puede pedir el cargador. «Sólo los que tienen alguna
  respuesta» mide la constancia sobre lo que de verdad se usa; «todos» es lo
  que encuentra al que nunca se inspeccionó.
- Los elementos se leen del listado con el tope de siempre (500 activos).

- *Descartado: una frecuencia guardada en cada elemento del listado.* Es lo
  correcto cuando cada extintor tiene la suya, y obliga a un campo con
  significado propio en el listado y a mantenerlo. Se revisa cuando un
  programa real lo pida; hoy la frecuencia es del formato.
- *Descartado: un cronograma con fechas programadas.* Es otro módulo: aquí
  se mide contra una frecuencia, que es lo que el papel ya suponía.
- *Descartado: ampliar el mapa de calor con las filas vacías.* Seguiría sin
  dar una cifra, y gerencia pide la cifra.

### 2. Un tipo de resultado: seguimiento (`tracking`)

El undécimo, y el que `2026-10-10-seguimiento-de-hallazgos-design.md §7` dejó
aprobado. Sólo en formatos de seguimiento. Responde **¿se está cerrando lo
que se abre?**

Devuelve los abiertos hoy y, de ellos, los vencidos —no dependen del
periodo—; los que se abrieron en el periodo y cuántos de esos están cerrados;
ese porcentaje; los días que tardó el cierre en promedio; y los abiertos que
más urgen, hasta seis, los vencidos primero. Admite meta sobre el porcentaje
y condiciones.

Y lo demás que ese plan anunciaba: **indicador, tendencia, distribución y
tabla calculan sobre un seguimiento**, con los asuntos abiertos en el periodo
como respuestas. Un asunto anulado no cuenta.

- Los asuntos se leen directos, con tope: 500 abiertos y 300 del periodo. Un
  seguimiento no tiene resúmenes diarios: sus asuntos cambian después de
  abrirse.
- *Queda fuera, como en ese plan:* el origen —que un ítem no conforme abra su
  asunto— y la reincidencia. Hasta entonces un hallazgo se abre a mano y dice
  de dónde salió en un campo.

### 3. La biblioteca: un seguimiento y otro tablero

**Seguimiento de hallazgos** (`H-2026-014`), en dos etapas. *Hallazgo*: qué
se encontró, de dónde salió, la prioridad, el centro de trabajo, el vehículo
o el equipo si los hay, una foto, el responsable y la fecha de compromiso.
*Cierre*: qué se hizo, la foto de la corrección y si quedó solucionado.

**Resultados.** Toda inspección sobre un elemento gana su programa, con la
frecuencia que dice su papel; el cumplimiento lleva meta de 90 %; el conteo
se compara con el periodo anterior.

| Inspección | Programa |
|---|---|
| Vehículos | Cada día de lunes a sábado, todos los vehículos activos. |
| Equipos (planta, cargador, soldadura, pulidora, compresor, prensa) | Cada día de lunes a sábado, los equipos con alguna inspección en el periodo. |
| Extintores, botiquines de vehículos | Cada mes, todos los activos. |
| Botiquín, camilla y kit de derrames | Cada mes, todos los centros de trabajo. |

**Tablero**, en siete pestañas:

| Pestaña | Qué contesta |
|---|---|
| Resumen | Lo que se mira primero: si se inspeccionó, si se cerró, qué se vence y las cifras del mes. |
| Vehículos | Programa, cumplimiento, lo que más falla, el mapa, por conductor y vencimientos. |
| Equipos | Programa y cumplimiento de la planta y del cargador; lo que más falla. |
| Emergencias | Extintores, botiquines, camillas y kits: programa del mes, estado y recargas. |
| Hallazgos | Abiertos, vencidos y cerrados; por prioridad, origen, responsable y centro. |
| Gestión SST | Lo que el informe de gestión totaliza: horas hombre, ausentismo, capacitación, dotación. |
| Ambiental | Residuos y consumos. |

**`installSst` puede poner al día lo instalado.** Con `"update":true`, un
resultado de la biblioteca que ya existe y cuya definición cambió se
actualiza —responde a la pregunta abierta 7 del plan de resultados—; con
`"resetDashboard":true`, el tablero del proyecto se sustituye por el de la
biblioteca. Las dos son decisiones de quien administra el deployment: sin
ellas, nada instalado se toca.

**Datos de demostración.** `demoData:seedIssues` abre —y cierra, según una
probabilidad— asuntos ficticios de un seguimiento, con la fecha que se le
diga.

### 4. Las pestañas del tablero no se desplazan de lado

*Añadido el 2026-10-12, tras ver el tablero de siete pestañas. Quien dirige
el producto eligió esta opción entre cuatro que se le presentaron con
maquetas.*

Con siete pestañas la fila ocupaba casi todo el ancho, la octava era la
última que el tablero admitía, y en teléfono ya se deslizaba de lado.

- **Desde `sm`**, la fila enseña las pestañas que caben, de la primera en
  adelante, y guarda el resto en un botón «Más». Si la que se mira está
  guardada, el botón lleva su nombre. El orden lo decide quien arma el
  tablero: lo que más se mira va primero.
- **En teléfono**, la fila es un solo selector con la pestaña actual.
- **El tope sube de 8 a 20 pestañas**: el ancho ya no lo pone.
- No cambia cómo se guarda el tablero: es sólo cómo se pinta
  (`packages/dashboard/components/dashboard-tabs.tsx`; cuántas caben lo
  decide `visibleTabCount`, que es puro y tiene sus pruebas).

- *Descartado: un selector siempre, también en escritorio.* Esconde qué
  secciones existen y cuesta dos clics aunque sólo haya tres.
- *Descartado: las pestañas en el menú lateral.* Mezcla lo fijo del producto
  con lo que cada empresa configura, y en teléfono el menú está cerrado.
- *Descartado por ahora: dos niveles, grupos y pestañas.* Es lo correcto
  cuando una empresa tenga varios módulos; cambia cómo se guarda el tablero y
  su editor, y esta solución no lo estorba.

### 5. Qué queda fuera

- Los formatos que el informe de gestión resume y la biblioteca no tiene:
  permisos de trabajo, simulacros, alcoholimetrías y reporte de incidentes.
  Sin ellos no hay tasa de accidentalidad. Son formatos nuevos, no gráficas.
- Repartir un resultado por quien diligenció: el autor no es un campo.
- Exportar el informe mensual.

## Reglas de acceso

Ninguna llave nueva, y las de siempre:

| | Sin rol | `fillForms` | `+ viewResponses` | `+ editForms` | Administrador y propietario |
|---|---|---|---|---|---|
| Ver un programa o un seguimiento calculados | No | No | Sí | Sí | Sí |
| Definirlos | No | No | No | Sí | Sí |

- Un programa enseña títulos de elementos del listado que su formato
  relaciona. Quien ve las respuestas de todos ya los ve en cada respuesta.
- Un resultado sobre un seguimiento es un agregado de los asuntos de todos:
  exige `viewResponses`, como la bandeja completa.
- `installSst` y `seedIssues` son internas.

## Desde qué tamaño se diseñó

Consulta: escritorio. En teléfono cada tarjeta ocupa la fila, como las demás.

## Preguntas abiertas

1. **La meta de 90 %** del cumplimiento es la que usa la segunda empresa. La
   responsable de SST de la primera no ha dicho la suya.
2. **Lunes a sábado** para los preoperacionales sale de que el papel trae
   columna de domingo pero una obra no lo trabaja siempre. Si se trabaja, se
   marca el domingo en el resultado.
3. **Un consolidado real, con datos.** Los archivos recibidos son plantillas.
   Con un mes diligenciado se puede comprobar que el tablero da lo mismo que
   el informe.
