# 02 · Reglas de Next.js y estructura del código

> Cómo se organiza la aplicación: carpetas de `app/`, `components/`, `packages/`,
> `lib/` y `hooks/`; la decisión arquitectónica **client-first** frente a Convex;
> las reglas de rendimiento de React/Next.js que imponemos; y la estrategia móvil
> (web responsive + PWA), con sus dos puntos de partida: el teléfono para quien
> diligencia y el escritorio para quien administra.

---

## 1. Rendimiento React/Next.js (reglas que imponemos)

Resumen de alto impacto por categoría. Aplícalas al escribir o refactorizar
componentes; el detalle está en <https://nextjs.org/docs> y <https://react.dev>.

| Prioridad | Categoría | Reglas núcleo |
|---|---|---|
| 🔴 Crítica | **Eliminar waterfalls** | `Promise.all()` para operaciones independientes; mover `await` a la rama donde se usa; empezar promesas temprano y esperar tarde. |
| 🔴 Crítica | **Tamaño de bundle** | Imports directos, **no barrels**; `next/dynamic` para componentes pesados (cuando lleguen: gráficas, exportación, el constructor de formatos); cargar módulos solo cuando la feature se activa. El teléfono en la obra es quien paga cada kilobyte. |
| 🟠 Alta | **Consultas** | No pedir el histórico completo para pintar un período. Acotar por intervalo dentro del índice (ver `01 §6`). |
| 🟡 Media | **Re-render** | Derivar estado en render (no en efectos); `useMemo` para filtrados y agrupaciones de listados densos; `useState` con inicializador perezoso; `startTransition` para updates no urgentes; refs para valores transitorios frecuentes. |
| 🟡 Media | **Entradas de búsqueda** | Todo campo de búsqueda que dispare filtrado pesado pasa por `useDebounce` (500 ms por defecto). |
| 🟢 Media | **Rendering** | Ternario en vez de `&&` para condicionales; extraer JSX estático fuera del componente; listas virtualizadas o paginadas cuando el conjunto crece con la operación. |
| 🟢 Baja-media | **JavaScript** | `Map`/`Set` para lookups repetidos (`groupByKey` ya lo hace); salir temprano de funciones; izar `RegExp` fuera de loops; combinar iteraciones. |

> [!TIP]
> Las dos reglas que más rinden en este proyecto: **imports directos sin
> barrels** (coincide con `00 §6`) y **`useMemo` sobre los filtrados de listado**,
> porque un listado con búsqueda se recalcula en cada pulsación.

---

## 2. La decisión arquitectónica: client-first

> [!CAUTION]
> **Toda página bajo `app/(harmony)/` es un Client Component (`"use client"`).
> Ningún Server Component llama a Convex.** Todo el acceso a datos es del lado
> del cliente, vía el `api.ts` de cada paquete.

### 2.1 Por qué

La reactividad de Convex —la UI que se actualiza sola cuando cambian los datos—
requiere `useQuery` en Client Components: `ConvexReactClient` mantiene una
suscripción WebSocket persistente. Un Server Component **no puede suscribirse**;
solo carga datos una vez, sin reactividad.

Harmony Build es una aplicación operativa en tiempo real: lo que alguien
registra en la obra debe aparecer en la pantalla de quien consulta sin
recargar, y quien administra ve entrar a un miembro nuevo en el momento en que
usa el código de unión. Priorizamos **reactividad sobre SSR**. Es una decisión
consciente, no una omisión.

### 2.2 Qué NO usamos

`preloadQuery`/`usePreloadedQuery` y el adaptador de TanStack Query para SSR con
reactividad retenida **no se usan** en `(harmony)/`: el costo de complejidad no
compensa cuando toda la app es una herramienta autenticada tras login, sin SEO ni
necesidad de first paint con datos. La carga se maneja inline con `isLoading` de
cada `api.ts`, con `<PageLoading />` como estado canónico (ver `03 §2.4`).

Lo que sí es Server Component, y por qué no contradice la regla:

