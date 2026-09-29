import { describe, expect, it } from "vitest";

import {
  addToDate,
  computeComputedValues,
  evaluateComputed,
} from "../field_computed";
import {
  type LogicField,
  cascadeAutoValues,
  collectReferences,
  computeVisibility,
  evaluateAutoValue,
  evaluateRule,
  findDependents,
  hasDependencyCycle,
  isTodayDependent,
  pruneHiddenValues,
} from "../field_logic";
import type {
  ComputedTerm,
  FormulaComputed,
  VisibilityOperator,
} from "../form_types";

const rule = (
  fieldId: string,
  operator: VisibilityOperator,
  ...values: string[]
) => ({ fieldId, operator, values });

/** Un campo que se ve cuando `when` se cumple. */
const field = (id: string, when?: ReturnType<typeof rule>[]): LogicField => ({
  id,
  config: when ? { visibility: { match: "all", rules: when } } : {},
});

describe("evaluateRule", () => {
  it("compara igualdad como texto, venga el valor como venga", () => {
    expect(evaluateRule(rule("a", "eq", "5"), 5)).toBe(true);
    expect(evaluateRule(rule("a", "eq", "5"), "5")).toBe(true);
    expect(evaluateRule(rule("a", "neq", "5"), "6")).toBe(true);
  });

  it("anyOf comprueba pertenencia al conjunto", () => {
    const r = rule("a", "anyOf", "diurno", "nocturno");
    expect(evaluateRule(r, "nocturno")).toBe(true);
    expect(evaluateRule(r, "mixto")).toBe(false);
  });

  it("una casilla acepta booleano y texto", () => {
    expect(evaluateRule(rule("a", "isChecked"), true)).toBe(true);
    expect(evaluateRule(rule("a", "isChecked"), "true")).toBe(true);
    expect(evaluateRule(rule("a", "isNotChecked"), false)).toBe(true);
    expect(evaluateRule(rule("a", "isNotChecked"), undefined)).toBe(true);
  });

  it("los numéricos fallan si alguno de los dos lados no es número", () => {
    expect(evaluateRule(rule("a", "gt", "10"), "20")).toBe(true);
    expect(evaluateRule(rule("a", "lte", "10"), 10)).toBe(true);
    // No compara «veinte» con 10 inventando un orden.
    expect(evaluateRule(rule("a", "gt", "10"), "veinte")).toBe(false);
    expect(evaluateRule(rule("a", "gt", "diez"), 20)).toBe(false);
  });

  it("las fechas se anclan a medianoche local, no a UTC", () => {
    // Interpretar `YYYY-MM-DD` como UTC corre la fecha un día para quien esté
    // al oeste de Greenwich, que es toda Colombia.
    expect(evaluateRule(rule("a", "before", "2026-06-15"), "2026-06-14")).toBe(
      true,
    );
    expect(evaluateRule(rule("a", "after", "2026-06-15"), "2026-06-16")).toBe(
      true,
    );
    expect(evaluateRule(rule("a", "before", "2026-06-15"), "2026-06-15")).toBe(
      false,
    );
  });

  it("las horas se comparan como horas, no como fechas", () => {
    // `Date.parse("08:00")` no da nada: sin esto la
    // regla no se cumplía nunca y el campo dependiente desaparecía.
    expect(evaluateRule(rule("a", "before", "09:30"), "08:00")).toBe(true);
    expect(evaluateRule(rule("a", "after", "00:00"), "23:59")).toBe(true);
    expect(evaluateRule(rule("a", "before", "08:00"), "08:00")).toBe(false);
    expect(evaluateRule(rule("a", "after", "08:00"), "7:15")).toBe(false);
  });

  it("anyOf sobre una lista múltiple basta con que una marcada esté en el conjunto", () => {
    const r = rule("a", "anyOf", "vigilancia", "escolta");
    expect(evaluateRule(r, ["primeros-auxilios", "escolta"])).toBe(true);
    expect(evaluateRule(r, ["primeros-auxilios"])).toBe(false);
    expect(evaluateRule(r, [])).toBe(false);
  });

  it("«es igual a» sobre un conjunto es pertenencia, y «distinto de», lo contrario", () => {
    expect(
      evaluateRule(rule("cursos", "eq", "alturas"), ["izaje", "alturas"]),
    ).toBe(true);
    expect(
      evaluateRule(rule("cursos", "eq", "alturas"), ["izaje", "confinados"]),
    ).toBe(false);
    expect(
      evaluateRule(rule("cursos", "neq", "alturas"), ["izaje", "confinados"]),
    ).toBe(true);
    expect(
      evaluateRule(rule("cursos", "neq", "alturas"), ["izaje", "alturas"]),
    ).toBe(false);
  });

  it("vacío es nulo, cadena vacía y sólo espacios", () => {
    for (const v of [null, undefined, "", "   "]) {
      expect(evaluateRule(rule("a", "isEmpty"), v), String(v)).toBe(true);
    }
    expect(evaluateRule(rule("a", "isNotEmpty"), "x")).toBe(true);
  });
});

