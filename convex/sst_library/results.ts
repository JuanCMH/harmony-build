/** Los resultados de la biblioteca SST y el tablero con que se instala: lo
 *  que cada formato entrega a partir de sus respuestas
 *  (`docs/plans/2026-10-09-resultados-y-tablero-design.md`).
 *
 *  Son **configuración**, no código: cualquiera de ellos se puede crear igual
 *  desde la aplicación. La biblioteca los trae hechos para que un proyecto
 *  recién instalado ya tenga algo que mirar.
 */

import type { FormField } from "../lib/form_types";
import type { ResultConfig, ResultGoal } from "../lib/result_types";
import type { WidgetHeight, WidgetSize } from "../lib/result_validators";
import { CATALOG } from "./common";
import { SST_LIBRARY } from "./index";

/** El formato de seguimiento de la biblioteca. */
const ISSUES = "seguimiento-de-hallazgos";

export interface LibraryResult {
  /** Estable y único: `<formato>/<resultado>`. */
  key: string;
  /** La clave del formato en la biblioteca. */
  form: string;
  name: string;
  /** Los nombres que tuvo antes en la biblioteca: con ellos se reconoce en un
   *  proyecto donde ya estaba instalado, y `update` lo renombra. */
  previousNames?: string[];
  config: ResultConfig;
}

export interface LibraryDashboardTab {
  id: string;
  label: string;
  widgets: { result: string; size: WidgetSize; height?: WidgetHeight }[];
}

const fieldsOf = (formKey: string): FormField[] =>
  (SST_LIBRARY.find((form) => form.key === formKey)?.sections ?? []).flatMap(
    (section) => section.fields,
  );

const result = (
  form: string,
  slug: string,
  name: string,
  config: ResultConfig,
  previousNames?: string[],
): LibraryResult => ({
  key: `${form}/${slug}`,
  form,
  name,
  config,
  ...(previousNames ? { previousNames } : {}),
});

const count = { operation: "count" } as const;
const sumOf = (fieldId: string) => ({ operation: "sum", fieldId }) as const;

/** La meta con que nace el cumplimiento de una inspección. Es de quien
 *  instala: se cambia en el resultado. */
const COMPLIANCE_GOAL: ResultGoal = { value: 90, direction: "min" };

/** De lunes a sábado: los días en que una obra opera. */
const WORKING_DAYS = [1, 2, 3, 4, 5, 6];

type Program = Omit<Extract<ResultConfig, { type: "coverage" }>, "type">;

/** Un preoperacional se hace cada día que se opera. */
const daily = (byFieldId: string, scope: Program["scope"]): Program => ({
  byFieldId,
  interval: "day",
  weekdays: WORKING_DAYS,
  scope,
  goal: COMPLIANCE_GOAL,
});

/** Lo de emergencia se revisa una vez al mes. */
const monthly = (byFieldId: string): Program => ({
  byFieldId,
  interval: "month",
  scope: "catalog",
  goal: COMPLIANCE_GOAL,
});

/**
 * Cada inspección, con el campo que dice **qué** se inspecciona y cada
 * cuánto le toca: lo que su hoja de papel ya suponía.
 *
 * El listado de equipos mezcla clases —la planta, el cargador, las
 * pulidoras—, así que a cada preoperacional de equipo sólo se le esperan los
 * que inspeccionó en el periodo. Vehículos, extintores y centros de trabajo
 * se esperan todos.
 */
/** Lo que inspecciona cada formato, dicho corto: es lo que distingue a sus
 *  resultados en una pestaña donde hay cuatro programas
 *  (`docs/plans/2026-10-14-tablero-a-la-medida-design.md` §7). */
const SUBJECT: Record<string, string> = {
  "sst-f-010": "Vehículos",
  "sst-f-031": "Soldadura eléctrica",
  "sst-f-038": "Pulidora",
  "sst-f-080": "Cargador",
  "sst-f-083": "Compresor",
  "sst-f-090": "Prensa hidráulica",
  "sst-f-115": "Herramientas neumáticas",
  "sst-f-116": "Planta de concreto",
  "sst-f-118": "Botiquines de vehículos",
  "sst-f-075": "Botiquín de centros de trabajo",
  "sst-f-066": "Camilla",
  "sst-f-065": "Kit de derrames",
  "sst-f-074": "Extintores",
};

