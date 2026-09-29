# 00 · Reglas Generales

> **La carpeta `docs/directives/` es la ley única y completa de Harmony Build.**
> Todo el desarrollo del proyecto —backend, frontend, interfaz, datos, diseño,
> pruebas y calidad— se rige desde estos siete documentos. No hay otra fuente de
> verdad interna: si una regla no está aquí (o en uno de los otros seis
> documentos), no es una regla del proyecto.

> [!CAUTION]
> **Estos documentos son prescriptivos, no sugerencias.**
> - No inventes convenciones, librerías, patrones o estructuras que no estén aquí.
> - Si un caso no está cubierto explícitamente, infiere la regla más cercana a
>   partir de los principios de este cuerpo de ley y **documenta la decisión**
>   editando el documento correspondiente en el mismo cambio.
> - Un documento que no coincide con el código es peor que no tener documento.
>   O la directriz es autoritativa, o es ruido: mantenla sincronizada.

---

## 1. Los siete documentos y qué gobierna cada uno

| Documento | Gobierna | Léelo antes de… |
|---|---|---|
| **`00-reglas-generales.md`** (este) | Identidad, dominio, stack, librerías permitidas, convención de nombres, idioma. | Cualquier tarea. Es el marco. |
| **`01-reglas-convex.md`** | Backend Convex: funciones, schema, `api.ts`, validación, permisos, auditoría, cascadas de borrado, migraciones, autenticación. | Tocar cualquier archivo de `convex/` o un `api.ts` de paquete. |
| **`02-reglas-nextjs.md`** | Estructura de la app, React/Next.js, carpetas, hooks, data fetching, móvil y PWA. | Tocar `app/`, `components/`, `packages/`, `lib/` o `hooks/`. |
| **`03-reglas-interfaz.md`** | Todo lo visible: color, espaciado, tipografía, iconos, componentes, layouts, overlays. | **Cualquier** cambio de UI. Sin excepción. |
| **`04-reglas-testing.md`** | Gate de calidad, pruebas unitarias, `convex-test`, Playwright y QA manual. | Antes de cada commit y al añadir lógica crítica. |
| **`05-reglas-diseno.md`** | Diseño previo a la implementación: cuándo se exige plan, su formato y su ciclo de vida. | Empezar una pantalla nueva, un rediseño o un componente que no existe. |
| **`06-reglas-calidad.md`** | Calidad estructural: abstracción, tamaño de archivo, espagueti de condicionales, capa canónica, atomicidad. | Cerrar una feature. Es la vara de la forma del código, no de su corrección. |

### 1.1 Orden de autoridad

Cuando dos reglas parezcan entrar en conflicto, se resuelven en este orden:

1. **El documento más específico del dominio de la tarea.** Para UI manda `03`;
   para backend manda `01`; para estructura de código manda `02`; para decidir
   si una pantalla puede empezar a construirse manda `05`.
2. **`00-reglas-generales.md`** (este documento) para stack, librerías y nombres.
3. **El código existente**, cuando el patrón más consistente ya está establecido
   y ningún documento lo contradice.
4. **La petición explícita del usuario**, que gana sobre todo lo anterior — pero
   si contradice una directriz, **no la sigas en silencio**: dilo. Ejemplo:
   *"Esto contradice `03-reglas-interfaz §3`. Confirma que quieres divergir, o
   sigo la directriz."*

**`06-reglas-calidad.md` es transversal y no compite con los demás**: juzga la
forma del código, no decide su estructura. Cuando su criterio choque con una
regla de dominio (`01`, `02`, `03`), manda la regla de dominio y `06` propone
dentro de ella. Extraer un archivo grande, por ejemplo, no autoriza a inventar
un directorio que `02 §4` no contempla.

Los siete documentos son **un solo cuerpo de ley** y pueden referenciarse entre
sí libremente (`ver 01-reglas-convex §5`). Lo que **nunca** deben referenciar es
un documento fuera de esta carpeta como si fuera normativo: si algo importa,
vive aquí. Las únicas referencias externas admitidas son a **tooling generado**
(ver `01`, nota inicial) y a **planes de diseño** (ver `05`).

---

## 2. Qué es Harmony Build

**Harmony Build es la plataforma con la que una empresa de construcción deja de
diligenciar en papel o en Excel sus formatos de obra.**

