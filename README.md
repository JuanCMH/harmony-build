# Harmony Build

Harmony Build es la plataforma con la que una empresa de construcción deja de
diligenciar en papel o en Excel sus formatos de obra —inspecciones
preoperacionales de vehículos y equipos, entrega de dotación y EPP,
inspecciones de botiquines, extintores, camillas y kits de derrames, informes
de SST— y los tiene digitalizados, con sus respuestas guardadas, listables y
graficadas.

La promesa: que el dato de la obra exista en el momento en que ocurre, con
nombre, fecha y responsable, y no en una hoja que alguien transcribe (o pierde)
a fin de mes.

Deriva de Harmony: conserva su stack, su sistema de diseño, su forma de
trabajar y la familia de componentes `Harmony*`. El dominio es nuevo.

> **La ley del proyecto es `docs/directives/`** (siete documentos). Este README
> sirve para levantar el proyecto y ubicarse; ante cualquier duda de cómo se
> hace algo, mandan las directrices. El índice está en `CLAUDE.md`.

## Estado actual

- **Autenticación**: registro e inicio de sesión con correo y contraseña o con
  Google; restablecimiento de contraseña por código enviado al correo.
- **Proyectos**: crear un proyecto (la obra) con su nombre, código, colores y
  logo; unirse con un código de unión, recibiendo el rol por defecto;
  archivarlo, transferirlo y eliminarlo.
- **Miembros y roles**: propietario, administrador y miembro con rol
  personalizado de quince llaves de permiso.
- **Formatos**: constructor con versiones, 18 tipos de campo —entre ellos lista
  de chequeo, firma, tabla y relación con otros formatos—, formatos y listados,
  categorías y audiencia por rol.
- **Diligenciar**, pensado para el teléfono, con borrador en el dispositivo.
- **Consultar**: respuestas con filtros, anular con motivo, elementos de los
  listados con su historial.
- **Resultados y tablero**: cada formato define lo que se calcula de sus
  respuestas —indicador, tendencia, distribución, tabla, cumplimiento,
  hallazgos, mapa de calor, vencimientos—, y el proyecto los reúne en un
  tablero con pestañas, para el rango de fechas que se elija.
- **Biblioteca SST**: los formatos en papel del cliente, listos para instalar
  con sus resultados y su tablero (`CLAUDE.md` dice cómo).
- **Auditoría** de cada acto importante.

Lo que viene: la exportación a Excel y PDF, los filtros por campo en los
resultados, y la revisión semanal con las firmas de quien autoriza y quien
verifica.

## Quién lo usa

- **Quien administra el proyecto** (propietario o administrador): crea el
  proyecto, invita gente, define roles y diseña los formatos. Suele ser de SST,
  calidad o dirección de obra, y trabaja desde escritorio.
- **Quien diligencia**: conductores, operarios, inspectores. Lo hace a diario,
  desde el teléfono, en la obra, con prisa y a veces con mala conexión.
- **Quien consulta**: revisa las respuestas, los resultados de cada formato y
  el tablero del proyecto.

## Stack técnico

- **Frontend**: Next.js 15 (App Router), React 19, Tailwind CSS 4, shadcn/ui
  sobre Radix UI.
- **Backend y base de datos**: Convex (queries, mutations, actions, auth), en
  un deployment propio.
- **Autenticación**: `@convex-dev/auth` con los proveedores Password y Google;
  Resend para el código de restablecimiento.
- **Estado y utilidades**: Jotai, nuqs, date-fns, sonner, motion, lucide-react.
- **Gráficas**: Recharts.
- **Calidad**: Biome, Vitest, convex-test, Playwright.
- **Gestor de paquetes**: Bun.
- **Móvil**: web responsive instalable como PWA. No hay app nativa: el teléfono
  es esta misma web.

La tabla completa, con la librería canónica de cada propósito, está en
`docs/directives/00-reglas-generales.md §4` y `§5`.

## Estructura del repositorio

