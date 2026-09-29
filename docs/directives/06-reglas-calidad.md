# 06 · Reglas de Calidad Estructural

> Cómo se juzga la **forma** del código, no su corrección. Este documento gobierna
> abstracción, tamaño de archivo, crecimiento de condicionales, ubicación de la
> lógica y atomicidad de las escrituras. Es la vara con la que se audita un cambio
> antes de darlo por terminado.

> [!CAUTION]
> **Este documento no busca bugs.** Un defecto de comportamiento, un fallo de
> permisos o una respuesta que se guarda a medias se atrapan con el gate y las
> pruebas de `04-reglas-testing`. Aquí la pregunta es distinta: *el código
> funciona, ¿pero deja el repositorio mejor o peor de como lo encontró?* Un cambio
> puede pasar todas las pruebas y aun así ser rechazado por este documento.

---

## 1. El principio

**Ser ambicioso con la estructura.** La mejora por defecto no es pulir lo que hay:
es buscar el movimiento que hace desaparecer una categoría entera de complejidad
—una rama, una capa, un estado— conservando exactamente el mismo comportamiento.

Existe una asimetría deliberada en cómo se juzga: *añadir* una abstracción exige
justificación, *eliminar* una no. Si dos caminos producen el mismo comportamiento,
gana el que tiene menos piezas móviles, aunque el otro sea el que ya estaba
escrito.

El listón no es "esto funciona". Es **"esto deja el código más simple de lo que
estaba"**, o al menos igual de simple.

Harmony Build nace pequeño y sin deuda. Este documento existe para que siga
siendo las dos cosas el mayor tiempo posible.

---

## 2. Los siete estándares

Se aplican a cualquier cambio no trivial. No son sugerencias.

### 2.1 Ambición estructural

Antes de aceptar una implementación, buscar el replanteamiento que la vuelve
innecesaria. Reordenar código sin reducir la carga conceptual no es una mejora:
es el mismo problema con otra forma. Un refactor que mueve 200 líneas de sitio y
deja el mismo número de casos especiales no ha hecho nada.

### 2.2 Tamaño de archivo

Un archivo que crece sin partirse acumula responsabilidades que nadie decidió
darle. Los umbrales están en §3.

### 2.3 Prevención de espagueti

Un condicional nuevo insertado en un flujo que no es suyo es un **problema de
diseño**, no un detalle de estilo. Cuando aparece un `if` que pregunta por un
módulo dentro de código que no debería conocerlo, la respuesta correcta casi
nunca es el `if`: es mover esa lógica detrás de su propia abstracción, o cambiar
el modelo de estado para que la pregunta no haga falta.

Dos señales duras de este proyecto:

- **Preguntar por el rol a mano.** `member.role === "owner"` repartido por
  handlers y componentes es la jerarquía de `01 §5.1` escrita veinte veces, y
  la vigésima se olvida del administrador. La pregunta se hace con
  `checkPermission`, `isProjectAdmin` o `isProjectOwner` en el servidor, y con
  `RoleGate` o `usePermissions()` en el cliente (`01 §5.4`).
- **Las banderas de módulo opcional.** Una bandera que enciende una parte del
  producto para unos proyectos y no para otros es exactamente la clase de
  condición que tiende a filtrarse a todas partes. **Hoy no existe ninguna**:
  todo proyecto tiene todo. La primera que se proponga entra con plan (`05`), y
  su comprobación vive en un solo sitio. Si para entender una función hay que
  saber qué módulos existen en el producto, la función está en el sitio
  equivocado.

### 2.4 Diseño por encima de aceptación

"Funciona" no es criterio de aprobación. Una implementación que resuelve el caso
de hoy y deja el flujo circundante más enredado se rechaza aunque el resultado
visible sea correcto. Preferir siempre la versión con menos piezas móviles.

### 2.5 Directo antes que mágico

El comportamiento oculto, implícito o adivinado es un defecto de calidad. Una
abstracción tiene que **comprar claridad**: si un helper solo reenvía sus
argumentos, si un wrapper no añade más que un nombre, si una capa existe "por si
acaso", sobra. La indirección que no explica nada solo esconde.

Corolario incómodo pero firme: **una abstracción prematura es peor que una
duplicación honesta.** Dos copias visibles se unifican el día que se entiende el
patrón; una abstracción equivocada se hereda durante años.

### 2.6 Disciplina de capa canónica

Cada pieza de lógica tiene un sitio correcto en este proyecto, y solo uno. La
tabla es la ley:

| Si la lógica… | Vive en | Nunca en |
|---|---|---|
| Es pura, sin React ni Convex, y sirve a toda la app | `lib/` | `packages/*/lib/`, `convex/` |
| Es una regla que deben cumplir **servidor y cliente** | `convex/lib/`, como módulo puro (`01 §2.2`) | Escrita dos veces |
| Es de dominio de una feature (cálculos, búsquedas, permisos del módulo) | `packages/<feature>/lib/` | `lib/` raíz |
| Toca Convex desde el frontend | El `api.ts` del paquete | Cualquier componente |
| Es de negocio y corre en el servidor | `convex/<dominio>.ts` | Un componente, un `lib/` cliente |
| Es un helper de servidor compartido entre dominios | `convex/lib/` | Duplicada en cada dominio |
| Es estado de UI de una feature | `packages/<feature>/store/` | Un componente con `useState` elevado a la fuerza |
| Es un hook transversal a toda la app | `hooks/` | `packages/*/store/` |
| Es UI genérica de terceros | `components/ui/` | Bifurcada en otra carpeta |
| Es UI propia del sistema de diseño | `components/harmony/` | `components/ui/` |
| Es UI de una sola feature | `packages/<feature>/components/` | `components/harmony/` |

Dos consecuencias que se vigilan explícitamente:

- **Fuga hacia arriba**: lógica específica de una feature que se cuela en un
  módulo de propósito general (`lib/`, `components/harmony/`, `convex/lib/`,
  `hooks/`). El módulo compartido pasa a conocer un caso que no le corresponde.
  La señal más fácil de ver: un archivo de `components/harmony/` que importa de
  `packages/` (`02 §5.1`).
- **Helper bespoke**: reimplementar algo que ya existe en la capa canónica porque
  no se buscó primero. Antes de escribir un helper, buscarlo. Los que ya
  existen:

  | Necesitas… | Ya existe |
  |---|---|
  | Unir clases | `cn` (`lib/utils.ts`) |
  | Agrupar una lista por una llave | `groupByKey` (`lib/group-by-key.ts`) |
  | Formatear una fecha | `lib/date-formats.ts` |
  | Un color de la paleta como clase o como hex | los mapas de `lib/custom-colors.ts` |
  | Limpiar un nombre escrito por una persona | `normalizeText` (`convex/lib/text.ts`) |
  | Comparar dos nombres sin mayúsculas ni tildes | `isSameName` (`convex/lib/text.ts`) |
  | El día de hoy en hora de Colombia | `todayInColombia` (`convex/lib/dates.ts`) |
  | Mostrar un error de Convex | `handleConvexErrorCallback` (`lib/convex-error-handler.ts`) |
  | Registrar un error del cliente | `logError` (`lib/logging.ts`) |
  | Hacer pulsable un contenedor | `lib/clickable-props.ts` |
  | Listado con búsqueda y orden en la URL | `useEntityList` (`components/harmony/entity-table.tsx`) |

### 2.7 Atomicidad de la orquestación

En Convex esto tiene un significado literal y no negociable: **una `mutation` es
una transacción; una `action` no lo es.** De ahí salen dos reglas:

- **No partas en dos mutations lo que cabe en una.** Dos escrituras separadas
  desde el cliente dejan una ventana en la que los datos están a medias, y no hay
  rollback que las una. Si dos documentos deben cambiar juntos o no cambiar,
  cambian dentro de la misma mutation. Casos propios: `projects.create` inserta
  el proyecto **y** la fila de su propietario; `projects.transfer` cambia las
  dos filas de `members` **y** `projects.userId`. Ninguna de las dos se puede
  quedar a medias, y por eso ninguna son dos llamadas. La entrada de auditoría
  va en la misma transacción que la escritura que registra (`01 §5.5`).
- **No serialices trabajo independiente.** Dentro de una mutation o action, dos
  operaciones que no dependen una de otra van con `Promise.all`. Un `await`
  secuencial sobre trabajo independiente es tiempo regalado.
  `projects.getDeletionImpact` es la referencia: cuenta las dos tablas en
  paralelo.

La excepción a la primera regla es la de `01 §6.1`: lo que **no cabe** en una
transacción —una cascada sin tope— se drena por lotes en una mutation interna
idempotente. Eso no es partir una escritura por comodidad; es el límite de la
transacción, y tiene su forma canónica.

---

## 3. Umbrales de tamaño

**La regla se aplica al cruce, no al estado.** Lo que se juzga es que un cambio
empuje un archivo *por encima* de un umbral que antes no cruzaba:

| Umbral | Qué significa | Qué se exige |
|---|---|---|
| **Cruzar 650 líneas** | El archivo entra entre los más grandes del repositorio | Justificarlo en el cambio, o extraer antes de añadir |
| **Cruzar 1.000 líneas** | Territorio de los archivos que nadie lee enteros | **Presunto bloqueo.** Se extrae, salvo excepción argumentada |

