# Harmony Build workspace instructions

Antes de modificar código, consulta las directivas en `docs/directives/`
(7 documentos autosuficientes) — son la única fuente de verdad del proyecto.
Ver `CLAUDE.md` en la raíz para el índice y el orden de autoridad.

Tres reglas que conviene tener a la vista antes de abrir cualquiera de ellas:

- **Cómo distinguir un bug de producto de un test obsoleto**, y por qué nunca se
  debilita una assertion para que un test pase:
  `docs/directives/04-reglas-testing.md §4`, con el triaje de fallos e2e
  incluido.
- **Un componente nunca importa `@/convex/_generated/api`**: el acceso a datos
  pasa por el `api.ts` de su paquete
  (`docs/directives/01-reglas-convex.md §2`).
- **Lo que depende del módulo de formatos está marcado como pendiente de su
  plan** y no se rellena sin un plan aprobado en `docs/plans/`
  (`docs/directives/05-reglas-diseno.md §3`).

`.github/instructions/convex.instructions.md` es el compendio oficial de reglas
de Convex: tooling de referencia, no gobernanza del proyecto.