| Carpeta | Qué contiene |
|---|---|
| `app/` | Rutas de Next.js. `auth/` es la única pública; `(harmony)/` es la aplicación con sesión. |
| `packages/` | Un módulo por dominio: `auth`, `users`, `projects`, `members`, `roles`, `logs`, `forms`, `dashboard`. Cada uno con su `api.ts`, que es el único acceso a Convex. |
| `convex/` | Backend: schema, funciones, permisos, auditoría y autenticación. `lib/` para los helpers, `__tests__/` para las pruebas. |
| `components/ui/` | Primitivos de shadcn/ui, con modificaciones propias. No se regeneran. |
| `components/harmony/` | La capa propia del sistema de diseño: `HarmonyModal`, `HarmonySheet`, `PageShell`, selectores. |
| `components/providers/` | Providers montados en el layout raíz. |
| `hooks/` | Hooks transversales: los tres de Convex (`useFetch`, `useMutate`, `useExecute`), `useConfirm`, `useDebounce`… |
| `lib/` | Utilidades puras de toda la aplicación. |
| `docs/directives/` | Las siete directrices: la ley del proyecto. |
| `docs/plans/` | Planes de diseño y de implementación, con su estado. |
| `scripts/` | `check-estilo.mjs`, la parte del gate que vigila las clases de Tailwind. |
| `public/` | Estáticos: manifiesto, iconos y service worker. |

## Requisitos

- Node.js 20 o superior.
- Bun.
- Una cuenta de Convex, y un proyecto de Convex **propio** de Harmony Build (no
  se reutiliza el de Harmony).
- Para el restablecimiento de contraseña: una cuenta de Resend con el dominio
  del remitente verificado.
- Para el inicio de sesión con Google: unas credenciales de OAuth de Google
  Cloud.

## Variables de entorno

Viven en **dos sitios distintos**, y confundirlos es el error más frecuente al
montar el proyecto.

**En `.env.local`** (las lee Next.js). Hay una plantilla en `.env.example`:

| Variable | Para qué | ¿Obligatoria? |
|---|---|---|
| `CONVEX_DEPLOYMENT` | El deployment que usa `bunx convex dev`. | Sí; la escribe `convex dev` |
| `NEXT_PUBLIC_CONVEX_URL` | El cliente de Convex en el navegador. Sin ella la aplicación no arranca. | Sí; la escribe `convex dev` |
| `NEXT_PUBLIC_POSTHOG_KEY` | Observabilidad. Sin ella, los errores se quedan en consola. | No |
| `NEXT_PUBLIC_POSTHOG_HOST` | El host de PostHog. | No |
| `E2E_EMAIL`, `E2E_PASSWORD` | La cuenta con la que corre `bun run test:e2e`. La suite la crea si no existe. | Sólo para los e2e, y sólo contra un deployment de desarrollo |

**En el deployment de Convex** (las leen las funciones del backend). No van en
`.env.local`: se definen con `bunx convex env set`.

| Variable | Para qué | Si falta |
|---|---|---|
| `SITE_URL` | La dirección de la aplicación, para las redirecciones de autenticación. | Falla la vuelta desde Google. |
| `JWT_PRIVATE_KEY` | Firma de la sesión. | Ningún inicio de sesión funciona. |
| `JWKS` | Verificación de la sesión. | Ningún inicio de sesión funciona. |
| `AUTH_RESEND_KEY` | Envío del código de restablecimiento. | **El restablecimiento parece funcionar y el correo no llega.** Ver el aviso de abajo. |
| `AUTH_GOOGLE_ID` | Inicio de sesión con Google. | El botón de Google falla; lo demás funciona. |
| `AUTH_GOOGLE_SECRET` | Inicio de sesión con Google. | El botón de Google falla; lo demás funciona. |

## Conectar con Convex

Pasos para enlazar un proyecto de Convex nuevo. Se hacen una vez por
deployment: el de desarrollo de cada persona, y el de producción.

**1. Crear o elegir el proyecto de Convex.**

```bash
bunx convex dev --configure
```

Pregunta por el equipo y el proyecto, y escribe `CONVEX_DEPLOYMENT` y
`NEXT_PUBLIC_CONVEX_URL` en `.env.local`. Después se queda observando y
desplegando `convex/`; se puede dejar corriendo.

**2. Generar las claves de autenticación.**

```bash
bunx @convex-dev/auth
```

Genera `JWT_PRIVATE_KEY` y `JWKS`, pregunta por la dirección de la aplicación
para `SITE_URL` —en desarrollo, `http://localhost:7778`— y define las tres en el
deployment.

**3. Definir la clave de Resend.**

```bash
bunx convex env set AUTH_RESEND_KEY …
```

El remitente del correo está escrito en `convex/resend.ts`; su dominio tiene que
estar verificado en la cuenta de Resend a la que pertenece la clave.

**4. Definir las credenciales de Google.**

```bash
bunx convex env set AUTH_GOOGLE_ID …
bunx convex env set AUTH_GOOGLE_SECRET …
```

En la consola de Google Cloud, la URI de redirección autorizada es la del
**deployment de Convex**, no la de la aplicación:
`https://<tu-deployment>.convex.site/api/auth/callback/google`.

**5. Comprobar.**

```bash
bunx convex env list
```

