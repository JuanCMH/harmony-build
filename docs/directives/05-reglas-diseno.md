# 05 · Reglas de Diseño

> El **proceso** por el que una pantalla se decide antes de escribirse. Mientras
> `03-reglas-interfaz` fija *cómo se ve* lo que se construye, este documento fija
> *qué se construye y cuándo se puede empezar*.

> [!CAUTION]
> **Este documento es prescriptivo.** Un cambio de estructura de interfaz que
> llega a código sin haber pasado por aquí es deuda desde el primer commit: el
> problema de diseño se descubre cuando ya hay schema, permisos, migraciones y
> tests encima. La regla existe porque rehacer un plan cuesta minutos y rehacer
> una feature cuesta días.

---

## 1. Por qué existe este documento

Harmony Build tiene reglas de interfaz sólidas (`03`), y las decisiones que no
son de interfaz —qué se construye, para quién, qué se descartó— necesitan un
sitio que no sea la cabeza de quien las tomó. Ese sitio es `docs/plans/`.

El proyecto empieza así: el módulo de formatos, que es la razón de ser del
producto, se diseña en `docs/plans/` **antes** de escribirse. **El plan no es
burocracia: es el único momento en que cambiar de opinión sale barato.**

---

## 2. Cuándo se exige plan previo

La regla se activa por **decisiones de estructura**, no por tamaño del cambio.

### 2.1 Exige plan

- Pantalla nueva, o vista nueva dentro de un módulo existente.
- Rediseño de una pantalla existente: cambia qué información se muestra, cómo se
  agrupa o qué acciones ofrece.
- Feature que necesita un componente que **no existe** en `components/ui` ni en
  `components/harmony`.
- Cambio en un flujo de varios pasos (crear un proyecto y unirse a él, diseñar
  un formato, diligenciarlo).
- Cambio que necesita un **campo o tabla nuevos en el schema**, una **llave de
  permiso nueva**, o que altera el alcance de datos de una vista.
- Una **superficie sin sesión** —una vista pública, un enlace compartible, una
  API—: hoy no hay ninguna (`01 §5.7`).
- Gráfica o exportación nueva, o cambio en el cálculo que la alimenta.
- Una **dependencia nueva** que abre una categoría en `00 §5.1`.

### 2.2 No exige plan

- Copy, etiquetas, mensajes de error.
- Ajustes de espaciado, color o tipografía que ya están resueltos en `03`.
- Corrección de bugs, incluidos los visuales.
- Añadir una columna a una tabla existente o un campo a un formulario existente,
  cuando el patrón ya está establecido y el dato ya existe en el schema.
- Saneamiento de la deuda documentada en `03 §8`, `02 §9` o `01 §10`.

### 2.3 La prueba de decisión

> **Si tienes que pensar dónde va algo, diséñalo primero.**
> Si la respuesta ya está en `03`, impleméntalo.

---

## 3. El flujo

### Paso 1 · Diseñar

Se escribe el documento de diseño en `docs/plans/YYYY-MM-DD-<tema>-design.md`,
con los bloques de §3.1. Describe **la decisión**, no el código.

### Paso 2 · Revisar

Se comenta e itera sobre el documento. Este es el único paso donde el cambio es
barato; alargarlo aquí es más rentable que acortarlo.

### Paso 3 · Detectar huecos

Si el diseño necesita un componente que no existe, **primero se decide el
componente** y entra en el plan como pieza propia; luego se usa. La librería
crece por necesidad real, nunca por especulación.

> [!CAUTION]
> Antes de diseñar un componente nuevo, verifica que el hueco es real: revisa
> `components/ui`, `components/harmony` y los `packages/*/components/` afines. Un
> componente duplicado con otro nombre es peor que no tenerlo.

Lo mismo vale para lo que las directrices dejan **pendiente del plan**: los
colores de estado del dominio (`03 §1.4`), los iconos de las entidades nuevas y
de los tipos de campo (`03 §5.2`, `03 §5.5`), las reglas del formulario de
captura (`03 §6.2`) y las llaves de permiso (`01 §5.3`). El plan que las
necesite las **decide**, y el cambio que lo implementa las escribe en la
directriz correspondiente.

