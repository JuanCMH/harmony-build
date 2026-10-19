/** Los resultados y el tablero de la biblioteca SST son datos: que cada
 *  resultado pida campos que su formato tiene, y que el tablero sólo nombre
 *  resultados que existen.
 */

import { describe, expect, it } from "vitest";
import { DASHBOARD_LIMITS } from "../../dashboards";
import { resultName, resultProblem } from "../../lib/result_definition";
import { RESULT_LIMITS } from "../../lib/result_types";
import { HEIGHTS_OF, heightOf, placeWidgets } from "../../lib/widget_layout";
import { SST_LIBRARY } from "../index";
import { SST_DASHBOARD, SST_RESULTS } from "../results";
import { duplicates, fieldsOf, records } from "./readers";

const formOf = (key: string) => SST_LIBRARY.find((form) => form.key === key);

describe("resultados de la biblioteca SST", () => {
  it("no repite ninguna clave, ni un nombre dentro de un formato", () => {
    expect(duplicates(SST_RESULTS.map((result) => result.key))).toEqual([]);
    expect(
      duplicates(SST_RESULTS.map((result) => `${result.form}/${result.name}`)),
    ).toEqual([]);
  });

  it.each(SST_RESULTS.map((result) => [result.key, result] as const))(
    "%s cuadra con los campos de su formato",
    (_key, result) => {
      const form = formOf(result.form);
      expect(form).toBeDefined();
      if (!form) return;
      expect(resultName(result.name)).toBe(result.name);
      expect(
        resultProblem(result.config, form.kind, fieldsOf(form)),
      ).toBeNull();
    },
  );

  it("da al menos un resultado a cada formato que se diligencia", () => {
    const withResults = new Set(SST_RESULTS.map((result) => result.form));
    expect(
      records.filter((form) => !withResults.has(form.key)).map((f) => f.key),
    ).toEqual([]);
  });

  it("no pasa del tope de resultados por formato", () => {
    for (const form of SST_LIBRARY) {
      expect(
        SST_RESULTS.filter((result) => result.form === form.key).length,
      ).toBeLessThanOrEqual(RESULT_LIMITS.maxPerForm);
    }
  });
});

describe("programas de la biblioteca SST", () => {
  const programs = SST_RESULTS.filter(
    (result) => result.config.type === "coverage",
  );

  it("toda inspección sobre un elemento tiene el suyo", () => {
    expect(programs.map((result) => result.form).sort()).toEqual([
      "sst-f-010",
      "sst-f-031",
      "sst-f-038",
      "sst-f-065",
      "sst-f-066",
      "sst-f-074",
      "sst-f-075",
      "sst-f-080",
      "sst-f-083",
      "sst-f-090",
      "sst-f-116",
      "sst-f-118",
    ]);
  });

  it("a un preoperacional de equipo no se le espera todo el listado", () => {
    // El listado de equipos mezcla clases: a la inspección de la planta no
    // se le puede pedir el cargador.
    for (const result of programs) {
      if (result.config.type !== "coverage") continue;
      expect(result.config.scope, result.key).toBe(
        result.config.byFieldId === "equipo" ? "seen" : "catalog",
      );
    }
  });
});

describe("seguimiento de la biblioteca SST", () => {
  it("dice si se cierra lo que se abre", () => {
    const tracking = SST_RESULTS.filter(
      (result) => result.config.type === "tracking",
    );
    expect(tracking.map((result) => result.form)).toEqual([
      "seguimiento-de-hallazgos",
    ]);
  });
});

describe("cifras compuestas de la biblioteca SST", () => {
  it("sólo se arman con indicadores de la biblioteca", () => {
    const indicators = new Set(
      SST_RESULTS.filter((result) => result.config.type === "indicator").map(
        (result) => result.key,
      ),
    );
    for (const result of SST_RESULTS) {
      if (result.config.type !== "composite") continue;
      for (const term of result.config.terms) {
        if (term.type === "result") {
          expect(indicators.has(term.resultId), result.key).toBe(true);
        }
      }
    }
  });
});

describe("tablero de la biblioteca SST", () => {
  it("sólo nombra resultados que existen, y ninguno dos veces en una pestaña", () => {
    const keys = new Set(SST_RESULTS.map((result) => result.key));
    for (const tab of SST_DASHBOARD) {
      const used = tab.widgets.map((widget) => widget.result);
      expect(used.filter((key) => !keys.has(key)), tab.id).toEqual([]);
      expect(duplicates(used), tab.id).toEqual([]);
    }
  });

  it("abre por el resumen, y sólo él repite resultados de otras pestañas", () => {
    expect(SST_DASHBOARD[0]?.id).toBe("resumen");
    const elsewhere = SST_DASHBOARD.slice(1).flatMap((tab) =>
      tab.widgets.map((widget) => widget.result),
    );
    // Lo que el resumen enseña es un atajo: todo está además en su pestaña.
    expect(
      SST_DASHBOARD[0]?.widgets
        .map((widget) => widget.result)
        .filter((key) => !elsewhere.includes(key)),
    ).toEqual([]);
  });

  it("cabe en los límites de un tablero", () => {
    expect(duplicates(SST_DASHBOARD.map((tab) => tab.id))).toEqual([]);
    expect(SST_DASHBOARD.length).toBeLessThanOrEqual(DASHBOARD_LIMITS.maxTabs);
    for (const tab of SST_DASHBOARD) {
      expect(tab.widgets.length).toBeGreaterThan(0);
      expect(tab.widgets.length).toBeLessThanOrEqual(
        DASHBOARD_LIMITS.maxWidgets,
      );
    }
  });

  it("da a cada resultado un alto que su tipo admite", () => {
    const typeOf = new Map(
      SST_RESULTS.map((result) => [result.key, result.config.type]),
    );
    for (const tab of SST_DASHBOARD) {
      for (const widget of tab.widgets) {
        const type = typeOf.get(widget.result);
        if (!type || !widget.height) throw new Error(widget.result);
        expect(HEIGHTS_OF[type], widget.result).toContain(widget.height);
      }
    }
  });

  it("no deja huecos en ninguna pestaña", () => {
    const typeOf = new Map(
      SST_RESULTS.map((result) => [result.key, result.config.type]),
    );
    for (const tab of SST_DASHBOARD) {
      const { holes } = placeWidgets(
        tab.widgets.map((widget) => ({
          size: widget.size,
          height: heightOf(
            typeOf.get(widget.result) ?? "indicator",
            widget.height,
          ),
        })),
      );
      expect(holes, tab.id).toEqual([]);
    }
  });
});