Una obra produce todos los días formatos que alguien llena a mano:
inspecciones preoperacionales de vehículos y equipos, entregas de dotación y
elementos de protección personal, inspecciones de botiquines, extintores,
camillas y kits de derrames, informes de seguridad y salud en el trabajo. Hoy
viven en una hoja que alguien transcribe —o pierde— a fin de mes.

Harmony Build los digitaliza: el formato se diseña una vez, se diligencia en la
obra, y sus respuestas quedan guardadas, listables y, más adelante, graficadas.
La promesa central es **que el dato de la obra exista en el momento en que
ocurre, con nombre, fecha y responsable**, y no en una hoja que se reconstruye
después.

> [!NOTE]
> **Fase actual: base.** Hoy existen autenticación, proyectos, miembros, roles
> y auditoría. El módulo de formatos está en diseño (`docs/plans/`) y las
> gráficas del panel son una fase posterior. Estas directrices describen lo que
> existe; lo que depende del módulo de formatos queda marcado como pendiente de
> su plan, sin contenido inventado.

### 2.1 Atributos de la plataforma

- **Inmediata**: el dato se captura donde ocurre y cuando ocurre, no se
  transcribe después.
- **Atribuible**: toda respuesta y todo acto importante llevan nombre, fecha y
  responsable.
- **De campo**: quien diligencia está en la obra, con el teléfono en la mano,
  con prisa y a veces con mala conexión.
- **Precisa**: reduce ruido y convierte hojas dispersas en datos que se pueden
  listar y comparar.
- **Serena bajo presión**: transmite control incluso cuando la obra aprieta.

### 2.2 Personalidad

Serena bajo presión · Precisa sin rigidez · Técnica pero humana · Sobria, no fría.

### 2.3 Principios de UX (cómo debe sentirse el producto)

1. **Calma funcional**: la interfaz reduce ansiedad operativa, nunca la amplifica.
2. **Jerarquía inmediata**: lo crítico se detecta en segundos (qué formato falta
   por diligenciar, qué respuesta pide atención, quién la firmó).
3. **Densidad con orden**: mucha información, mínima fricción cognitiva.
4. **Consistencia temporal**: la navegación y los estados respetan la lógica de
   fecha de la obra: qué se diligenció, qué día y en qué orden.
5. **Precisión semántica**: el color comunica estado real, no decoración.
6. **Minimalismo útil**: menos ornamento, más decisión.
7. **Trazabilidad visible**: siempre se puede responder "¿quién, qué, cuándo?".
8. **Un camino, no ocho**: para cada tarea frecuente existe un flujo canónico.
   Los atajos son atajos, no alternativas que compiten.

> [!IMPORTANT]
> **Dos contextos de uso, dos puntos de partida.** Quien **diligencia**
> —conductores, operarios, inspectores— lo hace a diario desde el teléfono, en
> la obra: el formulario de captura se diseña **primero para pantalla
> estrecha**, corto y claro. Quien **administra** —crea el proyecto, invita,
> define roles, diseña formatos— trabaja desde escritorio: la administración se
> diseña **primero para pantalla ancha**. Las dos superficies tienen que
> funcionar en los dos tamaños; lo que cambia es por cuál se empieza
> (`02 §7.1`).

### 2.4 Voz y tono

Voz clara, directa, técnica y confiable. Por contexto: **captura en obra** breve
y accionable · **alertas** firme y específica · **errores** explícita y orientada
a solución · **onboarding** cercana y guiada, sin exceso de texto.

### 2.5 Qué Harmony Build nunca es

- Nunca una herramienta donde el dato de la obra se reconstruye de memoria a fin
  de mes: la respuesta se guarda cuando ocurre, con su autor y su fecha.
- Nunca un producto que "recuerda" por el usuario sin dejar rastro. Todo acto
  importante queda en `logs` (ver `01 §5.5`).
- Nunca una herramienta donde el "usuario avanzado" necesita trucos que el básico
  ignora. La UI se comporta igual para todos; lo que cambia son los permisos.
- Nunca una app donde dos flujos idénticos se ven distintos porque los construyó
  otra persona en otra semana. Estas directrices existen precisamente para
  impedir eso.

### 2.6 Referencias visuales

