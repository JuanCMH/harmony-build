# 03 · Reglas de Interfaz

> El estándar único para construir interfaces en Harmony Build, sobre
> **shadcn/ui + Radix + Tailwind CSS 4**. Referencias de espíritu: Linear
> (claridad estructural), Iron Man HUD (visualización táctica de datos), iOS
> Liquid Glass (profundidad óptica controlada), Bloomberg Terminal (datos
> primero).

> [!CAUTION]
> **Este documento es prescriptivo.** Nunca inventes variantes de layout,
> espaciado o padding no documentadas aquí. Si un caso no está cubierto, infiere
> la regla más cercana a partir de la retícula de 4px y del canon de superficies,
> y documéntala. **Cualquier cambio de UI obliga a leer este documento** — la
> consistencia visual del producto depende de seguirlo; un modal mal hecho crea
> una semana de deriva.

---

## 0. Resoluciones del canon (leer primero)

Estas reglas resuelven ambigüedades. **Ganan sobre cualquier interpretación
anterior y sobre lo que se encuentre escrito en el repositorio.**

### 0.1 Librería de iconos: **Lucide** (`lucide-react`)

Única librería de iconos del proyecto. El catálogo completo de entidades,
acciones y estados está en §5, y es **cerrado**: cada entidad tiene un icono
único que no se comparte con otra entidad. El tipo de una prop que recibe icono
es `LucideIcon`.

Excepción: los iconos de marca que Lucide no tiene (Google) viven como SVG en
`components/icons/`.

### 0.2 Radios: valores reales del token `--radius`

`app/globals.css` define `--radius: 0.625rem` (**10px**). Las clases rinden estos
valores reales:

| Clase | Valor real | Uso canónico |
|---|---|---|
| `rounded-xl` | **14px** | Contenedores de icono (`size-10`/`size-12`), tarjetas destacadas. |
| `rounded-lg` | **10px** | Superficie por defecto: contenedores de tabla, tarjetas, paneles. |
| `rounded-md` | **8px** | **Interactivos**: botones, inputs, selects, dropdowns, textareas. |
| `rounded-sm` | 6px | Chips y elementos densos dentro de un contenedor ya redondeado. |

> [!NOTE]
> **`rounded-2xl` no se usa.** No lo introduzcas: la superficie exterior de este
> producto es `rounded-lg`, no la tarjeta grande de 16px.

### 0.3 `backdrop-blur`: el estándar es **`backdrop-blur-lg`**

Para headers sticky y superficies translúcidas se usa `backdrop-blur-lg` sobre
`bg-background/40`. `backdrop-blur-sm` es el valor para overlays ligeros y
capas de atenuación sobre contenido. No se usan `backdrop-blur-xl` ni `-2xl`:
no forman parte del canon.

### 0.4 Fuente de títulos: **`font-space-grotesk`**

`app/globals.css` declara dos familias, `--font-poppins` y
`--font-space-grotesk`. Para un título con carácter técnico la clase es
**`font-space-grotesk`**, y no hay otra.

**`font-title` no existe.** No hay ninguna variable `--font-title`, así que esa
clase no aplica ninguna fuente: cae al Poppins global sin que nadie lo note. Es
el error que esta resolución previene.

### 0.5 Idioma de la interfaz

Todo texto visible va en **español**, con acentuación correcta. Los
identificadores y nombres de archivo van en inglés, y las rutas siguen la regla
de `00 §6`.

### 0.6 El esquema de superficies: **el chrome se hunde, el contenido se levanta**

Lo que más pesa visualmente es el trabajo, no la ventana ni el menú.

| Token | Tema oscuro | Tema claro | Qué es |
|---|---|---|---|
| `--sidebar` | `0.12` | `0.985` | El marco: ventana y menú lateral |
| `--background` | `0.19` | `1` | El panel donde se trabaja |
| `--card` | `0.225` | `1` | Un bloque levantado sobre el panel |

(Luminosidad `oklch`.) Tres niveles, en este orden y sin excepciones:
**marco < panel < bloque**.

De aquí sale una consecuencia que se olvida: en tema claro `--card` y
`--background` son **el mismo blanco**. Una tarjeta en claro no aporta superficie,
aporta un borde. Si lo que quieres es separar, sepáralo con aire.

### 0.7 La escala tipográfica llega a **`text-ui`** (13px)

Entre `text-xs` (12px, metadato) y `text-sm` (14px, cuerpo) está el tamaño con
el que están escritas las herramientas densas de escritorio: la etiqueta de una
entrada de menú, el dato secundario de una fila. A 14px pesa como el cuerpo; a
12px se lee como una nota al pie.

Está en `app/globals.css` junto a `text-2xs`, y los dos están registrados en
`tailwind-merge` (`lib/utils.ts`): sin eso, `cn()` los confunde con un color de
texto y descarta uno de los dos. Es el **último** escalón que se añade: dos
huecos en una escala son un sistema, cinco son cien tamaños a mano.

---

## 1. Tokens de diseño

### 1.1 Arquitectura de tokens en 3 niveles

Todo color, espaciado y tipografía se piensa en tres niveles. **Los componentes
consumen el nivel semántico**, salvo el caso explícito de la paleta de dominio
(§1.4).

| Nivel | Qué es | Ejemplos |
|---|---|---|
| **Primitivo** | Valor crudo, sin contexto. | `--color-h-purple: #6f00ff`, `--radius: 0.625rem`, `--color-cobalt: #0078d7` |
| **Semántico** | Rol/intención; mapea a un primitivo y permite dark mode. | `--background`, `--foreground`, `--card`, `--muted`, `--border`, `--primary`, `--destructive`, `--sidebar-*` |
| **Componente** | Combinaciones concretas en el JSX. | `bg-card border rounded-lg`, `bg-h-indigo/10 text-h-indigo` |

Los semánticos están definidos en `oklch` en `:root` y `.dark` de
`app/globals.css`. **No se editan sin motivo declarado**: son la base de shadcn y
tocarlos mueve toda la aplicación a la vez.

### 1.2 Espaciado (retícula estricta de 4px)

Todo obedece a una escala base de `4px` (1 unidad Tailwind = 0.25rem = 4px).

| Concepto | Clase | Valor | Uso obligatorio |
|---|---|---|---|
| **Contenido de listado** | `p-2` | 8px | Sección de vistas de tabla/listado a pantalla completa. |
| **Contenido de vista compuesta** | `p-4` | 16px | Sección de vistas de detalle, paneles y flujos. |
| **Header de página** | `h-12` + `p-2` | 48px alto | Barra sticky superior. Altura fija, ver §2.1. |
| **Overlays** | `p-4` | 16px | Header, contenido y footer de `HarmonyModal`. Ver §3. |
| **Tarjetas** | `p-4` | 16px | Padding interno de tarjetas y paneles. |
| **Tarjetas densas** | `p-2` / `p-3` | 8–12px | Filas de listado, ítems dentro de un sheet. |
| **Gaps entre bloques** | `space-y-4` / `gap-4` | 16px | Separación entre secciones de una vista. |
| **Contenido de vista de lectura** | `px-6 pt-8 pb-16` | 24 / 32 / 64px | Sección de ajustes y de cualquier pantalla que se lee en vez de rastrearse. Ver la nota de abajo. |
| **Bloques de una vista de lectura** | `space-y-10` | 40px | Entre la cabecera de un área y su contenido, y entre bloques hermanos. |
| **Gaps en formularios** | `space-y-4` | 16px | Separación entre campos de un formulario en modal. |
| **Secciones dentro de un panel** | `space-y-6` | 24px | Bloques con título propio dentro de un sheet o modal. |
| **Título de sección ↔ su contenido** | `space-y-3` | 12px | Dentro de cada una de esas secciones. |
| **Elementos contiguos** | `gap-2` | 8px | Icono ↔ texto, botones contiguos, chips. |

