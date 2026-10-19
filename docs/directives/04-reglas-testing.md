# 04 · Reglas de Testing y Calidad

> La estrategia de pruebas de Harmony Build es **pragmática**: un *gate* que
> impide que entre código roto, no un objetivo de cobertura. La pregunta no es
> "¿qué % está cubierto?", sino **"¿de dónde vienen los bugs que de verdad
> duelen?"**. En una plataforma cuya promesa es que el dato de la obra exista
> con nombre, fecha y responsable, la respuesta es clara: **el control de acceso
> entre proyectos**, **la auditoría** y —cuando llegue el módulo de formatos—
> **que una respuesta diligenciada se guarde entera y se lea igual que se
> escribió**. Ahí se invierte primero.

---

## 1. Filosofía

1. **Gate, no cobertura.** El objetivo es un umbral que ningún commit roto cruce,
   no un número. Perseguir porcentaje lleva a tests frágiles de bajo valor.
2. **Invierte donde el fallo es caro.** Un permiso que cruza de un proyecto a
   otro expone los datos de una empresa a otra, y no lo ve nadie hasta que es
   tarde. Esa lógica **sí** merece tests. Un botón que abre un modal, no.
3. **La prueba fija la regresión concreta.** Cuando aparece un defecto, el test
   que lo captura vale más que diez tests genéricos escritos por adelantado.

---

## 2. El gate de pre-commit

Antes de cada commit, en este orden:

```bash
bun run check      # tsc --noEmit (proyecto completo) + biome lint + estilo
bun run test       # pruebas unitarias y de Convex
```

Scripts disponibles en `package.json`:

| Script | Qué corre |
|---|---|
| `check` | `tsc --noEmit && biome lint . && node scripts/check-estilo.mjs` — **el gate**. |
| `typecheck` | Solo `tsc --noEmit`. |
| `biome` | Solo `biome lint .`. |
| `format` | `biome check --write .` — reformatea. Ver §2.2 antes de usarlo. |
| `test` | `vitest run`: unidades y Convex. |
| `test:watch` | Vitest en modo observador. |
| `test:e2e` | Playwright. También `test:e2e:headed` y `test:e2e:ui`. |

**El gate nace en verde y sin deuda.** No hay lista de archivos congelados en
`biome.json` ni ocurrencias toleradas en `scripts/estilo-deuda.json`
(`03 §8.1`). Un `check` en rojo es siempre un cambio que lo rompió, nunca
«lo de siempre».

> [!CAUTION]
> **No alimentes solo archivos staged a `tsc`.** Pierde errores entre archivos.
> `tsc --noEmit` corre siempre sobre el proyecto entero. Biome sí puede operar
> sobre archivos staged.

### 2.1 El gate autoritativo: CI

`.github/workflows/ci.yml` corre `check` y `test` en cada push a `main` y en
cada pull request, en dos trabajos independientes para que el informe diga
cuál falló sin tener que abrir el registro. Un empujón nuevo sobre la misma
rama cancela el anterior.

Es el gate que manda: un hook local se salta con `--no-verify`, CI no.

Los dos trabajos corren **sin ninguna variable de entorno**:
`bun install --frozen-lockfile`, `bun run check` y `bun run test` pasan sobre
un clon limpio. Dos cosas lo permiten y hay que mantenerlas:
`convex/_generated/` está versionado, y `convex-test` corre en memoria sin
deployment.

**Los e2e no corren en CI.** Necesitan el servidor de Next levantado y un
deployment de Convex propio —la suite escribe datos de prueba y los limpia
después—, y usar el de desarrollo desde CI significaría que dos ramas se pisan
los datos. Hasta que exista un deployment de pruebas, se ejecutan en local con
`bun run test:e2e` antes de cerrar una superficie (§3, nivel 3).

Lo que falta, por orden de retorno:

1. **Un deployment de Convex de pruebas**, para meter los e2e en CI.
2. **Hooks de git** (lefthook o husky): Biome sobre staged en `pre-commit`,
   `check` + tests en `pre-push`. Adelantan el aviso; no sustituyen a CI.

