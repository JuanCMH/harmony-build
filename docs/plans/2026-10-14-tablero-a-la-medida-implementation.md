# Tablero a la medida · implementación

**Fecha:** 2026-10-14 · **Estado:** implementado (2026-10-14)
**Diseño:** `2026-10-14-tablero-a-la-medida-design.md`

Orden de dependencia: el contrato de datos, después el cálculo, después la
interfaz, y al final la biblioteca y las directivas.

## 1. Contrato: el alto del resultado

- `convex/lib/result_validators.ts`: `WIDGET_HEIGHTS` y `height` opcional en
  `dashboardTabs`.
- `convex/lib/widget_layout.ts` (nuevo): los altos que admite cada tipo, el
  ancho y el alto por omisión, `heightOf` y el alto en pisos.
- `convex/dashboards.ts`: `get` devuelve el alto resuelto; `save` rechaza un
  alto que el tipo no admite (`dashboardsErrors.invalidWidgets`).
- `convex/formLibrary.ts` y `convex/sst_library/results.ts`: el tablero de la
  biblioteca lleva alto.
- Pruebas: `convex/__tests__/form-results.test.ts` (guardar y leer el alto,
  rechazar uno no admitido) y `convex/lib/__tests__/widget-layout.test.ts`.

## 2. Cálculo: gráficas honestas

- `convex/lib/date_buckets.ts`: `fitBucket` con mínimo de tres periodos.
- `convex/lib/result_compute.ts` y `convex/lib/result_coverage.ts`: el mínimo
  en tendencia, cumplimiento y programa; el ritmo del formato en el
  indicador.
- `packages/forms/lib/result-periods.ts` (nuevo): qué periodos corta el rango.
- Pruebas en `convex/lib/__tests__/` y `packages/forms/lib/__tests__/`.

## 3. La tarjeta y el contenido que se adapta

- `components/harmony/widget-card.tsx` (nuevo).
- `packages/forms/lib/fit-rows.ts` y `packages/forms/lib/use-fit-rows.ts`
  (nuevos): cuántas filas caben, medido en la tarjeta.
- `packages/forms/lib/widget-grid.ts` (nuevo): la retícula de pisos.
- `packages/forms/lib/suggested-height.ts` y
  `packages/forms/lib/results-layout.ts` (nuevos): el alto en que caben los
  datos de hoy y el acomodo sin huecos de la página del formato.
- `packages/forms/components/result-card.tsx`: sobre `WidgetCard`, recibe el
  alto y el rango.
- `packages/forms/components/result-view.tsx`: cada tipo según el alto. Las
  piezas comunes pasan a `result-figures.tsx` (nuevo) y la lista que cabe a
  `result-fit-list.tsx` (nuevo).
- `result-bars.tsx`, `result-tables.tsx`, `result-tracking.tsx`,
  `result-coverage.tsx`, `result-heatmap.tsx`, `result-spark-bars.tsx`,
  `result-charts.tsx`: filas de alto fijo, sin `max-h` ni scroll; gráficas que
  llenan; periodo cortado punteado; barras apiladas con rótulos que no caben.
- `components/ui/chart.tsx`: la ayuda nombra cada serie una vez.
- `packages/forms/components/results-board.tsx`: la retícula por pisos y el
  acomodo.

## 4. El tablero y su editor

- `packages/dashboard/lib/dashboard-draft.ts`: alto en el borrador;
  `resizeWidget` cambia ancho, alto o los dos.
- `packages/dashboard/components/dashboard-view.tsx`,
  `dashboard-widget.tsx`, `widget-edit-menu.tsx` y `grid-holes.tsx` (nuevos),
  `add-widget-popover.tsx`, `add-to-dashboard-menu.tsx`.
- La colocación de la retícula y sus huecos vive en
  `convex/lib/widget_layout.ts` (`placeWidgets`, `widenInto`): la usan el
  editor y la prueba del tablero de la biblioteca.

## 5. Biblioteca, directivas y cierre

- `convex/sst_library/results.ts`: nombres por objeto y el tablero
  recompuesto.
- Directivas: `03 §1.3` (la tarjeta de widget), `03 §2.3` (el tablero no
  lleva techo con scroll ni `items-start`), `00 §3` si cambia el dominio.
- `2026-10-09-resultados-y-tablero-design.md` §4: remite a este plan.
- Gate de `04 §2`, QA en los dos tableros (`04 §7`) y `06 §8.2`.
- Instalar la biblioteca en la demostración con `"update":true,
  "resetDashboard":true`, y recomponer desde el editor el tablero de la
  segunda empresa.
