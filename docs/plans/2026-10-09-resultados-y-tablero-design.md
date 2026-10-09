# Resultados y tablero

**Fecha:** 2026-10-09 · **Estado:** implementado (2026-10-09)

> Este documento es un **registro**: las decisiones se tomaron con quien dirige
> el producto el 2026-10-09 y se implementaron ese mismo día; aquí queda por
> qué el código es como es. `05 §5` prohíbe escribir un plan después para
> justificar lo hecho: lo que sigue no justifica, anota, y lo que la
> implementación dejó sin resolver está al final, como preguntas abiertas.
>
> Fuentes: el módulo de formatos
> (`2026-09-28-modulo-de-formatos-design.md`), que dejó «las gráficas del
> panel» fuera de su alcance y anticipó que el resumen por ítem sería un dato
> derivado (§3); los quince formatos del cliente; y `01 §6`, que fija cuánto
> puede costar una pantalla.

## Objetivo

Que lo que la obra ya diligencia se pueda **mirar junto** sin abrir respuesta
por respuesta: cada formato dice qué se calcula de sus respuestas —una cifra,
una tendencia, un mapa de hallazgos—, y el proyecto reúne esos cálculos en un
tablero, para el rango de fechas que quien mira elija.

## Problema

Con el módulo de formatos el dato existe, con fecha y autor. Lo que no existe
es la respuesta a las preguntas por las que se diligenciaba el papel: qué
equipo acumuló más hallazgos, qué vehículo no se inspeccionó el martes, cuándo
vence el extintor del cargador, cuántas horas hombre lleva el mes. Hoy quien
las quiere contestar abre el listado de respuestas de cada formato y cuenta a
ojo, que es lo mismo que transcribir a fin de mes con otra herramienta.

Tres cosas condicionan cualquier solución:

1. **Cada formato pregunta algo distinto.** De una inspección interesa el
   cumplimiento y qué falla; de las horas hombre, la suma; de un listado de
   vehículos, lo que se vence. No hay un resumen único que sirva a todos.
2. **Los formatos son del proyecto, no de la plataforma.** Cualquier cálculo
   escrito para «la inspección de vehículos» deja de servir en la siguiente
   empresa. Lo que se construye tiene que funcionar sobre cualquier formato
   que alguien cree mañana.
3. **Las respuestas crecen todos los días y pesan.** Una inspección de 63
   ítems son varios kilobytes; un tablero que las lea todas cada vez que se
   abre tiene fecha de caducidad (`01 §6`).

## Modelo personalizable (2026-10-09)

Los ocho tipos eran un catálogo cerrado: cada uno, una operación sobre un
campo. Para que un resultado se pueda armar como se arma un formato —con
piezas que se combinan—, el modelo gana cinco piezas. Todas son **opcionales**
en la configuración guardada: lo que ya existía sigue valiendo sin migrar.

| Pieza | Qué es | Dónde cabe |
|---|---|---|
| **Fórmula** | Una medida puede ser una cuenta entre agregados: `suma(HHT) ÷ suma(personas)`. Operandos y operadores alternados, con la precedencia de siempre; hasta cinco cifras. Dividir por cero, o por nada, deja la cifra sin valor. | Toda medida: indicador, tendencia, distribución, columnas de tabla. |
| **Formato** | El nombre propio de una medida, su unidad («%», «h») y sus decimales. | Toda medida que no sea contar. |
| **Condiciones** | Qué respuestas entran, además del periodo. Es la misma regla campo–operador–valor de la visibilidad (`evaluateRule`), y se cumplen todas; hasta cinco. | Todo resultado de respuestas. |
| **Meta** | Un valor y de qué lado se cumple. La cifra dice si cumple; la gráfica dibuja la línea. | Indicador, tendencia, cumplimiento, cifra compuesta. |
| **Comparación** | Cuánto cambió frente al periodo anterior, de igual largo. Si ese periodo no cabe entero en el tope de lectura, no se compara. | Indicador. |
| **Series** | Hasta tres medidas más en la misma gráfica, cada una con su línea y su color fijo. | Tendencia. |

Y un tipo nuevo, el noveno:

- **Cifra compuesta** (`composite`): una cuenta entre **indicadores** de uno o
  varios formatos del proyecto —días de ausencia ÷ HHT × 1.000—. Pertenece al
  formato desde el que se crea y se pone en el tablero como cualquier otro.
  Cada indicador se calcula para el mismo periodo; debajo de la cifra va lo
  que valió cada uno. Hasta cuatro indicadores distintos, porque cada formato
  ajeno es una lectura más. Si se borra uno, la cifra lo dice en vez de dar
  un número.

Decisiones:

- **Fórmulas estructuradas, no texto.** Se eligen de listas, como en los
  campos calculados: se validan al guardar y no se rompen al renombrar un
  campo.
- **Una cifra compuesta sólo se arma con indicadores, no con otra
  compuesta.** No hay ciclos que vigilar ni cadenas de lecturas.
- **«Otros» ya no suma lo que no se puede sumar.** En una distribución de un
  promedio o de una fórmula, lo que no cupo se vuelve a calcular sobre sus
  respuestas.
- **Lo simple sigue siendo simple.** Un indicador que cuenta respuestas se
  crea igual que antes; las piezas nuevas van debajo, cada una en su sección.

- *Descartado: unir respuestas de dos formatos fila a fila.* Es construir una
  herramienta de consultas; las tasas SST sólo piden dividir dos cifras.
- *Descartado por ahora: partir una tendencia por un campo* (una línea por
  centro de trabajo). Se resuelve hoy con una serie por condición; se revisa
  si alguien lo pide.

La biblioteca trae un ejemplo de cada una: «Horas por persona» (fórmula y
comparación), «HHT y tiempo extra por semana» (dos series) y «Días de
ausencia por cada 1.000 HHT» (cifra compuesta entre dos formatos).

## Navegación (2026-10-09)

Cómo se llega a cada cosa, de principio a fin.

- **La lista de formatos abre el formato.** Pulsar una fila lleva a sus
  respuestas para quien las consulta o lo construye; «Diligenciar» es un
  botón de la fila. Quien **sólo** diligencia sigue yendo directo a
  diligenciar. El menú de la fila ofrece además «Ver resultados» y «Editar el
  diseño».
- **Un formato, tres pestañas** bajo la barra de la página, las mismas en sus
  tres pantallas: **Respuestas** (o Elementos) · **Resultados** · **Diseño**
  (`FormTabs`). Son enlaces: cada una conserva su dirección. Sólo salen las
  que quien mira puede abrir. Desde el diseño con cambios sin guardar, se
  pregunta antes de salir.
- **Del resultado al tablero**: cada tarjeta de la página de resultados tiene
  «Añadir al tablero», que pide la pestaña y lo deja puesto.
- **Del tablero al resultado**: cada tarjeta del tablero tiene «Ver en el
  formato».
- **El tablero se edita en el sitio.** «Editar tablero» —acción de la barra
  de la página— pone el tablero en modo edición: las tarjetas siguen pintando
  sus datos y cada una lleva encima con qué moverla, cambiarle el ancho o
  quitarla; las pestañas se crean, renombran, mueven y quitan ahí mismo; y
  una casilla «Añadir resultado» elige formato y resultado, o lleva a crearlo.
  Nada se guarda hasta «Guardar tablero».

- *Descartado: la hoja lateral con la lista de pestañas y resultados.* Se
  ordenaba a ciegas: no se veía lo que se estaba armando.
- *Descartado: los resultados como botón de la cabecera de las respuestas.*
  Quedaba a dos pasos de la lista y no se veía desde el diseño.

## Dirección aprobada

### 1. Un resultado es una definición, no un dato

Un **resultado** pertenece a un formato y dice **qué** se calcula: el tipo, el
campo que se mide, por qué se separa. No guarda ninguna cifra. Se calcula al
leer, sobre las respuestas vigentes del rango de fechas que se esté mirando.

- Cambiar la definición cambia lo que se ve de inmediato, también hacia atrás:
  no hay nada que reconstruir.
- Una definición se valida contra los campos de la **versión publicada** del
  formato, al crearla y al editarla. Un formato sin publicar no admite
  resultados.
- Si una versión posterior quita el campo al que un resultado apunta, el
  resultado **no se borra ni se calcula a cero**: se devuelve con su
  `problem`, y la tarjeta dice que apunta a un campo que el formato ya no
  tiene y pide editarlo.
