# 01 · Reglas de Convex

> Backend de Harmony Build: funciones, schema, el contrato `api.ts`, validación,
> el **modelo de permisos completo**, auditoría, coste de las lecturas, cascadas
> de borrado, migraciones y autenticación. Esta es la ley del directorio
> `convex/` y de cómo el frontend habla con él.

> [!NOTE]
> El repositorio conserva `.github/instructions/convex.instructions.md`, el
> compendio de reglas oficiales del framework. Es **tooling de referencia, no
> gobernanza del proyecto**: este documento resume e impone las reglas oficiales
> de alto impacto (§1) y añade las convenciones específicas de Harmony Build (§2
> en adelante). Ante duda sobre una API de Convex, la fuente primaria es
> <https://docs.convex.dev>.

---

## 1. Reglas oficiales de Convex que imponemos (resumen)

Estas son de Convex, no inventadas por el proyecto, pero son **obligatorias**.

| Regla | Detalle |
|---|---|
| **Validators en toda función pública** | Toda `query`/`mutation`/`action` pública lleva `args` con validators de `convex/values`. Los tipos de TS no existen en runtime → sin validator hay hueco de seguridad. |
| **Forma de objeto** | Siempre `export const f = query({ args, handler })`, nunca la forma de función suelta. |
| **Auth dentro de la función** | Verifica la identidad con `getAuthUserId(ctx)` en toda función pública. **Nunca** autorices a partir de argumentos manipulables (un `userId` que llegue por `args`). |
| **Índices, no `.filter()`** | Usa `.withIndex()`. Reserva `.collect()` para conjuntos acotados; si el conjunto crece con la operación del cliente, acota por período o pagina (§6). |
| **`internal.*` en scheduler y `runMutation`** | A `ctx.scheduler` y a `ctx.runMutation` se les pasan referencias `internal.*`, nunca `api.*`. La auditoría se escribe con `ctx.runMutation(internal.logs.create, …)` (§5.5). |
| **Actions para efectos** | Mutations = transaccionales y deterministas, sin `fetch` ni llamadas externas. Todo lo que haga I/O externo (correos vía Resend, APIs) va en un `action`. |
| **Lógica en helpers TS** | Mantén la lógica reutilizable en helpers de `convex/lib/` y los wrappers de función delgados. |

---

## 2. El contrato `api.ts` por paquete (regla dura del proyecto)

> [!CAUTION]
> **Un componente NUNCA importa `@/convex/_generated/api`.** El único acceso a
> datos de Convex desde el frontend es a través del `api.ts` de un paquete, que
> envuelve los endpoints con los hooks `useFetch` / `useMutate` / `useExecute`.
> Esta es la convención más importante del sistema de paquetes.

### 2.1 Cómo se ve

```ts
// packages/roles/api.ts
import { api } from "@/convex/_generated/api";
import { useFetch } from "@/hooks/use-fetch";
import { useMutate } from "@/hooks/use-mutate";

export const useCreateRole = () => useMutate(api.roles.create);
export const useUpdateRole = () => useMutate(api.roles.update);
export const useRemoveRole = () => useMutate(api.roles.remove);

export const useGetRoles = (data: typeof api.roles.get._args) =>
  useFetch(api.roles.get, data);
```

- `useFetch` → envuelve `useQuery` (lecturas reactivas). Devuelve
  `{ data, isLoading }`.
- `useMutate` → envuelve `useMutation` (escrituras). Devuelve `{ mutate, data,
  error, isPending, isSuccess, isError, isSettled }` con callbacks
  `onSuccess`/`onError`/`onSettled`.
- `useExecute` → envuelve `useAction` (acciones largas: correos, APIs externas).

El detalle de estos tres hooks está en `02-reglas-nextjs §6`.

**Las acciones de sesión siguen la misma regla.** `useAuthActions` de
`@convex-dev/auth/react` se importa **sólo** en `packages/auth/api.ts`, que lo
reexpone como `useSignIn` y `useSignOut`. No abre un canal de datos, pero es
igualmente acceso al backend, y esparcirlo deja la capacidad de autenticación
repartida por paquetes que no son el suyo.

**Tipado de argumentos**: usa `typeof api.<dominio>.<fn>._args` en la firma del
hook en vez de redeclarar la forma a mano. Si el validator cambia, el hook falla
en compilación en vez de mentir.

### 2.2 Qué sí puede importar un componente

Importar `@/convex/_generated/dataModel` es **legítimo** en cualquier componente:
`Id<"…">` y `Doc<"…">` son el vocabulario de tipos del proyecto y no abren un
canal de datos. Lo que esta regla prohíbe es `_generated/api`, que sí lo abre.

**Módulos puros de `convex/`**: el frontend puede importarlos cuando la regla
que contienen debe ser **una sola** en los dos runtimes. Un módulo es apto sólo
si no importa nada de `convex/_generated/`, `convex/server` ni React — es TS
puro, y por eso ambos bundlers lo resuelven sin arrastrar un runtime que no
tienen. Casos vigentes:

| Módulo | Servidor | Cliente |
|---|---|---|
| `convex/lib/password_policy.ts` | `validatePasswordRequirements` en `convex/auth.ts` | medidor de fuerza de `packages/auth` |
| `convex/lib/error_messages.ts` | mensaje de los `ConvexError` | texto de validación previa al envío (`authErrors.weakPassword` en `/auth`) |
| `convex/lib/join_codes.ts` | `projects.create` y `projects.newJoinCode` generan el código con `JOIN_CODE_LENGTH` | todo formulario que pida el código valida contra la misma longitud |
| `convex/permissions.ts` | `permissionsSchema` en el schema y en los `args` de `roles.*` | `packages/roles/lib/permissions.ts`, **sólo con `import type`** (§5.3) |
| `convex/lib/result_types.ts`, `result_definition.ts` | `formResults.create` y `update` validan la definición con `resultProblem`; `compute` dice con ella qué resultado quedó sin su campo | el editor de resultados ofrece los mismos tipos, operaciones y campos, y valida antes de enviar (`packages/forms/lib/result-draft.ts`) |
| `convex/lib/date_buckets.ts` | `result_compute.ts` agrupa por día, semana o mes; `formResults.compute` mide el rango | `packages/forms/lib/results-range.ts` calcula los atajos del rango |
| `convex/lib/import_types.ts` | `formImports.writeBatch` resuelve cada fila con `importSections`: lo que una importación no exige | `packages/forms/lib/import-rows.ts` revisa las filas con las mismas secciones antes de enviarlas; los límites (`IMPORT_LIMITS`) son los mismos en los dos lados |

La razón es la de §5: si la regla vive dos veces, una de las dos se queda atrás,
y la que se queda atrás siempre es la del servidor. Esto **no** relaja §2: sigue
prohibido importar `_generated/api`, que es lo que abre un canal de datos.

**Al revés, hay módulos que el cliente no debe importar aunque sean puros**: un
catálogo grande de datos importado desde `packages/` entra entero en el bundle
del navegador. Lo que pesa se consulta con una query, no se importa.

### 2.3 Excepciones legítimas y deuda

Importan `api` sin ser el `api.ts` de un paquete, y es correcto:

- Los **hooks de infraestructura** de `hooks/` (`use-fetch`, `use-mutate`,
  `use-action`, `use-generate-upload-url`) y los **providers** de
  `components/providers/`: **son** la capa de infraestructura, no componentes.
- Las **pruebas** (`convex/__tests__/`), que llaman a las funciones por su
  referencia.