**Linear es la referencia principal.** Detrás: Iron Man UI/HUD (visualización
táctica) · Saleva *One Week Wonder* (jerarquía de datos) · The Atlas de No
Man's Sky (sentido sistémico) · iOS 26 Liquid Glass (profundidad óptica
controlada). Orientan el nivel de precisión y expresividad; Harmony Build
mantiene lenguaje propio centrado en operación real.

Lo que se toma de Linear es **estructura**, no estilo: el chrome que se hunde y
el contenido que se levanta (`03 §0.6`), la navegación en gris que no compite con
el trabajo (`03 §2.2`), el dato fuera de la zona de acciones (`03 §2.3`) y la
caja que sólo encierra lo finito (`03 §1.3`). El color de marca, la densidad
operativa y el idioma son propios.

> [!NOTE]
> Este repositorio **no guarda capturas de la referencia**. Las reglas de `03`
> que salen de Linear están escritas con su medida y su razón, de modo que se
> puedan aplicar sin mirar la captura. Una regla nueva que se apoye en la
> referencia se escribe igual: con el valor, no con «como en Linear».

---

## 3. Modelo de dominio

Harmony Build es una plataforma **multi-tenant** con **un solo nivel de
tenencia: el proyecto**. Todo cuelga de él y nunca se cruza entre proyectos.

```
Project (la obra o el proyecto de la empresa)
 ├── Members + Roles   → equipo; tres niveles de identidad: owner, admin y
 │                        miembro con rol personalizado (8 llaves de permiso)
 ├── Logs              → auditoría
 └── (módulo de formatos: formatos, respuestas y relaciones entre formatos;
      se diseña en docs/plans/ y entra en este árbol cuando se implemente)
```

| Tabla | Qué es | Notas |
|---|---|---|
| `projects` | La obra. `name`, `code` opcional, `userId` (propietario), `joinCode`, `active`, `primaryColor`, `secondaryColor`, `logo`. | Lleva la identidad visual (colores y logo) y el modelo de acceso (código de unión, miembros). Un proyecto archivado (`active: false`) se conserva y se lee, pero no se abre por defecto. |
| `members` | La pertenencia de una persona a un proyecto. `role: "owner" \| "admin" \| "member"` y `customRoleId` opcional. | Ver `01 §5.1`. |
| `roles` | Roles personalizados del proyecto, con las 8 llaves de `convex/permissions.ts`. | Ver `01 §5.3`. |
| `logs` | Auditoría. | Ver `01 §5.5`. |
| `users` | Identidad (tablas de `@convex-dev/auth`). | No es dominio: una persona existe fuera de cualquier proyecto. |

Ciclo cubierto por la fase base: registro e inicio de sesión · creación de
proyectos con identidad visual · unión por código · gestión de miembros · roles
y permisos granulares · auditoría · web responsive instalable como PWA.

> [!NOTE]
> El detalle exacto de entidades, campos, índices y estados es responsabilidad de
> `convex/schema.ts`. Este documento fija el mapa mental; el schema es la forma
> exacta de los datos. Cuando el módulo de formatos se implemente, su árbol
> entra aquí en el mismo cambio.

---

## 4. Stack oficial

| Capa | Tecnología | Notas |
|---|---|---|
| Framework | **Next.js 15.3** (App Router) | Turbopack en dev (`-p 7778`); `middleware.ts` para auth. Ver `02`. |
| UI runtime | **React 19** | Server Components existen en el framework, pero ver la decisión "client-first" en `02 §2`. |
| Estilos | **Tailwind CSS 4** | Tokens vía `@theme inline` en `app/globals.css`. Ver `03`. |
| Componentes base | **shadcn/ui** + **Radix UI** | En `components/ui/`, con modificaciones propias. Capa propia en `components/harmony/`. |
| Backend | **Convex** | Base de datos, funciones serverless y auth. Deployment propio, distinto del de Harmony. Sin componentes (`convex.config.ts` no existe), sin crons. Ver `01`. |
| Auth | **@convex-dev/auth** (`0.0.81`, fijada) | Password + Google. Restablecimiento de contraseña por código vía Resend. Sin verificación de correo al registrarse. Ver `01 §9`. |
| Estado global | **Jotai** (átomos) + **nuqs** (estado en URL) | Ver §5.1 y `02 §8`. |
| Toasts | **sonner** | Único sistema de notificaciones. |
| Fechas | **date-fns** | Formatos compartidos en `lib/date-formats.ts`, locale `es`. |
| Animación | **motion** | Ver §5.1. |
| Iconos | **lucide-react** | Única librería de iconos. Ver `03 §5`. |
| Móvil | **Web responsive + PWA** (service worker) | Único alcance móvil del proyecto. Ver `02 §7`. |
| Correo | **Resend** | Sólo desde Convex (`convex/resend.ts`): el código de restablecimiento. |
| Observabilidad | **PostHog** (`posthog-js`) | Errores del cliente vía `lib/logging.ts` + `ObservabilityProvider`. Sin clave, no hace nada. Ver `02 §3.2`. |
| Linting/format | **Biome 1.9** | Ver `04 §2`. |
| Pruebas | **Vitest** + **convex-test** + **Playwright** | Ver `04`. |
| Gestor de paquetes | **Bun** | `bun install`, `bun dev`, `bun run …`. |