> [!CAUTION]
> Las pantallas de **administración y consulta** son densas: mucha información
> en pantalla es la propuesta, no un defecto. Por eso la retícula es más
> apretada que la de una aplicación de marketing. No "airees" una vista subiendo
> los paddings a `p-6` o `p-8`: rompe la densidad y desalinea la vista con sus
> hermanas.

> [!NOTE]
> **La excepción son las pantallas que se leen.** Un listado se rastrea con la
> vista y su densidad es el producto; un área de ajustes se lee una vez cada
> pocas semanas y su densidad no aporta nada. La cabecera de un área respira
> 40px antes del contenido, y el contenido no termina a ras del borde inferior.
> Fuera de las vistas de lectura, sigue mandando la densidad.
>
> **Y el formulario de captura es otra cosa.** Se diligencia en el teléfono, con
> el pulgar y con prisa: ahí la densidad no es la propuesta. Su espaciado se
> fija en el plan del módulo de formatos (§6.2), dentro de esta misma retícula
> de 4px.

### 1.3 Profundidad y bordes

La profundidad se logra con **bordes** y **translucidez**, no con sombras
pesadas.

| Capa | Regla |
|---|---|
| **Superficie de tarjeta / contenedor** | `border rounded-lg bg-card` |
| **Bloque de una vista de lectura** | `rounded-xl border bg-card` + `divide-y divide-border/60` |
| **Header sticky** | `border-b bg-background/40 backdrop-blur-lg` |
| **Separadores internos** | `<Separator className="opacity-40" />` |
| **Separadores entre filas** | `divide-y divide-border/60`, nunca un borde por fila |
| **Contenedor de icono** | `size-10 rounded-xl border` + par tonal (§1.4) |
| **Cabecera de `PanelCard`** | La tarjeta de un panel es densa: icono en `size-9` con glifo `size-4`, y título `text-sm font-medium tracking-tight`. Es lo que pinta `components/harmony/panel-card.tsx`; no se escribe a mano. |

**Cuándo una caja se gana su sitio.** Se encajona lo **finito** —los cuatro
métodos de notificación, los estados de un flujo— y se deja a sangre lo que
crece sin tope o lo que ya vive dentro de otra superficie. De ahí tres reglas:

1. Un bloque que se lee entero va en caja, con sus filas separadas por hairline
   **dentro** de ella. Veinte filas con borde propio son veinte cajas, no una
   lista.
2. **Ninguna caja decorativa dentro de otra.** El `SidebarInset` ya es una
   superficie: no se le añade un borde alrededor del contenido (§2.2), y un
   bloque no lleva dentro otro bloque que sólo repita su borde. Anidar sí vale
   cuando la caja interior **es una entidad** de una colección —una regla dentro
   del bloque de reglas—; no vale cuando sólo agrupa dos frases.
3. En tema claro, `--card` y `--background` son el mismo blanco (§0.6): ahí la
   caja es sólo un borde. Si el bloque no necesita agruparse, no lo encajones.

No se usan `shadow-lg`/`shadow-xl` en superficies de aplicación. Las sombras que
trae shadcn en sus primitivos (`shadow-sm` de popovers y dropdowns) se dejan
como vienen.

**La tarjeta de un panel es `PanelCard`**
(`components/harmony/panel-card.tsx`): cabecera con icono, título, descripción
y acciones, y `rounded-lg border bg-card` sin más. No se escribe a mano en cada
panel: cada copia acaba con su propio `gap` y su propia capitalización, y dos
paneles que se parecen dejan de ser iguales. **Una tarjeta no brilla, no sigue
al ratón y no se desenfoca**: ninguno de esos efectos es de la referencia, y en
tema claro sólo añaden ruido al borde.

### 1.4 Color

Hay **tres familias de color** y cada una tiene su terreno. Confundirlas es el
error de UI más frecuente.

**a) Semánticos de shadcn — el 90% de la interfaz.**
`background`, `foreground`, `card`, `muted`, `muted-foreground`, `border`,
`input`, `primary`, `secondary`, `accent`, `destructive`, `sidebar-*`. Todo lo
que sea estructura, texto o superficie usa estos. Son theme-aware por
construcción.

**b) Colores de marca — acento e identidad.**

| Token | Hex | Uso |
|---|---|---|
| `h-purple` | `#6F00FF` | Primario de marca. Splash, acentos de identidad. |
| `h-indigo` | `#818CF8` | Acento de producto. **Es el color por defecto del contenedor de icono de modales y sheets.** |
| `h-rose` | `#FF3F7F` | Alerta y énfasis de marca. |
| `h-yellow` | `#F1FA8C` | Informativo / pendiente. |
| `h-deep` / `h-deeper` / `h-deepest` | `#1A0040` / `#10002B` / `#0A0018` | **Superficie profunda de marca**: el degradado del panel de `/auth` y del splash. Siempre oscura, no depende del tema. No se usa como fondo de aplicación. |

Se usan en **par tonal**: `text-h-indigo` para el trazo, `bg-h-indigo/10` para el
contenedor tintado, `border-h-indigo/10` para el borde.

**c) Paleta de dominio (24 colores) — datos, no decoración.**
Definida como primitivos en `globals.css`, declarada como validator en
`convex/colors.ts` y mapeada en `lib/custom-colors.ts` (`customColors`,
`bgCustomColors`, `borderCustomColors`, `textCustomColors`,
`textOnCustomColors`, `hoverCustomColors`, `hexCustomColors`, tipo
`CustomColor`). Es la paleta que **el usuario elige**: hoy, los dos colores de
identidad del proyecto (`projects.primaryColor` y `secondaryColor`). Va de
`yellow` a `slate`, con variante `-600` para hover.

> [!CAUTION]
> Esta paleta se consume **siempre** por los mapas de `lib/custom-colors.ts`,
> nunca escribiendo la clase a mano ni interpolándola: Tailwind 4 necesita ver
> la clase completa en el código, y `bg-${color}` no genera nada. El color de un
> proyecto es un dato guardado en Convex, no una decisión del componente.

**Regla de oro**: el color **comunica estado, no decora**. Si un color aparece,
significa algo. Nunca `yellow` como acento bonito, nunca `green` como borde de
tarjeta neutra.

**Colores de estado** (fijos, no configurables por el usuario). Son los
genéricos, y los únicos vigentes:

| Estado | Familia | Icono |
|---|---|---|
| Éxito / correcto | green | `CheckCircle2` |
| Advertencia / pendiente de atención | yellow | `TriangleAlert` |
| Error / fallo | red | `OctagonAlert` |
| Información | sky | `Info` |
| Neutro / inactivo | gray | — |

Y los de la auditoría, que salen de `logs.type` y se traducen en un solo sitio,
`packages/logs/lib/log-icons.tsx`:

| Tipo de registro | Color | Icono |
|---|---|---|
| Crear | green-500 | `CirclePlus` |
| Editar | yellow-500 | `PencilLine` |
| Eliminar | red-500 | `Trash2` |
| Información | gray-500 | `Info` |

**Los estados del dominio.** Cada uno traduce un dato guardado, y la
traducción vive en un solo módulo: `packages/forms/lib/status.ts` para formatos
y respuestas, `packages/forms/lib/checklist-styles.ts` para la lista de chequeo.