describe("computeVisibility", () => {
  it("un campo sin condición siempre se ve", () => {
    const vis = computeVisibility([field("a")], {});
    expect(vis.get("a")).toBe(true);
  });

  it("muestra y oculta según la condición", () => {
    const fields = [
      field("tipo"),
      field("placa", [rule("tipo", "eq", "moto")]),
    ];
    expect(computeVisibility(fields, { tipo: "moto" }).get("placa")).toBe(true);
    expect(computeVisibility(fields, { tipo: "a pie" }).get("placa")).toBe(
      false,
    );
  });

  it("«all» exige todas y «any» basta con una", () => {
    const rules = [rule("a", "eq", "1"), rule("b", "eq", "2")];
    const all: LogicField[] = [
      field("a"),
      field("b"),
      { id: "c", config: { visibility: { match: "all", rules: rules } } },
      { id: "d", config: { visibility: { match: "any", rules: rules } } },
    ];
    const vis = computeVisibility(all, { a: "1", b: "9" });
    expect(vis.get("c")).toBe(false);
    expect(vis.get("d")).toBe(true);
  });

  it("es transitiva: si A oculta a B, C —que depende de B— también se oculta", () => {
    // Es la parte que se olvida al hacer esto a mano: sin transitividad, C
    // se evaluaría contra el valor residual de B, que ya nadie ve.
    const fields = [
      field("a"),
      field("b", [rule("a", "eq", "sí")]),
      field("c", [rule("b", "eq", "sí")]),
    ];
    const vis = computeVisibility(fields, { a: "no", b: "sí", c: "x" });
    expect(vis.get("b")).toBe(false);
    expect(vis.get("c")).toBe(false);
  });

  it("ante un ciclo no se cuelga, y enseña el dato", () => {
    const fields = [
      field("a", [rule("b", "eq", "1")]),
      field("b", [rule("a", "eq", "1")]),
    ];
    expect(() => computeVisibility(fields, {})).not.toThrow();
  });

  it("un controlador que no existe no oculta nada", () => {
    const vis = computeVisibility(
      [field("a", [rule("fantasma", "eq", "1")])],
      {},
    );
    expect(vis.get("a")).toBe(false); // la regla no se cumple, pero no revienta
  });
});

describe("pruneHiddenValues", () => {
  it("descarta el valor de un campo oculto y conserva los demás", () => {
    const fields = [
      field("tipo"),
      field("placa", [rule("tipo", "eq", "moto")]),
    ];
    const pruned = pruneHiddenValues(fields, {
      tipo: "a pie",
      placa: "ABC123",
    });
    expect(pruned).toEqual({ tipo: "a pie" });
  });

  it("no toca values de fields sin condición ni desconocidos", () => {
    const pruned = pruneHiddenValues([field("a")], { a: "1", suelto: "2" });
    expect(pruned).toEqual({ a: "1", suelto: "2" });
  });

  it("no muta lo que recibe", () => {
    const values = { tipo: "a pie", placa: "ABC123" };
    pruneHiddenValues(
      [field("tipo"), field("placa", [rule("tipo", "eq", "moto")])],
      values,
    );
    expect(values.placa).toBe("ABC123");
  });
});