- **`app/layout.tsx`** — monta fuentes, metadatos y providers. No pide datos.
- **`app/page.tsx`** — sólo redirige a `/projects`.
- **`app/auth/page.tsx`** y **`app/(harmony)/layout.tsx`** — exportan
  metadatos o envuelven a un componente cliente (`AuthScreen`,
  `HarmonyLayoutClient`). No piden datos.
- **`app/api/`**, si llega a existir — route handlers.

No hay landing ni páginas públicas que justifiquen render en servidor. Si algún
día se añaden, entran con plan (`05`) y se anotan aquí como excepción.

---

## 3. Estructura de `app/`

Dos zonas, separadas por autenticación:

| Zona | URL | Propósito | Auth | Layout |
|---|---|---|---|---|
| `auth/` | `/auth` | Inicio de sesión, registro y restablecimiento | No | Root |
| `(harmony)/` | `/projects/*` | App autenticada | Sí | `HarmonyLayoutClient` + sidebar |

`/` no tiene pantalla propia: **redirige a `/projects`**.

```
app/
├── layout.tsx              # Root: providers, fuentes, metadata, tema
├── page.tsx                # `/` → redirect("/projects")
├── loading.tsx  error.tsx  not-found.tsx
├── globals.css             # Tailwind + tokens (ver 03)
├── auth/page.tsx
└── (harmony)/
    ├── layout.tsx          # HarmonyLayoutClient
    ├── loading.tsx
    └── projects/
        ├── page.tsx        # redirige al primer proyecto activo, o abre la
        │                   #   bienvenida si no hay ninguno
        └── [projectId]/
            ├── layout.tsx  # sidebar + chequeo de membresía
            ├── error.tsx
            ├── page.tsx    # inicio del proyecto
            ├── registros/  # auditoría
            └── ajustes/    # ajustes del proyecto
                ├── usuarios/
                └── roles/
```

| Ruta | Qué es |
|---|---|
| `/auth` | Autenticación. La única ruta pública. |
| `/` | Redirige a `/projects`. |
| `/projects` | Redirige al primer proyecto activo de quien entra, o abre la bienvenida (crear un proyecto o unirse con un código). |
| `/projects/[projectId]` | Inicio del proyecto. |
| `/projects/[projectId]/registros` | Auditoría (exige `viewLogs`, `01 §5.5`). |
| `/projects/[projectId]/ajustes` | Ajustes del proyecto. |
| `/projects/[projectId]/ajustes/usuarios` | Miembros. |
| `/projects/[projectId]/ajustes/roles` | Roles personalizados. |

**La jerarquía es de un solo nivel**: todo lo que tiene datos cuelga de
`[projectId]`, y una vista nunca agrega datos de varios proyectos. Una ruta
nueva del módulo de formatos se coloca bajo `[projectId]`, con el idioma que le
toca por su padre (`00 §6`), y entra en este árbol en el mismo cambio que la
crea.

### 3.1 Flujo de autenticación (`middleware.ts`)

`middleware.ts` usa `convexAuthNextjsMiddleware`:

1. `/auth` + autenticado → redirige a `/projects`.
2. Cualquier otra ruta + no autenticado → redirige a `/auth`.

No hay lista de rutas públicas: la única es `/auth`, y es la que el paso 1
trata aparte.

El middleware es una **frontera de red**, no la capa de autorización: sólo
comprueba la cookie de sesión. La autorización real vive en Convex (`01 §5`).

> [!CAUTION]
> **Una ruta que deba alcanzarse sin sesión tiene que declararse aquí, o no
> existe.** El `matcher` incluye `/(api|trpc)(.*)`, así que un route handler
> nuevo bajo `/api` responde una redirección a `/auth` a quien no trae cookie:
> parece caído y el error no apunta a ningún sitio. Antes de declararla, leer
> `01 §5.7`: hoy no hay ninguna superficie sin sesión, y abrir la primera exige
> plan.