### 2.2 Estado de Biome

`biome.json` tiene `recommended: false` y una lista explícita de reglas de
`complexity`, `correctness`, `style` y `suspicious`, más
`nursery/noRestrictedImports` para el trinquete de overlays (`03 §8.1`).
`organizeImports` está desactivado.

**Lint: dentro del gate, y limpio.**

> [!NOTE]
> Una supresión de Biome lleva **siempre** su razón en el comentario
> `// biome-ignore <regla>: <por qué>`, en una sola línea (Biome ignora la
> supresión si el comentario se parte en dos). Una supresión sin razón es una
> regla desactivada a escondidas. Y se suprime el **falso positivo**, con su
> explicación; no se debilita la regla para todo el repositorio.

**Formato: fuera del gate.** `check` corre `biome lint`, no `biome format`. La
regla operativa es: **el archivo que escribes o reescribes, lo dejas
formateado.** Lo que no se hace es reformatear dentro de un cambio funcional
archivos que ese cambio no toca: reformatear 800 líneas por corregir dos
entierra el cambio y arrasa el `git blame` de todo lo demás. Una pasada global
de `bun run format` es una decisión de mantenimiento propia, con su commit
dedicado.

---

## 3. Pruebas automatizadas

Tres niveles. No es una pirámide aspiracional: cada uno tiene su runner
configurado y su sitio.

### Nivel 1 — Vitest sobre lógica pura

Runner: **Vitest 4**. `vitest.config.ts` declara el alias `@`, fija el runtime
automático de JSX, recoge `**/__tests__/**/*.test.ts` y sube `testTimeout` a
20 s: las suites de `convex/__tests__/` montan el schema completo con
`convex-test`, y en arranque en frío ese primer import agota los 5 s por
defecto. El síntoma es un timeout en el **primer** test de cada archivo, que
pasa suelto y falla en la suite entera.

> El patrón recoge **`.test.ts`, no `.test.tsx`**. Lo que se prueba es lógica:
> si para probar algo hace falta montar un componente, lo que hay que extraer
> es la lógica (§5).

Qué se prueba a este nivel:

- **La lógica pura de un paquete**, en `packages/<x>/lib/__tests__/`: la fuerza
  de la contraseña contra la política, los rangos de fechas de la auditoría, el
  proyecto que se abre por defecto, el mensaje del aviso de borrado, la
  evaluación de permisos del `RoleGate`.
- **Las utilidades de `lib/`**: la paleta de colores y sus mapas, el registro de
  errores.
- **El sistema de diseño como regla ejecutable**, en
  `components/harmony/__tests__/`: las clases del armazón de página
  (`page-shell.test.ts` **es** `03 §2.1`), la búsqueda sin tildes de los
  selectores, el orden de las tablas, el selector de hora. Se prueban los
  módulos `*.utils.ts`, no el componente montado.

Todo cálculo del módulo de formatos —un campo calculado, una condición, la
validación de una respuesta— nace con su suite a este nivel.

### Nivel 2 — `convex-test` sobre backend crítico

**`convex-test`** es el mock oficial del backend. El montaje y la siembra se
comparten en `convex/__tests__/helpers.ts`:

```ts
import { convexTest } from "convex-test";
import schema from "../schema";

export function setupTest() {
  return convexTest(schema, import.meta.glob("../**/*.ts"));
}
```

`helpers.ts` exporta además `seedProject` —un proyecto con los tres niveles de
identidad de `01 §5.1`, un miembro sin rol y alguien de fuera que pertenece a
**otro** proyecto—, `grant` para conceder llaves al rol sembrado y
`NO_PERMISSIONS`. Una suite nueva parte de ahí; no escribe su propia siembra.

**La sesión se simula en cada suite**, no en el helper: Vitest iza `vi.mock`
dentro del archivo que lo declara.