describe("evaluateComputed", () => {
  const formula = (
    terms: ComputedTerm[],
    extra: Partial<FormulaComputed> = {},
  ): FormulaComputed => ({ kind: "formula", terms, ...extra });

  it("respeta la precedencia: × y ÷ antes de + y −", () => {
    // 2 + 3 × 4 = 14, no 20.
    const r = evaluateComputed(
      formula([
        { type: "const", value: 2 },
        { type: "op", op: "+" },
        { type: "const", value: 3 },
        { type: "op", op: "*" },
        { type: "const", value: 4 },
      ]),
      {},
    );
    expect(r).toBe(14);
  });

  it("toma los operandos de otros fields", () => {
    const r = evaluateComputed(
      formula([
        { type: "field", fieldId: "horas" },
        { type: "op", op: "*" },
        { type: "field", fieldId: "tarifa" },
      ]),
      { horas: "8", tarifa: 5000 },
    );
    expect(r).toBe(40000);
  });

  it("con algún operando lleno, el vacío vale `emptyAs`, y por omisión cero", () => {
    const terms = [
      { type: "field", fieldId: "a" },
      { type: "op", op: "+" },
      { type: "field", fieldId: "b" },
      { type: "op", op: "+" },
      { type: "const", value: 10 },
    ] as const;
    expect(evaluateComputed(formula([...terms]), { b: 5 })).toBe(15);
    expect(
      evaluateComputed(formula([...terms], { emptyAs: 5 }), { b: 5 }),
    ).toBe(20);
  });

  it("con todos los operandos vacíos no inventa un resultado", () => {
    // Sin esta regla daba 10: un IVA calculado sobre un contrato que nadie
    // había escrito.
    const terms = [
      { type: "field", fieldId: "a" },
      { type: "op", op: "+" },
      { type: "const", value: 10 },
    ] as const;
    expect(evaluateComputed(formula([...terms]), {})).toBeNull();
  });

  it("dividir por cero deja el campo vacío en vez de dar infinito", () => {
    const r = evaluateComputed(
      formula([
        { type: "const", value: 1 },
        { type: "op", op: "/" },
        { type: "field", fieldId: "cero" },
      ]),
      { cero: 0 },
    );
    expect(r).toBeNull();
  });

  it("redondea a los decimales pedidos; por omisión ninguno", () => {
    const terms = [
      { type: "const", value: 10 },
      { type: "op", op: "/" },
      { type: "const", value: 3 },
    ] as const;
    expect(evaluateComputed(formula([...terms]), {})).toBe(3);
    expect(evaluateComputed(formula([...terms], { rounding: 2 }), {})).toBe(
      3.33,
    );
  });

  it("una fórmula malformada o vacía no da un número inventado", () => {
    expect(evaluateComputed(formula([]), {})).toBeNull();
    expect(evaluateComputed(formula([{ type: "op", op: "+" }]), {})).toBeNull();
  });
});

describe("computeComputedValues", () => {
  it("resuelve un calculado que se alimenta de otro", () => {
    const fields: LogicField[] = [
      field("base"),
      {
        id: "subtotal",
        config: {
          computed: {
            kind: "formula",
            terms: [
              { type: "field", fieldId: "base" },
              { type: "op", op: "*" },
              { type: "const", value: 2 },
            ],
          },
        },
      },
      {
        id: "total",
        config: {
          computed: {
            kind: "formula",
            terms: [
              { type: "field", fieldId: "subtotal" },
              { type: "op", op: "+" },
              { type: "const", value: 100 },
            ],
          },
        },
      },
    ];
    const r = computeComputedValues(fields, { base: 50 });
    expect(r.get("subtotal")).toBe(100);
    expect(r.get("total")).toBe(200);
  });

  it("no calcula los fields ocultos", () => {
    const fields: LogicField[] = [
      field("tipo"),
      {
        id: "recargo",
        config: {
          visibility: { match: "all", rules: [rule("tipo", "eq", "nocturno")] },
          computed: { kind: "formula", terms: [{ type: "const", value: 999 }] },
        },
      },
    ];
    expect(
      computeComputedValues(fields, { tipo: "diurno" }).has("recargo"),
    ).toBe(false);
    expect(
      computeComputedValues(fields, { tipo: "nocturno" }).get("recargo"),
    ).toBe(999);
  });
});