**Una sesión que ya no se puede canjear manda al login, no a un 404.** Cuando
el refresh token no es legible —una cookie vieja, de otro deployment—, la
versión fijada de `@convex-dev/auth` devuelve una respuesta contradictoria:
una redirección a `/auth` marcada a la vez como «continúa». Next hace caso al
«continúa» y la petición termina en la página de 404. El `middleware` la
convierte en la redirección que pretendía ser y borra las cookies ilegibles. Es
un parche atado a la versión (`01 §9`): no se quita sin comprobar que la
librería ya no lo necesita.

### 3.2 Stack de providers (root layout)

```
ConvexAuthNextjsServerProvider
 └── html › body
     └── NuqsAdapter (estado en URL)
         └── ThemeProvider (dark/light/system)
             └── ConvexClientProvider
                 └── JotaiProvider
                     ├── ServiceWorkerRegister  (PWA, §7)
                     ├── ObservabilityProvider  (PostHog; sin clave, no-op)
                     ├── Toaster (sonner)
                     ├── ModalProvider
                     └── {children}
```

Un provider nuevo se monta aquí y en ningún otro sitio.

**Observabilidad.** Todo error del cliente pasa por `logError`
(`lib/logging.ts`); `ObservabilityProvider` registra el destino remoto. Sin
`NEXT_PUBLIC_POSTHOG_KEY` no inicializa nada y la app funciona igual: es
deliberado, para desarrollar y correr el gate sin cuenta ni red. Grabación de
sesión y autocaptura se apagan en el código del provider, no en el dashboard.
En código de aplicación no hay `console.error`: lo que merece consola merece
`logError`.

### 3.3 Convenciones de `app/`

- **Todas las páginas de `(harmony)/` son client components.** La carga se maneja
  con `isLoading` del `api.ts` correspondiente.
- **Layouts mínimos**: envuelven children con chrome compartido (sidebar). Nada
  de data fetching en layouts más allá del chequeo de membresía.
- **Segmentos de ruta en kebab-case**, con el idioma que fija `00 §6`: inglés en
  el primer nivel, y un segmento hijo sigue el idioma de su padre. Las etiquetas
  visibles, siempre en español.
- **Segmentos dinámicos** con la forma `[entityId]`: `[projectId]`.
- **El proyecto siempre está en la URL.** `useProjectId()`
  (`packages/projects/store/use-project-id.ts`) lo lee de `useParams()`.
  **Nunca** pases ese id por props si está en la ruta.

---

## 4. Estructura de `packages/` (módulos de dominio)

Cada carpeta en `packages/` es un **módulo de feature autocontenido** con
estructura interna fija:

```
packages/<feature>/
├── api.ts          # Hooks de Convex — ÚNICO acceso a Convex. Ver 01 §2
├── types.ts        # Tipos TS compartidos del paquete (en la raíz, nunca en lib/)
├── components/
│   ├── *.tsx
│   ├── modals/     # *-modal.tsx — usan HarmonyModal
│   └── sheets/     # *-sheet.tsx — usan HarmonySheet
├── store/          # Átomos Jotai, hooks de ID, managers
└── lib/            # Lógica de dominio, helpers, constantes, permisos
```

> [!CAUTION]
> Los nombres de directorio son fijos: solo `components/`, `store/`, `lib/`
> (+ `modals/`, `sheets/` dentro de components). No `dialogs/`, no `views/`, no
> `utils/`, no `hooks/`. En la raíz del paquete solo `api.ts` y `types.ts`.

**Inventario de la fase base (6 paquetes):**

| Paquete | Qué contiene |
|---|---|
| `auth` | La pantalla de `/auth`: inicio de sesión, registro, restablecimiento, medidor de fuerza. |
| `users` | El perfil de quien tiene la sesión. |
| `projects` | El proyecto: crear, unirse, conmutar, ajustes e identidad visual. Fusiona lo que en Harmony eran `organization` y `workspaces`. |
| `members` | Miembros del proyecto y su perfil. |
| `roles` | Roles personalizados, el catálogo de permisos de la interfaz y `RoleGate`. |
| `logs` | La vista de auditoría. |

No todos tienen todos los directorios: sólo lo que la feature necesita.