const INSPECTIONS: Record<string, Program | null> = {
  "sst-f-010": daily("vehiculo", "catalog"),
  "sst-f-031": daily("equipo", "seen"),
  "sst-f-038": daily("equipo", "seen"),
  "sst-f-080": daily("equipo", "seen"),
  "sst-f-083": daily("equipo", "seen"),
  "sst-f-090": daily("equipo", "seen"),
  // Tres equipos en una sola hoja: no hay un elemento que seguir.
  "sst-f-115": null,
  "sst-f-116": daily("equipo", "seen"),
  "sst-f-118": monthly("vehiculo"),
  "sst-f-075": monthly("centro-trabajo"),
  "sst-f-066": monthly("centro-trabajo"),
  "sst-f-065": monthly("centro-trabajo"),
  "sst-f-074": monthly("extintor"),
};

/**
 * Lo que se quiere saber de una inspección: si se hizo todo lo que tocaba,
 * cuántas hubo, qué tan bien salieron, qué falla más y —si se hace sobre un
 * equipo o un vehículo— el mapa de hallazgos por día, que es la hoja semanal
 * del papel.
 */
function inspectionResults(
  formKey: string,
  program: Program | null,
): LibraryResult[] {
  const fields = fieldsOf(formKey);
  const checklists = fields.filter((field) => field.type === "checklist");
  // La lista de chequeo principal: la última. En el botiquín, la primera son
  // las cuatro preguntas de instalación.
  const checklist = checklists[checklists.length - 1];
  if (!checklist) return [];
  const subject = fields.find((field) => field.id === program?.byFieldId);
  // El mapa es de un equipo o de un vehículo, no de un centro de trabajo.
  const mapped = subject && subject.id !== "centro-trabajo" ? subject : null;
  const what = SUBJECT[formKey] ?? "Inspección";
  return [
    result(formKey, "inspecciones", "Inspecciones", {
      type: "indicator",
      measure: count,
      compare: true,
    }),
    ...(program
      ? [
          result(
            formKey,
            "programa",
            `${what} · programa`,
            { type: "coverage", ...program },
            ["Programa de inspección"],
          ),
        ]
      : []),
    result(
      formKey,
      "cumplimiento",
      `${what} · cumplimiento`,
      {
        type: "compliance",
        checklistFieldId: checklist.id,
        interval: "week",
        goal: COMPLIANCE_GOAL,
      },
      ["Cumplimiento por semana"],
    ),
    result(
      formKey,
      "hallazgos",
      `${what} · ítems con hallazgos`,
      { type: "findings", checklistFieldId: checklist.id },
      ["Ítems con más hallazgos"],
    ),
    ...(mapped
      ? [
          result(
            formKey,
            "mapa",
            `Hallazgos por ${mapped.label.toLowerCase()} y día`,
            {
              type: "heatmap",
              rowFieldId: mapped.id,
              value: "failures",
              valueFieldId: checklist.id,
            },
          ),
          result(
            formKey,
            "por-elemento",
            `Inspecciones por ${mapped.label.toLowerCase()}`,
            { type: "distribution", byFieldId: mapped.id, measure: count },
          ),
        ]
      : []),
  ];
}