### Paso 4 · Planificar la implementación

El documento de diseño aprobado se traduce a
`docs/plans/YYYY-MM-DD-<tema>-implementation.md`: tareas ordenadas, con los
archivos que cada una crea o modifica. Hace explícito el orden de dependencia
—contrato de datos primero, backend después, UI al final.

### Paso 5 · Implementar

Con el plan como referencia y `03-reglas-interfaz` como ley. El checklist de
pre-entrega de `03 §7.1` aplica íntegro, y el de `06 §8.2` al cerrar.

### Paso 6 · Cerrar el plan

Al terminar, el plan se marca como implementado con la fecha. **Un plan sin
estado es un plan que miente**: en seis meses nadie sabe si describe la app o una
idea que se descartó.

Cerrar el plan incluye **llevar a las directrices lo que el plan convirtió en
regla**. Un plan implementado describe una decisión pasada; si de ella salió una
norma que el siguiente cambio debe respetar, vive en `docs/directives/`, no en
el plan.

### 3.1 Qué lleva un documento de diseño

Cinco bloques, **siempre**. Un diseño sin intención declarada convierte la
revisión en discusión de gustos.

| Bloque | Contenido |
|---|---|
| **Objetivo** | Qué se quiere lograr, en una frase. |
| **Problema** | Qué le pasa hoy a quien trabaja en la obra o la administra, en términos de su trabajo — no de la interfaz. |
| **Dirección aprobada** | Qué se resolvió y **por qué se descartó la alternativa obvia**. Es lo que evita rediscutir lo mismo en tres meses. |
| **Reglas de acceso** | Qué ve y qué puede hacer cada nivel: propietario, administrador, miembro con rol y miembro sin rol. Y con qué llave. Es donde más caro sale equivocarse. |
| **Preguntas abiertas** | Lo que el diseño no resuelve. Nombrarlas dirige la revisión a donde hace falta. |

Y un sexto cuando la pantalla la usa quien diligencia: **desde qué tamaño se
diseñó**. Una pantalla de captura se decide a 390px (`02 §7.1`); si el plan no
lo dice, se entiende que se diseñó para escritorio, y eso en una pantalla de
captura es un defecto del plan.

> [!CAUTION]
> Si el diseño dibuja un dato que **el schema no puede almacenar**, la pregunta
> abierta es obligatoria y bloquea la implementación. Un diseño que asume campos
> inexistentes no es una propuesta: es una promesa que el backend no puede
> cumplir sin tocar el schema —y, en cuanto haya datos reales, sin las tres
> pasadas de migración de `01 §7.1`—.

### 3.2 Los tres estados

Todo plan declara su estado en la cabecera, junto a la fecha:

| Estado | Significa | ¿Se puede implementar? |
|---|---|---|
| `propuesta` | Publicado y en discusión. Puede cambiar por completo. | **No** |
| `aprobado` | Revisado y cerrado. Es la referencia para el código. | Sí |
| `implementado` | Ya vive en la app. Se conserva como registro histórico. | Ya está |

A diferencia de una maqueta, un plan **no se borra al implementarse**: su valor
posterior es explicar por qué el código es como es. Lo que sí caduca es su
autoridad — un plan `implementado` describe una decisión pasada, no una regla
vigente. **La regla vigente vive en estas directrices.**

---

## 4. Convenciones de `docs/plans/`

- **Nombre**: `YYYY-MM-DD-<tema>-design.md` y
  `YYYY-MM-DD-<tema>-implementation.md`. La fecha es la de creación y no se
  actualiza.
- **Idioma**: español, con acentuación correcta, en coherencia con el resto de
  la documentación del proyecto.
- **Un tema por par de archivos.** Si un plan crece hasta abarcar dos rediseños,
  se parte.
