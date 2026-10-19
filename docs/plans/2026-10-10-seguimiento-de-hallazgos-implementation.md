# Seguimiento de hallazgos — implementación

**Fecha:** 2026-10-10 · **Estado:** entrega 1 implementada (2026-10-10);
entrega 2 pendiente · **Diseño:**
`2026-10-10-seguimiento-de-hallazgos-design.md`

> Dos entregas. La primera deja el seguimiento **usable de punta a punta**:
> crear uno, abrir un asunto, completar sus etapas, cerrarlo y verlo en la
> bandeja. La segunda trae lo que lo conecta con el resto: el origen en una
> inspección, la reincidencia y el resultado.
>
> Una simplificación frente al diseño, decidida al planificar: **una etapa es
> una sección**. El diseño agrupaba varias secciones en una etapa; con una a
> una, el constructor, el formulario y la lectura sirven tal cual, y una etapa
> larga se resuelve con más campos. Si hiciera falta agrupar, entra después
> sin migrar: `stages` ya guarda el id de la sección.

## Entrega 1 · El asunto y su bandeja — hecha

- **Clase** `tracking` en `FORM_KINDS`; estados `open` y `closed` en
  `RESPONSE_STATUSES`. La firma vale en un seguimiento.
- **Validación** (`form_validation.ts`): cada etapa tiene campos, ninguna va
  condicionada, y el campo de título está en la primera.
- **Schema**: `forms.dueDateFieldId`, `responsibleFieldId`, `numberPrefix`,
  `lastNumber`; `formResponses.number`, `year`, `stages`, `closedAt`,
  `dueDate`, `responsibleLabel`; índices `projectId_status` y `formId_status`.
  Todo opcional: no migra nada.
- **Reglas puras** (`convex/lib/tracking.ts`): etapas, consecutivo por
  formato y año, lo que se copia para la bandeja, y «vencido», que no se
  guarda.
- **Funciones** (`convex/formTrackings.ts`): `configure`, `open`,
  `completeStage`, `list`. `formResponses.getById` devuelve `tracking` (código,
  etapas, si se puede completar) y `void` anula un asunto.
  `forms.setTitleField` vale también aquí.
- **Interfaz**: tercera clase al crear y tercera pestaña en la lista; campo de
  título y «Cómo se sigue cada asunto» en el constructor; abrir un asunto
  desde la pantalla de diligenciar; la página del asunto con sus etapas y el
  formulario de la que toca; la tabla de asuntos en el formato; y la bandeja
  del proyecto en `/seguimientos`, con su entrada en el menú.
- **Bibliotecas**: `formLibrary.install` instala seguimientos, con lo que
  declaran.
- **Pruebas**: `convex/__tests__/form-trackings.test.ts`.

Recorrido hecho en el proyecto de Dinapower del deployment de desarrollo:
abrir un reporte de condición insegura, verlo en la bandeja con su
consecutivo y su etapa, completarlo y verlo cerrado.

## Entrega 2 · Pendiente

1. **Audiencia por etapa.** Hoy completa cualquier etapa quien puede
   diligenciar el seguimiento. Falta `roleIds` por etapa y su editor.
2. **Origen.** Que una lista de chequeo declare su seguimiento y un ítem no
   conforme abra un asunto, a mano o automáticamente, trayendo el texto, la
   observación y el elemento.
3. **Reincidencia.** Un asunto abierto por elemento e ítem.
4. **Resultado `tracking`**: abiertos, vencidos, porcentaje cerrado y días
   hasta el cierre; y los demás tipos sobre un seguimiento. *Hecho el
   2026-10-12, con el seguimiento de hallazgos de la biblioteca SST:
   `2026-10-12-programa-y-cierre-de-hallazgos-design.md`.*
5. **Condiciones entre etapas.** Un campo de una etapa que depende de uno de
   una etapa anterior se evalúa bien en el servidor, pero el formulario de la
   etapa no conoce los valores anteriores. Hasta resolverlo, no usarlas.
6. **Filtros de la bandeja** por formato y responsable, y «los que puedo
   completar yo».
7. **La biblioteca SST** con sus tres seguimientos, y `03`/`02`/`01` con lo
   que falte de esta entrega.
8. **Cargar la historia**: las acciones correctivas que una empresa ya tiene
   en Excel. Un asunto no se importa: hace falta decidir cómo entra uno ya
   cerrado.