| Estado | De qué dato sale | Color | Cómo se lee |
|---|---|---|---|
| Formato en borrador | `forms.status === "draft"` | gray | «Borrador» |
| Formato publicado | `forms.status === "published"` | green | «Publicado · v3» |
| Cambios sin publicar | `status === "published" && hasDraftChanges` | yellow | «Cambios sin publicar» (sustituye a la anterior) |
| Formato archivado | `forms.status === "archived"` | gray | «Archivado» |
| Respuesta enviada | `formResponses.status === "submitted"` | — | Sin insignia: es lo normal |
| Respuesta anulada | `formResponses.status === "voided"` | red | «Anulada», la fila atenuada y el motivo a la vista |
| Elemento inactivo | `formResponses.active === false` | gray | «Inactivo» |
| Ítem conforme · no conforme · no aplica | `ChecklistOption.meaning` | green · red · gray | Siempre con la letra o el nombre de la opción |
| Fecha vencida o que vence hoy · por vencer · vigente | Los días que faltan para una fecha de un elemento, en un resultado de vencimientos (`ExpirationRow.daysLeft`: negativo o cero · hasta 30 · más) | red · yellow · green | «Venció hace 3 días», «Vence hoy», «Vence en 12 días», «Vigente» (`packages/forms/components/result-tables.tsx`) |

Los estados van en `Badge variant="outline"` con el tinte de su familia
(`border-<color>-500/20 bg-<color>-500/10 text-<color>-700 dark:text-<color>-400`).
El único relleno sólido es el botón de la opción **elegida** en una lista de
chequeo: se pulsa con el pulgar al sol y tiene que verse de lejos.

**Una magnitud sin estado no se pinta con color de estado.** El color de estado
es de los registros que *tienen* un estado. Una cifra que sólo mide —cuántas
respuestas, cuántos miembros— va en el acento o en `foreground`; y dos lados de
una misma magnitud van en el mismo acento, **uno relleno y otro con contorno**,
no en verde y rojo.

Esta es la **única** familia donde la escala Tailwind cruda es legítima, porque
codifica una semántica cerrada: `green`, `yellow`, `red`, `sky` y `gray`. Fuera
de ella, `bg-blue-600` o `text-amber-400` en un componente es una violación: usa
el token semántico. Lo vigila `scripts/check-estilo.mjs` (§8.1).

**Escala de fuerza de contraseña** (medidor de `packages/auth`). Tiene tres
niveles y ninguno usa escala cruda:

| Nivel | Clase | Por qué |
|---|---|---|
| Débil (la política la rechaza) | `bg-destructive` | Es el token de "esto no se puede enviar". |
| Aceptable | `bg-h-yellow` | Informativo / pendiente: pasa, pero no es lo mejor. |
| Fuerte | `bg-h-indigo` | Acento de producto. |
| Segmento sin llenar | `bg-muted` | — |

El nivel se deriva **de la política**, nunca de la puntuación cruda: una
contraseña que el servidor rechazaría no puede leerse "Aceptable". Ver
`01 §9.2`.

**Regla de iconos**: NUNCA colorees un icono suelto con una clase de texto
arbitraria. El icono **hereda** el color de su contenedor tintado:

```tsx
<div className="flex shrink-0 items-center justify-center size-10 rounded-xl border bg-h-indigo/10 border-h-indigo/10 text-h-indigo">
  <HardHat className="size-5" />
</div>
```

La excepción son los iconos de estado de las tablas de arriba, cuyo color **es**
la información.

---

## 2. Anatomía de páginas

### 2.1 El shell de página (canon)

Toda página de `(harmony)/` usa el mismo esqueleto. **La barra superior es
idéntica en todas**: 48px de alto, sticky, translúcida.

```tsx
<div className="w-full h-full flex-1 flex flex-col">
  <header className="z-10 flex sticky top-0 h-12 shrink-0 p-2 items-center border-b bg-background/40 backdrop-blur-lg transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
    <div className="flex items-center gap-2 px-2 w-full">
      <SidebarTrigger />
      <ResponsiveBreadcrumb … />
      <div className="flex items-end gap-2 ml-auto">{/* acciones */}</div>
    </div>
  </header>

  <section className="flex-1 overflow-x-clip p-2 space-y-4">
    {/* contenido */}
  </section>
</div>
```

> [!IMPORTANT]
> **El contenido va en un `<section>`, no en un `<main>`.** `SidebarInset`
> (`components/ui/sidebar.tsx`) ya renderiza el `<main>` de la página; poner
> otro dentro deja **dos landmarks `main`** en el documento, que es HTML
> inválido y hace que un lector de pantalla anuncie dos contenidos principales.

En la práctica no se escribe a mano: se usa `PageShell` / `PageHeader` /
`PageMain` de `components/harmony/page-shell.tsx`, que son este canon y nada
más. Las clases viven en `page-shell.utils.ts` y una prueba las vigila
(`components/harmony/__tests__/page-shell.test.ts`).

Cinco variantes de contenido, y sólo cinco:

| Variante | Clases | Cuándo |
|---|---|---|
| **Listado** | `flex-1 overflow-x-clip p-2 space-y-4` | Tablas y listados a pantalla completa. Se desplaza la ventana, no la sección: con `overflow-y-auto` la sección sería un contenedor de scroll que nunca se mueve y anularía todo `sticky` de dentro. |
| **Compuesta** | `flex flex-col flex-1 min-h-0 gap-2 h-1 p-4` | Vistas con paneles internos que gestionan su propio scroll. |
| **Lectura** | `flex-1 overflow-y-auto mx-auto w-full max-w-3xl space-y-10 px-6 pt-8 pb-16` | Una pantalla que se lee, no que se rastrea: cada área de ajustes (§1.2, nota). `SettingsArea` la monta; una página no la escribe a mano. |
| **Editor** | `flex flex-col flex-1 min-h-0 h-1 p-0 lg:h-[calc(100svh-4rem)] lg:flex-none` | Un editor cuyos paneles dibujan sus propios bordes y padding: el constructor de formatos. Es la compuesta a sangre, con el alto de la ventana en escritorio: sin él, una columna larga desplaza el documento entero. |
| **Documento** | `flex-1 overflow-x-clip mx-auto w-full max-w-5xl space-y-6 px-4 pt-4 pb-24 sm:px-6 sm:pt-6` | Un formato para diligenciar, o una respuesta para leer. Nace en el teléfono (§6.2): 16px de margen y sitio abajo para la barra de envío. Se desplaza la ventana, no la sección: los títulos de bloque de una lista de chequeo son `sticky`. |


> [!NOTE]
> **Una variante con nombre la vigila la prueba; una anulación suelta no la
> vigila nadie.** Anular el padding de una variante por `className` es
> exactamente la variante inventada que esta sección prohíbe.
>
> Lo que `className` **sí** puede añadir a una variante: un ancho (`max-w-*`)
> o el `overflow-y-auto` que una compuesta necesita cuando su contenido crece.
> Lo que **no**: padding, `gap` ni `space-y`. Si una pantalla los necesita
> distintos, es una variante nueva: se añade a `page-shell.utils.ts`, a su
> prueba y a esta tabla, en el mismo cambio.

`h-1` en la variante compuesta no es un error: fuerza al flex a repartir la
altura en vez de crecer con el contenido. Es intencional y necesario para que el
scroll interno funcione.

### 2.2 Navegación y contexto

- **Breadcrumb obligatorio** en toda vista anidada, con `ResponsiveBreadcrumb`
  (`components/ui/responsive-breadcrumb.tsx`), que colapsa en dropdown en
  pantallas pequeñas.