- Los ids de campo se conservan entre versiones (formatos §2), así que un
  resultado sobrevive a que el campo cambie de etiqueta.

- *Descartado: guardar el resultado calculado.* Es lo que haría barata la
  lectura, y por eso es el paso siguiente (§9). Pero empezar por ahí obliga a
  decidir, antes de saber qué se mira de verdad, qué se resume, con qué grano,
  y cómo se reconstruye cuando cambia la definición o se anula una respuesta
  (`01 §7.3`). Con el cálculo al leer y un tope declarado (§5) eso se aprende
  primero.
- *Descartado: un cálculo escrito por formato* («el informe de la inspección
  de vehículos»). Es lo que el principio de producto prohíbe: capacidad
  general, y el caso del cliente como configuración (§8).

### 2. Catálogo cerrado de ocho tipos

> **Ampliado el 2026-10-09** por «Modelo personalizable»: los tipos siguen
> siendo pocos, pero cada uno admite piezas, y hay un noveno.

No hay un lienzo de gráficas ni un constructor de consultas. Hay ocho tipos,
cada uno responde una pregunta y pide del formato lo justo
(`convex/lib/result_types.ts`):

| Tipo | Pregunta | Configura | Devuelve |
|---|---|---|---|
| **Indicador** (`indicator`) | ¿Cuánto llevamos? | Una medida. | El valor, cuántas respuestas entraron y la misma cifra repartida por día —o por semana, si el rango pasa de un mes—: las columnas que acompañan a la cifra. |
| **Tendencia** (`trend`) | ¿Sube o baja? | Una medida y un intervalo (día, semana, mes). | Un punto por intervalo del rango —también los vacíos— y el total. |
| **Distribución** (`distribution`) | ¿Cómo se reparte? | Una medida y el campo por el que se reparte: una lista o una relación. | Hasta 12 filas de mayor a menor, y lo demás sumado en «Otros». |
| **Tabla** (`table`) | ¿Cuál es el detalle? | El campo por el que se reparte y de 1 a 6 medidas. | Una fila por opción o elemento, ordenadas por nombre, una columna por medida y el total al pie. |
| **Cumplimiento** (`compliance`) | ¿Qué tan bien salen las inspecciones? | Una lista de chequeo y un intervalo. | El porcentaje de ítems conformes del rango y su evolución por intervalo, con conformes y no conformes de cada punto. |
| **Hallazgos frecuentes** (`findings`) | ¿Qué falla más? | Una lista de chequeo. | Los 8 ítems con más no conformes, el total de hallazgos y cuántas respuestas entraron. |
| **Mapa de calor** (`heatmap`) | ¿Dónde y cuándo? | Una relación (las filas) y qué vale cada celda: cuántas respuestas, la suma de un campo numérico o los ítems no conformes de una lista de chequeo. | Elemento por día —o por semana, si el rango pasa de un mes—: hasta 12 filas y el máximo, para la escala. |
| **Vencimientos** (`expirations`) | ¿Qué se vence pronto? | De 1 a 6 campos de fecha de un **listado**. | Las 30 fechas más próximas de los elementos activos, con los días que faltan, cuántas ya vencieron y cuántas vencen en 30 días. |

Una **medida** es una operación sobre un campo numérico o de moneda: sumar,
promediar, el último valor, el mínimo o el máximo. La sexta operación, contar
respuestas, no mira ningún campo. **No hay operación por omisión** más allá de
contar: sumar un kilometraje no significa nada, y eso lo sabe quien define el
resultado, no la plataforma.

Qué tipos caben en cada clase de formato (formatos §1):

- En un **formato** (`record`): los siete primeros.
- En un **listado** (`catalog`): sólo vencimientos. Un listado no son hechos
  con fecha sino elementos que se mantienen al día; lo que se le pregunta es
  qué está por vencer **hoy**, y por eso no usa el rango.

Reglas de cálculo que valen para todos (`convex/lib/result_compute.ts`):

- **Un promedio de nada no es cero.** Sin valores, promedio, último, mínimo y
  máximo dan «sin dato» (`null`, que se pinta «—» o como un hueco en la
  línea). Sólo contar y sumar dan cero.