> [!NOTE]
> **Un inventario que no coincide con `ls packages/` no es documentación: es
> una trampa** para quien lo lea buscando dónde encaja lo suyo. Un paquete
> nuevo entra en esta tabla en el mismo cambio que lo crea. El módulo de
> formatos traerá los suyos; sus nombres se fijan en su plan.

### 4.1 Agrupaciones adicionales admitidas

**Ninguna hoy.** Todos los paquetes caben en la estructura fija.

Un paquete grande puede agrupar por tema dentro de `components/` cuando ese
subdirectorio contiene un **subsistema con vida propia** —con su `lib/` y sus
pruebas—, y se justifica en el cambio que lo crea, anotándolo aquí. La
diferencia con lo prohibido es concreta: un subsistema agrupa algo que se
entiende solo; `utils/` o `views/` sólo reordenan archivos.

### 4.2 Nombres canónicos de componentes

| Patrón | Propósito |
|---|---|
| `create-<entity>-modal.tsx` | Formulario de creación |
| `selected-<entity>-modal.tsx` | Detalle + edición + borrado del ítem seleccionado |
| `<entity>-config-modal.tsx` | Ajustes de una entidad |
| `<collection>-modal.tsx` / `<collection>-sheet.tsx` | Navegador de colección |
| `<entity>-detail-sheet.tsx` | Vista ancha con registros anidados |
| `<entity>-card.tsx` / `<entity>-item.tsx` | Fila o tarjeta dentro de un listado |
| `<collection>-section.tsx` | Un área de ajustes que administra una colección (`roles-section.tsx`, `members-section.tsx`) |

### 4.3 Dependencias entre paquetes

- Se importan entre sí vía `@/packages/<name>/…`, **nunca rutas relativas** entre
  paquetes.
- **Hubs** (importados por los demás): `projects`, `roles` y `members`. Son los
  que dan el proyecto actual, el miembro actual y el gate de permisos.
- **Hojas**: `logs` y `users` no deberían ser importados por los hubs.
- Un import nuevo **desde** un hub **hacia** un paquete de feature merece una
  segunda mirada: es como un hub se convierte en un nudo. Cuando llegue el
  módulo de formatos, sus paquetes importan de los hubs, no al revés.
- Un paquete **no** se importa a sí mismo por `@/packages/<own-name>/`; usa
  relativas internamente.
- **Sin barrels** (`index.ts`). Cada archivo se importa por su ruta.

---

## 5. Estructura de `components/`, `lib/` y `hooks/`

### 5.1 `components/` (UI horizontal compartida)

Solo subdirectorios, sin archivos sueltos en la raíz:

| Directorio | Propósito | ¿CLI? |
|---|---|---|
| `ui/` | Primitivos de shadcn/ui, **con modificaciones propias** | Ver la regla de abajo |
| `harmony/` | La capa propia del sistema de diseño (`HarmonyModal`, `HarmonySheet`, `PageShell`, selectores…) | Escritos a mano |
| `icons/` | SVGs de marca no disponibles en Lucide (`google`) | — |
| `providers/` | Context providers (montados en root layout) | — |

Reglas:

- **`ui/` no se regenera.** Varios de sus archivos llevan cambios propios que
  la CLI de shadcn pisaría —`select.tsx` (incluye `MultiSelect`), `sidebar.tsx`,
  `tabs.tsx`, `responsive-breadcrumb.tsx`—. Un primitivo **nuevo** sí se añade
  con `npx shadcn@latest add <c>`; uno existente se edita a mano, y sólo para
  cablearlo a los tokens o corregir accesibilidad. Si necesita comportamiento
  propio, **envuélvelo** en `harmony/`, no lo bifurques. `components.json`
  apunta a `@/components/ui`: no se cambia esa ruta.
- **`harmony/`** es la capa de design system. Dos componentes del mismo tipo,
  construidos en sesiones distintas, **deben ser estructuralmente idénticos**.
  Todo lo de aquí sigue `03-reglas-interfaz`. Conserva su nombre y su prefijo
  (`00 §6`).