- **`SidebarTrigger`** siempre primero en el header.
- Las acciones de la vista van a la derecha del header (`ml-auto`), nunca
  flotando sobre el contenido.
- **Cero redundancia visual**: no añadas bordes, sombras o esquinas redondeadas
  al contenedor que ya está dentro del `SidebarInset`. El `Sidebar` se monta
  siempre con `variant="inset"`: es el inset quien pone el margen, las esquinas
  y la sombra que separan el contenido del marco, y hacerlo otra vez por dentro
  es una caja dentro de otra (§1.3).
- **Un contexto que se abre, sustituye el sidebar; no añade uno**. El sidebar de
  ajustes reemplaza al del proyecto cuando la ruta lleva `/ajustes`. Nunca hay
  dos columnas de navegación. El sidebar sustituto lleva **siempre** una vuelta
  explícita en su cabecera.
- **La navegación no compite con el contenido.** Las entradas van en `text-ui` y
  en `text-muted-foreground`; sólo la activa sube a `text-foreground` con
  `font-medium`. El gris es lo que hace legible un menú de veinte entradas; el
  tamaño no.
- **Sin `uppercase` ni `tracking-wider` en las etiquetas de grupo.** Van en
  `text-xs text-muted-foreground/70`, capitalización normal. Las mayúsculas
  gritan y no aportan jerarquía que el color no dé.
- **Un icono por entrada sólo si distingue.** En una navegación de ajustes las
  entradas son texto: con un catálogo cerrado (§5), dos entradas vecinas
  acaban compartiendo glifo, y dos iconos iguales en la misma columna no
  distinguen nada.
- **Un `h1` por pantalla**, aunque no se vea. `PageHeader` lo emite solo, con la
  última miga como texto y `sr-only`: el nombre ya se lee en las migas y
  repetirlo a la vista sería redundancia. Sin él el documento no tiene
  encabezado y los `h2` de las secciones cuelgan de la nada. No escribas un
  `h1` propio en la página.

### 2.3 Listados

Hay **dos formas de listado**, y se eligen por lo que hace el usuario con ellas.

**a) Tabla de datos** (`EntityTable`): muchas columnas que se comparan entre sí.

- La tabla vive dentro de un contenedor `border rounded-lg bg-card`.
- Cabeceras de columna en `text-ui text-muted-foreground font-normal`,
  **capitalización normal**; ordenación con `ChevronUp`/`ChevronDown`/`ChevronsUpDown`.
  En mayúsculas pesan más que los datos que encabezan.
- El campo de búsqueda pasa por `useDebounce`; el modo de búsqueda (por nombre,
  por correo, etc.) es un `Select` a su derecha. Búsqueda y orden viven en la
  URL (`useEntityList`).
- Estado vacío: fila con `colSpan` completo, `text-center py-8 text-muted-foreground`
  y una frase en español que diga qué falta, no "sin resultados".
- Las acciones por fila van en un `DropdownMenu` con `MoreHorizontal`.

**b) Lista de colección** (`CollectionItem` dentro de `CatalogSection`): una
entidad por fila, que se abre —roles, miembros—.

- Dentro de una vista de lectura la fila **no lleva caja**: va en el bloque de
  §1.3, separada de sus hermanas por hairline. Fuera, conserva su
  `rounded-lg border bg-card`.
- **El icono de fila sólo sobrevive si lleva identidad**: un color de dominio,
  un avatar. El icono genérico repetido en veinte filas no distingue una de
  otra, y el título de la pantalla ya dijo de qué catálogo son todas.
- **Un dato no es una etiqueta de estado.** Un número o una fecha van como texto
  `tabular-nums` alineado a la derecha, no como `Badge`: siete pastillas grises
  idénticas no informan de nada.

**Una tabla dentro de una tarjeta lleva techo; una tabla que es la pantalla, no.**

| Dónde vive | Altura | Por qué |
|---|---|---|
| **Es la pantalla** (variante `listado`) | ninguna: crece y desplaza la página | no hay nada debajo a lo que tapar |
| **Es una tarjeta** (`PanelCard` dentro de una variante `compuesta`) | `max-h-*` y scroll dentro | si no, acapara la altura y empuja a sus hermanas fuera de la vista |

**`max-h`, nunca `h`.** Una altura fija reserva su hueco aunque sobren filas;
un máximo se encoge con pocas y desplaza con muchas.

> [!CAUTION]
> **El estiramiento no se ve, y es el defecto de verdad.** `PanelCard` es
> `h-full`, y dentro de un contenedor `space-y-*`, en una variante `compuesta`,
> llena un hueco que no es el de su contenido: el contenedor es un hijo flex que **se
> encoge** a la altura disponible en vez de crecer con lo que lleva dentro. La
> tarjeta reserva entonces una caja mucho mayor que sus filas y empuja a sus
> hermanas por debajo del área visible —están ahí, fuera de la pantalla, sin
> nada que lo insinúe—. Se corrige con `shrink-0` en el contenedor y `h-auto`
> en la tarjeta, además del `max-h`.
>
> El mismo síntoma en una retícula se corrige con `items-start`: sin él, cada
> columna se estira a la altura de la fila y toda tarjeta `h-full` la llena.

**El conteo va junto al título, nunca en la zona de acciones.** «Roles 7», el
número en `text-muted-foreground` y sin caja. La derecha de la cabecera es donde
vive lo accionable; un `Badge` ahí se disfraza de botón y parte en dos el grupo
de controles. Para quien no ve el número suelto, la frase completa viaja en
`sr-only`.

### 2.4 Estados de carga

- **Página completa**: `<PageLoading />` (`components/harmony/page-loading.tsx`).
- **Arranque de la app**: `SplashScreen`, montado por `HarmonyLayoutClient`.
- **Dentro de un botón**: `Loader2` con `animate-spin` y el botón `disabled`.
- **Dentro de una colección**: `CollectionLoading`, con la misma silueta que las
  filas que sustituye.
- El estado de carga usa **el mismo shell** que el estado cargado: nunca se
  renderiza suelto en medio de la página, porque produce un salto de retícula.

---

## 3. Overlays: modales, sheets y confirmaciones

### 3.0 Matriz de decisión (leer antes de crear cualquier overlay)

Solo existen **tres** overlays. Elegir es determinista, no estético:

| Pregunta | Componente |
|---|---|
| ¿Solo hay que confirmar o cancelar una acción? | `useConfirm` (§3.3) |
| ¿Es una tarea corta y finita de contenido fijo —crear/editar un registro, un import, un preview— que se completa y se cierra? | `HarmonyModal` (§3.1) |
| ¿Es contenido de longitud variable —colección administrable, detalle navegable, panel con scroll—? | `HarmonySheet` (§3.2) |

Reglas de desempate:

- Un formulario **corto** (≤ ~8 campos, sin scroll esperado) va en Modal; uno
  **largo** o con secciones va en Sheet.
- Si el usuario necesita **seguir viendo la página** mientras trabaja (comparar,
  copiar datos), va en Sheet; el Modal interrumpe y centra.
- CRUD maestro (listado + crear/editar): el **listado** vive en un Sheet de
  colección y el **formulario** en un Modal encima.
- **Nunca** `Dialog`/`Sheet` de shadcn a mano. Las únicas excepciones legítimas
  son los propios wrappers (`harmony-modal.tsx`, `harmony-sheet.tsx`) y
  `hooks/use-confirm.tsx`. Lo impide `biome.json` (§8.1). `DialogClose` y
  `SheetClose` sí son canónicos: se importan desde el wrapper, no desde
  `components/ui/`.

