# Base del proyecto

**Fecha:** 2026-09-28 · **Estado:** implementado (2026-09-28)

> Este documento es un **registro**, no una propuesta: la base se construyó por
> encargo directo el mismo día, derivándola de Harmony, y aquí queda por qué
> quedó como quedó. `05 §5` prohíbe escribir un plan después para justificar lo
> hecho; lo que sigue no justifica, anota. Las decisiones que todavía puede
> cambiar quien dirige el producto están al final, como preguntas abiertas.

## Objetivo

Tener en pie lo que cualquier módulo de Harmony Build necesita antes de existir:
entrar, crear un proyecto, sumar gente, repartir permisos y dejar rastro.

## Problema

Harmony resuelve todo eso, pero para otra forma de empresa: una organización
con varios espacios de trabajo, super administradores por encima, y un dominio
—clientes, puestos, turnos, novedades— del que dependen hasta sus piezas más
básicas. Sus tres gates de escritura llaman a las copias de seguridad; su
módulo de organizaciones importa agregados, asistente y jornada mensual; su
auditoría conoce a los clientes. Copiar la carpeta no daba una base: daba
Harmony con agujeros.

## Dirección aprobada

### 1. Un solo nivel: el proyecto

Una constructora no piensa en «organización y espacios»: piensa en obras. El
**proyecto** hereda la identidad de la organización de Harmony (nombre, logo,
dos colores) y el modelo de acceso de su espacio (miembros, roles, código de
unión).

- *Descartado: conservar los dos niveles* (empresa → obras). Es más fiel a
  Harmony y habría sido menos trabajo, pero pone por delante un nivel que en
  esta fase no contiene nada: ni catálogos de empresa, ni facturación, ni
  formatos compartidos. Si algún día varias obras comparten formatos, ese
  nivel entra con su plan.

### 2. Tres niveles de identidad, sin tabla aparte

`members.role` es `owner`, `admin` o `member`. Desaparece `superAdmins`.

| Nivel | Puede |
|---|---|
| Propietario | Todo. Sólo él transfiere y elimina el proyecto. Hay exactamente uno. |
| Administrador | Todo lo demás, sin necesidad de llaves. |
| Miembro | Lo que digan las llaves de su rol personalizado. Sin rol, sólo lee. |

- *Descartado: conservar `superAdmins`.* Con un nivel, super administrador y
  administrador son el mismo concepto en dos tablas, y obligaba a fabricar un
  «miembro sintético» para quien tenía acceso sin tener fila.

### 3. Ocho llaves, todas obligatorias

`editProject`, `inviteUsers`, `expelUsers`, `createRoles`, `editRoles`,
`deleteRoles`, `assignRoles`, `viewLogs`. De las 54 que declara Harmony, son
las que no dependen de su dominio. El proyecto nace sin documentos previos, así
que ninguna es opcional ni hay llaves en retirada.

### 4. Aditivo, no sustractivo

El repositorio se construyó **añadiendo** lo necesario a un proyecto vacío, no
quitándole a una copia de Harmony lo que sobraba. Es más trabajo al principio y
garantiza lo que la otra vía no puede: que no quede código de turnos dormido
en un rincón. De 66 dependencias quedaron 37.

Se conserva la familia `Harmony*` (`HarmonyModal`, `components/harmony/`,
`app/(harmony)/`): es el mismo sistema de diseño, y renombrarla tocaba cientos
de importaciones sin cambiar nada para quien usa el producto.

### 5. Lo que se corrigió al portar

Cosas que en Harmony estaban mal o a medias y aquí nacen bien:

- **El código de unión ya no viaja en las lecturas generales.** Se pide aparte
  (`projects.getJoinCode`) y sólo lo recibe quien puede invitar.
- **Un rol personalizado tiene que ser del proyecto del miembro.**
  `members.update` lo comprueba; en Harmony bastaba con conocer el id.
- **Expulsar a un administrador exige ser administrador.** Con la llave
  `expelUsers` sola se podía.
- **Los modales de miembros y roles usan `HarmonyModal`.** En Harmony eran
  cuatro entradas de la lista de deuda congelada.
- **Las credenciales de la cuenta de pruebas salen del entorno**, no del
  código.
- **Dos lecturas sin consumidor que incumplían las reglas se retiraron**
  (`logs.getByUser`, `users.getById`) en lugar de anotarse como deuda.
- **El proyecto nace sin deuda**: `scripts/estilo-deuda.json` vacío y
  `biome.json` sin lista de excepciones.

## Reglas de acceso

| | Sin sesión | Miembro sin rol | Miembro con rol | Administrador | Propietario |
|---|---|---|---|---|---|
| `/auth` | Sí | — | — | — | — |
| Cualquier otra ruta | Va a `/auth` | | | | |
| Inicio del proyecto | — | Sí | Sí | Sí | Sí |
| Actividad reciente y Registros | — | No | Con `viewLogs` | Sí | Sí |
| Ajustes → General (leer) | — | Sí | Sí | Sí | Sí |
| Ajustes → General (editar, archivar) | — | No | Con `editProject` | Sí | Sí |
| Ajustes → Usuarios | — | No | Con `inviteUsers`, `expelUsers` o `assignRoles` | Sí | Sí |
| Ajustes → Roles | — | No | Con `createRoles`, `editRoles` o `deleteRoles` | Sí | Sí |
| Salir del proyecto | — | Sí | Sí | Sí | No: antes transfiere |
| Transferir y eliminar | — | No | No | No | Sí |

El middleware sólo comprueba que haya sesión. Todo lo demás se decide en
Convex, función por función.

## Verificación

Hecha el 2026-09-28 contra un deployment local de Convex:

- `bun run check`: en verde.
- `bun run test`: 137 pruebas en 17 suites, 42 de ellas del backend.
- `bun run test:e2e`: 15 pruebas.
- `bun run build`: en verde, 8 rutas.
- Recorrido en el navegador, en escritorio y en teléfono: registro, bienvenida,
  crear proyecto, inicio, ajustes, crear y eliminar un rol, invitar, registros.

Sin verificar, porque dependen de credenciales que el deployment local no
tiene: el inicio de sesión con Google y el envío real del código de
restablecimiento de contraseña.

## Preguntas abiertas

Ninguna bloquea el módulo de formatos. Son decisiones de producto que la base
tomó por omisión.

1. **¿Un proyecto archivado es de sólo lectura?** Hoy archivar sólo lo saca de
   lo que se abre por defecto; se puede seguir trabajando en él. En
   construcción, una obra entregada que nadie debe tocar es un caso real.
2. **¿Hay un límite de proyectos por cuenta?** Harmony limitaba a dos
   organizaciones. Aquí no hay límite: es una decisión comercial.
3. **¿El código de unión caduca?** Hoy no. Concede sólo lectura, pero de todo
   el proyecto.
4. **Los textos de marca de la pantalla de acceso** («Del papel de la obra al
   dato que decide» y el aviso al pie) son provisionales: los escribió quien
   construyó la pantalla y nadie de producto los ha aprobado.
5. **El logotipo es el de Harmony** con otro texto. Falta decidir si Harmony
   Build tiene isotipo propio.
6. **El remitente del correo** es `harmony@n3xus.cloud`, el mismo dominio de
   Harmony. Sirve si la clave de Resend es de esa cuenta.