- La **utilería de limpieza de e2e**, cuando exista: un route handler que sólo
  responde fuera de producción (`04 §3`).

**Deuda: ninguna.** Ningún componente de `packages/` importa `_generated/api`
ni `convex/react`. Si aparece uno, se migra su acceso a datos al `api.ts` del
paquete en el mismo cambio que lo toca; no se anota y se deja.

---

## 3. Organización de `convex/`

```
convex/
├── schema.ts               # Fuente de verdad de tablas e índices;
│                           #   exporta `affectedEntityTypes` y `memberRoles`
├── permissions.ts          # permissionsSchema: las 8 llaves (ver §5.3)
├── colors.ts               # Paleta de 24 colores compartida con el schema
├── projects.ts             # crear, editar, transferir, eliminar y purgar;
│                           #   código de unión (§5.8, §6.1)
├── members.ts              # lecturas de miembros, cambio de rol, expulsión
├── roles.ts                # roles personalizados **y** las funciones de
│                           #   autorización (§5.2)
├── logs.ts                 # auditoría: `create` interna, `writeSystemLog`
│                           #   y las lecturas (§5.5)
├── formResults.ts          # los resultados de un formato: definirlos y
│                           #   calcularlos para un rango de fechas (§6)
├── formImports.ts          # importar registros desde un archivo: empezar,
│                           #   escribir por lotes, cerrar y deshacer (§5.6)
├── formTrackings.ts        # los asuntos de un seguimiento: abrir, completar
│                           #   una etapa y la bandeja
├── formDigests.ts          # reconstruir los resúmenes diarios de un
│                           #   formato; sólo funciones internas (§7.3)
├── dashboards.ts           # el tablero del proyecto: leerlo y guardarlo
├── formLibrary.ts          # `installSst`, interna: instala la biblioteca
│                           #   SST, con sus resultados y su tablero; con
│                           #   `update` y `resetDashboard` los pone al día
├── demoData.ts             # siembra de demostración; sólo funciones
│                           #   internas (`04 §7`)
├── users.ts                # perfil del propio usuario
├── upload.ts               # URL de subida al storage (exige sesión)
├── auth.ts / auth.config.ts# @convex-dev/auth (§9)
├── resend.ts               # el proveedor del código de restablecimiento
├── http.ts                 # rutas HTTP: sólo las de auth
│
├── lib/                    # helpers de TypeScript (sin registrar funciones)
│   ├── auth.ts             #   requireAuth
│   ├── error_messages.ts   #   catálogos de mensajes en español, uno por dominio
│   ├── join_codes.ts       #   JOIN_CODE_LENGTH
│   ├── password_policy.ts  #   la política de contraseñas (§9.2)
│   ├── dates.ts            #   todayInColombia
│   ├── date_buckets.ts     #   fechas de negocio agrupadas por día, semana
│   │                       #     o mes; puro
│   ├── response_digest.ts  #   lo que un resultado necesita de una
│   │                       #     respuesta: su resumen; puro
│   ├── form_digests.ts     #   `digestAdd`, `digestRemove`, `digestRange`:
│   │                       #     mantener y leer los resúmenes diarios
│   ├── tracking.ts         #   etapas, consecutivo y «vencido» de un asunto
│   │                       #     de seguimiento; puro (§2.2)
│   ├── import_types.ts     #   lo que una importación exige y lo que
│   │                       #     perdona, y sus límites; puro (§2.2)
│   ├── result_types.ts     #   los once tipos de resultado, sus piezas, sus límites y lo
│   │                       #     que devuelve cada uno; puro (§2.2)
│   ├── result_definition.ts#   qué puede pedir un resultado de un formato:
│   │                       #     `resultProblem`, `resultName`; puro (§2.2)
│   ├── result_compute.ts   #   `computeResult`: de las respuestas de un
│   │                       #     rango a lo que pinta una gráfica; puro
│   ├── result_coverage.ts  #   el programa: si se inspeccionó todo lo que
│   │                       #     tocaba; puro
│   ├── result_tracking.ts  #   el seguimiento: si se cierra lo que se
│   │                       #     abre; puro
│   ├── result_validators.ts#   validadores de `formResults.config` y de
│   │                       #     `dashboards.tabs`; `WIDGET_SIZES`
│   └── text.ts             #   normalizeText, isSameName
│
├── sst_library/            # la biblioteca de formatos SST: datos, no
│   │                       #   funciones
│   └── results.ts          #   `SST_RESULTS` y `SST_DASHBOARD`: los
│                           #     resultados y el tablero que instala
│
└── __tests__/              # pruebas con convex-test (ver 04)
    └── helpers.ts          #   montaje y siembra compartidos
```

Lo que **no existe**, a propósito: `convex.config.ts` (no hay componentes de
Convex), `crons.ts` (no hay tareas programadas) y cualquier módulo de
migraciones (§7.2). Cada uno nace con su primer consumidor, y este árbol se
actualiza en el mismo cambio.

Reglas de ubicación:

- **Queries y mutations** de un dominio → `convex/<dominio>.ts`.
- **Actions** (I/O externo) → junto a su dominio, marcadas como `action`. Si un
  dominio acumula varias, se separan en `<dominio>Actions.ts` (camelCase, §8).
- **Lógica reutilizable sin registrar función** → `convex/lib/`. Aquí **no** se
  hace `query({…})`; son helpers de TS que las funciones importan.
- **Mensajes de error de dominio** (español) → `convex/lib/error_messages.ts`,
  un objeto exportado por dominio.
- **Helpers de autorización** → `convex/roles.ts` (pertenencia y permisos) y
  `convex/lib/auth.ts` (identidad). No se duplican en cada dominio.

---

## 4. Validación y errores

### 4.1 Piezas

| Pieza | Rol |
|---|---|
| Validators de `convex/values` en `args` | Frontera de tipos en runtime. Obligatorio. |
| `convex/lib/error_messages.ts` | Catálogo de mensajes en español, un objeto por dominio (`projectsErrors`, `membersErrors`, `rolesErrors`, …). |
| `ConvexError` | El único mecanismo de error del backend. Se lanza con un mensaje del catálogo, nunca con una cadena literal escrita en el sitio. |
| `lib/convex-error-handler.ts` (cliente) | `handleConvexError`, `showConvexError`, `handleConvexErrorCallback` — parsean el error, limpian el stack y muestran el toast. |
| `convex/lib/text.ts` | `normalizeText` recorta y colapsa espacios: es la forma en la que se guarda **todo nombre escrito por una persona**. |

### 4.2 Reglas

- **Nunca** `throw new ConvexError("texto suelto")`. El texto vive en el catálogo
  del dominio, y el catálogo es lo único que se traduce o se corrige.
- Todo dominio nuevo añade su objeto `<dominio>Errors` a
  `convex/lib/error_messages.ts` con, como mínimo, las llaves canónicas que le
  apliquen: `unauthorized`, `userNotAuthenticated`, `insufficientPermissions`,
  `<entidad>NotFound`, y una por cada regla de forma que valide
  (`invalidName`, `invalidCode`…).
- **El frontend nunca muestra `err.message` crudo**: pasa siempre por
  `handleConvexErrorCallback` en el `onError` de la mutación.
- **Lo que el formulario valida en el navegador, el servidor lo vuelve a
  validar.** Las reglas de forma (longitudes, rangos, formatos, dependencias
  entre campos) se comprueban **explícitas en el handler antes de escribir**,
  con el mensaje del catálogo. `validateProjectFields` (`convex/projects.ts`) y
  `validateRoleName` (`convex/roles.ts`) son la referencia. No hay librería de
  esquemas instalada para esto, ni hace falta una capa obligatoria en todo
  endpoint.