**Archivos y estado**: los modales viven en
`packages/<dominio>/components/modals/<nombre>-modal.tsx`; los sheets en
`packages/<dominio>/components/sheets/<nombre>-sheet.tsx`, con su átomo de
apertura en `store/`. **El sufijo del archivo declara el overlay raíz**: un
`*-sheet.tsx` no renderiza un `HarmonyModal` como raíz, ni viceversa.

### 3.1 HarmonyModal (contenido fijo)

Compound components obligatorios (`components/harmony/harmony-modal.tsx`):

```tsx
<HarmonyModal open={open} onOpenChange={setOpen} maxWidth="sm:max-w-lg">
  <HarmonyModalHeader
    icon={ShieldCheck}
    title="Crear rol"
    description="Define qué puede hacer en el proyecto quien tenga este rol."
  />
  <HarmonyModalContent>
    <form id="create-role-form" className="space-y-4" onSubmit={handleSubmit}>
      …
    </form>
  </HarmonyModalContent>
  <HarmonyModalFooter>
    <DialogClose asChild>
      <Button variant="outline">Cancelar</Button>
    </DialogClose>
    <Button type="submit" form="create-role-form" disabled={isPending}>
      Crear
    </Button>
  </HarmonyModalFooter>
</HarmonyModal>
```

**Escala de tamaños CERRADA** (valor de `maxWidth`):

| Tamaño | Clase | Ancho | Uso |
|---|---|---|---|
| Compacto | `sm:max-w-md` | 448px | 1–3 campos, acciones puntuales. |
| **Estándar (default)** | *(sin `maxWidth`)* | 512px | Formulario típico de creación/edición. Es el valor por defecto de `DialogContent`. |
| Amplio | `sm:max-w-2xl` | 672px | Dos columnas, tabs internas, imports con tabla de preview. |
| Colección | `sm:max-w-3xl` | 768px | Administración maestro-detalle dentro de un modal. |

Prohibidos los valores arbitrarios (`sm:max-w-[425px]`) y los intermedios
(`sm:max-w-xl`, `sm:max-w-4xl`). Si un modal "necesita" más de `3xl`, en realidad
es un Sheet o una página.

**Padding canónico**: header `p-4`, contenido `p-4`, footer `p-4`. Están en el
componente; el consumidor **no** pasa padding a `HarmonyModalContent` — sólo
`space-y-*` o grid.

**Estructura fija del header**: contenedor de icono `size-10 rounded-xl border`
con el par tonal `bg-h-indigo/10 border-h-indigo/10 text-h-indigo` por defecto,
título `text-base font-semibold tracking-tight`, descripción `text-sm`. El icono
lo elige el catálogo de §5 según la entidad. Se cambia `iconClassName` sólo
cuando el color comunica algo (destructivo, estado).

**Formularios dentro del modal**: el `<form>` va dentro de
`HarmonyModalContent` con un `id`, y el botón de envío en el footer lo referencia
con `form="<id>"`. Así el footer queda fijo y el contenido scrollea.

### 3.2 HarmonySheet (colecciones y contexto lateral)

Se despliega desde la derecha (`components/harmony/harmony-sheet.tsx`). En
pantalla estrecha ocupa todo el ancho; a partir de `sm` manda su `maxWidth`.

```tsx
<HarmonySheet open={open} onOpenChange={setOpen} maxWidth="sm:max-w-3xl">
  <HarmonySheetHeader icon={Users} title="Miembros del proyecto" />
  <HarmonySheetToolbar>
    <Input placeholder="Buscar…" />
  </HarmonySheetToolbar>
  <HarmonySheetContent>…</HarmonySheetContent>
  <HarmonySheetFooter>…</HarmonySheetFooter>   {/* opcional */}
</HarmonySheet>
```

**Escala de tamaños CERRADA**:

| Tamaño | Clase | Ancho | Uso |
|---|---|---|---|
| **Estándar (default)** | `sm:max-w-lg` | 512px | Detalle simple, panel de configuración, flujos de export. |
| Detalle | `sm:max-w-2xl` | 672px | Detalle pesado con secciones. |
| Colección | `sm:max-w-3xl` | 768px | Maestro-detalle: listado + toolbar. |

**Padding canónico** (ya en el componente): header `p-4`, toolbar `px-4 py-3`,
contenido `p-4` con `gap-2`, footer `p-4`. El contenido gestiona su propio
scroll (`flex-1 min-h-0 overflow-y-auto`). **El consumidor no pasa padding a
`HarmonySheetContent`**, igual que con `HarmonyModalContent`: sólo `gap-*`,
`space-y-*` o grid.

> [!NOTE]
> **Un valor por defecto que la mitad de los consumidores corrige no es un
> valor por defecto: es el defecto.** Si un panel necesita otro padding, el
> cambio se hace en el componente y para todos, no con un parche en quien lo
> usa.

**El aire entre bloques de un panel** es el de §1.2 (`space-y-6` entre
secciones, `space-y-3` entre el título de una sección y su contenido). Un bloque de
acciones —«Editar», un filtro— nunca va a ras del borde superior del contenido:
lo separa el `p-4` del propio contenedor.

**Pestañas**: `TabsTrigger` lleva `px-3` **y `min-w-fit`**. El relleno solo no
basta: las pestañas son `flex-1` (base 0) y se reparten la barra a partes
iguales, así que la de texto más largo paga la diferencia y queda con menos
aire del que dice su padding. `min-w-fit` conserva el reparto igualitario en las
barras a lo ancho y prohíbe encoger por debajo del texto. A cambio, `TabsList`
es `max-w-full overflow-x-auto`: si no caben —y en el teléfono no caben—, la
fila se desplaza y la pestaña activa se trae a la vista al montarse. No se
envuelve con `flex-wrap` (la barra tiene alto fijo) ni se parchea el padding en
el consumidor. Entre la barra de pestañas y su contenido, `mt-3`.

### 3.3 useConfirm (confirmaciones)

Toda confirmación sí/no usa `hooks/use-confirm.tsx`. **Nunca** montes un
`AlertDialog` ni un `Dialog` propio para confirmar.

```tsx
const [ConfirmDialog, confirm] = useConfirm({
  title: "Eliminar rol",
  message: "Quienes lo tengan quedarán sin rol. Esta acción no se puede deshacer.",
  type: "critical", // info (Info) | warning (TriangleAlert) | critical (OctagonAlert)
});

// …
if (!(await confirm())) return;
// … y renderizar <ConfirmDialog /> en el árbol
```

**Toda acción destructiva pasa por aquí**, sin excepción. Eliminar un rol,
expulsar a un miembro o eliminar un proyecto sin confirmación es un defecto, no
una optimización de flujo.

**Cuando lo que se borra arrastra otros datos, el mensaje lleva el recuento
real**, no una frase genérica (`01 §6.1`). `message` es un `string`: se compone
antes de llamar a `confirm`, con una función pura y probada
(`packages/projects/lib/deletion-impact-message.ts` es la referencia).

---

## 4. Tipografía

| Fuente | Variable | Clase | Uso |
|---|---|---|---|
| **Poppins** | `--font-poppins` | *(global por defecto)* | Cuerpo, lectura, UI. Aplicada en `<body>`. |
| **Space Grotesk** | `--font-space-grotesk` | `font-space-grotesk` | Títulos y subtítulos con carácter técnico; el nombre de la marca en `/auth` y en el splash. |

Son las **dos** familias de la interfaz. Una tercera —para una frase de marca,
para un uso decorativo— entra con un plan que diga dónde se usa, y se anota
aquí; nunca en cuerpo, etiquetas o UI.

Escala de uso frecuente:

| Rol | Clases |
|---|---|
| Título de una pantalla que se lee | `text-3xl font-medium tracking-tight` |
| Título de una vista de trabajo | vive en las migas del header; la pantalla no lo repite (§2.2) |
| Título de bloque dentro de una pantalla | `text-base font-medium tracking-tight` |
| Título de overlay | `text-base font-semibold tracking-tight` |
| Descripción de pantalla | `text-base leading-relaxed text-muted-foreground max-w-2xl` |
| Descripción / subtítulo | `text-sm text-muted-foreground` |
| Cuerpo | `text-sm` |
| **Interfaz densa** | `text-ui` (13px) — entradas de navegación, dato secundario de una fila, etiqueta de columna |
| Etiqueta de tabla | `text-ui text-muted-foreground font-normal` |
| Metadato / auxiliar | `text-xs text-muted-foreground` |
| **Lo que no cabe a 12px** | `text-2xs` (11px) — una insignia dentro de una entrada de menú, el rótulo de una columna de un selector. No es un tamaño de lectura. |
| Cifras y horas | añadir `tabular-nums` |

> **Los dos títulos no son el mismo título.** Una vista de trabajo —un listado,
> un panel— no lleva encabezado a la vista: su nombre está en las migas y
> repetirlo roba alto a los datos. Una pantalla que se lee —un área de ajustes—
> **sí** abre con su título a 30px y una descripción de una línea debajo: es lo
> que convierte una lista de campos en una pantalla.
>
> Ningún título de bloque va solo: si merece un encabezado, merece la línea que
> explica qué hay debajo.

> **La escala es cerrada.** `text-2xs` es el único paso por debajo de `text-xs`,
> y `text-ui` el único entre `text-xs` y `text-sm`. Un tamaño escrito a mano
> (`text-[10px]`) no compila el gate (§8.1): un escalón documentado es mejor
> que cien valores sueltos. `text-[8px]` ya no se lee.

> **Regla**: no añadas clases de `font-family` a elementos individuales salvo que
> estés aplicando deliberadamente `font-space-grotesk`. El Poppins global cubre
> todo lo demás. Y recuerda §0.4: **`font-title` no existe.**

---

## 5. Iconografía (Lucide)

### 5.1 Regla fundamental

> [!IMPORTANT]
> **Un icono se pinta cuando distingue.** El catálogo dice *cuál* usar para cada
> entidad; no dice que haya que ponerlo siempre. Tres sitios donde estorba:
> repetido en todas las filas de un catálogo (todas son la misma entidad), en la
> cabecera de una pantalla cuya navegación ya la identifica, y en una navegación
> de texto donde dos entidades comparten glifo. Donde el icono lleva **color de
> dominio o de estado** sí distingue, y se queda.

Cada entidad y funcionalidad tiene un icono **único**. No se comparten iconos
entre entidades distintas. Los iconos de acciones genéricas (`Plus`, `Trash2`, …)
sí se reutilizan libremente.

Tamaños: `size-4` en botones y filas densas, `size-5` dentro de contenedores
`size-10`, `size-6` dentro de contenedores `size-12`.

### 5.2 Entidades del dominio

| Entidad | Icono |
|---|---|
| Proyecto | `HardHat` |
| Persona | `User` |
| Grupo / equipo (los miembros) | `Users` |
| Invitar o agregar persona | `UserPlus` |
| Expulsar o remover persona | `UserMinus` |
| Rol | `ShieldCheck` |
| Registros (auditoría) | `History` |
| Ajustes | `Settings` |
| Formato | `ClipboardList` |
| Listado | `LibraryBig` |
| Respuesta | `ClipboardPen` |
| Elemento de un listado | `Box` |
| Categoría de formatos | `Tag` |
| Tablero | `LayoutDashboard` |

> **Por qué `HardHat` y no `Building2`**: el casco nombra la obra, que es lo que
> un proyecto es aquí; el edificio nombra el resultado o la empresa. `Building2`
> queda libre, y sin asignar, por si el dominio necesita más adelante una
> entidad «empresa» o «contratista».


### 5.3 Acciones

`Plus` crear · `Trash2` eliminar · `Pencil` editar · `Copy` copiar · `Download`
descargar · `Upload` subir · `Search` buscar · `RefreshCw` refrescar o renovar ·
`X` cerrar · `Share2` compartir · `ToggleRight`/`ToggleLeft`
activar/desactivar · `ArchiveRestore` reactivar lo archivado · `Pin`/`PinOff`
fijar · `GripVertical` arrastrar · `MoreHorizontal` más acciones · `Link`
enlace · `BadgeCheck` verificado · `SlidersHorizontal` filtro · `ScanEye`
previsualizar · `EyeOff` ocultar · `LogIn` entrar o unirse · `LogOut` salir ·
`FileSpreadsheet` exportar Excel · `Code` exportar JSON · `ListChecks`
seleccionar todo, y «Todo conforme» en un bloque de una lista de chequeo ·
`PenLine` diligenciar · `Rocket` publicar · `Undo2` descartar un borrador ·
`CopyPlus` duplicar · `Archive` archivar · `Ban` anular una respuesta ·
`Eraser` borrar una firma.

`Settings` no está en esta lista: es la entrada «Ajustes» de §5.2.

### 5.4 Navegación, estado y chrome

- **Navegación**: `House` (inicio del proyecto), `ChevronRight`/`Left`/`Down`/`Up`,
  `ArrowRight`/`Left`/`Up`/`Down`, `ChevronsUpDown`, `Menu`,
  `ArrowUpRight` (abrir algo en su pantalla de origen: un resultado del
  tablero en su formato; y, con `ArrowDownRight` y `Minus`, cuánto subió,
  bajó o se quedó igual una cifra frente al periodo anterior),
  `PencilRuler` (la pestaña «Diseño» de un formato: `Pencil` es editar un
  dato).
- **Estado**: `Loader2` (carga), `OctagonAlert` (error), `TriangleAlert`
  (advertencia), `Info`, `Check`, `CheckCircle2`, `XCircle`, `ShieldAlert`,
  `KeyRound`, `Lock`.
- **Chrome**: `Sun`/`Moon` (tema), `Monitor`/`Tablet`/`Smartphone`.
- **Comunicación**: `Mail`, `Phone`; Google como SVG de `components/icons/`.

### 5.5 Campos del constructor de formatos

Los dieciocho tipos de `convex/lib/form_types.ts`, con el glifo de
`packages/forms/lib/field-catalog.ts`, que es el único módulo donde viven. Es
una lista cerrada aparte de las entidades de §5.2, y dentro de ella **ningún
glifo se repite** (una prueba lo comprueba):

`Type` texto corto · `AlignLeft` texto largo · `AtSign` correo · `Phone`
teléfono · `Link` enlace · `Hash` número · `DollarSign` moneda · `Calendar`
fecha · `Clock` hora · `List` lista · `ListTodo` lista múltiple ·
`CheckSquare` casilla · `Paperclip` archivo · `Image` imagen · `Network`
relación · `ClipboardCheck` lista de chequeo · `Signature` firma · `Table`
tabla.

> La lista múltiple no es `ListChecks`, como en Harmony: aquí `ListChecks` es
> la acción «Todo conforme» y convive con ella en la misma pantalla.

**Marcas de comportamiento**, también de lista cerrada: `Split` condicional ·
`Sigma` calculado · `Lightbulb` valor sugerido.

**Recetas de un valor derivado**: `Percent` porcentaje de un campo · `Equal`
operación entre campos · `Timer` días hasta una fecha · `TimerReset` días desde
una fecha · `Cake` años desde una fecha · `CalendarPlus` fecha más un plazo ·
`Tally5` conteo de marcadas · `Combine` texto compuesto · `Variable` fórmula.

