# Tablero a la medida: tarjetas con tamaños de widget

**Fecha:** 2026-10-14 · **Estado:** implementado (2026-10-14)

> Quien dirige el producto revisó el 2026-10-14 las tarjetas del tablero en
> dos proyectos —la demostración de pisos industriales y el de una empresa de
> vigilancia con un año de inspecciones reales— y pidió que se vieran «como
> los widgets de iOS»: tamaños definidos, el espacio aprovechado y respetado.
> La propuesta se le presentó con medidas y láminas de antes y después, la
> aprobó con un ajuste en una lámina, y pidió plan e implementación.
> Construye sobre `2026-10-09-resultados-y-tablero-design.md` §4.

## Objetivo

Que cada tarjeta del tablero tenga un tamaño de una escala fija y que su
contenido se adapte a ese tamaño, de modo que ninguna tarjeta dependa del alto
de su vecina, nada quede cortado y nada quede vacío.

## Problema

Se midieron las 77 tarjetas de los dos tableros a 1440 px:

- **El contenido decide el alto, y la fila se lo impone a la vecina.** Hay 26
  alturas distintas, de 173 a 677 px. 19 tarjetas quedan estiradas por la de
  al lado, con 2.560 px de alto vacío entre todas: una lista de recargas de
  tres filas junto a un programa de 516 px deja 238 px en blanco.
- **Las listas no tienen techo, o lo tienen con scroll.** Un seguimiento con
  seis asuntos estira su fila entera; los vencimientos de una flota desplazan
  por dentro y cortan la novena fila a la mitad, sin decir cuántas faltan.
- **Las gráficas miden siempre 208 px.** Si la tarjeta se estira, el hueco
  queda debajo de la curva; si es baja, la gráfica no encoge.
- **Las líneas de uno o dos puntos, y la caída falsa.** Con intervalo mensual
  y un rango de 30 días, la tendencia es un punto suelto o una diagonal de 80
  a 0 porque el mes en curso va por la mitad. El último periodo incompleto se
  lee como una caída en todas las tendencias semanales.
- **La cabecera pesa 70 px y corta los títulos** en un tercio de fila.
- **Títulos repetidos**: cuatro «Programa de inspección» en la misma pestaña,
  distinguidos sólo por la línea pequeña.
- **Rótulos largos cortados** en las barras de hallazgos (son preguntas del
  formato), **filas huérfanas** al final de una pestaña y **filas de lista que
  cambian de forma** según el largo del texto.

Quien mira el tablero no puede leerlo de un vistazo: tiene que buscar dónde
termina cada tarjeta y adivinar qué quedó fuera.

## Dirección aprobada

### 1. Ancho por columnas, alto por pisos

Se conservan los cuatro anchos de la retícula de doce (tercio, media, dos
tercios, fila entera) y se añade el **alto en pisos** de 136 px con 16 px de
separación:

| Alto | Pisos | Px | Para qué |
|---|---|---|---|
| Bajo | 2 | 288 | Una cifra con su contexto. |
| Medio | 3 | 440 | Una cifra con su gráfica, o una lista de 6 a 8 filas. |
| Alto | 4 | 592 | La gráfica y su detalle. |

Un alto mide lo mismo que dos bajos apilados. La retícula usa filas de alto
fijo (`grid-auto-rows`) y la colocación automática de CSS Grid: una tarjeta
alta junto a dos bajas se acomoda sola. En teléfono todo va a fila entera y
el alto se conserva.

*Descartado: que el alto lo siga poniendo el contenido y la retícula alinee
arriba (`items-start`).* Quita el estiramiento, pero el hueco pasa a estar
fuera de la tarjeta y los bordes inferiores quedan disparejos; es lo que hoy
sugiere `03 §2.3` para otras retículas, y aquí no sirve.

*Descartado: una retícula libre de arrastrar y redimensionar celda a celda.*
Pide una librería, multiplica los tamaños posibles y vuelve a las 26 alturas.

### 2. Cada tipo sabe pintarse en cada alto

| Tipo | Bajo | Medio | Alto | Por omisión |
|---|---|---|---|---|
| Indicador | cifra, meta, cambio y mini columnas | más alto | — | bajo |
| Cifra compuesta | cifra y las partes que quepan | igual | — | bajo |
| Tendencia | cifra y línea sin ejes | con ejes y meta | igual | medio |
| Cumplimiento | %, meta y línea sin ejes | con ejes y meta | igual | medio |
| Distribución | las barras que quepan y «Otros» | igual | igual | bajo |
| Hallazgos frecuentes | los ítems que quepan | igual | igual | medio |
| Vencimientos | etiquetas y las filas que quepan | igual | igual | medio |
| Programa | %, meta y los elementos peor cubiertos | %, meta y gráfica | %, gráfica y elementos | alto |
| Seguimiento | %, abiertos y vencidos | y los asuntos que quepan | igual | alto |
| Tabla | — | las filas que quepan y el total | igual | medio |
| Mapa de calor | las filas que quepan | igual | igual | medio |