- **`harmony/` no importa de `packages/`.** Es la capa horizontal: si un
  componente de aquí necesita conocer una feature, está en el sitio equivocado
  (`06 §2.6`).
- **kebab-case**, un componente por archivo, salvo compound components
  (`HarmonyModal` + sus partes) que viven juntos.
- Import siempre por `@/components/…`.

### 5.2 `lib/` (utilidades puras app-wide)

- **Funciones puras**: sin React, sin efectos, **sin imports de Convex**.
- Categorías vigentes:
  - *Framework*: `utils.ts` (`cn()`, con `text-ui` y `text-2xs` registrados en
    `tailwind-merge`).
  - *Color*: `custom-colors.ts` — la paleta de 24 colores con sus mapas
    `bg-`/`border-`/`text-`/hex y el tipo `CustomColor`, compartido con el schema.
  - *Fechas*: `date-formats.ts`.
  - *Colecciones*: `group-by-key.ts`.
  - *Accesibilidad*: `clickable-props.ts`.
  - *Errores*: `convex-error-handler.ts`, `logging.ts`
    (`logError`/`logWarn`/`logInfo`).
- **La lógica de una sola feature no va aquí.** Si sólo la usa un módulo, vive en
  `packages/<feature>/lib/`. La vara es el uso real, no la intuición: `lib/` es
  para lo que ya comparten varios paquetes.
- **Una regla que deben cumplir servidor y cliente no va aquí, sino en
  `convex/lib/`** como módulo puro, y el cliente la importa de allí (`01 §2.2`).
- Sin barrels. Import directo: `import { groupByKey } from "@/lib/group-by-key";`.

### 5.3 `hooks/` (hooks transversales)

Sin subdirectorios; todos los archivos en la raíz.

| Categoría | Hooks |
|---|---|
| Capa de datos Convex | `use-fetch`, `use-mutate`, `use-action` (`useExecute`), `use-generate-upload-url` |
| Navegador / UI | `use-debounce`, `use-confirm`, `use-mobile`, `use-window-size` |

---

## 6. Los tres hooks de Convex

Son el **único puente a Convex desde el frontend**:

| Hook | Envuelve | Uso |
|---|---|---|
| `use-fetch.ts` → `useFetch` | `useQuery` | Lecturas reactivas. Devuelve `{ data, isLoading }`. |
| `use-mutate.ts` → `useMutate` | `useMutation` | Escrituras. `mutate(args, { onSuccess, onError })`, más `isPending`/`isSuccess`/`isError`/`isSettled`. |
| `use-action.ts` → `useExecute` | `useAction` | Acciones largas (correos, APIs externas). Misma API que `useMutate`. |

> [!CAUTION]
> **Nunca uses `useQuery` / `useMutation` / `useAction` directamente en un
> componente.** Pasa siempre por `useFetch` / `useMutate` / `useExecute`, y
> exponlos desde el `api.ts` del paquete (ver `01 §2`).

**`"skip"` para no suscribirse.** `useFetch` acepta el centinela de Convex en
lugar de los argumentos. Sirve para las consultas que sólo hacen falta cuando
algo está abierto o listo —un modal montado pero cerrado, una lectura que
necesita sesión antes de tenerla—: no deben pagar su coste ni arrastrar su
fallo. El hook del `api.ts` que lo admita lo declara en su firma.

El manejo de error canónico de una escritura:

```tsx
const { mutate: createRole, isPending } = useCreateRole();

createRole(args, {
  onSuccess: () => toast.success("Rol creado correctamente"),
  onError: (error) => handleConvexErrorCallback(error),
});
```

---

## 7. Móvil: web responsive y PWA

> [!IMPORTANT]
> **Harmony Build es una aplicación web y nada más.** El alcance móvil del
> proyecto es **web responsive instalable como PWA**. No hay app nativa, ni
> tiendas, ni envoltorio. Publicar en tiendas es una decisión futura y separada;
> hasta que se tome, cualquier propuesta que dependa de un contenedor nativo se
> rechaza.