> [!NOTE]
> **Estos umbrales son provisionales.** Un umbral útil se pone donde el
> repositorio de verdad tiene su masa, y eso se mide: se toma la distribución de
> líneas de los archivos `.ts`/`.tsx` de `app/`, `components/`, `packages/`,
> `lib/`, `hooks/`, `convex/` y `e2e/` (sin `_generated/`), el primer umbral va
> en torno al percentil 95 y el segundo donde empiezan los archivos que ya son
> un problema.
>
> Harmony Build es todavía demasiado pequeño para que esa medida diga algo: 650
> y 1.000 son los valores con los que se calibró el proyecto del que deriva, y
> sirven de punto de partida. **Se recalibran cuando el proyecto tenga
> volumen** —como referencia, al cerrar el módulo de formatos—, y el cambio que
> los recalibre escribe aquí la distribución medida y la fecha.

### 3.1 Exenciones

No aplican los umbrales a archivos que son **declarativos por naturaleza**, donde
la longitud es inventario y no complejidad:

- `convex/schema.ts` — la forma de los datos.
- Catálogos de constantes y de mensajes: `lib/custom-colors.ts`,
  `convex/lib/error_messages.ts`, `convex/permissions.ts`, `convex/colors.ts`,
  `packages/roles/lib/permissions.ts`.
- El módulo de migraciones, cuando exista (`01 §7.2`): es histórico
  acumulativo, y cada migración es independiente.
- **Archivos generados**: su longitud no es una decisión de quien los tocó, y
  partirlos no los haría más legibles; no se leen, se regeneran.
- Archivos de test: su longitud es cobertura, no deuda.

Un archivo exento sigue sujeto al resto del documento: puede ser largo, no puede
ser espagueti. Y un archivo «mayormente declarativo» que mezcla configuración
con lógica **no** está exento: la mezcla es precisamente lo que lo hace crecer.

### 3.2 Estado de partida

**No hay deuda congelada.** Ningún archivo escrito para este proyecto cruza un
umbral.

Los primitivos de `components/ui/` llegan de shadcn con modificaciones propias,
y alguno —`sidebar.tsx`— nace ya por encima del primer umbral. No se juzga su
estado, sino el cruce: no se exige partirlo, pero un cambio que le añada líneas
netas se justifica, y lo que sea comportamiento propio se envuelve en
`components/harmony/` en vez de engordar el primitivo (`02 §5.1`).

Cuando un archivo cruce las 1.000 líneas con una excepción argumentada, se anota
aquí. A partir de ese momento **no crece más**: un cambio que le añada líneas
netas debe extraer al menos lo que añade.

---

## 4. Las preguntas de la revisión

Sobre cada cambio con sustancia, en este orden:

1. **¿Hay un replanteamiento que elimina la complejidad en vez de gestionarla?**
2. **¿El cambio mejora o empeora la cohesión local y el acoplamiento?**
3. **¿Los condicionales nuevos son la abstracción que falta, disfrazada de `if`?**
4. **¿Algún módulo cohesivo quedó más enredado o más lleno de estado?**
5. **¿La lógica está en su capa canónica (§2.6)?**
6. **¿Algún archivo cruzó un umbral de §3?**
7. **¿Hay opcionalidad o casts que ocultan el invariante real?** Un `?` o un `as`
   suele ser una verdad que el tipo no está diciendo. En el schema, además, la
   opcionalidad de una clave foránea decide qué pasa al borrar el padre
   (`01 §6.1`): no se pone por comodidad.
8. **¿Se reimplementó algo que ya existe?**
9. **¿Las escrituras son tan atómicas como permite la estructura (§2.7)?**
10. **¿Toda escritura que debía auditarse escribió su `log`, y toda tabla nueva
    que cuelga de `projectId` entró en la purga?** (ver `01 §5.5` y `01 §6.1`).
11. **¿Alguna lectura nueva crece con el histórico?** (ver `01 §6`).

---

## 5. Señales de alarma

Catálogo de lo que se marca sin discusión:

- Implementación enredada donde un replanteamiento la borraría.
- Refactor que mueve código sin reducir carga conceptual.
- Archivo que cruza un umbral de §3 por culpa del cambio.
- Condicional atornillado a un flujo que no es suyo — típicamente una pregunta
  por el rol, o por un módulo, dentro de código que no es de permisos ni de ese
  módulo (§2.3).