- **Lo que no eligió nada va en «Sin dato»** en una distribución o una tabla;
  en un mapa de calor no sale.
- **«No aplica» no cuenta** en el cumplimiento: el porcentaje es conformes
  sobre conformes más no conformes, y se cuentan sólo los ítems que se
  responden (no los títulos de bloque). El sentido de cada opción es el que
  declara la escala de la lista de chequeo (formatos §4.1).
- **Una celda vacía no es un cero.** En el mapa de calor, un día sin respuesta
  de ese elemento es `null` y se pinta punteado: es «no se inspeccionó», que
  es justo lo que se viene a buscar.
- **El intervalo se ensancha solo.** Una tendencia o un cumplimiento no pasan
  de 62 puntos: un año por días se convierte en semanas, y si aún no cabe, en
  meses. La semana va de lunes a domingo (`convex/lib/date_buckets.ts`).
- **La fecha es la de negocio** de la respuesta (formatos §6), que ya fijó el
  servidor en hora de Colombia: agrupar no vuelve a pensar en zonas horarias.

- *Descartado: un constructor libre* (elegir ejes, series, filtros). Es más
  potente y traslada a quien define el resultado preguntas que no sabe
  contestar —qué operación, qué eje—, además de abrir combinaciones que no
  significan nada. El catálogo se amplía con un tipo nuevo cuando un formato
  real lo pida.
- *Descartado: deducir los resultados del formato* (toda lista de chequeo
  trae su cumplimiento sin que nadie lo pida). Llena la pantalla de gráficas
  que nadie eligió. La biblioteca sí los trae hechos (§8), pero como
  definiciones corrientes que se pueden editar y borrar.

### 3. Qué registros entran se decide al mirar

El rango de fechas **no es parte del resultado**: es de quien mira, vale para
todo lo que hay en pantalla y vive en la dirección (`desde`, `hasta`), de modo
que un enlace al tablero de septiembre abre septiembre (`02 §8`).

- Por omisión, los **últimos 30 días** con hoy incluido.
- Un solo control, «Periodo», a la derecha de las pestañas: dice el atajo
  mientras el rango coincida con uno y, si no, las fechas. Al abrirlo, los
  atajos van primero —últimos 7, 30 y 90 días, este mes, mes pasado, este
  año— y el rango exacto al lado. La dirección guarda las fechas, no el
  atajo. Es el mismo patrón de los filtros de listado de Nexus
  (`nexus-desktop/docs/plans/2026-10-09-filtros-de-listado-design.md`).
- La dirección la escribe cualquiera: lo que no es una fecha, o un rango al
  revés, cae en el de omisión (`packages/forms/lib/results-range.ts`).
- **No hay exclusión manual de registros.** Una respuesta **anulada** no
  cuenta en ningún resultado, y anular es la única forma de sacar una: deja
  quién y por qué (formatos §6).

- *Descartado: un rango por resultado* («este indicador es siempre del mes»).
  Un tablero con seis rangos distintos no se puede leer de un vistazo ni
  compartir con un enlace.
- *Descartado: marcar respuestas como «no contar».* Sería una segunda forma de
  anular, sin motivo ni autor, y dos pantallas darían cifras distintas del
  mismo formato sin que nadie supiera por qué.

### 4. Un tablero por proyecto, con pestañas

El proyecto tiene **un** tablero. Sus **pestañas** agrupan resultados por lo
que se viene a mirar —los vehículos, las personas—, no por formato: una
pestaña mezcla resultados de varios.

- Cada pestaña lleva **widgets**: un resultado, señalado **por id**, y un
  **tamaño** en una retícula de doce —un tercio, media fila, dos tercios o la
  fila entera—. Por debajo de `lg`, todo va a fila entera.
- El widget apunta, no copia. Editar el resultado cambia el tablero; borrarlo
  —o borrar su formato— hace que deje de salir, sin dejar un hueco roto.
- El tablero se guarda **entero** en cada cambio: reordenar es cambiarlo todo,
  y es pequeño (hasta 8 pestañas de hasta 12 resultados).