Consecuencia directa, y aquí pesa más que en ningún otro producto de la
familia: **el teléfono no tiene una aplicación aparte que lo resuelva, y el
teléfono es donde se diligencia.** Lo que no funcione a 390px de ancho no
funciona en la obra, punto. Esto sube el listón de `03` en vez de bajarlo.

- **Service worker** — `public/service-worker.js`, registrado por
  `components/harmony/service-worker-register.tsx`. No cachea nada: existe para
  que la aplicación sea instalable.
- **Instalabilidad** — `public/manifest.json`, referenciado desde los metadatos
  del root layout (`manifest: "/manifest.json"`).
- **Enlaces** — no hay traducción de URLs de apertura nativa. Una URL de la
  aplicación es una URL del navegador, y ya está.
- **Sin conexión** — hoy la aplicación **no funciona sin red**: Convex necesita
  su conexión y el service worker no guarda nada. Quien diligencia tiene a
  veces mala cobertura, así que cómo se comporta la captura cuando la red falla
  es una decisión del plan del módulo de formatos, no algo que se improvise en
  un componente.

> [!CAUTION]
> Todo lo que dependa de APIs del navegador (`window`, `navigator`,
> `matchMedia`, `localStorage`, `performance`) se accede dentro de un efecto o
> tras comprobar el entorno. Un Client Component **también se renderiza en el
> servidor** la primera vez: un acceso directo en render rompe ese render, o
> produce un desajuste de hidratación que sólo se ve en producción.

### 7.1 Dos contextos, dos puntos de partida

Harmony Build tiene dos clases de pantalla, y no se diseñan desde el mismo
ancho (`00 §2.3`):

| Pantalla | Quién la usa | Se diseña primero para | Y además debe |
|---|---|---|---|
| **Captura**: el formulario que se diligencia | Conductores, operarios, inspectores; a diario, en la obra, con prisa | **Pantalla estrecha** (teléfono, 390px) | Funcionar en escritorio sin estirarse hasta ser ilegible |
| **Administración**: proyecto, miembros, roles, diseño de formatos, auditoría | Propietario y administradores; SST, calidad, dirección de obra | **Pantalla ancha** (escritorio) | Funcionar en tablet y en teléfono: ninguna acción queda inalcanzable |
| **Consulta**: respuestas y, después, gráficas | Quien revisa | Se decide en el plan de cada vista | — |

«Se diseña primero para» significa que ése es el tamaño en el que se toman las
decisiones de estructura —qué va arriba, qué se oculta, cuántas columnas—, y el
otro tamaño se deriva de él. No significa que el otro se pruebe menos: el QA de
`04 §7` recorre los dos.

Las reglas concretas del formulario de captura —tamaño de los controles, pasos,
guardado— se fijan al aprobar el plan del módulo de formatos (`03 §6.2`).

---

## 8. Estado

| Necesidad | Herramienta |
|---|---|
| Estado de UI local (modal/sheet abierto, selección) | **Jotai** (átomos en `packages/<x>/store/`) |
| Estado que debe vivir en la URL (rango, filtros, vista, tab) | **nuqs** (`packages/logs/store/use-registros-view.ts` es el caso canónico) |
| Datos del servidor | **Convex** vía `useFetch`/`useMutate` (reactivo, no requiere caché cliente) |

No se usa Redux, Zustand ni Context para estado de datos.

**Regla de URL**: el período seleccionado y los filtros de un listado viven en la
URL. Un enlace compartido debe reproducir la misma pantalla. Nada de estado de
vista en `localStorage` que pueda contradecir un enlace.

---

## 9. Deuda documentada

**Ninguna.** El proyecto nace sin deuda estructural anotada.

Cuando aparezca —un paquete con un directorio fuera de la convención, una
página que concentra filtrado y ordenación que deberían vivir en
`packages/<feature>/lib/`— se anota aquí con el archivo y la regla que
incumple, y se salda al tocarlo (`06 §2.6`). Lo que no se hace es dejarla sin
anotar: la deuda que no está escrita se convierte en el patrón que copia el
siguiente.