```ts
const authState = vi.hoisted(() => ({
  userId: null as Id<"users"> | null,
}));

vi.mock("@convex-dev/auth/server", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@convex-dev/auth/server")>();
  return { ...actual, getAuthUserId: async () => authState.userId };
});

// dentro de cada prueba:
authState.userId = s.adminId;
```

Qué cubren las suites de `convex/__tests__/`, y qué tiene que seguir cubierto
aunque se reescriban:

| Suite | Lo que fija |
|---|---|
| `roles-authorization.test.ts` | **La matriz de permisos**: los tres niveles de identidad contra las ocho llaves; que sin llave pedida sólo pasen los dos niveles altos; que un miembro sin rol lea y no escriba; que ser propietario de otro proyecto no conceda nada en éste; que el ámbito de editar un rol salga del rol y no de quien llama. |
| `projects.test.ts` | Crear deja un propietario y un código; las lecturas **nunca** devuelven `joinCode`; el código sólo lo lee y lo renueva quien tiene `inviteUsers`; unirse concede `member` sin rol una sola vez; transferir mueve la fila y `projects.userId` a la vez; sólo el propietario elimina; la purga drena lo suyo y no toca al vecino. |
| `members.test.ts` | **Las escaladas**: `assignRoles` no asciende a administrador, `expelUsers` no expulsa a uno, el propietario ni cambia ni sale; un rol de otro proyecto no se acepta; las lecturas no devuelven el documento de `users` entero. |
| `logs.test.ts` | El autor sale de la sesión; sin sesión no se escribe; lo que hace la plataforma lo firma la plataforma; leer exige `viewLogs`; el intervalo se respeta; una entrada sin proyecto no la lee nadie; el día se calcula en hora de Colombia. |
| `form-results.test.ts` | **Resultados y tablero**: definir un resultado exige `editForms` y queda en auditoría; alguien de otro proyecto no lo toca; se rechaza lo que no cuadra con los campos del formato y lo que pasa del tope; `compute` es de quien ve las respuestas de todos, no cuenta las anuladas, devuelve `null` con un rango que no lo es y dice qué resultado quedó sin su campo; el tablero lo ve `viewResponses` y lo arma `editProject`, no acepta un resultado de otro proyecto ni ids repetidos, y deja de mostrar el que se borró; borrar el formato y purgar el proyecto se llevan lo suyo; `installSst` instala resultados y tablero sin repetirlos, y sólo con `update` o `resetDashboard` toca lo que ya estaba; un **programa** espera a todos los elementos activos de su listado, también al que nunca se inspeccionó. |

| `form-imports.test.ts` | **Importar**: exige `importResponses` y diligenciar no basta; alguien de otro proyecto no escribe, cierra, deshace ni lee; sólo quien empezó continúa; la fecha del hecho entra hacia atrás y no hacia delante; firma, imagen, archivo, tabla y lista completa no se exigen, y lo demás sí; una fila mala no tumba el lote; la relación la compone el servidor, admite un elemento inactivo y rechaza uno de otro proyecto; un listado omite o actualiza por título; deshacer retira lo suyo y su cuenta, y conserva el elemento que ya se usó; la purga del proyecto y el borrado del formato se llevan el registro. |
| `form-digests.test.ts` | **Resúmenes diarios**: un año de 700 respuestas se calcula entero; lo que sale de los resúmenes es **idéntico** a lo que sale de leer las respuestas; no guardan lo que ningún resultado mira; diligenciar suma, anular resta y deshacer una importación retira lo suyo; un formato con respuestas anteriores se calcula con tope hasta reconstruirlo, y reconstruir es idempotente; la purga se los lleva. |
| `form-trackings.test.ts` | **Seguimientos**: cada etapa tiene campos y ninguna va condicionada; abrir guarda sólo la primera etapa, con su consecutivo y su título; completar avanza en orden, **no toca lo ya completado** y cierra con la última; un asunto sigue con la versión con que se abrió; no se diligencia ni se importa; alguien de otro proyecto no abre ni completa; la bandeja separa abiertos y cerrados y da sólo los propios a quien no ve los de todos; anular lo saca de los abiertos; sus **resultados** dicen cuánto se abrió, cuánto se cerró y qué sigue abierto y vencido, no cuentan lo anulado, son de quien ve las respuestas de todos y no admiten los tipos de una inspección. |