Lo que este stack **todavía no tiene**, y entrará con su primer consumidor:
gráficas, exportación a Excel y PDF, arrastrar y soltar, migraciones. La
librería que cubrirá cada propósito ya está decidida en §5.1.

---

## 5. Librerías: permitidas, canónicas y prohibidas

> [!CAUTION]
> **No se añade ninguna dependencia nueva sin actualizar esta sección en el mismo
> cambio.** Cada **propósito** funcional tiene una librería canónica. Tener dos
> librerías para lo **mismo** es deuda; pero un propósito puede legítimamente
> partirse en dos (p. ej. *escribir* Excel vs. generar PDF): eso no es
> duplicación, es la herramienta correcta por caso.

### 5.1 Decisiones canónicas por categoría

**Instaladas hoy:**

| Categoría | Canónica (usar SIEMPRE) | Prohibidas | Motivo |
|---|---|---|---|
| **Iconos** | `lucide-react` | cualquier otra | Catálogo completo de entidades y acciones en `03 §5`. Tipo `LucideIcon` para props que reciben iconos. |
| **Primitivos UI headless** | `@radix-ui/react-*` vía `components/ui/` | Base UI, Headless UI | — |
| **Listados con búsqueda y orden** | `EntityTable` + `useEntityList` (`components/harmony/entity-table.tsx`) | tablas ad-hoc con estado propio; una librería de índices para listados que caben en pantalla | Búsqueda y orden viven en la URL. Si un listado crece hasta necesitar un índice o una librería de tablas, se evalúa entonces y se anota aquí. |
| **Estado de UI local** | `jotai` | Context para estado de datos; Redux; Zustand | Átomos de apertura de modales/sheets en `packages/*/store/`. |
| **Estado en URL** | `nuqs` | `useState` + `useSearchParams` a mano | Filtros, rango, vista y tab viven en la URL. |
| **Toasts** | `sonner` | cualquier otra | — |
| **Animación reactiva de React** | `motion` (`motion/react`) | `framer-motion` | Es el nombre legado de la misma librería. |
| **Fechas** | `date-fns` | `moment`, `dayjs` | Con locale `es`. |
| **Calendario** | `react-day-picker` vía `components/ui/calendar.tsx` | un `<input type="date">` suelto | Los selectores de `components/harmony/` lo envuelven (`03 §6`). |
| **Listas con buscador** | `cmdk` vía `components/ui/command.tsx` | — | Lo consumen `SearchableSelect` y `SearchableMultiSelect`. |
| **Tema claro/oscuro** | `next-themes` vía `components/providers/theme-provider.tsx` | — | — |
| **Códigos aleatorios** | `oslo/crypto` | `Math.random()` para cualquier credencial | Código de unión y código de restablecimiento. Declarada explícitamente en `package.json`, aunque `@convex-dev/auth` también la trae. |
| **Observabilidad / errores** | `posthog-js` vía `components/providers/observability-provider.tsx` | Sentry, Datadog, un segundo SDK «por comparar»; `console.error` suelto en código de aplicación | Todo error del cliente pasa por `logError` (`lib/logging.ts`), que es el único punto que reenvía a PostHog. Grabación de sesión y autocaptura se apagan **en el código**, no en el dashboard. Sin `NEXT_PUBLIC_POSTHOG_KEY` el provider no hace nada. |