Deben aparecer las seis. Y el restablecimiento de contraseña se prueba
**recibiendo un código de verdad**.

> **Aviso: sin `AUTH_RESEND_KEY`, el restablecimiento de contraseña parece
> funcionar pero el correo no llega.** El formulario responde siempre «Si el
> correo está registrado, recibirás un código», exista o no la cuenta y se haya
> enviado o no el correo: es deliberado, para no revelar qué correos tienen
> cuenta. La consecuencia es que un fallo de configuración no se ve desde la
> interfaz. Si el código no llega, se mira en los registros del deployment de
> Convex, no en el navegador.

Para producción se repiten los pasos 2 a 5 contra el deployment de producción
(`bunx convex env set --prod …`), con `SITE_URL` apuntando al dominio real.

## Desarrollo local

1. Instala las dependencias:

```bash
bun install
```

2. Levanta Convex en modo desarrollo, en una terminal aparte (la primera vez,
   sigue antes «Conectar con Convex»):

```bash
bunx convex dev
```

3. Inicia la aplicación:

```bash
bun dev
```

La aplicación corre en `http://localhost:7778`.

## Scripts

| Script | Qué hace |
|---|---|
| `bun dev` | Next.js en modo desarrollo, con Turbopack, en el puerto `7778` y escuchando en `0.0.0.0`. |
| `bun run build` | Build de producción. |
| `bun run start` | Servidor de producción. |
| `bun run check` | **El gate**: `tsc --noEmit && biome lint . && node scripts/check-estilo.mjs`. |
| `bun run typecheck` | Sólo `tsc --noEmit`. |
| `bun run biome` | Sólo `biome lint .`. |
| `bun run format` | `biome check --write .`: reformatea. |
| `bun run test` | Pruebas unitarias y de Convex (Vitest). |
| `bun run test:watch` | Vitest en modo observador. |
| `bun run test:e2e` | Pruebas de extremo a extremo (Playwright). También `test:e2e:headed` y `test:e2e:ui`. |

Antes de cada commit: `bun run check` y `bun run test`. En GitHub, CI corre los
dos en cada push a `main` y en cada pull request.

## Rutas clave

| Ruta | Qué es |
|---|---|
| `/auth` | Autenticación. La única ruta pública. |
| `/` | Redirige a `/projects`. |
| `/projects` | Redirige al primer proyecto activo, o abre la bienvenida. |
| `/projects/[projectId]` | Inicio del proyecto, con el tablero. |
| `/projects/[projectId]/formats/[formId]/results` | Resultados de un formato. |
| `/projects/[projectId]/registros` | Auditoría. |
| `/projects/[projectId]/ajustes` | Ajustes del proyecto. |
| `/projects/[projectId]/ajustes/usuarios` | Miembros. |
| `/projects/[projectId]/ajustes/roles` | Roles. |

## Notas de acceso

- El middleware protege todas las rutas salvo `/auth` y redirige a ella si no
  hay sesión. Quien ya tiene sesión y entra a `/auth` va a `/projects`.
- El middleware sólo comprueba la sesión. **La autorización vive en Convex**:
  cada función comprueba la pertenencia al proyecto y, para escribir, la llave
  de permiso.
- Un proyecto tiene un **código de unión** de 12 caracteres que no caduca.
  Quien lo usa entra como miembro sin rol: ve el proyecto y no puede tocar nada
  hasta que alguien le asigne un rol. Sólo lo ve y lo renueva quien puede
  invitar; renovarlo invalida el anterior.

## Móvil

Harmony Build es una aplicación web y nada más: el alcance móvil es **web
responsive instalable como PWA**. No hay app nativa ni envoltorio. Como quien
diligencia lo hace desde el teléfono, las pantallas de captura se diseñan
primero para pantalla estrecha, y las de administración, primero para
escritorio (`docs/directives/02-reglas-nextjs.md §7`).

## Observabilidad (PostHog)

Opcional. Con `NEXT_PUBLIC_POSTHOG_KEY` definida, los errores del cliente
—todo lo que pasa por `logError` (`lib/logging.ts`) y las excepciones no
capturadas— se envían a PostHog. Sin ella, el provider no inicializa nada y la
aplicación funciona igual: es deliberado, para desarrollar y correr el gate sin
cuenta ni red.

La variable se lee **en tiempo de build**: cambiarla en el hosting no hace nada
hasta el siguiente despliegue. Grabación de sesión y autocaptura se apagan
desde el código del provider.

Las excepciones del backend no pasan por aquí: se reportan con la integración
de excepciones de Convex, que se configura en su panel, por deployment.