Cada caso de esas suites corresponde a un agujero de `01 §10`. **Una prueba de
aislamiento ataca desde fuera**: con la sesión de alguien que pertenece a otro
proyecto, contra los endpoints públicos.

Los helpers que reciben `ctx` —`checkPermission`, `hasProjectAccess`— se
prueban **llamándolos dentro de `t.run`**, sin pasar por una función pública:
ese es su contrato real.

> [!CAUTION]
> **No cuelgues una aserción del scheduler de `convex-test`.** Las cascadas
> grandes se drenan en un `internalMutation` agendado (`01 §6.1`), y el mock no
> lo ejecuta de forma fiable: una prueba que espere a que la purga agendada
> corra puede pasar aislada y fallar en conjunto. Peor aún, una prueba que sólo
> comprobara que algo *sigue* ahí pasaría en verde por el motivo equivocado.
>
> **Invoca la purga directamente**, que además es donde vive la lógica. Y como
> la mutation pública dejó una agendada que nadie va a consumir, ciérrala al
> final o disparará tras el teardown:
>
> ```ts
> await t.mutation(api.projects.remove, { id: s.projectId });
> await t.mutation(internal.projects.purgeProjectData, {
>   projectId: s.projectId,
> });
> await t.finishInProgressScheduledFunctions();
> ```
>
> Si aun así la suite lanza `Write outside of transaction …
> _scheduled_functions` —sólo al correr muchos archivos, nunca al correr el
> archivo solo—, falta ceder el turno antes de terminar:
> `await new Promise((resolve) => setTimeout(resolve, 0));`.

Qué merece cubrirse a continuación, por orden:

- **Cada tabla nueva que cuelgue de `projectId`**: que `purgeProjectData` la
  drene y no toque la del proyecto vecino. Es la prueba que convierte en
  ejecutable el aviso de `01 §6.1`.
- **Cada llave nueva**: su fila en la matriz de permisos, y el caso de quien no
  la tiene.
- **Las cascadas por opcionalidad**: por cada padre de la tabla de `01 §6.1`,
  que sus hijos de clave requerida desaparezcan y los de clave opcional queden
  con el campo anulado —no borrados—.

> [!NOTE]
> `convex-test` es un **mock**: no aplica límites de tamaño ni de tiempo reales,
> no hay crons, y no debe depender del formato de IDs ni del texto exacto de un
> error que no sea del catálogo. Siempre haz un smoke manual del código nuevo.

### Nivel 3 — Playwright sobre flujos reales

`playwright.config.ts`: `testDir` en `./e2e`, `baseURL` en
`http://localhost:7778`, `fullyParallel`, y cuatro proyectos —`setup`, que
inicia sesión y guarda el estado en `e2e/.auth/user.json`; `cleanup`, su
teardown; `chromium`, autenticado; y `chromium-unauth`, que recoge los
`*.unauth.spec.ts`—.

Lo que cubre hoy `e2e/`:

| Archivo | Qué recorre |
|---|---|
| `auth.setup.ts` | Registra la cuenta de pruebas (o entra, si ya existe), crea su proyecto si aparece la bienvenida, y guarda la sesión. |
| `auth.unauth.spec.ts` | La pantalla de acceso, el mensaje único ante credenciales inválidas, y que toda ruta sin sesión manda a `/auth`. |
| `auth.spec.ts` | Con sesión, `/auth` lleva al proyecto. |
| `project.spec.ts` | Inicio, ajustes generales, usuarios, código de unión, y el ciclo de un rol: crearlo, verlo en auditoría y eliminarlo. |
| `helpers.ts` | La cuenta y el proyecto de pruebas, `gotoApp`, `goToProject`, `openSettingsArea`, `reSignInIfNeeded`. |

Falta por cubrir, y entra con la próxima superficie que lo toque: unirse con un
código desde una segunda cuenta, transferir y eliminar un proyecto.