- La pestaña que se mira va en la dirección (`pestana`), junto al rango.
- **Es** el inicio del proyecto para quien ve las respuestas de todos: bajo
  la barra de la página van las pestañas y nada más, y «Editar tablero» es la
  acción de esa barra (`03 §2.2`). Quien no las ve no tiene tablero: su
  inicio son sus formatos para diligenciar, el equipo y la actividad.
- Cada tarjeta lleva una ayuda (ⓘ) que dice cómo se lee su tipo, y cada
  barra, celda y columna dice su cifra exacta al pasar por ella.

- *Descartado: varios tableros, o uno por persona.* Obliga a decidir quién ve
  cuál y a mantenerlos. Las pestañas dan la misma separación sin permisos
  nuevos.
- *Descartado: una pantalla propia para el tablero.* Cada quien encuentra lo
  suyo en la misma dirección.
- *Descartado (2026-10-09): el tablero debajo de «Para diligenciar».* Quien
  consulta tenía que pasar una lista de formatos para llegar a lo que venía a
  ver; los formatos siguen a un toque en el menú.

### 5. Cálculo y límites

`formResults.compute` calcula **todos los resultados de un formato de una
vez**, para un rango. Leen las mismas respuestas, y como el cliente comparte
la suscripción, una pestaña con cinco resultados del mismo formato las lee
una sola vez. Cada widget del tablero pide los de su formato y se queda con
el suyo.

| Límite | Valor | Qué pasa al alcanzarlo |
|---|---|---|
| Respuestas por cálculo | 300 | Se calcula sobre las **primeras** 300 del rango (las más antiguas) y el resultado lo dice (`capped`). |
| Elementos de un listado por cálculo | 500 | Ídem, sobre los elementos activos. |
| Rango | 400 días | Un rango mayor no se calcula. |
| Resultados por formato | 20 | El servidor rechaza el siguiente. |
| Nombre de un resultado | 2 a 60 caracteres | — |
| Medidas de una tabla | 6 | — |
| Campos de fecha de unos vencimientos | 6 | — |
| Filas de una distribución o un mapa de calor | 12 | La distribución suma el resto en «Otros»; el mapa se queda con los 12 elementos con más respuestas. |
| Ítems de unos hallazgos | 8 | — |
| Filas de unos vencimientos | 30 | Los contadores de vencidos y por vencer sí cuentan todas. |
| Puntos de una tendencia | 62 | El intervalo se ensancha. |
| Pestañas del tablero | 8 | — |
| Resultados por pestaña | 12 | — |
| Nombre de una pestaña | 40 caracteres | — |

- Las respuestas se leen por el índice de formato y fecha de negocio, con el
  rango **dentro** del índice (`01 §6`, forma 1), y con tope y degradación
  declarada (forma 3). Las anuladas se descartan después de leer, así que
  también gastan tope.
- El cálculo es un **módulo puro** (`convex/lib/result_compute.ts`): recibe
  los campos y las respuestas ya leídas, y no sabe nada de la base. El
  servidor sólo decide qué respuestas entran. Así se prueba con casos dorados
  (`04 §6`).
- **`today` lo manda el cliente**, porque una consulta no lee el reloj. Sólo
  lo usan los vencimientos, para los días que faltan.
- El aviso de tope dice que las cifras son de las primeras respuestas y que
  acortar el rango las enseña todas.

- *Descartado: paginar las respuestas hasta leerlas todas.* Un agregado
  necesita todas a la vez; paginar sólo reparte el mismo coste en varias
  consultas y lo esconde.

### 6. Modelo de datos

```
projects
 ├── forms
 │    └── formResults   → name, config (unión por `type`), createdBy
 └── dashboards         → tabs[]: { id, label,
                           widgets[]: { id, resultId, size } }
```

- `formResults.formId` es **requerida**: un resultado no existe sin su
  formato, y `forms.remove` se lleva los suyos (`01 §6.1`).
- `dashboards` tiene un documento por proyecto, o ninguno todavía.
- Las dos tablas llevan `projectId` con índice y entran en
  `projects.purgeProjectData` en el mismo cambio que las crea.
- `config` es una unión discriminada por tipo; guarda **ids de campo**, no
  etiquetas. Su validador (`convex/lib/result_validators.ts`) vive aparte de
  los tipos (`result_types.ts`), que son puros y viajan al navegador: el
  editor ofrece los mismos tipos y operaciones que el servidor valida
  (`01 §2.2`).