**Decididas y no instaladas todavía.** Ninguna de estas está en
`package.json`. Entran **junto a su primer consumidor**, moviendo su fila a la
tabla de arriba en el mismo cambio:

| Propósito | Será la canónica | Entra con |
|---|---|---|
| **Arrastrar y soltar** | `@dnd-kit` — *no instalada todavía* | El constructor de formatos, si su plan lo pide. |
| **Gráficas** | `recharts` — *no instalada todavía* | La fase de gráficas del panel. |
| **Escribir/exportar Excel** | `exceljs` — *no instalada todavía* | La primera exportación de respuestas. |
| **Generar PDF** | `pdfmake` — *no instalada todavía* | La primera exportación a PDF. |
| **Migraciones de datos** | `@convex-dev/migrations` — *no instalada todavía* | La primera migración sobre datos vivos (`01 §7.2`). |

> [!NOTE]
> Esta segunda tabla fija la decisión para que nadie la vuelva a tomar, **no
> autoriza a importar**. Escribir código contra una librería que no está
> instalada no compila; instalarla «para ir adelantando» es exactamente la
> deuda de §5.3.

### 5.2 Regla de dependencias

- Antes de instalar algo, verifica si ya existe una librería canónica para ese
  propósito. Si existe, úsala.
- Si de verdad hace falta una categoría nueva, añádela a la tabla §5.1 con su
  motivo, en el mismo cambio que la instala.
- **Una dependencia entra con el código que la usa y sale con él.** Una que se
  sustituye se desinstala en el mismo cambio que la sustituye, aunque parezca
  cómodo dejarla «por si volvemos».
- Preferir **imports directos** sobre barrels (mejor tree-shaking). Ver `02 §1`.

### 5.3 Duplicaciones vivas (deuda conocida)

**Ninguna.** El proyecto nace con las dependencias que importa y nada más.

Una dependencia declarada y sin usar no es inofensiva: la tabla de §5.1 la
presenta como canónica, así que el código nuevo se escribe contra una librería
que en realidad nadie ha llegado a usar. Se comprueba buscando el
**especificador exacto** —un nombre corto puede aparecer dentro de otro, y
`harmony` aparece dentro de `@/components/harmony`— y se verifica con
`bun run build`, no sólo con `tsc`: una dependencia usada fuera de TypeScript
sólo se cae ahí.

---

## 6. Convención de nombres

El proyecto usa convenciones **distintas según el contexto**, y esto es
deliberado. La tabla es la ley:

| Contexto | Convención | Ejemplo | Regla dura |
|---|---|---|---|
| **Segmentos de ruta** (`app/`) | kebab-case; **inglés en el primer nivel**, y un segmento hijo sigue el idioma de su padre | `projects/`, `[projectId]/`, `registros/`, `ajustes/usuarios/` | Ver la nota de abajo. |
| **Directorios de `packages/`** | camelCase | `projects/`, `members/`, `roles/` | Coincide con el nombre del módulo de Convex que consumen. |
| **Archivos** de componentes, hooks, `lib/`, `packages/` | kebab-case | `create-role-modal.tsx`, `use-debounce.ts`, `group-by-key.ts` | Un componente/hook por archivo. |
| **Módulos de `convex/`** (raíz) | **camelCase, sin guiones** | `projects.ts`, `members.ts`, `permissions.ts` | ⚠ Un archivo con guion dentro de `convex/` expuesto por `_generated/api` **falla el push**. Ver `01 §8`. |
| **Módulos de `convex/lib/`** | snake_case | `error_messages.ts`, `join_codes.ts`, `password_policy.ts` | No se mezcla con camelCase dentro de esa carpeta. |
| **Componentes React** | PascalCase | `HarmonyModal`, `RoleGate` | — |
| **Hooks** | `use` + PascalCase, en archivo `use-*.ts` | `useFetch`, `useDebounce` | Export nombrado único, sin default. |
| **Átomos Jotai / managers** | `use*` en `packages/<x>/store/` | `useMemberId` | — |
| **Variables y funciones** | camelCase | `joinCode`, `normalizeText` | — |
| **Constantes de módulo** | UPPER_SNAKE_CASE | `JOIN_CODE_LENGTH`, `PURGE_BATCH` | — |
| **Claves de permiso** | camelCase `<acción><Dominio>` | `editProject`, `inviteUsers`, `viewLogs` | Fuente canónica: `convex/permissions.ts`. Ver `01 §5`. |
| **Tests** | `<tema>.test.ts` dentro de `__tests__/` | `roles-authorization.test.ts` | kebab-case incluso bajo `convex/` (los tests no se exponen por `_generated/api`). |