- **Una query que sostiene una página no lanza por falta de acceso: devuelve
  `null`.** Que el proyecto no exista, o que no sea de quien pregunta, es un
  estado por el que se pasa al navegar fuera de uno recién eliminado; lanzar
  ahí tumba la página entera (`projects.getById`, `members.current`). Una
  lectura cuyo acceso depende de una **llave** sí lanza
  `insufficientPermissions` (`logs.*`): ahí la falta de permiso es la
  respuesta, no un estado de paso.

### 4.3 El orden canónico de un handler

Toda mutation de dominio sigue esta secuencia, en este orden. Es el patrón que
`convex/roles.ts` implementa de referencia:

```ts
export const update = mutation({
  args: { id: v.id("roles"), name: v.string(), ...permissionsSchema },
  handler: async (ctx, args) => {
    // 1 · Identidad
    const userId = await getAuthUserId(ctx);
    if (userId === null)
      throw new ConvexError(rolesErrors.userNotAuthenticated);

    // 2 · Existencia de la entidad (y de su padre, hasta llegar al proyecto)
    const role = await ctx.db.get(args.id);
    if (!role) throw new ConvexError(rolesErrors.roleNotFound);

    // 3 · Permiso, siempre contra el projectId derivado del documento
    const hasPermission = await checkPermission({
      ctx, userId, permission: "editRoles", projectId: role.projectId,
    });
    if (!hasPermission) throw new ConvexError(rolesErrors.cannotEditRoles);

    // 4 · Validación de forma, con el mensaje del catálogo
    const { id, name: rawName, ...permissions } = args;
    const name = validateRoleName(rawName);

    // 5 · Escritura
    await ctx.db.patch(id, { name, ...permissions });

    // 6 · Auditoría (ver §5.5)
    await ctx.runMutation(internal.logs.create, {
      description: `Rol actualizado: ${name} (${countGranted(permissions)} permisos)`,
      type: "update",
      projectId: role.projectId,
      affectedEntityType: "role",
      affectedEntityId: id,
    });

    return id;
  },
});
```

> [!CAUTION]
> **El `projectId` del permiso se deriva del documento, nunca del argumento.**
> Un `projectId` que llega por `args` junto al `id` de una entidad es un dato
> del cliente: comprobar el permiso contra él permite operar sobre una entidad
> de otro proyecto pasando el propio. Se lee siempre del documento ya cargado
> (`role.projectId`, `member.projectId`).
>
> La única forma legítima de recibir `projectId` por argumentos es **al crear o
> al listar**, cuando todavía no hay documento del que derivarlo: ahí el permiso
> se comprueba contra ese mismo `projectId`, que es también el que se guarda
> (`roles.create`). Y todo **otro** id que llegue en la misma llamada tiene que
> demostrar que pertenece a ese proyecto: `members.update` rechaza un
> `customRoleId` cuyo `projectId` no es el del miembro.

---

## 5. Modelo de permisos

Los permisos se aplican **server-side**: Convex es la fuente de verdad. El gating
de UI es solo UX y nunca reemplaza esta capa. La fuente canónica de las llaves es
`convex/permissions.ts`.

### 5.1 Principios

1. **Nomenclatura `<acción><Dominio>`** en camelCase: `editProject`,
   `inviteUsers`, `viewLogs`. Los validators de Convex exigen identificadores
   `[A-Za-z0-9_]`.
2. **Aditivo, nunca sustractivo**: los permisos otorgan. Faltar un permiso = sin
   acceso. No existe "deny override".
3. **Visible, nunca oculto**: la UI respeta permisos **ocultando** la acción con
   `<RoleGate>`, sin botones deshabilitados con tooltips crípticos.
4. **Tres niveles de identidad** dentro de un proyecto, en orden de poder. Son
   los tres literales de `members.role` (`memberRoles` en `convex/schema.ts`):
   - `owner` — **propietario**: todo, y **sólo él elimina o transfiere el
     proyecto**. Hay exactamente uno por proyecto.
   - `admin` — **administrador**: todo lo demás, sin necesidad de llaves.
   - `member` — **miembro**: lo que digan las llaves booleanas de su **rol
     personalizado** (`customRoleId`). **Sin rol, sólo lee.**
5. **No hay nivel por encima del proyecto.** No existe la tabla `superAdmins`
   ni ninguna identidad que cruce proyectos: ser propietario de un proyecto no
   concede nada en otro.
6. **Reflejado en auditoría**: toda acción con permiso que tiene éxito escribe en
   `logs` (§5.5).

### 5.2 Las funciones de autorización

| Función | Dónde | Qué comprueba |
|---|---|---|
| `requireAuth(ctx)` | `convex/lib/auth.ts` | Identidad. Devuelve el `userId` o **lanza** `authErrors.userNotAuthenticated`. Es lo único que queda en ese módulo. |
| `populateMember(ctx, userId, projectId)` | `convex/roles.ts` | Devuelve la fila de `members` de esa persona en ese proyecto, o `null`. La base de las otras cuatro. |
| `hasProjectAccess(ctx, userId, projectId)` | `convex/roles.ts` | Pertenencia al proyecto. Es el gate de **lectura**. |
| `checkPermission({ ctx, userId, projectId, permission? })` | `convex/roles.ts` | Pertenencia **más** la llave concreta. Es el gate de **escritura**. Propietario y administrador pasan siempre; un miembro, sólo con la llave en su rol. **Sin `permission`, sólo pasan los dos niveles altos.** |
| `isProjectAdmin(ctx, userId, projectId)` | `convex/roles.ts` | Los dos niveles altos de §5.1: propietario o administrador. Para lo que un rol personalizado no debe alcanzar por sí solo. |
| `isProjectOwner(ctx, userId, projectId)` | `convex/roles.ts` | El nivel más alto. Eliminar y transferir el proyecto. |

**Regla**: toda query de dominio pasa por `hasProjectAccess`; toda mutation de
dominio pasa por `checkPermission`. No hay tercera vía.

**Las llaves de lectura son la excepción, y también van en la query.** Cuando
una llave gobierna *ver* algo —`viewLogs`— la comprobación es `checkPermission`
**dentro de la query**, no `hasProjectAccess`: pertenecer al proyecto no es lo
mismo que poder ver su auditoría. `checkPermission` ya incluye la pertenencia,
así que sustituye al gate de lectura, no se suma a él.

**Lo que no pasa por una llave, y por qué:**

| Operación | Gate | Motivo |
|---|---|---|
| `projects.create`, `projects.join` | sólo sesión | Son las que **crean** la pertenencia: antes de ellas no hay miembro contra el que comprobar. |
| `projects.remove`, `projects.transfer`, `projects.getDeletionImpact` | `isProjectOwner` | §5.1: son sólo del propietario. Ninguna llave las concede. |
| Cambiar `members.role` (ascender a administrador o degradar), expulsar a un administrador | llave **más** `isProjectAdmin` | Ver el aviso de escalada, abajo. |
| `members.remove` sobre uno mismo | sólo pertenencia | Salir por cuenta propia no pide llave. |
| `users.updateName`, `users.updateImage`, `users.current` | sólo sesión | Es el perfil de quien llama; el `userId` sale de la sesión. |
| `formLibrary.installSst`, `demoData.seedDay`, `writeDay`, `filesFor`, `seedIssues`, `formImports.purge`, `formDigests.rebuild`, `rebuildProject` | **internas** (`internalMutation`, `internalAction`, `internalQuery`) | No tienen sesión ni llave: las ejecuta quien administra el deployment con `bunx convex run`, y la aplicación no las alcanza. No son una superficie sin sesión (§5.7). |

