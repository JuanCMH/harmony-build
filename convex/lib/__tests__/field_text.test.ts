import { describe, expect, it } from "vitest";

import {
  answerableItems,
  checklistSummaryText,
  summarizeChecklist,
} from "../checklist_summary";
import { dateText, fieldText, groupThousands } from "../field_text";
import {
  checklistConfig,
  checklistField,
  field,
  referenceField,
  selectField,
  signatureField,
  tableField,
} from "./form.fixtures";

describe("groupThousands", () => {
  it("separa los miles con punto y los decimales con coma", () => {
    expect(groupThousands(1234567.5)).toBe("1.234.567,5");
    expect(groupThousands(1250000, 0)).toBe("1.250.000");
    expect(groupThousands(-4500)).toBe("-4.500");
    expect(groupThousands(12)).toBe("12");
  });
});

describe("fieldText", () => {
  it("vacío cuando no hay respuesta", () => {
    expect(fieldText(field("a"), undefined)).toBe("");
    expect(fieldText(field("a"), "  ")).toBe("");
    expect(fieldText(tableField("a"), [])).toBe("");
  });

  it("una lista se lee por su etiqueta, no por su valor", () => {
    const shift = field("a", {
      type: "select",
      config: { options: [{ label: "Turno diurno", value: "opcion-1" }] },
    });
    expect(fieldText(shift, "opcion-1")).toBe("Turno diurno");
    // Una opción que ya no existe se deja como está.
    expect(fieldText(shift, "opcion-9")).toBe("opcion-9");
    expect(
      fieldText({ ...shift, type: "multiSelect" }, ["opcion-1", "opcion-9"]),
    ).toBe("Turno diurno, opcion-9");
    expect(fieldText(selectField("a", ["Moto"]), "Moto")).toBe("Moto");
  });

  it("una fecha se lee como `DD/MM/YYYY`", () => {
    expect(fieldText(field("a", { type: "date" }), "2026-09-15")).toBe(
      "15/09/2026",
    );
    expect(dateText("sin fecha")).toBe("sin fecha");
  });

  it("una casilla dice «Sí» o «No»", () => {
    expect(fieldText(field("a", { type: "checkbox" }), true)).toBe("Sí");
    expect(fieldText(field("a", { type: "checkbox" }), false)).toBe("No");
  });

  it("los números llevan separador de miles, y la moneda su signo", () => {
    expect(fieldText(field("a", { type: "number" }), 12500.75)).toBe(
      "12.500,75",
    );
    expect(fieldText(field("a", { type: "currency" }), 1250000)).toBe(
      "$ 1.250.000",
    );
    expect(fieldText(field("a", { type: "number" }), 0)).toBe("0");
  });

  it("un archivo se lee por su nombre", () => {
    expect(
      fieldText(field("a", { type: "image" }), {
        storageId: "k",
        name: "extintor.jpg",
      }),
    ).toBe("extintor.jpg");
  });

  it("una firma dice quién firmó", () => {
    expect(
      fieldText(signatureField("a"), {
        storageId: "k",
        name: "firma.png",
        signerName: "Ana Rojas",
      }),
    ).toBe("Firmado por Ana Rojas");
  });

  it("una relación se lee por el título del elemento", () => {
    expect(
      fieldText(referenceField("a", "f"), {
        responseId: "r1",
        label: "SLP-835",
        snapshot: [],
      }),
    ).toBe("SLP-835");
  });

  it("una tabla dice cuántas filas tiene", () => {
    const row = (rowId: string) => ({
      rowId,
      cells: [{ columnId: "elemento", value: "Casco" }],
    });
    expect(fieldText(tableField("a"), [row("1")])).toBe("1 fila");
    expect(fieldText(tableField("a"), [row("1"), row("2"), row("3")])).toBe(
      "3 filas",
    );
  });

  it("una lista de chequeo se resume por el sentido de cada respuesta", () => {
    expect(
      fieldText(checklistField("a"), [
        { itemId: "aceite", value: "b" },
        { itemId: "refrigerante", value: "b" },
        { itemId: "altas", value: "m", note: "Fundida" },
        { itemId: "medias", value: "na" },
      ]),
    ).toBe("2 conformes · 1 no conforme · 1 no aplica");
  });
});

describe("summarizeChecklist", () => {
  const config = checklistConfig();

  it("los encabezados no cuentan: sólo lo que se responde", () => {
    expect(answerableItems(config).map((item) => item.id)).toEqual([
      "aceite",
      "refrigerante",
      "altas",
      "medias",
    ]);
  });

  it("cuenta conformes, no conformes, no aplica y sin responder", () => {
    expect(
      summarizeChecklist(config, [
        { itemId: "aceite", value: "b" },
        { itemId: "altas", value: "m", note: "Fundida" },
      ]),
    ).toEqual({ ok: 1, fail: 1, na: 0, unanswered: 2, total: 4 });
  });

  it("cuenta por el sentido, no por la letra de la escala", () => {
    const yesNo = checklistConfig({
      options: [
        { value: "si", label: "Sí", short: "Sí", meaning: "ok" },
        { value: "no", label: "No", short: "No", meaning: "fail" },
      ],
    });
    expect(
      summarizeChecklist(yesNo, [
        { itemId: "aceite", value: "no" },
        { itemId: "refrigerante", value: "si" },
      ]),
    ).toMatchObject({ ok: 1, fail: 1 });
  });

  it("una opción que ya no es de la escala cuenta como sin responder", () => {
    expect(
      summarizeChecklist(config, [{ itemId: "aceite", value: "regular" }]),
    ).toMatchObject({ ok: 0, unanswered: 4 });
  });

  it("la inspección de 63 ítems se lee como en el papel", () => {
    expect(
      checklistSummaryText({
        ok: 61,
        fail: 2,
        na: 0,
        unanswered: 0,
        total: 63,
      }),
    ).toBe("61 conformes · 2 no conformes · 0 no aplica");
    expect(
      checklistSummaryText({ ok: 1, fail: 0, na: 0, unanswered: 3, total: 4 }),
    ).toBe("1 conforme · 0 no conformes · 0 no aplica · 3 sin responder");
  });
});