### 5.6 Tipos de resultado

Los nueve tipos de `convex/lib/result_types.ts`, con el glifo de
`packages/forms/lib/result-catalog.ts`, que es el único módulo donde viven. Es
la cabecera de la tarjeta de un resultado (`PanelCard`), en la pantalla del
formato y en el tablero:

`Gauge` indicador · `ChartLine` tendencia · `ChartColumn` distribución ·
`Table2` tabla · `ClipboardCheck` cumplimiento · `TriangleAlert` hallazgos
frecuentes · `Grid3x3` mapa de calor · `CalendarClock` vencimientos ·
`Calculator` cifra compuesta.

La meta de una cifra se dice con los glifos de estado de §5.4:
`CheckCircle2` cumple y `XCircle` no cumple, siempre con su texto.

`ChartLine` es además la entrada «Resultados» de un formato y su estado vacío.

> Dos de estos glifos ya tenían dueño: `ClipboardCheck` es la lista de chequeo
> (§5.5), de la que sale el cumplimiento, y `TriangleAlert` es el estado de
> advertencia (§5.4). Aquí nombran un tipo de resultado, no un campo ni un
> estado.

### 5.7 Añadir un icono al catálogo

Un icono nuevo se añade a este documento **en el mismo cambio** que lo introduce,
y sólo después de verificar que la entidad no tiene ya uno asignado. Reutilizar
el icono de otra entidad es un defecto de UI, no un atajo.

---

## 6. Formularios

Estas reglas valen para **todo** formulario de la aplicación: los de
administración, que existen hoy, y el de captura, cuando llegue.

- **Etiquetas en español**, con `Label` de shadcn asociado a su control por `id`.
  Cuando el `placeholder` ya nombra el campo sin ambigüedad, sigue siendo
  obligatorio que el control tenga nombre accesible: `aria-label` o `Label`
  visualmente oculto.
- **Validación nativa primero**: `required`, `minLength`, `maxLength`, `type`.
  Evita revalidar en JS lo que el navegador ya hace. El servidor valida
  siempre, haya validado o no el navegador (`01 §4.2`).
- **Estado de envío**: todos los controles y el botón se deshabilitan con
  `isPending` de `useMutate`.
- **Cierre limpio**: al cerrar, el modal resetea su estado local. Un formulario
  que reabre con los datos anteriores es un defecto.
- **Éxito**: `toast.success("<Entidad> creada correctamente")`.
  **Error**: `handleConvexErrorCallback(error)` — nunca `toast.error(err.message)`.
- **Controles de fecha y hora**: usa siempre los componentes de
  `components/harmony/` (`DatePicker`, `DateRangePicker`, `DayPicker`,
  `MonthPicker`, `TimePicker`), con locale español. Nunca un `<input type="date">`
  suelto.
- **Color**: `ColorSelect` (`components/harmony/color-select.tsx`), sobre la
  paleta de dominio de §1.4.
- **Listas de datos**: una lista cuyas opciones salen de datos y pueden crecer
  —miembros, roles— usa `SearchableSelect` (`components/harmony/`), que enseña
  un buscador a partir de ocho opciones y busca sin tildes; para elegir varias,
  `SearchableMultiSelect`. Las listas cortas y fijas —estado, tamaño, sí/no—
  siguen siendo `Select`. Toda lista desplegable tiene un tope de 20rem de
  alto.

### 6.1 Accesibilidad

- Todo control interactivo debe **poder anunciarse**: texto visible,
  `aria-label`, o `Label` asociado. Un botón cuyo único contenido es un icono
  necesita `aria-label` o un `Hint` con texto.
- **Área de toque ≥ 24px** en cualquier acción de fila o chip. En el teléfono no
  hay una app aparte: **el teléfono es esta misma web** (`02 §7`). Es el mínimo
  de toda la aplicación; el formulario de captura puede exigir más (§6.2).
- **Foco visible**: no elimines el anillo de foco. El token `--ring` existe para
  eso y `outline-ring/50` está aplicado globalmente. Un contenedor que se
  desplaza recorta lo que sobresale: si el anillo sale cortado, se le da sitio
  (padding con margen negativo) o se pinta por dentro (`ring-inset`), pero no se
  quita.
- **Contraste**: el texto sobre color de marca no siempre pasa. `h-yellow`
  (`#F1FA8C`) y `h-indigo` (`#818CF8`) son claros: sobre ellos el texto va
  oscuro, y como color de texto sólo funcionan sobre fondo oscuro o contenedor
  tintado al 10%. Sobre la paleta de dominio, el color del texto lo calcula
  `textOnCustomColors`, no quien escribe el componente.
- **Los dos temas cuentan**: toda pantalla se revisa en claro y oscuro antes de
  darse por terminada. Y en la obra, a pleno sol, el tema claro es el que se
  usa.
- **El color nunca es el único portador de información**: un estado en color
  lleva además icono o texto.
- **Un contenedor pulsable es un botón de verdad**, o lleva las propiedades de
  `lib/clickable-props.ts`. Una tarjeta con `onClick` y nada más no se alcanza
  con el teclado.

### 6.2 El formulario de captura

Quien diligencia lo hace en el teléfono, en la obra, con prisa y a veces al
sol (`00 §2.3`, `02 §7.1`). De ahí estas reglas, que implementan
`packages/forms/components/form-form.tsx` y los controles de campo:

- **Se decide a 390px de ancho.** Una columna en teléfono, seis en tableta y
  doce en escritorio (`packages/forms/lib/grid.ts`: pequeño 3, medio 6, grande
  9, entero 12). En tableta sólo hay dos anchos: el pequeño va a media fila y
  los demás a fila entera. La lista de chequeo, la tabla y el texto largo
  ocupan siempre la fila entera.
- **Las filas se completan, en escritorio y en tableta.** Los tamaños de los
  campos seguidos de una sección suman doce, y los pequeños van de dos en dos
  para que la misma fila cierre en tableta. Un campo condicional va a fila
  entera: aparece y desaparece sin descuadrar a los demás. **La firma va a fila
  entera**, y un campo de firma nuevo nace así: a media fila dejaba la otra
  mitad vacía al pie del formato. Lo vigila una prueba de la biblioteca de
  formatos.
- **Los controles de una fila arrancan a la misma altura.** Cada campo son dos
  pistas —la etiqueta con su ayuda, y el control— que comparte con sus vecinos
  (`FIELD_CELL`, `subgrid`): una ayuda o una etiqueta en dos líneas no empuja
  su control por debajo del de al lado.
- **Controles de 40px en teléfono** (`h-10`) y 36px desde `sm`. Los campos de
  texto van a 16px en teléfono: por debajo, iOS amplía la página al enfocar.
- **Etiqueta encima**, ayuda debajo de la etiqueta, asterisco de obligatorio en
  `text-destructive` con su texto accesible.
- **Secciones**: pestañas desde `lg`; en teléfono y tableta, apiladas con su
  título, porque la hoja se recorre hacia abajo.
- **La lista de chequeo** es una fila por ítem con la escala en botones del
  ancho del pulgar; el título de cada bloque se queda arriba al desplazar;
  «Todo conforme» por bloque, sin pisar lo ya marcado; la observación aparece
  sola al marcar no conforme.
- **Barra de envío pegada abajo**, con lo que falta a la izquierda («Faltan 3
  obligatorios»). Al enviar con faltantes, el foco va al primero y se señalan
  todos.