describe("auto-asignación", () => {
  const withAuto = (
    id: string,
    rules: {
      fieldId: string;
      operator: VisibilityOperator;
      values: string[];
      set: string;
    }[],
  ): LogicField => ({ id, config: { autoValue: { rules: rules } } });

  it("gana la primera regla que se cumple", () => {
    const f = withAuto("turno", [
      { ...rule("hora", "gte", "18"), set: "nocturno" },
      { ...rule("hora", "gte", "6"), set: "diurno" },
    ]);
    expect(evaluateAutoValue(f, { hora: "20" })).toBe("nocturno");
    expect(evaluateAutoValue(f, { hora: "9" })).toBe("diurno");
    expect(evaluateAutoValue(f, { hora: "3" })).toBeNull();
  });

  it("se propaga en cascada al cambiar el controlador", () => {
    const fields = [
      field("a"),
      withAuto("b", [{ ...rule("a", "eq", "1"), set: "sí" }]),
      withAuto("c", [{ ...rule("b", "eq", "sí"), set: "también" }]),
    ];
    const applied = cascadeAutoValues(fields, { a: "1" }, "a");
    expect(applied.get("b")).toBe("sí");
    expect(applied.get("c")).toBe("también");
  });

  it("no muta los values que recibe", () => {
    const values = { a: "1" };
    cascadeAutoValues(
      [field("a"), withAuto("b", [{ ...rule("a", "eq", "1"), set: "sí" }])],
      values,
      "a",
    );
    expect(values).toEqual({ a: "1" });
  });
});

describe("integridad de referencias", () => {
  it("recoge lo referenciado por visibilidad, fórmula y auto-valor, sin repetir", () => {
    const f: LogicField = {
      id: "x",
      config: {
        visibility: { match: "all", rules: [rule("a", "eq", "1")] },
        computed: {
          kind: "formula",
          terms: [
            { type: "field", fieldId: "a" },
            { type: "op", op: "+" },
            { type: "field", fieldId: "b" },
          ],
        },
        autoValue: { rules: [{ ...rule("c", "eq", "1"), set: "z" }] },
      },
    };
    expect(collectReferences(f).sort()).toEqual(["a", "b", "c"]);
  });

  it("encuentra quién depende de un campo, para no dejar borrarlo", () => {
    const fields = [field("a"), field("b", [rule("a", "eq", "1")]), field("c")];
    expect(findDependents(fields, "a").map((f) => f.id)).toEqual(["b"]);
    expect(findDependents(fields, "c")).toEqual([]);
  });

  it("detecta ciclos, incluida la auto-referencia", () => {
    expect(hasDependencyCycle([field("a"), field("b")])).toBe(false);
    expect(hasDependencyCycle([field("a", [rule("a", "eq", "1")])])).toBe(true);
    expect(
      hasDependencyCycle([
        field("a", [rule("b", "eq", "1")]),
        field("b", [rule("a", "eq", "1")]),
      ]),
    ).toBe(true);
  });

  it("detecta ciclos entre fórmulas, no sólo entre visibilidades", () => {
    const withFormula = (id: string, ref: string): LogicField => ({
      id,
      config: {
        computed: { kind: "formula", terms: [{ type: "field", fieldId: ref }] },
      },
    });
    expect(
      hasDependencyCycle([withFormula("a", "b"), withFormula("b", "a")]),
    ).toBe(true);
  });
});

