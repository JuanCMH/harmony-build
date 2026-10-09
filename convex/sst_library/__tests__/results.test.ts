/** Los resultados y el tablero de la biblioteca SST son datos: que cada
 *  resultado pida campos que su formato tiene, y que el tablero sólo nombre
 *  resultados que existen.
 */

import { describe, expect, it } from "vitest";
import { DASHBOARD_LIMITS } from "../../dashboards";
import { resultName, resultProblem } from "../../lib/result_definition";
import { RESULT_LIMITS } from "../../lib/result_types";
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
  it("sólo nombra resultados que existen, y ninguno dos veces", () => {
    const keys = new Set(SST_RESULTS.map((result) => result.key));
    const used = SST_DASHBOARD.flatMap((tab) =>
      tab.widgets.map((widget) => widget.result),
    );
    expect(used.filter((key) => !keys.has(key))).toEqual([]);
    expect(duplicates(used)).toEqual([]);
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
});
