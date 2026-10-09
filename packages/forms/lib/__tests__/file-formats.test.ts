import { describe, expect, it } from "vitest";

import {
  FILE_FORMAT_GROUPS,
  acceptsFile,
  describeFormats,
  toggleFormatGroup,
} from "../file-formats";

const [pdf, word] = FILE_FORMAT_GROUPS;

describe("formatos de archivo", () => {
  it("encender y apagar un grupo deja la lista como estaba", () => {
    const withPdf = toggleFormatGroup([], pdf);
    expect(withPdf).toEqual([".pdf"]);
    expect(toggleFormatGroup(withPdf ?? [], pdf)).toBeUndefined();
  });

  it("apagar un grupo no se lleva los demás", () => {
    expect(toggleFormatGroup([".pdf", ".doc", ".docx"], word)).toEqual([
      ".pdf",
    ]);
  });

  it("describe los grupos como se piensan", () => {
    expect(describeFormats([".pdf", ".doc", ".docx"])).toBe("PDF o Word");
    expect(describeFormats([".pdf", ".doc", ".docx", ".csv"])).toBe(
      "PDF, Word o .csv",
    );
  });

  it("acepta por extensión, sin importar mayúsculas", () => {
    const formats = toggleFormatGroup([], word) ?? [];
    expect(acceptsFile(formats, { name: "Contrato.DOCX", type: "" })).toBe(
      true,
    );
    expect(acceptsFile(formats, { name: "foto.png", type: "image/png" })).toBe(
      false,
    );
    expect(acceptsFile([], { name: "lo-que-sea.zip", type: "" })).toBe(true);
  });
});