Convenciones e2e:

- **Datos aislados por test.** Las suites corren en paralelo; dos tests que
  comparten un nombre de entidad se pisan. Todo lo que la suite crea lleva un
  prefijo reconocible (`e2e-`) y un sufijo único.
- **Selectores acotados al contenedor relevante** cuando la UI repite etiquetas.
- **Assertions sobre el resultado de negocio**, no sobre la mecánica de la UI.
- **La limpieza borra sólo lo que lleva el prefijo**, sólo para el usuario de
  pruebas y nunca en producción. Su utilería de backend es interna o exige
  sesión; el route handler que la invoque es la excepción documentada al
  contrato `api.ts` (`01 §2.3`).
- **Las credenciales del usuario de pruebas no se escriben en el código.** Se
  leen de `E2E_EMAIL` y `E2E_PASSWORD`, que `playwright.config.ts` carga de
  `.env.local`: una cuenta cuya contraseña está en el repositorio existe en
  todo deployment contra el que se haya corrido la suite.
- **Los e2e no corren en CI** mientras no exista un deployment de pruebas
  (§2.1).
- Las lecciones de operar la suite están en §8.

> [!NOTE]
> **Lo que se prueba de una feature que depende de un servicio externo es su
> interfaz.** Una prueba no envía un correo de verdad ni llama a una API de
> terceros en cada ejecución: sería dinero, segundos y un resultado distinto
> cada vez, y §5 prohíbe las pruebas que dependen de la red. Los datos se
> siembran; la lógica se cubre con `convex-test`.

---

## 4. Bug de producto vs. test obsoleto

Cuando un test falla, **clasifica el fallo antes de tocar nada**. Esta es la
regla más importante del documento y la que más veces se rompe bajo presión.

- Si el fallo revela un **bug real o una regresión visible para el usuario**,
  se arregla el producto primero.
- Si el comportamiento del producto es correcto y el test está **obsoleto,
  frágil, ambiguo o afirma lo equivocado**, se arregla el test.

### 4.1 La regla dura

**Nunca debilites un test para que pase mientras el comportamiento está roto.**

❌ No hagas:
- eliminar la assertion que prueba el resultado de negocio;
- sustituir la validación del resultado por una comprobación superficial de UI;
- añadir esperas, reintentos o cambios de selector que tapan un defecto real;
- documentar un bug del producto como si fuera comportamiento aceptable.

✅ Sí haz:
- dejar el test en rojo mientras el bug exista;
- reparar el comportamiento visible;
- actualizar el test para que valide el resultado buscado de forma clara y
  estable;
- registrar la lección en estas directrices **sólo si generaliza** más allá del
  bug concreto.

### 4.2 Triaje de un fallo e2e

1. Confirma cuál es el comportamiento de negocio esperado.
2. Decide si está roto el producto o el test.
3. Si está roto el producto: arréglalo y **mantén la assertion fuerte**.
4. Si el producto es correcto: haz el test más preciso o menos frágil, **sin
   reducir cobertura**.
5. Si el patrón se repite, documéntalo aquí.

**Ejemplo.** Un test llena el formulario de rol, pulsa `Guardar` y no se crea
nada. Eso es un bug de producto: se arregla el flujo de creación y se mantiene la
assertion de que el rol existe después de guardar. **No** se cambia el test
para verificar solamente que el modal se cerró.

---

## 5. Qué NO hacer

- ❌ Perseguir un porcentaje de cobertura como objetivo.
- ❌ Tests de UI que solo verifican que un componente renderiza.
- ❌ Depender de detalles de implementación de Convex (formato de ID, texto exacto
  de un error interno) en los tests. El texto de un error **del catálogo** sí se
  puede afirmar, importándolo de `convex/lib/error_messages.ts`, no copiándolo.
- ❌ Saltarse el gate con `--no-verify` para "arreglarlo después".
- ❌ Escribir un test que dependa del reloj real o de la red.
- ❌ Reformatear medio repositorio dentro de un cambio funcional.
- ❌ Escribir una siembra propia en una suite de Convex en vez de usar la de
  `helpers.ts`.

