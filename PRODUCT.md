# Product

<!-- impeccable:product-schema 1 -->

> Este archivo existe porque el skill `impeccable` lo exige antes de diseñar.
> Recoge **verdad de producto**, no reglas. La ley del proyecto sigue siendo
> `docs/directives/` (`00 §1`): si algo de aquí contradice una directriz, manda
> la directriz. Casi todo lo de abajo está extraído de `00 §2` y `00 §3`.

## Platform

web

## Users

**Quien administra el proyecto** (propietario o administrador). Crea el
proyecto, invita gente, define roles y, en el módulo de formatos, diseña los
formatos. Suele ser de seguridad y salud en el trabajo, de calidad o de
dirección de obra, y trabaja **desde escritorio**. La configuración se toca
cada pocas semanas y por algo concreto: quien entra sabe a qué viene, no viene
a explorar.

**Quien diligencia.** Conductores, operarios, inspectores. Lo hace **a diario,
desde el teléfono, en la obra**, con prisa y a veces con mala conexión.
Necesita formularios cortos y claros. Es el usuario más frecuente del producto
y el que menos tiempo tiene para él.

**Quien consulta.** Revisa las respuestas y, después, las gráficas.

En una obra pequeña las tres pueden ser la misma persona.

## Product Purpose

Que una empresa de construcción deje de diligenciar en papel o en Excel sus
formatos de obra —inspecciones preoperacionales de vehículos y equipos, entrega
de dotación y EPP, inspecciones de botiquines, extintores, camillas y kits de
derrames, informes de SST— y los tenga digitalizados, con sus respuestas
guardadas, listables y, más adelante, graficadas.

La promesa: que el dato de la obra exista en el momento en que ocurre, con
nombre, fecha y responsable, y no en una hoja que alguien transcribe (o pierde)
a fin de mes.

## Positioning

Un solo nivel de tenencia —el proyecto, que es la obra— del que cuelga todo y
que nunca se cruza con otro. El dato no se reconstruye después: se captura
donde ocurre, y todo acto importante queda en auditoría con su autor y su
fecha. Un formulario genérico en línea no puede afirmar eso sin el modelo de
acceso y de trazabilidad que lo sostiene.

## Operating Context

Empresa de construcción. La unidad de trabajo es la obra, y dentro de ella el
día: lo que se inspecciona, se entrega o se revisa hoy se registra hoy.

Dos contextos de uso que no se parecen. **La captura** ocurre en la obra, en el
teléfono, de pie y con prisa: el formulario se diseña **primero para pantalla
estrecha**. **La administración** ocurre en una oficina, en escritorio: se
diseña **primero para pantalla ancha**. Las dos superficies tienen que funcionar
en los dos tamaños; lo que cambia es por cuál se empieza.

**Fase actual: base.** Existen autenticación, proyectos, miembros, roles y
auditoría. El módulo de formatos está en diseño (`docs/plans/`); las gráficas
del panel son una fase posterior.

## Capabilities and Constraints

- Backend Convex, en un deployment propio; frontend Next.js 15 App Router con
  React 19; Tailwind 4 con tokens; shadcn/ui + Radix. Web responsive instalable
  como PWA; no hay app nativa: el teléfono es esta misma web.
- Modelo de dominio de un nivel: `Project` → `Members` + `Roles`, `Logs` y,
  cuando se implemente, el módulo de formatos (formatos, respuestas y relaciones
  entre formatos).
- Tres niveles de identidad por proyecto: propietario, administrador y miembro
  con rol personalizado. Ocho llaves de permiso. Un miembro sin rol sólo lee.
  Sólo el propietario elimina o transfiere el proyecto.
- Se entra a un proyecto con un código de unión de 12 caracteres, que no
  caduca y concede acceso de miembro sin rol.
- Cada proyecto lleva identidad visual propia: dos colores de una paleta de 24
  y un logo.
- Hoy la aplicación no funciona sin conexión. Cómo se comporta la captura
  cuando la red falla es una decisión pendiente del plan de formatos.
- No hay vistas públicas ni API: la única ruta sin sesión es `/auth`.
- Sin gráficas, exportación ni arrastrar y soltar todavía: entran con la
  funcionalidad que las necesite.
- Sin sistema de i18n: el español está escrito en la interfaz.
- Auditoría obligatoria de todo acto importante (`logs`).

## Brand Commitments

Nombre: **Harmony Build**. Deriva de Harmony y conserva su sistema de diseño y
su familia de componentes (`HarmonyModal`, `HarmonySheet`…). Personalidad fijada
en `00 §2.2`: serena bajo presión, precisa sin rigidez, técnica pero humana,
sobria y no fría. Voz clara, directa y confiable; breve y accionable en la
captura en obra, explícita y orientada a solución en los errores.

Restricciones de identidad vinculantes, de `03-reglas-interfaz`: tokens de color
en tres niveles, retícula de espaciado de 4px, radios fijados por token, catálogo
de iconos **cerrado** (Lucide, un icono por entidad; el proyecto es `HardHat`),
cuatro variantes de contenido de página y tres únicos overlays. Toda la
interfaz, en español con acentuación correcta.

Pendiente del plan de formatos, y por tanto sin decidir: los colores de estado
del dominio, los iconos de los formatos y de los tipos de campo, y las reglas
del formulario de captura.

Referencias declaradas: Linear (claridad estructural), Iron Man HUD
(visualización táctica), Bloomberg Terminal (datos primero), iOS Liquid Glass
(profundidad óptica controlada).

## Evidence on Hand

- `docs/directives/` — siete documentos que son la ley del proyecto.
- `docs/plans/` — los planes de diseño e implementación, con estado y fecha.
- `convex/schema.ts` — la forma exacta de los datos.
- `convex/__tests__/` y los `__tests__/` de cada paquete — las pruebas de
  Vitest y `convex-test`.

No hay testimonios, clientes nombrados, precios ni benchmarks: no se inventan.

## Product Principles

Los ocho principios de UX viven en `00 §2.3`. Los cinco que más deciden diseño:

1. **Calma funcional.** La interfaz reduce la ansiedad operativa, nunca la
   amplifica.
2. **Jerarquía inmediata.** Lo crítico se detecta en segundos.
3. **Densidad con orden.** Mucha información, mínima fricción cognitiva —en la
   administración y en la consulta; en la captura, lo justo.
4. **Un camino, no ocho.** Cada tarea frecuente tiene un flujo canónico; los
   atajos son atajos, no alternativas que compiten.
5. **Trazabilidad visible.** Siempre se puede responder quién, qué y cuándo.

## Accessibility & Inclusion

Sin estándar externo declarado, pero `03 §6.1` y `03 §7` fijan mínimos duros:
todo control accionable alcanzable con el tabulador —prohibido `tabIndex={-1}`
en un control accionable—, anillo de foco siempre visible, etiquetas reales
asociadas a sus campos, área de toque de al menos 24px, y contenedores
pulsables que son botones de verdad y no tarjetas con `onClick`. El color
comunica estado real y nunca es el único portador de significado.

Quien diligencia lo hace en el teléfono, en la obra y con prisa: los dos temas
cuentan, y el claro es el que se usa a pleno sol.
