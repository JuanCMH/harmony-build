import { describe, expect, it } from "vitest";

import { missingRequiredFields } from "../form_evaluation";
import { importSections, isImportExempt } from "../import_types";
import { validateValues } from "../value_validation";
import {
  checklistField,
  field,
  oneSection,
  signatureField,
  tableField,
} from "./form.fixtures";

describe("isImportExempt", () => {
  it("exime lo que un archivo no puede traer", () => {
    expect(isImportExempt({ type: "signature" })).toBe(true);
    expect(isImportExempt({ type: "image" })).toBe(true);
    expect(isImportExempt({ type: "file" })).toBe(true);
    expect(isImportExempt({ type: "table" })).toBe(true);
    expect(isImportExempt({ type: "text" })).toBe(false);
    expect(isImportExempt({ type: "checklist" })).toBe(false);
    expect(isImportExempt({ type: "reference" })).toBe(false);
  });
});

describe("importSections", () => {
  const sections = oneSection(
    field("placa", { required: true }),
    signatureField("firma", "author", { required: true }),
    field("foto", { type: "image", required: true }),
    field("soporte", { type: "file", required: true }),
    tableField("entrega", { required: true }),
    checklistField("inspeccion", { required: true }),
  );

  it("deja de exigir firma, imagen, archivo, tabla y lista de chequeo", () => {
    expect(missingRequiredFields(sections, {})).toEqual([
      "placa",
      "firma",
      "foto",
      "soporte",
      "entrega",
      "inspeccion",
    ]);
    expect(missingRequiredFields(importSections(sections), {})).toEqual([
      "placa",
    ]);
  });

  it("no exige la lista de chequeo completa ni la nota del no conforme", () => {
    const values = {
      placa: "SLP835",
      inspeccion: [{ itemId: "aceite", value: "m" }],
    };
    expect(validateValues(sections, values).map((p) => p.code)).toEqual([
      "checklistNoteRequired",
      "checklistIncomplete",
    ]);
    expect(validateValues(importSections(sections), values)).toEqual([]);
  });

  it("sigue rechazando una opción que la escala no tiene", () => {
    const values = { inspeccion: [{ itemId: "aceite", value: "regular" }] };
    expect(
      validateValues(importSections(sections), values).map((p) => p.code),
    ).toEqual(["checklistOptionMissing"]);
  });

  it("no toca ids, tipos ni la definición original", () => {
    const relaxed = importSections(sections);
    expect(relaxed[0].fields.map((f) => [f.id, f.type])).toEqual(
      sections[0].fields.map((f) => [f.id, f.type]),
    );
    expect(sections[0].fields[5].required).toBe(true);
    expect(sections[0].fields[5].config.checklist?.note).toBe("onFail");
    expect(relaxed[0].fields[5].config.checklist?.note).toBe("optional");
  });

  it("respeta una nota que el formato no admite", () => {
    const never = oneSection(checklistField("lista", {}, { note: "never" }));
    expect(importSections(never)[0].fields[0].config.checklist?.note).toBe(
      "never",
    );
  });
});