---

## 6. Convenciones

- **Ubicación**: en `__tests__/` junto al código que prueban
  (`convex/__tests__/`, `packages/<x>/lib/__tests__/`, `lib/__tests__/`,
  `components/harmony/__tests__/`). Nombre kebab-case `<tema>.test.ts`.
- **Runner**: Vitest. Los tests de Convex corren en el mismo entorno por defecto
  que los unitarios; si algún día se necesita `edge-runtime`, se separa con
  `projects` en `vitest.config.ts`.
- **Nombres**: `describe` por función, módulo o regla; `it` describiendo el
  comportamiento esperado, **en español**, como una frase que se pueda leer en
  el informe: *«`assignRoles` reparte roles, pero no asciende a administrador»*.
  Cuando la prueba fija una directriz, la cita (`"los tres niveles de identidad
  (01 §5.1)"`).
- **Datos**: sin dependencias de red ni de reloj real; usa fake timers de Vitest
  cuando el tiempo importe. Una función que depende del momento **recibe el
  instante** en vez de leerlo (`todayInColombia(now)`), y así se prueba sin
  reloj.
- **Fixtures doradas** para los cálculos: un caso real congelado vale más que
  veinte casos sintéticos. Cuando el módulo de formatos calcule algo, su caso
  dorado sale de un formato real de la obra.
- **Los nombres de la siembra son del dominio**: una obra, una inspectora, un
  conductor. Una prueba se lee mejor cuando sus datos se parecen a los de
  verdad.

---

## 7. QA manual

Lo que no está automatizado se cubre con QA manual. Hoy no hay procedimientos
escritos; cuando se introduzcan, viven en `docs/qa/` y **no** en este documento.

Mínimo exigible al cerrar cualquier feature no trivial, antes de darla por
terminada:

```
□ Recorrí el flujo completo en la aplicación real, no solo en tests.
□ Lo revisé en tema claro y en tema oscuro (03 §6.1).
□ Lo revisé a 390px de ancho y en escritorio (02 §7.1). Si es una pantalla de
  captura, el teléfono es la prueba principal, no la secundaria.
□ Probé el camino de error: sin permiso, sin datos, como miembro sin rol.
□ Lo probé con cada nivel de identidad al que afecta: propietario,
  administrador, miembro con rol, miembro sin rol (01 §5.1).
□ Verifiqué que la acción quedó registrada en el log cuando corresponde (01 §5.5).
□ Corrí el gate de §2.
```

> Una pantalla vacía no dice si la vista funciona: el recorrido se hace con
> datos de densidad real. Una siembra de demostración es **sólo para
> desarrollo** —funciones internas, invocables únicamente con
> `bunx convex run`, que marcan con un prefijo todo lo que crean, no modifican
> nada preexistente y saben borrar sólo lo suyo— y se documenta en esta
> sección.

**La siembra que existe: `convex/demoData.ts`.** Escribe las respuestas
ficticias de un día en los formatos publicados de un proyecto, para recorrer
los resultados y el tablero con datos:

```bash
bunx convex run demoData:seedDay '{"projectId":"…","date":"2026-10-08",
  "plan":[{"formId":"…","count":6,"failRate":0.08}],
  "signature":"<PNG en base64>","image":"<JPEG en base64>"}'
```

- Es genérica: genera un valor por **tipo de campo** a partir de la versión
  publicada, sin conocer ningún formato. `hints` (por id de campo: `min`,
  `max`, `texts`) acerca los datos a los de una obra. En una relación,
  `texts` son los títulos de los elementos entre los que se elige: sin eso,
  la inspección de la planta elige cualquier equipo del listado.
- `demoData:seedIssues` hace lo mismo con un **seguimiento**: abre asuntos
  con la fecha que se le diga y cierra una parte (`closeRate`,
  `closeWithin`). No sube archivos.