- Booleano de un solo uso, o modo nullable, que multiplica los caminos.
- Lógica de una feature filtrada a un módulo de propósito general.
- Genericidad "mágica" tapando una estructura que era simple.
- Wrapper fino, helper identidad o capa que solo reenvía.
- `any`, cast o parámetro opcional innecesario.
- Lógica duplicada donde tocaba extraer, o helper bespoke donde ya existía el
  canónico.
- Una regla escrita dos veces, una en el servidor y otra en el cliente.
- Manejo de un caso borde incrustado a media función.
- Refactor que pasa las pruebas pero deja el módulo menos modular.
- Rama "temporal" con toda la pinta de volverse permanente.
- Trabajo independiente ejecutado en serie (§2.7).
- Escritura partida en dos mutations donde cabía una (§2.7).
- Componente que llama a Convex sin pasar por el `api.ts` de su paquete
  (ver `01 §2`).
- Cascada de borrado que olvida una tabla hija, o tabla nueva que no entra en
  la purga de su proyecto.
- Endpoint que devuelve el documento entero de una tabla con secretos
  (`01 §5.8`).
- Dependencia instalada sin consumidor, o sin su fila en `00 §5.1`.

---

## 6. Remedios preferidos

Cuando se marca algo, se propone la salida. Por orden de ambición:

1. Eliminar la capa de indirección entera.
2. Replantear el modelo de estado para que los condicionales desaparezcan.
3. Mover la frontera de responsabilidad para que la feature encaje sin casos
   especiales.
4. Convertir el caso especial en el flujo por defecto.
5. Extraer una función pura.
6. Partir el archivo en módulos con un tema cada uno.
7. Aislar la lógica de la feature detrás de su abstracción.
8. Sustituir la cadena de condiciones por un modelo tipado o un despachador.
9. Separar orquestación de lógica de negocio.
10. Colapsar ramas duplicadas.
11. Borrar el wrapper que no aclara nada.
12. Usar el helper canónico que ya existía.
13. Hacer explícita la frontera de tipos.
14. Mover la lógica a su capa (§2.6).
15. Paralelizar el trabajo independiente.
16. Agrupar las escrituras relacionadas en una sola transacción.

---

## 7. Tono

Directo y serio sobre la calidad, sin ser desagradable. Un problema de
mantenibilidad se dice claro, no se envuelve en algodón. La crítica va al código,
nunca a quien lo escribió, y **siempre acompañada del camino de salida**: señalar
sin proponer no es revisar.

Ejemplos del registro correcto:

- *"Esto empuja el archivo por encima de 650 líneas. ¿Extraemos la validación de
  campos antes de añadir esto?"*
- *"Esto pregunta por el rol a mano en un flujo que ya tiene su gate.
  ¿Lo pasamos por `isProjectAdmin`?"*
- *"Funciona, pero deja el código de alrededor más enredado. Mantengamos el
  comportamiento y reestructuremos: si el estado se modela así, estas tres
  condiciones sobran."*

---

## 8. Prioridad y barra de aprobación

### 8.1 Orden de los hallazgos

1. Regresiones estructurales.
2. Simplificaciones grandes que se dejaron pasar.
3. Aumento de espagueti o de ramificación.
4. Problemas de frontera y de contrato de tipos.
5. Tamaño de archivo y descomposición.
6. Modularidad y calidad de abstracción.
7. Legibilidad.

**Si hay un hallazgo de los tres primeros niveles, no se reportan nits.** Una
observación de alta convicción vale más que quince cosméticas: el ruido entierra
la señal, y una lista de veinte puntos se ignora entera.

### 8.2 Barra de aprobación

Un cambio se aprueba cuando **todo** esto es cierto:

- [ ] No hay regresión estructural.
- [ ] No quedó sobre la mesa una simplificación evidente.
- [ ] Ningún archivo cruzó un umbral de §3 sin justificarlo.
- [ ] No se añadió espagueti por casos especiales.
- [ ] No hay abstracciones ocultas ni comportamiento mágico.
- [ ] No hay wrappers, casts ni opcionalidad de relleno.
- [ ] No hay fugas entre capas (§2.6).
- [ ] No se duplicó un helper que ya era canónico.
- [ ] No se creó deuda: ni de estilo (`03 §8`), ni de estructura (`02 §9`), ni
      de backend (`01 §10`). Si se descubrió, quedó anotada.

### 8.3 Cuándo se aplica

Este documento se ejerce sobre el **conjunto de cambios**, no archivo a archivo:
un cambio solo se puede juzgar contra lo que había antes. El momento natural es
antes de cerrar una feature, junto al gate de `04-reglas-testing` —el gate
comprueba que no está roto, este documento comprueba que no está torcido.

No se ejerce sobre cambios triviales (una constante, una cadena, un ajuste de
espaciado). Aplicarlo ahí solo genera ruido.