- Un widget cuyo resultado ya no existe se queda en el documento hasta el
  siguiente guardado; la lectura lo filtra.
- No hay tipo de entidad nuevo en la auditoría: definir un resultado se
  registra sobre su **formato**, y guardar el tablero, sobre el **proyecto**.

### 7. Pantallas

| Dónde | Qué es | Se decide primero para |
|---|---|---|
| `/projects/[id]/formats/[formId]/results` | Los resultados del formato, calculados, y dónde se definen. | Escritorio |
| `/projects/[id]` | El tablero, dentro del inicio del proyecto. | Escritorio |

Las dos son pantallas de **consulta** (`02 §7.1`): la retícula de doce se
decide en escritorio, y en teléfono y tableta cada tarjeta ocupa la fila.

**Resultados de un formato.** Se llega con el botón «Resultados» de la
pantalla de respuestas, que aparece si el formato está publicado y se ven las
respuestas de todos. Es la otra mitad del constructor: allí se dice qué se
pregunta; aquí, qué se quiere saber.

- Arriba, la barra de rango (no en un listado: sus vencimientos son de hoy) y
  «Añadir resultado».
- Cada resultado es una tarjeta (`PanelCard`) con el icono de su tipo, su
  nombre y su gráfica, y —para quien los define— editar y eliminar. El ancho
  de la tarjeta lo da el tipo: una cifra cabe en un tercio; una tabla o un
  mapa de calor piden la fila.
- Eliminar confirma, y dice que el resultado deja de verse también en el
  tablero y que las respuestas no se tocan.
- Estados: sin resultados, con la invitación a añadir el primero; sin permiso
  para ver las respuestas; formato sin publicar; y el aviso de tope.

**Editor de un resultado.** Un sheet: nombre, tipo —sólo los que caben en esa
clase de formato— y lo que el tipo pide. Cada selector ofrece **sólo los
campos que sirven**: los numéricos para medir, las listas y relaciones para
repartir, las listas de chequeo, las fechas. Si el formato no tiene campos de
esa clase, lo dice. Cambiar de tipo no pierde lo ya elegido en los demás. Un
resultado nuevo nace válido: cuenta respuestas.

**Tablero.** Pestañas, la barra de rango y, para quien lo arma, «Editar
tablero» («Armar el tablero» si está vacío). Cada widget es la misma tarjeta
que en la pantalla del formato, con el nombre del formato debajo del suyo.
Mientras calcula, un esqueleto con su silueta.

**Editor del tablero.** Un sheet con las pestañas en orden: nombre, subir,
bajar y quitar. Dentro de cada una, sus resultados con su tamaño y los mismos
tres movimientos, y un selector en dos pasos para añadir otro —primero el
formato publicado, después uno de sus resultados—, que entra con el tamaño
propio de su tipo. No se guarda sin pestañas ni con una sin nombre.

Componentes que **no existían** y este cambio crea (`05 §3`, paso 3): el
contenedor de gráficas `components/ui/chart.tsx`, escrito a mano al estilo de
shadcn/ui sobre Recharts; la tarjeta de resultado y sus formas
(`packages/forms/components/result-*.tsx`: cifra, línea o área, barras
horizontales, tabla, mapa de calor y lista de vencimientos); y la barra de
rango. Las barras, el mapa de calor y las tablas son HTML: sólo la tendencia
y el cumplimiento usan Recharts.

Decisiones de las gráficas:

- **Una serie, un color**: el acento de producto (`h-indigo`). Una cifra que
  sólo mide no lleva color de estado (`03 §1.4`); en las barras, la primera
  lleva el acento y las demás acompañan en gris.
- El mapa de calor es **un solo tono en cinco pasos**; el cero va sin tono y
  la celda sin respuesta, punteada.
- Los vencimientos sí son un estado, y lo dicen con palabras además del color:
  vencido o vence hoy (rojo), vence en 30 días o menos (amarillo), vigente
  (verde).
- El valor va siempre escrito: ni la barra ni el color son los únicos que lo
  dicen (`03 §6.1`).