- Hasta 40 respuestas por llamada. Se siembra **del día más viejo al más
  nuevo**: la fecha de negocio aquí se elige, y el orden de creación tiene que
  seguir siendo el de las fechas.
- Con semilla: la misma llamada da los mismos valores.
- Todo pasa por `resolveValues`, igual que una respuesta de verdad.

> [!CAUTION]
> **Todavía no cumple la regla de arriba.** No marca lo que crea, suma al
> `responseCount` de cada formato y no sabe retirar lo sembrado: sus respuestas
> son indistinguibles de las reales. Hasta que lo haga, **no se ejecuta en un
> deployment con datos que alguien quiera conservar**.

---

## 8. Lecciones de operar la suite

Tres defectos que no están en el código que se prueba, sino en el entorno de la
prueba. Los tres engañan: el síntoma aparece lejos de la causa.

### 8.1 La sesión compartida de la suite se rota sola

Toda la suite arranca del mismo `e2e/.auth/user.json`, y Convex Auth **rota** el
token de refresco: en cuanto un contexto lo usa, el que guarda el fichero deja
de valer y **todos los contextos siguientes aterrizan en `/auth`**.

El síntoma engaña mucho:

- Fallan pruebas que no tienen nada que ver, veinte o treinta posiciones más
  adelante, cada una agotando su tiempo de espera.
- La que rompe la sesión **pasa en verde**.
- Aisladas, todas pasan.
- El mensaje habla de un elemento que no aparece, nunca de la sesión. Hay que
  abrir la captura para ver que es la pantalla de entrada.

Un helper de navegación que reintenta no basta si su espera revienta antes de
poder reintentar: la navegación ya terminó, en `/auth`.

**La suite tiene que volver a entrar sola.** Todo helper de navegación de
`e2e/` comprueba si aterrizó en `/auth` y, si es así, rellena el formulario,
guarda el estado recién emitido y sigue. Sólo cuesta cuando de verdad ha
caducado. Es un parche atado a la versión fijada de `@convex-dev/auth`
(`01 §9`).

> **Lo que encuentra este defecto es leer el error de la primera prueba que
> falla**, no la cola del informe. Las teorías que se persiguen antes —los
> workers en paralelo, la memoria del servidor, un `beforeAll` que no devuelve
> el estado— son todas ciertas a medias, y ninguna es la causa.

### 8.2 Navega pulsando enlaces; abre una dirección sólo si eso es lo que pruebas

Un `page.goto` recarga la aplicación entera. Dentro de una prueba, moverse
pulsando enlaces es más rápido y además comprueba que el camino existe:

```ts
// Mal: recarga entera para ir a otra pantalla
await page.goto(`/projects/${projectId}/ajustes`);

// Bien: lo que haría una persona
await page.getByRole("link", { name: "Ajustes", exact: true }).click();
await page.waitForURL(/\/ajustes/);
```

Cuando lo que se prueba **es** abrir una dirección —un enlace con filtros, una
ruta a la que no se tiene acceso—, se usa el helper de navegación que aguanta
el rebote de §8.1.

> Ese helper no espera a que se desmonte la pantalla de arranque. Esa espera
> cuesta su tiempo completo cuando la pantalla no llega a aparecer, y
> multiplicada por cada llamada convierte una suite de minutos en una de
> cuartos de hora. Lo que venga después ya tiene su propia espera.

### 8.3 Al borrar ficheros, vacía `.next`

Turbopack sigue sirviendo el grafo de módulos que tenía cacheado. Un fichero
borrado —o una dependencia que `bun remove` podó— sigue compilándose desde la
caché, y el error aparece **donde no está la causa**: una importación que ya no
existe, o un paquete con otra estructura de directorios.

El síntoma más caro es que el overlay de error de Next tapa la página entera, y
entonces Playwright falla en el `setup` con
`<nextjs-portal> intercepts pointer events` — que no dice nada del fichero
culpable.

```bash
kill <pid de next-server> && rm -rf .next && bun dev
```

`tsc` y `biome` pasan igual, porque leen el disco. La caché no.