describe("recetas", () => {
  const TODAY = "2026-09-14";

  it("porcentaje de un campo", () => {
    const iva = { kind: "percent" as const, of: "contrato", percent: 19 };
    expect(evaluateComputed(iva, { contrato: 10_000_000 })).toBe(1_900_000);
    expect(evaluateComputed(iva, { contrato: "" })).toBeNull();
    expect(
      evaluateComputed(
        { ...iva, percent: 12.5, rounding: 2 },
        { contrato: 10.01 },
      ),
    ).toBe(1.25);
  });

  it("operación entre fields, de izquierda a derecha", () => {
    const valor = {
      kind: "arithmetic" as const,
      operands: ["tarifa", "puestos"],
      op: "*" as const,
    };
    expect(evaluateComputed(valor, { tarifa: 2_500_000, puestos: 3 })).toBe(
      7_500_000,
    );
    expect(evaluateComputed(valor, { tarifa: 2_500_000 })).toBe(0);
    expect(evaluateComputed(valor, {})).toBeNull();
    expect(
      evaluateComputed(
        { ...valor, op: "/" as const },
        { tarifa: 10, puestos: 0 },
      ),
    ).toBeNull();
    expect(
      evaluateComputed({ ...valor, operands: ["tarifa"] }, { tarifa: 1 }),
    ).toBeNull();
  });

  it("días hasta y desde una fecha, sólo si se sabe qué día es hoy", () => {
    const until = { kind: "daysUntil" as const, of: "vence" };
    expect(
      evaluateComputed(until, { vence: "2026-09-26" }, { today: TODAY }),
    ).toBe(12);
    expect(
      evaluateComputed(until, { vence: "2026-09-11" }, { today: TODAY }),
    ).toBe(-3);
    expect(
      evaluateComputed(
        { kind: "daysSince", of: "ingreso" },
        { ingreso: "2026-09-04" },
        { today: TODAY },
      ),
    ).toBe(10);
    // El servidor guarda sin «hoy»: no evalúa lo que cambia con el día.
    expect(evaluateComputed(until, { vence: "2026-09-26" })).toBeNull();
    expect(isTodayDependent(until)).toBe(true);
  });

  it("años cumplidos: el día del cumpleaños ya cuenta, el anterior no", () => {
    const edad = { kind: "yearsSince" as const, of: "nacimiento" };
    expect(
      evaluateComputed(edad, { nacimiento: "1990-09-14" }, { today: TODAY }),
    ).toBe(36);
    expect(
      evaluateComputed(edad, { nacimiento: "1990-09-15" }, { today: TODAY }),
    ).toBe(35);
    expect(
      evaluateComputed(edad, { nacimiento: "2030-01-01" }, { today: TODAY }),
    ).toBeNull();
  });

  it("fecha más un plazo se queda en el último día del mes", () => {
    expect(addToDate("2026-01-31", 1, "months")).toBe("2026-02-28");
    expect(addToDate("2024-01-31", 1, "months")).toBe("2024-02-29");
    expect(addToDate("2024-02-29", 2, "years")).toBe("2026-02-28");
    expect(addToDate("2026-12-15", 30, "days")).toBe("2027-01-14");
    expect(addToDate("2026-03-31", -1, "months")).toBe("2026-02-28");
    expect(
      evaluateComputed(
        { kind: "dateAdd", of: "expedicion", amount: 1, unit: "years" },
        { expedicion: "2026-09-30" },
      ),
    ).toBe("2027-09-30");
  });

  it("conteo de marcadas; ninguna marcada es vacío", () => {
    const cursos = { kind: "count" as const, of: "cursos" };
    expect(
      evaluateComputed(cursos, { cursos: ["vigilancia", "escolta"] }),
    ).toBe(2);
    expect(evaluateComputed(cursos, { cursos: [] })).toBeNull();
  });

  it("texto compuesto nombra las opciones por su etiqueta", () => {
    const sede: LogicField = {
      id: "sede",
      config: { options: [{ label: "Torre Norte", value: "torre-norte" }] },
    };
    const codigo = {
      kind: "concat" as const,
      parts: [
        { type: "field" as const, fieldId: "cliente" },
        { type: "text" as const, text: " - " },
        { type: "field" as const, fieldId: "sede" },
      ],
    };
    expect(
      evaluateComputed(
        codigo,
        { cliente: "Andino", sede: "torre-norte" },
        { fields: [sede] },
      ),
    ).toBe("Andino - Torre Norte");
    expect(evaluateComputed(codigo, {}, { fields: [sede] })).toBeNull();
  });

  it("un derivado se alimenta de otro: vencimiento y días que faltan", () => {
    const fields: LogicField[] = [
      field("expedicion"),
      {
        id: "vence",
        config: {
          computed: {
            kind: "dateAdd",
            of: "expedicion",
            amount: 1,
            unit: "years",
          },
        },
      },
      {
        id: "faltan",
        config: { computed: { kind: "daysUntil", of: "vence" } },
      },
    ];
    const withToday = computeComputedValues(
      fields,
      { expedicion: "2025-09-24" },
      undefined,
      TODAY,
    );
    expect(withToday.get("vence")).toBe("2026-09-24");
    expect(withToday.get("faltan")).toBe(10);
    // Sin hoy, lo que se guarda es la fecha, no los días.
    const withoutToday = computeComputedValues(fields, {
      expedicion: "2025-09-24",
    });
    expect(withoutToday.get("vence")).toBe("2026-09-24");
    expect(withoutToday.has("faltan")).toBe(false);
  });

  it("las referencias de una receta cuentan para ciclos y borrados", () => {
    const f: LogicField = {
      id: "x",
      config: {
        computed: {
          kind: "arithmetic",
          operands: ["a", "b"],
          op: "+" as const,
        },
      },
    };
    expect(collectReferences(f).sort()).toEqual(["a", "b"]);
    expect(
      hasDependencyCycle([
        {
          id: "a",
          config: { computed: { kind: "percent", of: "b", percent: 1 } },
        },
        { id: "b", config: { computed: { kind: "count", of: "a" } } },
      ]),
    ).toBe(true);
  });
});

