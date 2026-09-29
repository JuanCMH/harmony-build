Antes de modificar código, consulta las directivas en `docs/directives/`
(7 documentos autosuficientes) — son la única fuente de verdad del proyecto.

| Documento | Léelo antes de… |
|---|---|
| `00-reglas-generales.md` | Cualquier tarea. Es el marco: identidad, dominio, stack, nombres, idioma. |
| `01-reglas-convex.md` | Tocar `convex/` o un `api.ts` de paquete. |
| `02-reglas-nextjs.md` | Tocar `app/`, `components/`, `packages/`, `lib/` o `hooks/`. |
| `03-reglas-interfaz.md` | **Cualquier** cambio de UI. Sin excepción. |
| `04-reglas-testing.md` | Cada commit, y al añadir lógica crítica. |
| `05-reglas-diseno.md` | Empezar una pantalla nueva o un rediseño. |
| `06-reglas-calidad.md` | Cerrar una feature. |

El orden de autoridad ante conflictos está en `00-reglas-generales §1.1`.

Idioma: código e identificadores en inglés; todo lo que ve el usuario, en
español con acentuación correcta.

Harmony Build deriva de Harmony y conserva su familia de componentes: los
nombres `HarmonyModal`, `HarmonySheet`, `components/harmony/` y `app/(harmony)/`
**no se renombran** (`00-reglas-generales §6`).

El módulo de formatos está implementado según
`docs/plans/2026-09-28-modulo-de-formatos-design.md`. Su biblioteca de formatos
SST vive en `convex/sst_library/` y se instala en un proyecto con
`bunx convex run formLibrary:installSst '{"projectId":"…","withSamples":true}'`
(`"update":true` publica una versión nueva de lo que cambió en la biblioteca).

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->