> [!CAUTION]
> `checkPermission` es `async`. **Sin `await` devuelve una `Promise`, que es
> siempre truthy**, y el `if (!hasPermission)` de abajo no se cumple jamás: el
> permiso queda desactivado sin que nada falle ni avise. No lo detecta ni el
> tipado ni el linter, porque el valor se asigna a una variable. Al leer un
> handler, comprobar el `await` antes que la llave.

> [!CAUTION]
> **Una llave no puede escalar por la jerarquía.** `assignRoles` reparte roles
> personalizados; mover a alguien a `admin` —que concede todos los permisos—
> exige estar ya en los dos niveles altos (`isProjectAdmin`). Sin esa
> comprobación, quien tiene la llave más baja se asciende a sí mismo o a un
> cómplice. Lo mismo al expulsar: `expelUsers` no alcanza para echar a un
> administrador. Y **el propietario no se toca desde `members`**: ni cambia de
> rol ni sale ni es expulsado; la propiedad sólo se mueve con
> `projects.transfer`, que cambia a la vez la fila de `members` y
> `projects.userId`. Un proyecto sin propietario no lo puede eliminar ni
> transferir nadie.

### 5.3 Las llaves

Dieciséis, todas `v.boolean()` **obligatorias**, tal como viven en
`convex/permissions.ts`. No hay llaves opcionales ni retiradas: el proyecto nace
sin documentos previos, así que no hay rol que pueda carecer de una.

> [!IMPORTANT]
> **El catálogo es uno solo, y el tipo lo garantiza.** `convex/permissions.ts` es
> la fuente; `packages/roles/lib/permissions.ts` deriva su `PermissionValue` de
> ella con `import type` y cierra el archivo con una comprobación de
> exhaustividad. Si el schema gana una llave que la UI no ofrece, **deja de
> compilar** con el nombre de la llave que falta.
>
> Esta red existe porque, donde las dos listas son independientes, divergen:
> una llave que vive en el schema sin casilla en la UI de roles no se puede
> activar nunca, y nadie lo nota porque nada las ata.

| Dominio | Llave | Qué gobierna (el `checkPermission` que la consume) |
|---|---|---|
| **Proyecto** | `editProject` | `projects.update`: nombre, código, colores, logo, archivar y reactivar. `dashboards.save`: armar el tablero. |
| | `inviteUsers` | `projects.getJoinCode` y `projects.newJoinCode` (§5.8). |
| | `expelUsers` | `members.remove` sobre otra persona. |
| **Roles** | `createRoles` | `roles.create`. |
| | `editRoles` | `roles.update`. |
| | `deleteRoles` | `roles.remove`. |
| | `assignRoles` | `members.update`: asignar o quitar un rol personalizado. |
| **Auditoría** | `viewLogs` | `logs.getByProject`, `logs.getLogDetails`. |
| **Formatos** | `createForms` | `forms.create`, `forms.duplicate`. |
| | `editForms` | `formTrackings.configure`; `formVersions.saveDraft`, `publish`, `discardDraft`, `getDraft`; `forms.updateDetails`, `setTitleField`; `formCategories.*`; `forms.listCatalogs`; `formResults.create`, `update`, `remove`. |
| | `deleteForms` | `forms.archive`, `unarchive`, `remove`. |
| | `fillForms` | `formTrackings.open` y `completeStage` (con la audiencia del seguimiento); sin `viewResponses`, `formTrackings.list` devuelve sólo los asuntos propios. `formResponses.submit` (con la audiencia del formato), `formResponses.listMine` («Mis respuestas»: sólo las propias, siempre), `formFiles.generateUploadUrl`, `formEntries.searchEntries`. Sin `viewResponses`, `formResponses.list` devuelve sólo las propias. |
| | `viewResponses` | `formResponses.list` y `getById` de las respuestas de todos; `formEntries.listEntries`, `listEntryHistory`; `formResults.compute` y `dashboards.get`, que son agregados de ellas. |
| | `voidResponses` | `formResponses.void`. |
| | `editCatalogs` | `formEntries.createEntry`, `updateEntry`, `setEntryActive`; lectura de todos los elementos de un listado, y con ella `formResults.compute` sobre un listado. |
| | `importResponses` | `formImports.start`, `writeBatch`, `finish`, `revert`, `entryTitles`: importar respuestas en un formato y elementos en un listado, y deshacer una importación. No pide `fillForms` ni `editCatalogs`: importar no es diligenciar. `formImports.list` la admite junto a la llave de ver las respuestas. |

Quien tiene `createForms`, `editForms` o `deleteForms` ve además los
borradores. Las reglas de acceso completas del módulo están en
`docs/plans/2026-09-28-modulo-de-formatos-design.md` («Reglas de acceso») y se
implementan en un solo sitio, `convex/lib/form_access.ts`. Las de resultados y
tablero, en `docs/plans/2026-10-09-resultados-y-tablero-design.md` («Reglas de
acceso»): no añaden llaves.

Al añadir una llave nueva:

1. Se declara en `convex/permissions.ts` y se le da casilla en
   `packages/roles/lib/permissions.ts` en el mismo cambio (si no, no compila).
2. Se documenta en la tabla de arriba, con el `checkPermission` que la consume.
3. **Si ya existen roles guardados en algún deployment con datos reales**, una
   llave obligatoria nueva hace que el push falle: los documentos viejos no la
   tienen. Entonces entra con el patrón de §7.1 —se declara
   `v.optional(v.boolean())`, se rellena en los roles existentes y sólo después
   se hace obligatoria—. Una llave ausente **deniega**: `checkPermission`
   compara con `=== true`.

> [!CAUTION]
> Una llave que no gobierna ninguna comprobación server-side es una promesa
> vacía: la UI oculta un botón y la API sigue abierta. Antes de añadir una llave,
> localiza el `checkPermission` que la va a consumir.

#### Llaves que sólo gobiernan la UI

**Ninguna hoy.** Las dieciséis tienen su comprobación en el servidor.

La categoría existe y es legítima: una llave puede corresponder a una
**pantalla que compone operaciones ya gateadas por separado** y no a un
endpoint propio. Refina la UI por debajo de lo que el servidor distingue, pero
**no es una barrera**: quien tiene la llave base puede hacer la operación por
otro camino. Si alguna vez se introduce una, se anota aquí con la llave que la
protege de verdad, o el próximo que lea la lista supondrá que gatea algo.

### 5.4 Gating en el cliente

```tsx
<RoleGate permissions={["createRoles"]}>
  <Button>Nuevo rol</Button>
</RoleGate>
```

`RoleGate` (`packages/roles/components/role-gate.tsx`) acepta
`validationType: "all" | "any"` (por defecto `any`), `inverse` y `fallback`
(lo que se pinta cuando no hay permiso; sin él, nada). `owner` y `admin` pasan
siempre; un miembro, según las llaves de su rol. Es **solo UX**: la misma
comprobación existe en el servidor o el permiso no existe.

Cuando hace falta la respuesta y no un envoltorio, `usePermissions()`
(`packages/roles/store/use-permissions.ts`) la da para el proyecto de la ruta:
`can(permissions, validationType)`, `isOwner` e `isElevated` (propietario o
administrador). Un componente pregunta por ahí, **no** comparando
`member.role` a mano (`06 §2.3`).