> [!NOTE]
> **El idioma de una ruta lo decide su padre.**
>
> - Rutas **de primer nivel**: inglés (`/auth`, `/projects`).
> - Rutas **hijas** de un segmento en inglés: inglés. Una ruta nueva que
>   cuelgue directamente de `/projects/[projectId]` va en inglés, como su padre.
> - Dentro de un proyecto hay **dos árboles en español**, heredados de Harmony:
>   `registros` y `ajustes`. Son la excepción, y no se añade una tercera.
> - Rutas **hijas** de un segmento en español: español (`/ajustes/usuarios`,
>   `/ajustes/roles`). `/ajustes/users` mezclaría dos idiomas dentro de una
>   misma dirección, que es peor que cualquiera de las dos opciones puras.
> - El idioma del segmento no cambia el del código: los componentes, hooks y
>   tipos que lo sirven siguen en inglés.
>
> Renombrar `registros` y `ajustes` a inglés es la alternativa coherente, y se
> descarta por lo mismo que en Harmony: los dos árboles se heredan con sus
> componentes, sus enlaces y sus pruebas.

> [!NOTE]
> **El prefijo `Harmony` de los componentes no cambia.** El producto se llama
> Harmony Build, pero la capa propia de componentes conserva los nombres de la
> familia de la que deriva: `HarmonyModal`, `HarmonySheet`,
> `HarmonyLayoutClient`, la carpeta `components/harmony/` y el grupo de rutas
> `app/(harmony)/`. No se renombran ni se crea un `BuildModal`.

Reglas transversales:

- **Sin barrels (`index.ts`)** en `lib/`, `packages/` ni `components/`. Cada
  archivo se importa por su ruta directa.
- **Imports por alias `@/…`**, nunca rutas relativas entre paquetes o carpetas de
  primer nivel. Dentro de un mismo paquete sí se usan relativas.
- **Un export por archivo** para hooks y componentes de dominio. Los compound
  components (`HarmonyModal` + `HarmonyModalHeader` + …) viven juntos por diseño.

---

## 7. Idioma

- **Código, identificadores y nombres de archivo: inglés.** Las rutas también,
  salvo la excepción documentada en §6: un segmento hijo sigue el idioma de su
  padre, y hay dos árboles en español (`registros`, `ajustes`).
- **Todo lo que ve el usuario final: español, con acentuación correcta.**
  Etiquetas, botones, toasts, mensajes de error de dominio (catálogo en
  `convex/lib/error_messages.ts`, ver `01 §4`) y descripciones de auditoría.
- **Los nombres de las pruebas: español.** `describe` e `it` dicen el
  comportamiento esperado en el idioma en que se discute (`04 §6`).
- No hay sistema de i18n: el español está hardcodeado en la UI. Si algún día se
  introduce, esta sección es la que cambia primero.

---

## 8. Checklist mental de cada sesión

```
□ ¿Leí la petición completa y con cuidado?
□ ¿Es pantalla nueva o rediseño? → 05-reglas-diseno: exige plan aprobado.
□ ¿La tarea toca UI?             → 03-reglas-interfaz es obligatorio.
□ ¿La tarea toca convex/?        → 01-reglas-convex.
□ ¿Toca estructura/React?        → 02-reglas-nextjs.
□ ¿Voy a añadir una dependencia? → Verifica §5 y actualiza la tabla si aplica.
□ ¿Voy a inventar un patrón?     → Busca primero el patrón documentado.
□ ¿Depende del módulo de formatos? → Su regla se fija en su plan, no aquí.
□ ¿Antes de commit?              → Corre el gate de 04-reglas-testing.
□ ¿Cierro una feature?           → 06-reglas-calidad: el gate dice que no está
                                   roto; la 06 dice si quedó torcido.
```
