import { describe, expect, it } from "vitest";

import { valueProblems } from "../error_messages";
import type { FormField, FormValues } from "../form_types";
import {
  isEmail,
  isPhone,
  isRealDate,
  isTime,
  isUrl,
  validateValues,
} from "../value_validation";
import {
  checklistField,
  field,
  oneSection,
  referenceField,
  selectField,
  signatureField,
  tableField,
} from "./form.fixtures";

/** Los códigos de los problemas de un valor en un formato de un solo campo. */
const codes = (definition: FormField, value: unknown) =>
  validateValues(oneSection(definition), { [definition.id]: value }).map(
    (problem) => problem.code,
  );

describe("formatos de texto", () => {
  it("una fecha es `YYYY-MM-DD` y existe", () => {
    expect(isRealDate("2026-09-29")).toBe(true);
    expect(isRealDate("2024-02-29")).toBe(true);
    expect(isRealDate("2026-02-29")).toBe(false);
    expect(isRealDate("2026-13-01")).toBe(false);
    expect(isRealDate("29/09/2026")).toBe(false);
    expect(isRealDate("2026-9-29")).toBe(false);
  });

  it("una hora es `HH:mm`, de 00:00 a 23:59", () => {
    expect(isTime("07:30")).toBe(true);
    expect(isTime("23:59")).toBe(true);
    expect(isTime("24:00")).toBe(false);
    expect(isTime("7:30")).toBe(false);
    expect(isTime("07:60")).toBe(false);
  });

  it("correo, enlace y teléfono", () => {
    expect(isEmail("ana.rojas@obra.com.co")).toBe(true);
    expect(isEmail("ana@obra")).toBe(false);
    expect(isEmail("ana rojas@obra.co")).toBe(false);
    expect(isUrl("https://obra.co/planos?id=3")).toBe(true);
    expect(isUrl("obra.co")).toBe(false);
    expect(isUrl("ftp://obra.co")).toBe(false);
    expect(isPhone("+57 (310) 555-1234")).toBe(true);
    expect(isPhone("3105551234")).toBe(true);
    expect(isPhone("12345")).toBe(false);
    expect(isPhone("310-ABC-1234")).toBe(false);
  });
});

describe("validateValues", () => {
  it("devuelve el campo, el código y el mensaje en español", () => {
    expect(
      validateValues(oneSection(field("correo", { type: "email" })), {
        correo: "ana",
      }),
    ).toEqual([
      {
        fieldId: "correo",
        code: "invalidEmail",
        message: valueProblems.invalidEmail,
      },
    ]);
  });

  it("no valida lo vacío ni lo que no es de ningún campo", () => {
    expect(
      validateValues(oneSection(field("correo", { type: "email" })), {
        correo: "",
        suelto: 5,
      }),
    ).toEqual([]);
  });

  it("el valor tiene que ser del tipo de su campo", () => {
    expect(codes(field("a"), 5)).toEqual(["wrongKind"]);
    expect(codes(field("a", { type: "number" }), "doce")).toEqual([
      "wrongKind",
    ]);
    expect(codes(field("a", { type: "checkbox" }), "quizá")).toEqual([
      "wrongKind",
    ]);
    expect(codes(field("a", { type: "multiSelect" }), "a")).toEqual([
      "wrongKind",
    ]);
    expect(codes(field("a", { type: "image" }), "foto.jpg")).toEqual([
      "wrongKind",
    ]);
    expect(codes(referenceField("a", "f"), "jd7")).toEqual(["wrongKind"]);
    expect(codes(checklistField("a"), "todo bien")).toEqual(["wrongKind"]);
    expect(codes(tableField("a"), [{ fila: 1 }])).toEqual(["wrongKind"]);
  });

  it("cada tipo de texto valida su formato", () => {
    const cases = [
      ["email", "ana@obra.co", "ana", "invalidEmail"],
      ["url", "https://obra.co", "obra", "invalidUrl"],
      ["phone", "310 555 1234", "abc", "invalidPhone"],
      ["date", "2026-09-29", "2026-02-30", "invalidDate"],
      ["time", "07:30", "25:00", "invalidTime"],
    ] as const;
    for (const [type, good, bad, code] of cases) {
      expect(codes(field("a", { type }), good), type).toEqual([]);
      expect(codes(field("a", { type }), bad), type).toEqual([code]);
    }
  });

  it("respeta la longitud mínima y máxima", () => {
    const plate = field("a", { config: { minLength: 6, maxLength: 7 } });
    expect(codes(plate, "SLP-835")).toEqual([]);
    expect(codes(plate, "SLP")).toEqual(["tooShort"]);
    expect(codes(plate, "SLP-8355")).toEqual(["tooLong"]);
    // Y un techo que el formato no puede subir.
    expect(codes(field("a", { type: "textarea" }), "x".repeat(5001))).toEqual([
      "tooLong",
    ]);
  });

  it("respeta el valor mínimo y máximo", () => {
    const hours = field("a", {
      type: "number",
      config: { minValue: 0, maxValue: 24 },
    });
    expect(codes(hours, 8)).toEqual([]);
    expect(codes(hours, 0)).toEqual([]);
    expect(codes(hours, -1)).toEqual(["belowMin"]);
    expect(codes(hours, 25)).toEqual(["aboveMax"]);
  });

  it("la opción de una lista tiene que existir", () => {
    const shift = selectField("a", ["diurno", "nocturno"]);
    expect(codes(shift, "diurno")).toEqual([]);
    expect(codes(shift, "mixto")).toEqual(["optionMissing"]);

    const courses = field("a", {
      type: "multiSelect",
      config: { options: [{ label: "Alturas", value: "alturas" }] },
    });
    expect(codes(courses, ["alturas"])).toEqual([]);
    expect(codes(courses, ["alturas", "izaje"])).toEqual(["optionMissing"]);
  });

  it("una firma lleva el nombre de quien firma", () => {
    const signed = { storageId: "k", name: "firma.png", signerName: "Ana" };
    expect(codes(signatureField("a", "other"), signed)).toEqual([]);
    expect(
      codes(signatureField("a", "other"), { ...signed, signerName: "  " }),
    ).toEqual(["signerNameRequired"]);
  });
});