Lo que es sólo del propietario —eliminar y transferir— no se gatea con una
llave, porque ninguna lo concede: se gatea con `isOwner`.

### 5.5 Auditoría

`logs` registra cada operación relevante con tres tipos de entidad
(`affectedEntityType`: `project`, `member`, `role`) y cuatro tipos de acción
(`create`, `update`, `delete`, `info`). Reglas:

- **Toda mutation que crea, modifica o borra una entidad de dominio escribe su
  log**, después de la escritura y dentro de la misma mutation.
- La descripción es una frase en español con el nombre de la entidad
  (`"Rol eliminado: Inspección"`), no un volcado de campos. Cuando una
  operación significa algo más preciso que «actualizado», lo dice:
  `projects.update` escribe «Proyecto archivado» o «Proyecto reactivado» cuando
  lo que cambió fue `active`.
- Se rellena siempre `projectId`, `affectedEntityType` y `affectedEntityId`.
- **`logs.create` es `internalMutation` y no acepta `userName`.** El autor se
  resuelve dentro de la mutation a partir de la sesión. Si fuera pública, o si
  el nombre llegara por `args`, cualquiera con sesión podría dejar constancia
  inventada —el texto que quisiera, en el proyecto que quisiera, firmada con el
  nombre de otro—, que es exactamente lo que un registro de auditoría no puede
  permitir.
- **Lo que la plataforma hace sola firma como «Harmony Build».** Una tarea
  agendada no tiene sesión y `logs.create` la exige, así que las mutations
  internas que actúan sin persona escriben con `writeSystemLog`
  (`convex/logs.ts`), que fija el autor (`SYSTEM_AUTHOR`) y **exige
  `projectId`**: una entrada sin proyecto no la vería nadie.
- **`logs.projectId` es opcional por una sola razón**: la entrada «Proyecto
  eliminado» va **sin** él, para sobrevivir a la purga que el propio borrado
  agenda (§6.1). Es la única. Ninguna otra escritura omite el proyecto, y esa
  entrada no se lee desde la aplicación: queda en el panel de Convex.
- Añadir un tipo de entidad nuevo obliga a extender, en el mismo cambio:
  **`affectedEntityTypes` en `convex/schema.ts`** —una sola constante, que
  `convex/logs.ts` importa—, el `switch` de `logs.getLogDetails` que resuelve
  la entidad relacionada, y el mapa de títulos de
  `packages/logs/lib/log-utils.ts` —un `Record` sobre el tipo, que deja de
  compilar hasta que la entidad nueva tenga su título—. Con la unión escrita
  dos veces, añadir un tipo al schema deja la mutation rechazándolo.

**Leer la auditoría también se autoriza.** Las tres lecturas exigen `viewLogs`:

| Lectura | Ámbito |
|---|---|
| `getByProject({ projectId, from, to })` | El proyecto pedido, acotado al intervalo `[from, to)` en milisegundos. El intervalo lo calcula el cliente, que es quien conoce la zona horaria de quien mira, y se resuelve **dentro del índice** (§6). |
| `getLogDetails({ logId })` | El ámbito se **deriva del propio log** (`log.projectId`), nunca de un argumento. Devuelve el documento afectado, así que sin ese gate es una lectura arbitraria de documentos (§10). Un log sin proyecto no lo lee nadie. |

`getLogDetails` retira además el `joinCode` del proyecto que devuelve: ver la
auditoría no es poder invitar (§5.8).

**Sin log, a propósito**: `users.updateName` y `users.updateImage`. Son el
perfil del propio usuario, sin proyecto al que asociar la entrada.

### 5.6 Lotes: el ámbito se deriva de cada elemento

Cuando una mutation recibe un **array** de elementos, hay dos errores que se
repiten:

1. **Comprobar el permiso sólo contra el primer elemento.** Basta encabezar la
   lista con un registro propio para escribir en un proyecto ajeno con el resto.
2. **Tomar el `projectId` del propio elemento.** Es un dato del cliente: se
   deriva del documento padre ya cargado, como manda §4.3.

La forma correcta: dentro del bucle, cargar el padre de **cada** elemento,
derivar su proyecto y comprobar el permiso contra él, memoizando en un `Set` o
un `Map` los proyectos ya comprobados. Si un solo elemento cae fuera, el lote
entero se descarta. Lo que **no** vale es comprobar una vez fuera del bucle.

Una `action` no toca la base: su comprobación vive en un `internalQuery` que
recibe el lote completo y devuelve el ámbito de cada elemento.

La única mutation que recibe un arreglo es `formImports.writeBatch`, y lo
cumple de otra manera: **ninguna fila trae ámbito**. El formato y el proyecto
salen de la importación (`formImports`), que se comprobó al empezarla y se
vuelve a comprobar en cada lote; cada relación de cada fila demuestra además
que su elemento es del listado y del proyecto (`resolveValues`). Lo que sí
cambia frente a la regla de arriba es el fallo: una fila que no pasa la
validación **no descarta el lote**, vuelve con su motivo. Eso vale porque lo
que falla es un dato, no un ámbito; un problema de ámbito sigue tumbándolo
todo.

### 5.7 Funciones sin sesión y Server Actions

**No hay ninguna superficie sin sesión.** Harmony Build no tiene vistas
públicas, ni enlaces compartibles sin cuenta, ni API por HTTP: la única ruta
pública es `/auth` (`02 §3.1`), y `convex/http.ts` sólo registra las rutas de
autenticación.

Por tanto, **una función pública sin `getAuthUserId` (o `requireAuth`) es un
error, no una decisión.** Vale hasta para lo que parece inofensivo:
`upload.generatedUploadUrl` exige sesión porque, sin ella, es una URL de
escritura al storage abierta a cualquiera que conozca la dirección del
deployment.

Vale también para las **Server Actions de Next**: `"use server"` crea un
endpoint HTTP invocable con el Action ID del bundle, así que una Server Action
sin comprobación propia es tan pública como una query sin sesión —y gatearla
con `RoleGate` en el componente que la llama no la protege en absoluto—. Lo que
envía correo o escribe datos vive en una `action` o `mutation` de Convex, con
su `checkPermission` server-side.

Si algún día se necesita una superficie sin sesión, entra con plan (`05`) y se
documenta aquí con sus reglas: sólo lectura, sin enumeración, mínimo necesario.

### 5.8 Códigos de invitación

| Código | Longitud | Alfabeto | Caduca | Qué concede |
|---|---|---|---|---|
| `projects.joinCode` | 12 (`JOIN_CODE_LENGTH`, `convex/lib/join_codes.ts`) | `a-z0-9` | no | `member` **sin rol** del proyecto: lee, y no puede tocar nada hasta que alguien le asigne un rol |
| Código de restablecimiento de contraseña | 6 | `a-z0-9` | 15 minutos | cambiar la contraseña de la cuenta a cuyo correo llegó (§9) |

- **Lo lee y lo renueva sólo quien tiene `inviteUsers`**: `projects.getJoinCode`
  y `projects.newJoinCode`. Renovarlo invalida el anterior, y como no caduca,
  **rotarlo es la única forma de revocarlo**.
- Unirse (`projects.join`) es idempotente: quien ya es miembro no gana una
  segunda fila ni cambia de rol.
- La longitud vive en una constante compartida porque la escriben varios
  sitios: quien genera el código y todo formulario que lo pide. Con el número
  repetido en cada uno, un cambio de longitud deja códigos válidos que ningún
  formulario acepta.