Dependencia que entra con este cambio, anotada en `00 §5.1`: `recharts`
(3.8.0, fijada), que ya era la decidida para las gráficas. Paquete nuevo:
`packages/dashboard`. Lo del resultado vive en `packages/forms`, porque un
resultado es parte de la definición de un formato.

### 8. Biblioteca SST y datos de demostración

**La biblioteca trae resultados y un tablero como configuración**
(`convex/sst_library/results.ts`). Ninguno es código de la aplicación:
cualquiera de ellos se puede crear igual desde la pantalla.

- Cada una de las trece inspecciones recibe «Inspecciones» (indicador),
  «Cumplimiento por semana» e «Ítems con más hallazgos», y —si el formato
  elige su equipo, vehículo o extintor en **un solo** campo de relación— el
  mapa de hallazgos por elemento y día, que es la hoja semanal del papel.
- Entrega de dotación, horas hombre trabajadas, control de ausentismo,
  capacitaciones y charlas, gestión ambiental y registro fotográfico traen los
  suyos: indicadores, tendencias por semana, distribuciones y tablas por
  centro de trabajo.
- Los listados de vehículos, personal y extintores traen sus vencimientos:
  SOAT y revisión, licencias de conducción, próxima recarga.
- El tablero nace con cinco pestañas —Vehículos, Equipos, Emergencias,
  Personas, Ambiental—.

`formLibrary.installSst` los instala después de los formatos, en cada
ejecución:

- **Idempotente por formato y nombre**: un resultado que ya está —mismo
  formato, mismo nombre sin distinguir mayúsculas ni tildes— no se vuelve a
  crear. Tampoco se actualiza: si alguien lo editó, se respeta.
- **No pisa un tablero existente**: sólo lo instala si el proyecto no tiene
  ninguno. Un widget cuyo resultado no llegó a instalarse se omite.
- Devuelve cuántos resultados creó y si instaló el tablero.

**Datos de demostración** (`convex/demoData.ts`). Un tablero vacío no dice si
funciona (`04 §7`). `demoData:seedDay` escribe las respuestas ficticias de un
día: es interna, la ejecuta quien administra el deployment con
`bunx convex run`, y **no conoce ningún formato**: genera un valor por tipo de
campo a partir de la versión publicada.

- Recibe el proyecto, la fecha, un plan —por formato, cuántas respuestas, la
  probabilidad de que un ítem no cumpla y, opcionalmente, pistas por campo
  (rangos y textos)— y una firma y una foto en base64 para los campos que las
  exigen. Hasta 40 respuestas por día.
- Todo pasa por `resolveValues`, como una respuesta de verdad. Lo único que
  se elige es la fecha de negocio, y por eso se siembra del día más viejo al
  más nuevo.
- Con semilla: la misma siembra da los mismos datos. Unos ítems y unos
  equipos fallan más que otros, que es lo que se ve en una obra.
- Sólo siembra formatos (`record`) publicados del proyecto, y suma al
  contador de respuestas de cada uno.

### 9. Qué queda fuera, y el paso siguiente

- **Resúmenes diarios mantenidos al escribir.** Es la forma 4 de `01 §6` y lo
  que levanta el tope de 300 respuestas: una tabla derivada, por formato y
  día, que se actualiza en la misma transacción que la respuesta y su
  anulación, y que cumple `01 §7.3` —también reconstruirse cuando cambia la
  definición—. No está construido. Entra con su plan cuando un formato real
  toque el tope en el rango que de verdad se mira.
- **Filtros por campo** («sólo la planta norte», «sólo este vehículo»). Hoy
  lo único que acota es el rango de fechas.
- **Exportar** un resultado o el tablero a Excel o PDF. Las librerías están
  decididas y sin instalar (`00 §5.1`).
- Comparar con el periodo anterior, metas o umbrales por resultado, avisos
  cuando algo vence y tableros por persona.
- El consolidado del informe de gestión y la vista semanal para imprimir
  siguen donde los dejó el módulo de formatos (§12).

## Reglas de acceso

No hay llaves nuevas. Tres de las quince gobiernan esto, y propietario y
administrador las tienen todas (`01 §5.1`).