describe("lista de chequeo", () => {
  const complete = [
    { itemId: "aceite", value: "b" },
    { itemId: "refrigerante", value: "b" },
    { itemId: "altas", value: "na" },
    { itemId: "medias", value: "m", note: "Fundida" },
  ];

  it("acepta una inspección completa", () => {
    expect(codes(checklistField("a", { required: true }), complete)).toEqual(
      [],
    );
  });

  it("cada ítem tiene que existir y no ser un encabezado", () => {
    expect(
      codes(checklistField("a"), [{ itemId: "fantasma", value: "b" }]),
    ).toEqual(["checklistUnknownItem"]);
    expect(
      codes(checklistField("a"), [{ itemId: "frontales", value: "b" }]),
    ).toEqual(["checklistUnknownItem"]);
  });

  it("un ítem no se responde dos veces", () => {
    expect(
      codes(checklistField("a"), [
        { itemId: "aceite", value: "b" },
        { itemId: "aceite", value: "na" },
      ]),
    ).toEqual(["checklistDuplicateItem"]);
  });

  it("la opción tiene que ser de la escala", () => {
    expect(
      codes(checklistField("a"), [{ itemId: "aceite", value: "regular" }]),
    ).toEqual(["checklistOptionMissing"]);
  });

  it("obligatoria significa todos los ítems respondidos", () => {
    const partial = complete.slice(0, 3);
    expect(codes(checklistField("a", { required: true }), partial)).toEqual([
      "checklistIncomplete",
    ]);
    expect(
      validateValues(oneSection(checklistField("a", { required: true })), {
        a: partial,
      })[0].itemId,
    ).toBe("medias");
    // Sin ser obligatoria, se puede dejar a medias.
    expect(codes(checklistField("a"), partial)).toEqual([]);
  });

  it("una observación sola no responde un ítem", () => {
    expect(
      codes(checklistField("a", { required: true }, { note: "optional" }), [
        ...complete.slice(0, 3),
        { itemId: "medias", note: "No alcancé a revisar" },
      ]),
    ).toEqual(["checklistIncomplete"]);
  });

  it("la observación es obligatoria cuando la respuesta es no conforme", () => {
    expect(
      codes(checklistField("a"), [{ itemId: "aceite", value: "m" }]),
    ).toEqual(["checklistNoteRequired"]);
    expect(
      codes(checklistField("a"), [{ itemId: "aceite", value: "m", note: " " }]),
    ).toEqual(["checklistNoteRequired"]);
    // En lo conforme es opcional.
    expect(
      codes(checklistField("a"), [
        { itemId: "aceite", value: "b", note: "Recién cambiado" },
      ]),
    ).toEqual([]);
    // Y si el formato no la exige, tampoco en lo no conforme.
    expect(
      codes(checklistField("a", {}, { note: "optional" }), [
        { itemId: "aceite", value: "m" },
      ]),
    ).toEqual([]);
  });

  it("no admite observación, cantidad ni fecha que la lista no pide", () => {
    const never = checklistField("a", {}, { note: "never" });
    expect(
      codes(never, [{ itemId: "aceite", value: "b", note: "Bien" }]),
    ).toEqual(["checklistExtraNotAllowed"]);
    expect(
      codes(never, [{ itemId: "aceite", value: "b", quantity: 2 }]),
    ).toEqual(["checklistExtraNotAllowed"]);
    expect(
      codes(never, [{ itemId: "aceite", value: "b", date: "2026-09-29" }]),
    ).toEqual(["checklistExtraNotAllowed"]);
  });

  it("valida la cantidad y la fecha cuando la lista las pide", () => {
    // La inspección de botiquín: cantidad actual y fecha de vencimiento.
    const kit = checklistField(
      "a",
      {},
      {
        note: "optional",
        quantity: { label: "Cant. actual" },
        date: { label: "Vence" },
      },
    );
    expect(
      codes(kit, [
        { itemId: "aceite", value: "b", quantity: 3, date: "2027-01-31" },
      ]),
    ).toEqual([]);
    expect(
      codes(kit, [{ itemId: "aceite", value: "b", quantity: -1 }]),
    ).toEqual(["checklistInvalidQuantity"]);
    expect(
      codes(kit, [{ itemId: "aceite", value: "b", date: "31/01/2027" }]),
    ).toEqual(["checklistInvalidDate"]);
  });

  it("una observación no pasa de 500 caracteres", () => {
    expect(
      codes(checklistField("a"), [
        { itemId: "aceite", value: "m", note: "x".repeat(501) },
      ]),
    ).toEqual(["checklistNoteTooLong"]);
  });
});