> [!CAUTION]
> **El `joinCode` no puede salir en un `...project`.** `projects.get` y
> `projects.getById` **nunca** lo devuelven: pasan por `withLogo`
> (`convex/projects.ts`), que lo retira antes de responder. Sólo llega a quien
> puede rotarlo, por su propia query.
>
> La regla general: **un endpoint que hace *spread* del documento entrega también
> lo que se añada al schema mañana.** En una tabla con secretos —códigos, tokens,
> datos de contacto— se enumeran los campos que salen, no los que no. Por eso
> `members.*` no devuelve nunca el documento de `users` entero, sino
> `publicUser`: nombre, correo, teléfono e imagen.

---

## 6. Coste de las lecturas: ninguna pantalla puede costar «todo el histórico»

Una pantalla cuyo coste crece con la operación acumulada tiene fecha de
caducidad. En una obra, lo que se acumula son las respuestas de los formatos y
la auditoría: cada día añade filas, y ninguna se borra.

**Regla**: una query de pantalla no puede tener un término proporcional al total
histórico de una tabla que crece con la operación. Las formas admitidas de
evitarlo, por orden de preferencia:

1. **Ventana indexada por período.** `_creationTime` cierra todos los índices
   de Convex, así que un intervalo se resuelve dentro del índice sin añadir
   ninguno. `logs.getByProject` es la referencia:

   ```ts
   ctx.db
     .query("logs")
     .withIndex("projectId", (q) =>
       q
         .eq("projectId", args.projectId)
         .gte("_creationTime", args.from)
         .lt("_creationTime", args.to),
     )
     .order("desc")
     .collect();
   ```

   Cuando el período es un campo de dominio y no la fecha de creación, el
   índice lo lleva como último campo (`["projectId", "date"]`).
2. **Paginación**, cuando no hay un período natural que acote.
3. **Conteo acotado con degradación declarada**: `.take(CAP + 1)` y decir «más
   de `CAP`», nunca `.collect().length` (§6.1). Es también la forma de un
   **cálculo** acotado: `formResults.compute` lee las respuestas de un formato
   dentro del rango de fechas (forma 1, índice `formId_date`), hasta 300
   (`RESPONSES_CAP`) y con un rango de 400 días como mucho, y devuelve
   `capped: true` cuando las cifras son de una parte del rango. Hoy es el
   camino de un formato cuyos resúmenes no están al día y el de un
   **seguimiento**, cuyos asuntos cambian después de abrirse y por eso no
   tienen resumen: hasta 300 abiertos en el rango y hasta 500 abiertos hoy,
   que se leen por estado. Un **programa** lee además los elementos activos
   del listado que relaciona, hasta 500.
4. **Un resumen mantenido al escribir** (un agregado, o una tabla derivada que
   se actualiza en la misma transacción que el dato). El caso vivo son los
   **resúmenes diarios** de un formato (`formDayDigests`): lo que un
   resultado necesita de cada respuesta, por formato y día. De ellos calcula
   `formResults.compute` hasta 12.000 respuestas por rango
   (`docs/plans/2026-10-10-resumenes-de-resultados-design.md`). Cumple §7.3.

`.collect()` sin acotar queda reservado a conjuntos que **no** crecen con la
operación: los miembros y los roles de un proyecto.

> [!NOTE]
> Esta regla también obliga al cliente: el período seleccionado viaja en la URL
> (`02 §8`) y llega a la query como argumento. Una pantalla que pide «todo» y
> filtra en el navegador incumple esta sección aunque la query lleve índice.

### 6.1 Cascadas de borrado: la política

**La política está escrita en el schema.** La opcionalidad de cada clave
foránea dice qué hacer cuando muere el padre:

| La FK del hijo es… | Significa | Al borrar el padre |
|---|---|---|
| **Requerida** (`v.id(...)`) | El hijo no existe sin el padre | **Cascada**: se borra |
| **Opcional** (`v.optional(v.id(...))`) | El hijo sobrevive sin el padre | **Anular** el campo |

`roles.remove` anula `members.customRoleId`: el miembro sobrevive a su rol y
queda como miembro sin rol, que sólo lee. `projects.remove` se lleva `members`
y `roles`, cuyo `projectId` es requerido. Las dos aciertan porque siguen la
regla.

Al diseñar una tabla nueva, **la opcionalidad de su clave foránea es una
decisión de borrado**, no de comodidad: se elige pensando en qué pasa con la
fila el día que desaparezca su padre.

#### La excepción consciente: `logs`

`logs.projectId` es opcional y aun así **cascadea** con el proyecto. Es
opcional por la razón de §5.5 —la constancia del borrado—, no porque un log
sobreviva al suyo. Anularlo rompería el gate de autorización, que deriva el
ámbito de `projectId`: un log sin proyecto no lo puede leer nadie. Y fuera de
su proyecto, un log no entra en ninguna otra cascada: borrar un rol o expulsar
a un miembro no borra lo que se escribió sobre ellos.

Toda excepción futura a la tabla de arriba se anota aquí, con su motivo.

#### Se avisa antes de borrar, con cifras

Cuando una cascada destruye datos, el usuario ve **qué** va a destruir antes
de confirmar — no una frase genérica, sino el recuento real:

> Se eliminarán 3 miembros y 2 roles, junto con todos los registros del
> proyecto. Esta acción no se puede deshacer.

La confirmación es `useConfirm` (`03 §3.3`), cuyo `message` es un `string`: el
recuento se compone antes de llamarla, con una función pura
(`packages/projects/lib/deletion-impact-message.ts`). Lo sirve una query propia
—`projects.getDeletionImpact`—, que exige el mismo nivel que el borrado y
cuenta con `.take(CAP + 1)`, nunca con `.collect().length`: a partir del tope
(`IMPACT_COUNT_CAP`) devuelve `capped: true` y la interfaz dice «más de».

Lo que crece sin tope —la auditoría— **no se cuenta**: se nombra. Contarlo
sería la lectura de «todo el histórico» que §6 prohíbe, y el aviso no necesita
la cifra para ser honesto.

**Preferimos avisar sobre bloquear.** Es la decisión de producto: negarse a
borrar un proyecto con datos obliga a un rodeo manual cada vez, mientras que
un recuento honesto en la confirmación evita el borrado accidental sin estorbar
el deliberado.

#### El límite de la transacción manda sobre la elegancia

Una cascada que puede tocar decenas de miles de documentos no cabe en una
transacción. Cuando el volumen no está acotado, la cascada vive en un
`internalMutation` que corre por lotes y **se re-agenda a sí misma** hasta
agotarlas, y `remove` sólo la agenda.

Es lo que hace `projects.remove`: escribe la constancia, borra el logo del
storage y el documento del proyecto, y agenda `projects.purgeProjectData`, que
drena `members`, `roles` y `logs` por lotes de 200 (`PURGE_BATCH`).

Un `internalMutation` de purga no es opcionalmente idempotente: puede reejecutarse
tras un fallo parcial, así que se escribe para tolerarlo. El de proyecto lo es
por construcción: consulta lo que queda por índice y lo borra.

> [!CAUTION]
> **Toda tabla nueva que cuelgue de `projectId` entra en
> `purgeProjectData` en el mismo cambio que la crea**, con su índice por
> `projectId`. Una tabla que se olvida no falla ni avisa: deja filas huérfanas
> de un proyecto que ya no existe, ilegibles para siempre. Si la tabla guarda
> archivos, la purga borra también su `_storage`. Y el recuento de
> `getDeletionImpact` gana su línea en el mismo cambio.