| Llave | Permite | Función |
|---|---|---|
| `viewResponses` | Ver los resultados calculados de cualquier formato y ver el tablero. | `formResults.compute`, `dashboards.get` |
| `editForms` | Definir, editar y eliminar los resultados de un formato. | `formResults.create`, `update`, `remove` |
| `editProject` | Armar el tablero. | `dashboards.save` |

Qué ve cada quien:

| | Sin rol | `fillForms` | `+ viewResponses` | `+ editForms` | `+ editProject` |
|---|---|---|---|---|---|
| Tablero en el inicio | No | No | Sí | Sí | Sí, con «Editar tablero» |
| Resultados de un formato | No | No | Sí | Sí, con añadir, editar y eliminar | Sí |

- Un resultado es un **agregado de las respuestas de todos**: se calcula con
  la misma regla con que se listan (`canViewAll`, `convex/lib/form_access.ts`).
  Por eso, en un **listado**, `editCatalogs` también alcanza para calcular sus
  vencimientos: quien mantiene los elementos ya los ve todos. El tablero, en
  cambio, exige `viewResponses` sin excepción.
- Las lecturas **devuelven `null`** sin acceso, no lanzan: el tablero se monta
  en el inicio para todos y no se pinta para quien no puede verlo.
- Las **definiciones** de los resultados de un formato (`formResults.get`:
  nombre y configuración, sin cifras) las lee quien puede ver el formato. Es
  lo que alimenta el selector del editor del tablero.
- El ámbito de toda escritura sale del documento: el proyecto de un resultado
  es el de su formato (`01 §4.3`). `dashboards.save` recibe el proyecto —es
  quien lo crea— y **cada resultado que llega por id demuestra que es de ese
  proyecto** (`01 §10`, la regla de la lista de ids).
- Quedan en auditoría: crear, editar y eliminar un resultado (sobre el
  formato) y guardar el tablero (sobre el proyecto). Calcular no escribe nada.
- La instalación de la biblioteca y la siembra de demostración son funciones
  internas: no tienen sesión ni llave, y no se alcanzan desde la aplicación.
- No hay ninguna superficie sin sesión. Un tablero no se comparte con un
  enlace público.

## Preguntas abiertas

Lo que la implementación dejó sin decidir, o decidió de una forma que conviene
mirar otra vez:

1. **¿Definir resultados exige también ver las respuestas?** El servidor sólo
   pide `editForms`. La pantalla, en cambio, enseña «Resultados» y «Añadir
   resultado» a quien además ve las respuestas de todos: quien construye
   formatos sin `viewResponses` no llega a definirlos desde la aplicación. Lo
   mismo con el tablero: `dashboards.save` pide `editProject`, pero el botón
   vive en un tablero que sólo se pinta con `viewResponses`.
2. **El tablero no avisa del tope.** El aviso de «más respuestas de las que se
   calculan» sólo sale en la pantalla de resultados del formato; un widget
   del tablero enseña la cifra truncada sin decirlo.
3. **Un rango de más de 400 días se lee como falta de permiso.** La dirección
   lo acepta, el servidor devuelve `null`, y la pantalla dice que hace falta
   el permiso para ver las respuestas.
4. **Al tocar el tope se ven las respuestas más antiguas del rango**, no las
   más recientes. Es coherente con «el último valor es el del final», pero en
   un tablero lo reciente suele importar más.
5. **La tabla no tiene tope de filas.** La distribución y el mapa de calor se
   quedan en 12; una tabla repartida por un listado de doscientos elementos
   saca doscientas filas.
6. **«Otros» siempre suma.** En una distribución que promedia, o que toma el
   máximo, la fila «Otros» es la suma de los promedios de lo que no cupo.
7. **Actualizar la biblioteca no actualiza sus resultados.** `"update":true`
   publica una versión nueva de los formatos que cambiaron; un resultado de
   la biblioteca que ya existe se deja como está, aunque la biblioteca lo
   haya corregido.
8. **La siembra de demostración no marca ni borra lo suyo.** `04 §7` pide que
   una siembra marque con un prefijo lo que crea y sepa retirarlo; ésta
   escribe respuestas indistinguibles de las reales y sin vuelta atrás. Hoy se
   usa sólo en deployments de desarrollo.