describe("tabla", () => {
  const row = (rowId: string, cells: Record<string, unknown>) => ({
    rowId,
    cells: Object.entries(cells).map(([columnId, value]) => ({
      columnId,
      value,
    })),
  });
  const helmet = row("r1", { elemento: "Casco", cantidad: 2 });

  it("acepta una entrega bien diligenciada", () => {
    expect(
      codes(tableField("a"), [
        helmet,
        row("r2", {
          elemento: "Botas",
          cantidad: 1,
          fecha: "2026-09-29",
          talla: "l",
        }),
      ]),
    ).toEqual([]);
  });

  it("respeta las filas mínimas y máximas", () => {
    const bounded = tableField("a", {}, { minRows: 2, maxRows: 2 });
    expect(codes(bounded, [helmet])).toEqual(["tableTooFewRows"]);
    expect(
      codes(bounded, [
        helmet,
        { ...helmet, rowId: "r2" },
        { ...helmet, rowId: "r3" },
      ]),
    ).toEqual(["tableTooManyRows"]);
    // Una fila que nadie llenó no cuenta.
    expect(
      codes(bounded, [
        helmet,
        row("r2", { elemento: "", cantidad: undefined }),
      ]),
    ).toEqual(["tableTooFewRows"]);
  });

  it("nunca admite más de 100 filas", () => {
    const rows = Array.from({ length: 101 }, (_, i) => ({
      ...helmet,
      rowId: `r${i}`,
    }));
    expect(codes(tableField("a"), rows)).toEqual(["tableTooManyRows"]);
  });

  it("dos filas no comparten identificador", () => {
    expect(codes(tableField("a"), [helmet, helmet])).toEqual([
      "tableDuplicateRow",
    ]);
  });

  it("cada celda es de una columna que existe", () => {
    expect(
      codes(tableField("a"), [
        row("r1", { ...{ elemento: "Casco", cantidad: 1 }, color: "rojo" }),
      ]),
    ).toEqual(["tableUnknownColumn"]);
  });

  it("las celdas obligatorias se exigen en cada fila", () => {
    const problems = validateValues(oneSection(tableField("a")), {
      a: [helmet, row("r2", { elemento: "Guantes" })],
    });
    expect(problems).toEqual([
      {
        fieldId: "a",
        code: "tableCellRequired",
        message: valueProblems.tableCellRequired,
        rowId: "r2",
        columnId: "cantidad",
      },
    ]);
  });

  it("cada celda es del tipo de su columna", () => {
    const bad = (cells: Record<string, unknown>) =>
      codes(tableField("a"), [
        row("r1", { elemento: "Casco", cantidad: 1, ...cells }),
      ]);
    expect(bad({ cantidad: "dos" })).toEqual(["tableCellInvalid"]);
    expect(bad({ elemento: 5 })).toEqual(["tableCellInvalid"]);
    expect(bad({ fecha: "ayer" })).toEqual(["tableCellInvalid"]);
    expect(bad({ talla: "xxl" })).toEqual(["tableCellInvalid"]);
  });

  it("una firma por fila lleva el nombre de quien recibe", () => {
    const delivery = tableField(
      "a",
      {},
      {
        columns: [
          { id: "elemento", label: "Elemento", type: "text", required: true },
          { id: "recibe", label: "Recibe", type: "signature", required: true },
        ],
      },
    );
    const signed = (signerName: string) => [
      row("r1", {
        elemento: "Casco",
        recibe: { storageId: "k", name: "firma.png", signerName },
      }),
    ];
    expect(codes(delivery, signed("Luis Pardo"))).toEqual([]);
    expect(codes(delivery, signed(""))).toEqual(["signerNameRequired"]);
  });
});

describe("un formato entero", () => {
  it("devuelve los problemas en el orden de los campos", () => {
    const sections = oneSection(
      field("correo", { type: "email" }),
      field("horas", { type: "number", config: { maxValue: 24 } }),
      selectField("turno", ["diurno"]),
    );
    const values: FormValues = { turno: "mixto", horas: 30, correo: "ana" };
    expect(
      validateValues(sections, values).map((p) => [p.fieldId, p.code]),
    ).toEqual([
      ["correo", "invalidEmail"],
      ["horas", "aboveMax"],
      ["turno", "optionMissing"],
    ]);
  });
});