**Las purgas se delegan hacia abajo, no se reimplementan.** Cuando una tabla
hija tenga a su vez hijos que sólo se alcanzan a través de ella, la purga del
proyecto no baja por ese árbol: borra la fila intermedia y agenda la purga de
esa entidad, que ya sabe hacerlo. Una segunda implementación tendría que
redescubrir el mismo camino, y acabaría divergiendo de la primera.

#### La tabla de decisiones

Derivada del schema, padre por padre. «Anular» significa `patch` del campo a
`undefined`; «cascada» significa borrar el hijo.

| Padre | Hijos que cascadean | Hijos que se anulan |
|---|---|---|
| `projects` | `members`, `roles`, `logs`, `formResults`, `dashboards`, su `logo` en `_storage` | — |
| `forms` | `formResults`, `formImports` *(y sus `formVersions`; un formato con respuestas no se elimina, se archiva)* | — |
| `formImports` | Al **deshacerla** (`revert`), las `formResponses` que creó, con sus `formResponseLinks`; en un listado se conserva el elemento que alguna respuesta ya eligió, sin la marca | `formResponses.importId` *(si el registro desaparece con su proyecto, la respuesta se va con él; el campo es opcional para lo que no se importó)* |
| `formResults` | — *(un widget de `dashboards.tabs` que lo señala deja de leerse: `dashboards.get` lo filtra)* | — |
| `roles` | — | `members.customRoleId` |
| `members` | — | — *(los `logs` que lo nombran se conservan)* |
| `users` | *(fuera de alcance: identidad, no dominio)* | — |

`formDayDigests` cuelga de `projectId` y de su formato, y la purga la drena
aparte, de pocos en pocos, porque sus documentos pesan.
`formResults`, `formImports` y `dashboards` cuelgan de `projectId` y están en
la lista de tablas ligeras de `purgeProjectData` (`LIGHT_TABLES`, `convex/projects.ts`).
El resto de las tablas del módulo de formatos —`formCategories`,
`formVersions`, `formResponses`, `formResponseLinks`— está en la purga y
todavía no en esta tabla.

---

## 7. Migraciones de schema

> [!CAUTION]
> **El deploy de schema es de validación estricta.** Convex rechaza el push si el
> schema nuevo no admite campos presentes en documentos viejos. Si quitas un
> campo del validator y existe en algún documento, el push falla con
> `Object contains extra field X that is not in the validator`. Y al revés: si
> añades un campo obligatorio y algún documento no lo tiene, también.

Hoy el proyecto no tiene datos en producción ni migraciones escritas. Esta
sección fija cómo se hará la primera, para que no se improvise el día que haga
falta.

### 7.1 Patrón obligatorio: widen → migrate → narrow (3 deploys)

Para migrar campos existentes, **nunca** en un solo deploy:

1. **Widen**: añadir el campo/tabla nuevos **sin quitar** los legacy del
   validator. Marcar el campo nuevo como `v.optional(...)`. Correr el backfill.
2. **Migrate**: `db.replace(id, { …camposLimpios })` para eliminar los campos
   viejos de cada documento.
3. **Narrow**: recién entonces, quitar los campos legacy del schema y, si
   procede, volver obligatorio el campo nuevo.

Un campo que conceptualmente es obligatorio y está declarado `v.optional(...)`
suele ser un campo a medio migrar. **No lo conviertas en requerido sin correr
el backfill y confirmar que ningún documento lo tiene vacío.**

Mientras un deployment no tenga datos que conservar —el de desarrollo, antes
del primer uso real— el schema se puede cambiar de una vez. La regla de los
tres deploys empieza el día que exista un dato que alguien no quiere perder.

### 7.2 Herramientas

- **`@convex-dev/migrations` no está instalado.** Es la librería canónica para
  backfills idempotentes (`00 §5.1`) y entra con la primera migración: ese
  cambio la instala, crea `convex/convex.config.ts` para registrarla, añade el
  runner y actualiza `00 §4`, `00 §5.1` y el árbol de §3.
- Un backfill es **idempotente**: un segundo run debe procesar cero filas.
- Los backfills leen los campos legacy vía cast: siguen vivos en la base aunque
  ya no estén en el schema hasta el narrow.

### 7.3 Datos derivados

Cuando un dato se guarda **dos veces** —el valor de origen y una copia
denormalizada que consulta otra pantalla— la copia es *derivada*:

1. **Declara la fuente de verdad** en el schema. La copia nunca se edita a mano.
2. **Toda escritura del origen actualiza la copia** en la misma transacción.
3. **Todo cambio de la regla que produce la copia obliga a reconstruirla** para
   los datos existentes. Sin esto, la copia sólo es correcta para lo que se
   escribió después del cambio, y la pantalla que la consume miente en silencio.

Casos vivos en Harmony Build:

- **`projects.userId`** repite quién es el propietario. La fuente de verdad
  para autorizar es la fila `owner` de `members` (`isProjectOwner`);
  `projects.transfer` mueve las dos en la misma mutation, y es el único sitio
  que las toca.
- **`formDayDigests`** resume las respuestas vigentes de un formato por día.
  La fuente es `formResponses`. Lo mantienen `digestAdd` y `digestRemove`
  (`convex/lib/form_digests.ts`), y **toda mutation que escriba, anule o
  retire una respuesta de un formato tiene que llamarlas**. La regla de qué
  entra es `convex/lib/response_digest.ts`; si cambia, sube `DIGEST_VERSION`
  y se reconstruye con `formDigests.rebuild`. Mientras `forms.digestVersion`
  no coincide, los resultados se calculan leyendo las respuestas.
- **`logs.userName`** es una *instantánea* del nombre del autor en el momento
  de escribir, no una copia que se mantenga: si la persona cambia de nombre, la
  auditoría conserva el que firmó. Es deliberado —un registro dice lo que pasó—
  y por eso no se reconstruye.

---

## 8. Nombres de archivo en `convex/` (regla del push)

> [!CAUTION]
> Los nombres de módulo de Convex solo admiten `[a-zA-Z0-9_.]`: **sin guiones.**
> Un archivo `foo-bar.ts` dentro de `convex/` que se exponga vía `_generated/api`
> **falla el push** con
> `InvalidConfig: … can only contain alphanumeric characters, underscores, or periods`.

- Módulos de la raíz de `convex/`: **camelCase** (`projects.ts`, `members.ts`;
  un módulo de dos palabras sería `fooBar.ts`).
- Módulos de `convex/lib/`: **snake_case** (`error_messages.ts`,
  `join_codes.ts`). Es la convención establecida en esa carpeta; no se mezcla.
- Los tests de `convex/__tests__/` usan kebab-case
  (`roles-authorization.test.ts`): el bundler de Convex ignora las carpetas que
  empiezan por `_`, así que no son funciones desplegadas y la restricción no
  aplica. `convex/tsconfig.json` excluye esa carpeta por el mismo motivo; las
  suites las typechequea el `tsconfig.json` de la raíz.
- Al añadir o quitar un módulo, `convex/_generated/api.d.ts` se regenera solo y
  debe **commitearse junto** con el archivo nuevo. `convex/_generated/` está
  versionado, y CI depende de ello (`04 §2.1`).

Esto contrasta con el resto del repo, que usa kebab-case (ver `00 §6`). Es una
excepción impuesta por Convex, no una inconsistencia.

---

## 9. Autenticación

- Auth con **@convex-dev/auth**, con dos proveedores: **Password** y
  **Google**. Configuración en `convex/auth.ts` y `convex/auth.config.ts`.