Lo que no cabe **no desplaza ni se corta**: la lista enseña las filas enteras
que caben y debajo dice «y N más», que lleva al formato. Cuántas caben se
mide en la tarjeta, no se adivina por tipo. Las gráficas llenan el alto que
dejan la cifra y las etiquetas.

*Descartado: un número fijo de filas por tipo y alto.* Falla en cuanto el
título ocupa dos líneas o la tarjeta va en un teléfono.

### 3. Una tarjeta de widget

`PanelCard` es la tarjeta de un panel de pantalla, con buscadores y filtros en
la cabecera. Un resultado no los lleva. Se crea `WidgetCard`
(`components/harmony/widget-card.tsx`): 16 px de margen a los cuatro lados,
sin separador, el título en hasta dos líneas y debajo el formato con el
glifo del tipo (`03 §5.6`) en pequeño; las acciones, discretas, a la derecha.
Pasa de 70 px a unos 44 px de cabecera. La usan el tablero y la página de
resultados del formato, que comparten `ResultCard`.

### 4. Gráficas honestas

- **Al menos tres periodos.** Si el rango deja menos de tres puntos en el
  intervalo del resultado, se baja al siguiente (mes → semana → día). Es la
  regla inversa de la que ya ensancha el intervalo pasados 62 puntos.
- **El periodo cortado se dice.** Un periodo que el rango no cubre entero
  —la semana o el mes en curso, o el primero si el rango empieza a mitad— se
  dibuja punteado, y su ayuda lo nombra. Nunca se lee como una caída.
- **Las mini columnas del indicador siguen el ritmo del formato.** Si se
  respondió en tantos días como semanas tiene el rango o menos (un informe
  semanal), las columnas son semanas, no 30 días con cuatro rayas sueltas.

### 5. Barras y filas de un solo molde

- Con rótulos largos (el más largo pasa de 28 caracteres), las barras pasan a
  **rótulo arriba y barra debajo**, a todo el ancho. Con rótulos cortos siguen
  en columnas.
- Las filas de seguimiento, vencimientos y programa tienen **un alto fijo**:
  el texto en una línea con puntos suspensivos y la etiqueta a la derecha,
  nunca debajo.

### 6. El editor

- En modo edición, cada tarjeta lleva un menú «Ajustar» con mover antes y
  después, ancho, alto (con el sugerido marcado) y quitar. La barra que hoy va
  encima de cada tarjeta le robaba alto, y con altos fijos lo que se ve al
  editar dejaría de ser lo que queda al guardar.
- **Los huecos se ven**: el editor calcula la colocación y pinta con línea
  punteada el espacio que queda libre en una fila, con la opción de ensanchar
  la tarjeta de al lado para cerrarlo. No se reacomoda solo: el orden lo
  decide quien arma el tablero.
- **El alto sugerido** es el más bajo en que caben todas las filas de hoy.

### 7. La página de resultados de un formato

Usa la misma tarjeta y la misma retícula, pero ahí nadie ordena los
resultados a mano: se acomodan solos (`packages/forms/lib/results-layout.ts`)
con el alto sugerido de cada uno, las cifras de tres en tres, las medias filas
en parejas del mismo alto y lo que queda suelto ensanchado a la fila entera.
No deja huecos.

### 8. La biblioteca

Los resultados de programa, cumplimiento y hallazgos se nombran **por el
objeto**: «Extintores · programa», no «Programa de inspección». El tablero
de la biblioteca se recompone con anchos y altos, sin quitar ni añadir
resultados.

## Reglas de acceso

No cambian. Ver el tablero sigue pidiendo `viewResponses` y armarlo,
`editProject` (`2026-10-09-resultados-y-tablero-design.md`, reglas de
acceso). El alto es parte de lo que se guarda al armarlo; no hay llave nueva.

| Nivel | Ve el tablero | Ajusta anchos y altos |
|---|---|---|
| Propietario | Sí | Sí |
| Administrador | Sí | Sí |
| Miembro con rol | Con `viewResponses` | Con `editProject` |
| Miembro sin rol | No | No |

## Desde qué tamaño se diseñó

Escritorio, a 1440 px: el tablero lo mira quien administra (`00 §2.3`). En
teléfono las tarjetas van a fila entera con el mismo alto, y las listas
enseñan las filas que quepan en ese ancho.

## Datos

Cada resultado del tablero guarda, además de `size` (ancho), un `height`
opcional: `short`, `medium` o `tall`. **Sin `height`, el alto es el que el
tipo trae por omisión**, y así se leen los tableros guardados antes de este
cambio. No hay migración: el campo es opcional por diseño, no a medio migrar
(`01 §7.1`). Guardar valida que el alto sea uno de los que admite el tipo.

## Preguntas abiertas

- **El tablero de la segunda empresa** se instaló desde un JSON fuera del
  repositorio. Se recompone desde el editor, con la cuenta de pruebas que lo
  administra; el JSON de origen no se toca.
- **Arrastrar para mover.** Sigue siendo con «antes» y «después». Si el
  tablero crece, se evalúa con `@dnd-kit`, que ya es canónica (`00 §5.1`).