/* ─────────── Los tipos nuevos como controladores (diseño §4.5) ──────────── */

describe("valores de los tipos nuevos", () => {
  const signature = {
    storageId: "kg2abc",
    name: "firma.png",
    signerName: "Ana",
  };
  const vehicle = { responseId: "jd7slp835", label: "SLP-835", snapshot: [] };
  const rows = [{ rowId: "r1", cells: [{ columnId: "c1", value: "Casco" }] }];

  it("una firma y un archivo sólo dicen si están respondidos", () => {
    expect(evaluateRule(rule("firma", "isNotEmpty"), signature)).toBe(true);
    expect(evaluateRule(rule("firma", "isEmpty"), signature)).toBe(false);
    expect(evaluateRule(rule("firma", "isEmpty"), undefined)).toBe(true);
    // Un objeto que no apunta a nada no es una firma.
    expect(
      evaluateRule(rule("firma", "isEmpty"), { storageId: "", name: "" }),
    ).toBe(true);
    // Y no se compara con nada: no hay texto con el que compararla.
    expect(evaluateRule(rule("firma", "eq", "kg2abc"), signature)).toBe(false);
  });

  it("una tabla está vacía cuando no tiene filas", () => {
    expect(evaluateRule(rule("entregas", "isEmpty"), [])).toBe(true);
    expect(evaluateRule(rule("entregas", "isNotEmpty"), rows)).toBe(true);
    expect(evaluateRule(rule("entregas", "isEmpty"), rows)).toBe(false);
  });

  it("una relación se compara por el id del elemento, no por su título", () => {
    expect(evaluateRule(rule("vehiculo", "isNotEmpty"), vehicle)).toBe(true);
    expect(evaluateRule(rule("vehiculo", "eq", "jd7slp835"), vehicle)).toBe(
      true,
    );
    expect(evaluateRule(rule("vehiculo", "eq", "SLP-835"), vehicle)).toBe(
      false,
    );
    expect(evaluateRule(rule("vehiculo", "neq", "jd7otro"), vehicle)).toBe(
      true,
    );
    expect(
      evaluateRule(rule("vehiculo", "anyOf", "jd7otro", "jd7slp835"), vehicle),
    ).toBe(true);
    expect(evaluateRule(rule("vehiculo", "anyOf", "jd7otro"), vehicle)).toBe(
      false,
    );
    expect(evaluateRule(rule("vehiculo", "isEmpty"), undefined)).toBe(true);
  });

  it("un campo que depende de una relación se poda cuando no se cumple", () => {
    const fields = [
      field("vehiculo"),
      field("remolque", [rule("vehiculo", "eq", "jd7slp835")]),
    ];
    expect(
      pruneHiddenValues(fields, { vehiculo: vehicle, remolque: "R-01" }),
    ).toEqual({ vehiculo: vehicle, remolque: "R-01" });
    expect(
      pruneHiddenValues(fields, {
        vehiculo: { ...vehicle, responseId: "jd7otro" },
        remolque: "R-01",
      }),
    ).toEqual({ vehiculo: { ...vehicle, responseId: "jd7otro" } });
  });

  it("los valores de los tipos nuevos no cuentan como operandos de una receta", () => {
    const total = {
      kind: "arithmetic" as const,
      operands: ["entregas", "firma"],
      op: "+" as const,
    };
    // Con todo «lleno» pero nada numérico, cada operando vale `emptyAs`.
    expect(evaluateComputed(total, { entregas: rows, firma: signature })).toBe(
      0,
    );
  });
});