- **El restablecimiento de contraseña es por código**: `Password` se configura
  con `reset: ResendOTPPasswordReset` (`convex/resend.ts`), que envía por
  Resend un código de 6 caracteres válido 15 minutos. Resend **no** es un
  proveedor de inicio de sesión.
- **El registro no verifica el correo.** `Password` no lleva `verify`. Es una
  decisión, no un olvido, y tiene una consecuencia que hay que recordar: un
  correo de la tabla `users` no está demostrado. Nada debe conceder acceso por
  coincidencia de correo.
- La identidad en funciones se obtiene con `getAuthUserId(ctx)`, o con
  `requireAuth(ctx)` de `convex/lib/auth.ts`, que lanza el error del catálogo en
  vez de repetir el `if (userId === null) throw` en cada handler. Nunca confíes
  en un `userId` que llegue por `args`.
- **Sólo se registran providers que la UI usa.** Un provider configurado y no
  ejercitado es una vía de acceso sin pruebas ni interfaz que la vigile.
- El redireccionamiento de rutas y la detección de sesión viven en
  `middleware.ts` (Next.js). Ver `02 §3.1`. El middleware **no** autoriza: sólo
  redirige por cookie de sesión. La autorización real vive aquí (§5).
- Las variables que todo esto necesita viven en el **deployment de Convex**, no
  en `.env.local`: `SITE_URL`, `JWT_PRIVATE_KEY`, `JWKS`, `AUTH_RESEND_KEY`,
  `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`. El README explica cómo se generan.

> [!CAUTION]
> **Sin `AUTH_RESEND_KEY`, el restablecimiento parece funcionar y el correo no
> llega.** El envío falla en el servidor, pero el formulario de `/auth`
> responde siempre «Si el correo está registrado, recibirás un código»
> (`03 §7.2`), exista o no la cuenta y se haya enviado o no. Es el precio de no
> revelar qué correos tienen cuenta: el fallo de configuración no se ve desde
> la interfaz. Se comprueba en los registros del deployment.

### 9.1 Duraciones (las unidades no coinciden entre sí)

Es el punto donde más fácil se cuela un error silencioso, porque cuatro ajustes
contiguos usan dos unidades distintas:

| Ajuste | Dónde | Unidad | Valor |
|---|---|---|---|
| `session.totalDurationMs` / `inactiveDurationMs` | `convex/auth.ts` | **ms** | 7 días |
| `jwt.durationMs` | `convex/auth.ts` | **ms** | *sin declarar* → 1 hora |
| `cookieConfig.maxAge` | `middleware.ts` | **segundos** | 7 días |
| `maxAge` del código de restablecimiento | `convex/resend.ts` | **segundos** | 15 minutos |

> [!CAUTION]
> **`jwt.durationMs` se deja en su valor por defecto (1 hora).** El JWT no es
> revocable: `signOut` y la invalidación de sesión sólo matan el refresh token,
> así que alargarlo mantiene vivo un token filtrado después de cerrar sesión. La
> duración que el usuario percibe como "no me pide login toda la semana" la da el
> refresh token (`session`), no el JWT.
>
> **`cookieConfig.maxAge` va en segundos.** Pasarle milisegundos no falla ni
> avisa: la cookie simplemente pasa a durar años.

### 9.2 Política de contraseñas

La regla —8 caracteres y 3 de las 4 categorías (mayúscula, minúscula, número,
símbolo)— vive en `convex/lib/password_policy.ts` y se aplica en dos sitios:

1. **`validatePasswordRequirements` en `convex/auth.ts`** — es la que gatea de
   verdad. Sin ella, `@convex-dev/auth` sólo comprueba longitud ≥ 8.
2. **El medidor de fuerza de `packages/auth`** — es sólo UX, para fallar rápido
   con un mensaje claro.

Vale aquí el aviso de §5.3: una regla que sólo existe en el cliente es una
promesa vacía. El módulo compartido está permitido por §2.2 precisamente para
que las dos no puedan divergir.

> [!WARNING]
> `@convex-dev/auth` sigue oficialmente en beta (versiones `0.0.x`) y el proyecto
> está fijado en `0.0.81`; `@auth/core`, en `0.37.0` por compatibilidad. Hay dos
> parches que dependen de esa versión exacta: el de `middleware.ts`, que
> convierte en redirección la respuesta contradictoria de una sesión que ya no
> se puede canjear (`02 §3.1`), y el de la suite de e2e para la rotación del
> token de refresco (`04 §8.1`). **Subir de versión exige volver a probar
> ambos.** Si Convex anuncia deprecación o la beta bloquea una feature, el plan
> B es `@convex-dev/better-auth`.

---

## 10. Lecciones heredadas y deuda documentada

Harmony Build deriva de Harmony, y con el código heredó lo que allí costó
aprender. Esta sección guarda esas lecciones como reglas, y debajo la deuda
propia que se conoce.

### La regla de la lista de IDs

Toda query que reciba **una lista de IDs**, o un id junto a un ámbito: validar
el ámbito no basta si después se leen documentos por ID sueltos. Cada documento
debe demostrar que pertenece al ámbito validado:

```ts
const role = await ctx.db.get(roleId);
if (!role) continue;
if (role.projectId !== args.projectId) continue;
```

Es lo que hace `members.update` con `customRoleId`, y lo que hace
`logs.getLogDetails` al derivar el proyecto del propio log.

### Los patrones que ya fallaron una vez

Cada fila es un agujero que existió en el proyecto de origen. La columna de la
derecha dice dónde está cerrado aquí, para que quien toque ese código sepa qué
está sosteniendo.

| Patrón | Dónde está cerrado |
|---|---|
| Query que sólo comprueba sesión, no pertenencia | `hasProjectAccess` en toda lectura de `members` y `roles`; `viewLogs` en toda lectura de `logs` |
| Escritura que sólo comprueba sesión | `checkPermission` en toda mutation de dominio (§5.2) |
| Permiso comprobado sólo contra el primer elemento del lote | §5.6 |
| Ámbito tomado de `args` en vez del documento | §4.3 |
| `checkPermission` sin `await` | §5.2 |
| Relay de correo sin autenticar (una `action` pública o una Server Action) | §5.7; el único correo que se envía es el del código de restablecimiento, desde el proveedor |
| Mutation sin autenticar | `upload.generatedUploadUrl` exige `requireAuth` |
| Escalada de privilegio por una llave baja | `members.update` y `members.remove` exigen `isProjectAdmin` para tocar la jerarquía (§5.2) |
| Secreto filtrado por *spread* del documento | `withLogo`, `publicUser`, `withoutJoinCode` (§5.8) |
| Ámbito comprobado, entidades no | la regla de la lista de IDs, arriba |
| Autor de la auditoría tomado de `args` | `logs.create` es interna y resuelve el autor de la sesión (§5.5) |

La lección transversal: **el heurístico "¿tiene `getAuthUserId`?" no sirve**.
Casi todos esos endpoints lo tenían. La pregunta es si el documento que
devuelven o escriben demuestra pertenecer al ámbito del usuario.

### Deuda conocida

**Ninguna.** El proyecto nació con dos lecturas heredadas que incumplían estas
reglas y que no consumía ninguna pantalla —`logs.getByUser`, que recorría el
rastro entero de una persona (§6), y `users.getById`, que sólo exigía sesión
(el primer patrón de la tabla de arriba)—. Se retiraron el 28 de septiembre de
2026 en vez de anotarse: una función sin consumidor no es deuda que se paga
después, es código que sobra. Si alguna vuelve, vuelve con su pantalla y
cumpliendo: intervalo dentro del índice, y un proyecto en común con la persona
que se consulta.