- **Borrador en el dispositivo**: lo escrito se guarda solo mientras no se
  envía, y al volver se ofrece recuperarlo. Los archivos y las firmas no caben
  en el borrador, y la franja lo dice.
- **Ningún dato escrito se pierde en silencio.** Si algo impide guardar, se
  dice, y lo escrito sigue en pantalla.
- **Una respuesta leída es texto, no controles deshabilitados**: pares
  etiqueta–valor, los hallazgos de una lista de chequeo primero.
- **Todo lo anterior de §6 y §6.1 le aplica**, y los tres overlays de §3 siguen
  siendo los únicos.

---

## 7. Anti-patrones (lo que NUNCA debe suceder)

- ❌ Montar `Dialog` o `Sheet` de shadcn directamente en vez de `HarmonyModal` /
  `HarmonySheet`.
- ❌ Confirmar una acción destructiva sin `useConfirm`.
- ❌ Usar `rounded-2xl` (§0.2) o inventar un radio nuevo.
- ❌ Escribir `font-title` (§0.4).
- ❌ Colorear un icono suelto en vez de tintar su contenedor.
- ❌ Usar la escala Tailwind cruda fuera de los colores de estado de §1.4.
- ❌ Escribir a mano, o interpolar, una clase de la paleta de dominio en vez de
  usar los mapas de `lib/custom-colors.ts`.
- ❌ Subir el padding de una vista para "airearla".
- ❌ Pasar padding a `HarmonyModalContent` o `HarmonySheetContent`.
- ❌ Un `maxWidth` fuera de la escala cerrada de §3.1 / §3.2.
- ❌ Un tamaño tipográfico escrito a mano (`text-[10px]`).
- ❌ Texto de interfaz en inglés, o en español sin acentos.
- ❌ `toast.error(error.message)` en vez de `handleConvexErrorCallback`.
- ❌ Un botón de icono sin nombre accesible.
- ❌ Un estado de carga renderizado fuera del shell de la página.
- ❌ `tabIndex={-1}` en un control que el usuario debe poder accionar. Sacarlo del
  orden de tabulación no lo hace "menos ruidoso": lo hace inalcanzable sin ratón.
- ❌ Quitar el anillo de foco porque sale recortado (§6.1).
- ❌ Un contador —o cualquier dato— dentro de la zona de acciones de una cabecera
  (§2.3).
- ❌ Una caja dentro de otra caja, y en particular un borde alrededor del
  contenido que ya está en el `SidebarInset` (§1.3, §2.2).
- ❌ Un borde por fila en una lista que vive dentro de un bloque: las filas se
  separan con hairline (§2.3).
- ❌ `uppercase` + `tracking-wider` en etiquetas de grupo o de columna (§2.2, §2.3).
- ❌ Un `Badge` para un valor numérico o monetario. Los badges son estado.
- ❌ Una segunda navegación vertical junto al sidebar de la aplicación: el
  contexto que se abre **sustituye** (§2.2).
- ❌ El mismo icono repetido en todas las filas de un catálogo (§5.1).
- ❌ Una pantalla de captura diseñada en escritorio y «adaptada» después al
  teléfono (§6.2).

### 7.1 Checklist de pre-entrega (UI)

```
□ ¿Usé HarmonyModal / HarmonySheet / useConfirm, y el correcto según §3.0?
□ ¿El maxWidth está en la escala cerrada?
□ ¿El icono sale del catálogo de §5 y es único para esa entidad?
□ ¿Los colores son semánticos, de marca en par tonal, o de estado?
□ ¿El shell de página respeta §2.1, y el `Sidebar` va con `variant="inset"`?
□ ¿El contenido está sin cajas de más: ninguna dentro del inset, ninguna anidada?
□ ¿El conteo está junto al título y no entre los controles?
□ ¿Los iconos que quedan distinguen algo, o son el mismo repetido?
□ ¿Reviso la pantalla en tema claro y en tema oscuro?
□ ¿La revisé a 390px de ancho, y es ése el tamaño del que partí si es captura?
□ ¿Todo control tiene nombre accesible y el foco sigue siendo visible?
□ ¿Los textos están en español y con acentos correctos?
□ ¿El estado de carga y el vacío están resueltos, no improvisados?
□ ¿Las acciones destructivas confirman, con su recuento si arrastran datos?
```

### 7.2 La excepción de los formularios de `/auth`

Los formularios de autenticación **no** usan `handleConvexErrorCallback`: usan
mensajes fijos y deliberadamente vagos. No es deuda, es la regla para este caso:

| Situación | Mensaje | Por qué |
|---|---|---|
| Credenciales incorrectas | *"Correo o contraseña incorrectos"* | Distinguir "no existe" de "contraseña mala" convierte el formulario en un oráculo de qué correos tienen cuenta. |
| Solicitud de código de restablecimiento | *"Si el correo está registrado, recibirás un código"* — siempre, exista o no | Mismo motivo. El flujo avanza al paso del código en ambos casos. |
| Registro fallido en servidor | *"No se pudo crear la cuenta. Verifica los datos"* | Evita filtrar si el correo ya estaba registrado. |

La política de contraseñas **sí** se explica entera y literal (`authErrors.weakPassword`):
ahí ocultar información sólo estorba, no protege a nadie.

> [!CAUTION]
> El precio de la vaguedad es que **un fallo de configuración tampoco se ve**:
> sin la clave de Resend en el deployment, el restablecimiento responde lo
> mismo y el correo no llega nunca (`01 §9`). Al montar un deployment nuevo se
> comprueba recibiendo un código de verdad, no mirando el formulario.

Fuera de `/auth`, la regla general sigue intacta: `handleConvexErrorCallback`.

---

## 8. Estado de cumplimiento (deuda actual)

**Ninguna.** El proyecto nace sin deuda de interfaz: `scripts/estilo-deuda.json`
está vacío y `biome.json` no lleva ninguna lista de archivos congelados.

La regla que gobierna esta sección, para el día en que deje de estar vacía:
**no se crea deuda nueva; la existente se salda al tocar el archivo.** Una
deuda que se descubra se anota aquí con su alcance y la regla que incumple —no
se deja sin escribir—, y sale de la lista en el cambio que la salda.

### 8.1 El trinquete

Estas tres reglas **no dependen de que alguien se acuerde**. `bun run check`
las comprueba:

| Regla | Quién la vigila | Deuda congelada |
|---|---|---|
| Overlay crudo en vez de wrapper Harmony (§3.0) | `noRestrictedImports` en `biome.json` | **0** — es error duro |
| Tamaño tipográfico a mano (§4) | `scripts/check-estilo.mjs` | **0** — es error duro |
| Escala de color cruda fuera de los estados (§1.4) | `scripts/check-estilo.mjs` | **0** — `scripts/estilo-deuda.json` vacío |

Un archivo nuevo que incumpla **no compila el gate**, y el mensaje dice qué usar
en su lugar.

El mecanismo de congelación existe —`estilo-deuda.json` admite ocurrencias por
archivo, y `biome.json` admite excepciones por ruta— pero **usarlo es una
decisión que se justifica**, no una salida cómoda: congelar deuda en un
proyecto que nació sin ella significa que algo se hizo mal. Si algún día se
congela algo, el número sólo puede bajar: cuando se salda, el script avisa para
que se actualice la lista, y así el trinquete no retrocede.

> Esto existe porque la promesa no basta. Una regla que nadie ejecuta es una
> intención: en el proyecto del que éste deriva, «no se crea deuda nueva»
> estuvo escrito durante meses mientras se acumulaban más de cien tamaños
> tipográficos a mano.
