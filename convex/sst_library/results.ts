/** Los resultados de la biblioteca SST y el tablero con que se instala: lo
 *  que cada formato entrega a partir de sus respuestas
 *  (`docs/plans/2026-10-09-resultados-y-tablero-design.md`).
 *
 *  Son **configuración**, no código: cualquiera de ellos se puede crear igual
 *  desde la aplicación. La biblioteca los trae hechos para que un proyecto
 *  recién instalado ya tenga algo que mirar.
 */

import type { FormField } from "../lib/form_types";
import type { ResultConfig } from "../lib/result_types";
import type { WidgetSize } from "../lib/result_validators";
import { CATALOG } from "./common";
import { SST_LIBRARY } from "./index";
import { LIBRARY_REFERENCE_PREFIX } from "./types";

export interface LibraryResult {
  /** Estable y único: `<formato>/<resultado>`. */
  key: string;
  /** La clave del formato en la biblioteca. */
  form: string;
  name: string;
  config: ResultConfig;
}

export interface LibraryDashboardTab {
  id: string;
  label: string;
  widgets: { result: string; size: WidgetSize }[];
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
): LibraryResult => ({ key: `${form}/${slug}`, form, name, config });

const count = { operation: "count" } as const;
const sumOf = (fieldId: string) => ({ operation: "sum", fieldId }) as const;

/**
 * Lo que se quiere saber de una inspección: cuántas hubo, qué tan bien
 * salieron, qué falla más y —si se hace sobre un equipo o un vehículo— el
 * mapa de hallazgos por día, que es la hoja semanal del papel.
 */
function inspectionResults(formKey: string): LibraryResult[] {
  const fields = fieldsOf(formKey);
  const checklist = fields.find((field) => field.type === "checklist");
  if (!checklist) return [];
  // El equipo o el vehículo, cuando el formato lo elige en un solo campo.
  const subjects = fields.filter(
    (field) =>
      field.type === "reference" &&
      [CATALOG.vehicles, CATALOG.equipment, CATALOG.extinguishers].some(
        (catalog) =>
          field.config.reference?.formId ===
          `${LIBRARY_REFERENCE_PREFIX}${catalog}`,
      ),
  );
  return [
    result(formKey, "inspecciones", "Inspecciones", {
      type: "indicator",
      measure: count,
    }),
    result(formKey, "cumplimiento", "Cumplimiento por semana", {
      type: "compliance",
      checklistFieldId: checklist.id,
      interval: "week",
    }),
    result(formKey, "hallazgos", "Ítems con más hallazgos", {
      type: "findings",
      checklistFieldId: checklist.id,
    }),
    ...(subjects.length === 1
      ? [
          result(
            formKey,
            "mapa",
            `Hallazgos por ${subjects[0].label.toLowerCase()} y día`,
            {
              type: "heatmap",
              rowFieldId: subjects[0].id,
              value: "failures",
              valueFieldId: checklist.id,
            },
          ),
          result(
            formKey,
            "por-elemento",
            `Inspecciones por ${subjects[0].label.toLowerCase()}`,
            { type: "distribution", byFieldId: subjects[0].id, measure: count },
          ),
        ]
      : []),
  ];
}

const INSPECTIONS = [
  "sst-f-010",
  "sst-f-031",
  "sst-f-038",
  "sst-f-080",
  "sst-f-083",
  "sst-f-090",
  "sst-f-115",
  "sst-f-116",
  "sst-f-118",
  "sst-f-075",
  "sst-f-066",
  "sst-f-065",
  "sst-f-074",
];

export const SST_RESULTS: LibraryResult[] = [
  ...INSPECTIONS.flatMap(inspectionResults),

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

const widget = (result: string, size: WidgetSize) => ({ result, size });

/**
 * El tablero con que nace un proyecto que instala la biblioteca. Una pestaña
 * por lo que se viene a mirar, no por formato. Una cifra suelta va en fila
 * con otras cifras, nunca al lado de una gráfica: estirada a su alto, queda
 * un hueco con un número. Las pestañas: las inspecciones, lo de
 * emergencia, las personas, lo ambiental y lo que se vence.
 */
export const SST_DASHBOARD: LibraryDashboardTab[] = [
  {
    id: "vehiculos",
    label: "Vehículos",
    widgets: [
      widget("sst-f-010/cumplimiento", "half"),
      widget("sst-f-010/hallazgos", "half"),
      widget("sst-f-010/mapa", "full"),
      widget("vehiculos/vencimientos", "half"),
      widget("sst-f-010/por-elemento", "half"),
    ],
  },
  {
    id: "equipos",
    label: "Equipos",
    widgets: [
      widget("sst-f-116/cumplimiento", "half"),
      widget("sst-f-080/cumplimiento", "half"),
      widget("sst-f-116/mapa", "full"),
      widget("sst-f-116/hallazgos", "half"),
      widget("sst-f-031/hallazgos", "half"),
    ],
  },
  {
    id: "emergencias",
    label: "Emergencias",
    widgets: [
      widget("sst-f-075/cumplimiento", "half"),
      widget("sst-f-074/cumplimiento", "half"),
      widget("sst-f-075/hallazgos", "half"),
      widget("extintores/recargas", "half"),
    ],
  },
  {
    id: "personas",
    label: "Personas",
    widgets: [
      widget("horas-hombre-trabajadas/hht", "third"),
      widget("control-de-ausentismo/dias", "third"),
      widget("capacitaciones-y-charlas/charlas", "third"),
      widget("horas-hombre-trabajadas/por-persona", "third"),
      widget("horas-hombre-trabajadas/personas", "third"),
      widget("control-de-ausentismo/por-mil-hht", "third"),
      widget("horas-hombre-trabajadas/con-extra", "twoThirds"),
      widget("control-de-ausentismo/por-tipo", "third"),
      widget("capacitaciones-y-charlas/por-centro", "full"),
      widget("personal/licencias", "half"),
      widget("sst-f-007/por-trabajador", "half"),
    ],
  },
  {
    id: "ambiental",
    label: "Ambiental",
    widgets: [
      widget("gestion-ambiental/agua", "third"),
      widget("gestion-ambiental/rcd-total", "third"),
      widget("gestion-ambiental/registros", "third"),
      widget("gestion-ambiental/rcd", "full"),
      widget("gestion-ambiental/residuos", "full"),
    ],
  },
];