export const SST_RESULTS: LibraryResult[] = [
  ...Object.entries(INSPECTIONS).flatMap(([formKey, program]) =>
    inspectionResults(formKey, program),
  ),

  // Vehículos: lo que el informe de gestión pide de la flota —cuántos y
  // cuántos kilómetros— y quién los inspecciona.
  result("sst-f-010", "por-conductor", "Inspecciones por conductor", {
    type: "table",
    byFieldId: "conductor",
    measures: [
      { ...count, label: "Inspecciones" },
      {
        operation: "max",
        fieldId: "kilometraje",
        label: "Último kilometraje",
      },
    ],
  }),
  result("sst-f-010", "kilometraje", "Kilometraje por vehículo", {
    type: "table",
    byFieldId: "vehiculo",
    measures: [
      { ...count, label: "Inspecciones" },
      { operation: "max", fieldId: "kilometraje", label: "Última lectura" },
    ],
  }),

  // Seguimiento de hallazgos: si se cierra lo que se abre, y de quién es.
  result(ISSUES, "cierre", "Cierre de hallazgos", {
    type: "tracking",
    goal: { value: 80, direction: "min" },
  }),
  result(ISSUES, "reportados", "Hallazgos reportados", {
    type: "indicator",
    measure: count,
    compare: true,
  }),
  result(ISSUES, "alta", "Hallazgos de prioridad alta", {
    type: "indicator",
    measure: count,
    compare: true,
    filters: [
      { fieldId: "prioridad", operator: "eq", values: ["prioridad-alta"] },
    ],
  }),
  result(ISSUES, "por-semana", "Hallazgos por semana", {
    type: "trend",
    measure: { ...count, label: "Hallazgos" },
    interval: "week",
  }),
  result(ISSUES, "por-prioridad", "Hallazgos por prioridad", {
    type: "distribution",
    byFieldId: "prioridad",
    measure: count,
  }),
  result(ISSUES, "por-origen", "Hallazgos por origen", {
    type: "distribution",
    byFieldId: "origen",
    measure: count,
  }),
  result(ISSUES, "por-centro", "Hallazgos por centro de trabajo", {
    type: "distribution",
    byFieldId: "centro-trabajo",
    measure: count,
  }),
  result(ISSUES, "por-responsable", "Hallazgos por responsable", {
    type: "distribution",
    byFieldId: "responsable",
    measure: count,
  }),

  // Entrega de dotación
  result("sst-f-007", "entregas", "Entregas por semana", {
    type: "trend",
    measure: count,
    interval: "week",
  }),
  result("sst-f-007", "por-trabajador", "Entregas por trabajador", {
    type: "distribution",
    byFieldId: "trabajador",
    measure: count,
  }),

  // Horas hombre trabajadas
  result("horas-hombre-trabajadas", "hht", "Horas hombre trabajadas", {
    type: "indicator",
    measure: sumOf("hht"),
    compare: true,
  }),
  result("horas-hombre-trabajadas", "tendencia", "HHT por semana", {
    type: "trend",
    measure: sumOf("hht"),
    interval: "week",
  }),
  result("horas-hombre-trabajadas", "personas", "Personas en promedio", {
    type: "indicator",
    measure: { operation: "average", fieldId: "personas" },
  }),
  result("horas-hombre-trabajadas", "por-persona", "Horas por persona", {
    type: "indicator",
    // Horas de todos entre personas de todos: el promedio pesa cada registro
    // por su gente, que es lo que un promedio de promedios no hace.
    measure: {
      operation: "formula",
      terms: [
        { type: "agg", operation: "sum", fieldId: "hht" },
        { type: "op", op: "/" },
        { type: "agg", operation: "sum", fieldId: "personas" },
      ],
      unit: "h",
      decimals: 1,
    },
    compare: true,
  }),
  result(
    "horas-hombre-trabajadas",
    "con-extra",
    "HHT y tiempo extra por semana",
    {
      type: "trend",
      interval: "week",
      measure: { ...sumOf("hht"), label: "HHT" },
      series: [{ ...sumOf("tiempo-extra"), label: "Tiempo extra" }],
    },
  ),
  result("horas-hombre-trabajadas", "por-centro", "HHT por centro de trabajo", {
    type: "table",
    byFieldId: "centro-trabajo",
    measures: [count, sumOf("hht"), sumOf("tiempo-extra")],
  }),

  // Control de ausentismo
  result("control-de-ausentismo", "dias", "Días de ausencia", {
    type: "indicator",
    measure: sumOf("dias-ausencia"),
    compare: true,
  }),
  result("control-de-ausentismo", "casos", "Casos de ausentismo", {
    type: "indicator",
    measure: count,
    compare: true,
  }),
  // Lo que el informe separa: lo laboral (ATEL) de lo común.
  result(
    "control-de-ausentismo",
    "dias-laboral",
    "Días perdidos por causa laboral",
    {
      type: "indicator",
      measure: sumOf("dias-ausencia"),
      filters: [{ fieldId: "origen", operator: "eq", values: ["atel"] }],
    },
  ),
  result("control-de-ausentismo", "por-genero", "Casos por género", {
    type: "distribution",
    byFieldId: "genero",
    measure: count,
  }),
  result("control-de-ausentismo", "tendencia", "Días de ausencia por semana", {
    type: "trend",
    measure: sumOf("dias-ausencia"),
    interval: "week",
  }),
  result("control-de-ausentismo", "por-tipo", "Días de ausencia por tipo", {
    type: "distribution",
    byFieldId: "tipo-ausencia",
    measure: sumOf("dias-ausencia"),
  }),
  result("control-de-ausentismo", "por-origen", "Casos por origen", {
    type: "distribution",
    byFieldId: "origen",
    measure: count,
  }),

  // Una cifra entre dos formatos: los términos nombran resultados de la
  // biblioteca, y `installResults` los cambia por los instalados.
  result(
    "control-de-ausentismo",
    "por-mil-hht",
    "Días de ausencia por cada 1.000 HHT",
    {
      type: "composite",
      terms: [
        { type: "result", resultId: "control-de-ausentismo/dias" },
        { type: "op", op: "/" },
        { type: "result", resultId: "horas-hombre-trabajadas/hht" },
        { type: "op", op: "*" },
        { type: "const", value: 1000 },
      ],
      decimals: 2,
    },
  ),

  // Capacitaciones y charlas
  result("capacitaciones-y-charlas", "charlas", "Charlas y capacitaciones", {
    type: "indicator",
    measure: count,
  }),
  result("capacitaciones-y-charlas", "participantes", "Participaciones", {
    type: "indicator",
    measure: sumOf("participantes"),
  }),
  // El único total que la hoja del informe calcula.
  result("capacitaciones-y-charlas", "horas", "Horas de capacitación", {
    type: "indicator",
    measure: { ...sumOf("horas"), unit: "h" },
    compare: true,
  }),
  result(
    "capacitaciones-y-charlas",
    "por-semana",
    "Charlas y participantes por semana",
    {
      type: "trend",
      interval: "week",
      measure: { ...count, label: "Charlas" },
      series: [{ ...sumOf("participantes"), label: "Participantes" }],
    },
  ),
  result(
    "capacitaciones-y-charlas",
    "por-centro",
    "Capacitación por centro de trabajo",
    {
      type: "table",
      byFieldId: "centro-trabajo",
      measures: [count, sumOf("participantes"), sumOf("horas")],
    },
  ),

  // Gestión ambiental
  result("gestion-ambiental", "agua", "Agua potable (litros)", {
    type: "indicator",
    measure: sumOf("agua-potable"),
  }),
  result("gestion-ambiental", "rcd-total", "RCD (kg)", {
    type: "indicator",
    measure: sumOf("rcd"),
  }),
  result("gestion-ambiental", "registros", "Registros ambientales", {
    type: "indicator",
    measure: count,
  }),
  result("gestion-ambiental", "combustible", "Combustible (galones)", {
    type: "indicator",
    measure: sumOf("combustible"),
    compare: true,
  }),
  result("gestion-ambiental", "reciclable", "Reciclable por semana (kg)", {
    type: "trend",
    interval: "week",
    measure: { ...sumOf("carton"), label: "Cartón" },
    series: [
      { ...sumOf("plastico"), label: "Plástico" },
      { ...sumOf("papel"), label: "Papel" },
    ],
  }),
  result("gestion-ambiental", "rcd", "RCD por semana (kg)", {
    type: "trend",
    measure: sumOf("rcd"),
    interval: "week",
  }),
  result(
    "gestion-ambiental",
    "residuos",
    "Residuos por centro de trabajo (kg)",
    {
      type: "table",
      byFieldId: "centro-trabajo",
      measures: [
        sumOf("carton"),
        sumOf("plastico"),
        sumOf("papel"),
        sumOf("rcd"),
      ],
    },
  ),

  // Registro fotográfico
  result("registro-fotografico", "registros", "Registros fotográficos", {
    type: "indicator",
    measure: count,
  }),

  // Listados: lo que se vence
  result(CATALOG.vehicles, "vencimientos", "Vencimientos de SOAT y revisión", {
    type: "expirations",
    dateFieldIds: ["soat-vigencia", "rtm-vigencia"],
  }),
  result(CATALOG.staff, "licencias", "Vigencia de licencias de conducción", {
    type: "expirations",
    dateFieldIds: ["licencia-vigencia"],
  }),
  result(CATALOG.extinguishers, "recargas", "Próxima recarga de extintores", {
    type: "expirations",
    dateFieldIds: ["proxima-recarga"],
  }),
];