- **Sin capturas ni maquetas binarias**: el plan describe estructura y decisión.
  Lo visual lo gobierna `03`.
- Los planes **no son normativos**. Si un plan y una directriz se contradicen,
  gana la directriz, y el plan se corrige o se marca como superado.
- Un plan **cita las directrices por número de sección** (`01 §6.1`). Quien
  renumere una directriz revisa las citas de los planes que no estén
  `implementado`.

---

## 5. Anti-patrones

- ❌ Implementar una pantalla nueva sin plan aprobado.
- ❌ Diseñar un componente nuevo sin haber verificado que el hueco es real.
- ❌ Dibujar datos que el schema no puede almacenar, sin declararlo como pregunta
  abierta.
- ❌ Dejar un plan sin estado, o con el estado desactualizado.
- ❌ Omitir las reglas de acceso: aquí, "quién ve qué" es diseño, no un detalle
  de implementación.
- ❌ Tratar un plan como fuente de verdad por encima de `03` o del código.
- ❌ Escribir el plan después de implementar para justificar lo hecho.
- ❌ Rellenar en una directriz lo que está marcado como pendiente de un plan,
  sin que ese plan esté aprobado.
- ❌ Diseñar en escritorio una pantalla que se va a usar en el teléfono.

### 5.1 Checklist de pre-entrega (diseño)

```
□ ¿El cambio es de estructura?          → Exige plan (§2.1).
□ ¿El plan está en estado aprobado?     → Si no, no se implementa.
□ ¿Tiene los cinco bloques (§3.1)?
□ ¿Están resueltas las preguntas abiertas?
□ ¿Las reglas de acceso cubren propietario, administrador, miembro con rol y
  miembro sin rol?
□ ¿Dice desde qué tamaño de pantalla se diseñó?
□ ¿El diseño usa sólo componentes que existen, o el hueco está justificado?
□ ¿Necesita schema nuevo? → Tabla nueva: entra en la purga (01 §6.1).
                            Campo sobre datos vivos: plan de migración (01 §7.1).
□ ¿Necesita una llave nueva? → 01 §5.3.
□ ¿Se llevó a las directrices lo que el plan convirtió en regla?
□ ¿Se marcó el plan como implementado al terminar?
```

---

## 6. Relación con las demás directivas

| Documento | Qué aporta a este flujo |
|---|---|
| **`00 §2.3`** | Los ocho principios de UX y los dos contextos de uso. Un diseño que los contradice se rechaza en revisión, aunque se vea bien. |
| **`00 §3`** | El modelo de dominio. Un diseño cuyos datos no cuelgan de un proyecto, o que los cruza entre proyectos, está mal planteado, no mal dibujado. |
| **`00 §5`** | Las librerías. Un diseño que pide una dependencia nueva lo dice, y dice cuál es la canónica. |
| **`03`** | La ley visual completa. En conflicto, manda `03`. |
| **`03 §7.1`** | El checklist de UI, que aplica íntegro al implementar. |
| **`01 §5`** | El modelo de permisos: las reglas de acceso del plan deben poder expresarse con las llaves existentes, o el plan incluye la llave nueva. |
| **`01 §6`** | El coste de las lecturas y las cascadas. Un diseño cuya pantalla necesita «todo el histórico» no está terminado. |
| **`01 §7`** | Migraciones de schema. Si el plan necesita un campo que no existe, ahí está el costo real de la pregunta abierta. |
| **`02 §7.1`** | Desde qué ancho se diseña cada clase de pantalla. |
| **`06`** | La vara estructural al cerrar. Un plan que obliga a inflar un archivo que ya es grande (`06 §3`) debe decir cómo lo evita. |

> [!NOTE]
> **Orden de autoridad** (ver `00 §1.1`): para *cómo se ve*, manda `03`. Para
> *cuándo se puede empezar a construir*, manda este documento. Si un plan
> aprobado contradice `03`, gana `03` — y el plan se corrige antes de
> implementarse, no después.