const widget = (result: string, size: WidgetSize, height: WidgetHeight) => ({
  result,
  size,
  height,
});

/**
 * El tablero con que nace un proyecto que instala la biblioteca
 * (`docs/plans/2026-10-12-programa-y-cierre-de-hallazgos-design.md §3`).
 *
 * Una pestaña por lo que se viene a mirar, no por formato, y en el orden en
 * que se pregunta: primero si se hizo —el programa—, después cómo salió —el
 * cumplimiento y lo que más falla— y al final el detalle.
 *
 * Cada fila se arma con anchos y altos que encajan
 * (`docs/plans/2026-10-14-tablero-a-la-medida-design.md` §1): un alto junto a
 * dos bajos apilados, o dos del mismo alto lado a lado. La prueba de la
 * biblioteca comprueba que ninguna pestaña deja un hueco.
 *
 * «Resumen» repite resultados de las demás: es lo que se mira primero, y lo
 * crítico son los vehículos, lo que se vence y lo que sigue abierto.
 */
export const SST_DASHBOARD: LibraryDashboardTab[] = [
  {
    id: "resumen",
    label: "Resumen",
    widgets: [
      widget("sst-f-010/programa", "half", "tall"),
      widget(`${ISSUES}/cierre`, "half", "tall"),
      widget("extintores/recargas", "third", "short"),
      widget("horas-hombre-trabajadas/hht", "third", "short"),
      widget("control-de-ausentismo/dias", "third", "short"),
      widget("vehiculos/vencimientos", "half", "medium"),
      widget("capacitaciones-y-charlas/horas", "half", "medium"),
    ],
  },
  {
    id: "vehiculos",
    label: "Vehículos",
    widgets: [
      widget("sst-f-010/programa", "half", "tall"),
      widget("sst-f-010/hallazgos", "half", "tall"),
      widget("sst-f-010/cumplimiento", "half", "medium"),
      widget("vehiculos/vencimientos", "half", "medium"),
      widget("sst-f-010/mapa", "full", "short"),
      widget("sst-f-010/kilometraje", "half", "short"),
      widget("sst-f-010/por-conductor", "half", "short"),
      widget("personal/licencias", "half", "short"),
      widget("sst-f-010/por-elemento", "half", "short"),
    ],
  },
  {
    id: "equipos",
    label: "Equipos",
    widgets: [
      widget("sst-f-116/programa", "half", "tall"),
      widget("sst-f-116/cumplimiento", "half", "short"),
      widget("sst-f-116/hallazgos", "half", "short"),
      widget("sst-f-080/programa", "half", "tall"),
      widget("sst-f-080/cumplimiento", "half", "short"),
      widget("sst-f-080/hallazgos", "half", "short"),
      widget("sst-f-116/mapa", "full", "short"),
      widget("sst-f-031/programa", "half", "medium"),
      widget("sst-f-031/hallazgos", "half", "medium"),
      widget("sst-f-038/programa", "half", "medium"),
      widget("sst-f-038/hallazgos", "half", "medium"),
    ],
  },
  {
    id: "emergencias",
    label: "Emergencias",
    // Lo de emergencia se revisa una vez al mes: en un rango de semanas no
    // hay línea, sólo la cifra y sus elementos, y eso cabe en dos pisos.
    widgets: [
      widget("sst-f-074/programa", "half", "short"),
      widget("extintores/recargas", "half", "short"),
      widget("sst-f-074/cumplimiento", "half", "short"),
      widget("sst-f-074/hallazgos", "half", "short"),
      widget("sst-f-075/programa", "half", "short"),
      widget("sst-f-075/hallazgos", "half", "short"),
      widget("sst-f-118/programa", "half", "short"),
      widget("sst-f-118/hallazgos", "half", "short"),
      widget("sst-f-066/programa", "half", "short"),
      widget("sst-f-065/programa", "half", "short"),
    ],
  },
  {
    id: "hallazgos",
    label: "Hallazgos",
    widgets: [
      widget(`${ISSUES}/reportados`, "third", "short"),
      widget(`${ISSUES}/alta`, "third", "short"),
      widget(`${ISSUES}/por-prioridad`, "third", "short"),
      widget(`${ISSUES}/cierre`, "half", "tall"),
      widget(`${ISSUES}/por-semana`, "half", "tall"),
      widget(`${ISSUES}/por-responsable`, "third", "short"),
      widget(`${ISSUES}/por-origen`, "third", "short"),
      widget(`${ISSUES}/por-centro`, "third", "short"),
    ],
  },
  {
    id: "gestion",
    label: "Gestión SST",
    widgets: [
      widget("horas-hombre-trabajadas/hht", "third", "short"),
      widget("horas-hombre-trabajadas/personas", "third", "short"),
      widget("horas-hombre-trabajadas/por-persona", "third", "short"),
      widget("control-de-ausentismo/dias", "third", "short"),
      widget("control-de-ausentismo/dias-laboral", "third", "short"),
      widget("control-de-ausentismo/por-mil-hht", "third", "short"),
      widget("horas-hombre-trabajadas/con-extra", "half", "medium"),
      widget("capacitaciones-y-charlas/por-semana", "half", "medium"),
      widget("capacitaciones-y-charlas/horas", "third", "short"),
      widget("control-de-ausentismo/por-tipo", "third", "short"),
      widget("sst-f-007/por-trabajador", "third", "short"),
      widget("capacitaciones-y-charlas/por-centro", "full", "short"),
    ],
  },
  {
    id: "ambiental",
    label: "Ambiental",
    widgets: [
      widget("gestion-ambiental/agua", "third", "short"),
      widget("gestion-ambiental/combustible", "third", "short"),
      widget("gestion-ambiental/rcd-total", "third", "short"),
      widget("gestion-ambiental/rcd", "half", "medium"),
      widget("gestion-ambiental/reciclable", "half", "medium"),
      widget("gestion-ambiental/residuos", "full", "short"),
    ],
  },
];
