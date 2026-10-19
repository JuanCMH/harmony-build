import { describe, expect, it } from "vitest";

import {
  cellText,
  isBlankCell,
  parseBoolean,
  parseDate,
  parseNumber,
  parseTime,
} from "../import-cells";

/** Una fecha de Excel: `exceljs` la entrega en UTC. */
const excel = (iso: string) => new Date(`${iso}Z`);

describe("cellText", () => {
  it("dice la celda como se leería en la hoja", () => {
    expect(cellText("  SLP835 ")).toBe("SLP835");
    expect(cellText(1200)).toBe("1200");
    expect(cellText(true)).toBe("Sí");
    expect(cellText(excel("2025-11-03T00:00:00"))).toBe("2025-11-03");
    expect(cellText(null)).toBe("");
    expect(isBlankCell("   ")).toBe(true);
    expect(isBlankCell(0)).toBe(false);
    expect(isBlankCell(false)).toBe(false);
  });
});

describe("parseNumber", () => {
  it("acepta números y textos con la coma decimal de Colombia", () => {
    expect(parseNumber(1200)).toBe(1200);
    expect(parseNumber("1200")).toBe(1200);
    expect(parseNumber("12,5")).toBe(12.5);
    expect(parseNumber("-3,25")).toBe(-3.25);
    expect(parseNumber("$ 1.250.000")).toBe(1250000);
    expect(parseNumber("1.250.000,50")).toBe(1250000.5);
    expect(parseNumber("1,250,000.50")).toBe(1250000.5);
  });

  it("un punto es de miles si agrupa de tres en tres, y decimal si no", () => {
    expect(parseNumber("12.500")).toBe(12500);
    expect(parseNumber("12.5")).toBe(12.5);
    expect(parseNumber("0.75")).toBe(0.75);
  });

  it("rechaza lo que no es un número", () => {
    expect(parseNumber("doce")).toBeNull();
    expect(parseNumber("12 km")).toBeNull();
    expect(parseNumber("1,2,3")).toBeNull();
    expect(parseNumber("")).toBeNull();
    expect(parseNumber(".")).toBeNull();
    expect(parseNumber(true)).toBeNull();
    expect(parseNumber(Number.NaN)).toBeNull();
  });
});

describe("parseDate", () => {
  it("lee una fecha de Excel por sus partes UTC", () => {
    expect(parseDate(excel("2025-11-03T00:00:00"))).toBe("2025-11-03");
    // La marca temporal de un formulario: la hora no cambia el día.
    expect(parseDate(excel("2025-11-03T23:40:00"))).toBe("2025-11-03");
  });

  it("lee texto ISO y día primero, con o sin hora", () => {
    expect(parseDate("2025-11-03")).toBe("2025-11-03");
    expect(parseDate("2025-11-03T14:20:00")).toBe("2025-11-03");
    expect(parseDate("3/11/2025")).toBe("2025-11-03");
    expect(parseDate("03-11-2025 7:15:00")).toBe("2025-11-03");
    expect(parseDate("03.11.25")).toBe("2025-11-03");
  });

  it("entiende mes primero cuando el día no puede ser un mes", () => {
    expect(parseDate("11/23/2025")).toBe("2025-11-23");
    expect(parseDate("23/11/2025")).toBe("2025-11-23");
  });

  it("lee el número de serie de Excel", () => {
    expect(parseDate(45964)).toBe("2025-11-03");
    expect(parseDate(12)).toBeNull();
  });

  it("rechaza lo que no existe o no es una fecha", () => {
    expect(parseDate("30/02/2025")).toBeNull();
    expect(parseDate("ayer")).toBeNull();
    expect(parseDate("")).toBeNull();
    expect(parseDate(null)).toBeNull();
    expect(parseDate(new Date(Number.NaN))).toBeNull();
  });
});

describe("parseTime", () => {
  it("lee horas de texto, con segundos y con a. m. / p. m.", () => {
    expect(parseTime("07:30")).toBe("07:30");
    expect(parseTime("7:30")).toBe("07:30");
    expect(parseTime("7:30:45")).toBe("07:30");
    expect(parseTime("7:30 p. m.")).toBe("19:30");
    expect(parseTime("12:05 a.m.")).toBe("00:05");
    expect(parseTime("12:05 PM")).toBe("12:05");
  });

  it("lee la hora de una celda de Excel", () => {
    expect(parseTime(excel("1899-12-30T07:30:00"))).toBe("07:30");
    expect(parseTime(0.5)).toBe("12:00");
  });

  it("rechaza lo que no es una hora", () => {
    expect(parseTime("25:00")).toBeNull();
    expect(parseTime("13:00 p. m.")).toBeNull();
    expect(parseTime("temprano")).toBeNull();
    expect(parseTime(3)).toBeNull();
  });
});

describe("parseBoolean", () => {
  it("lee sí y no como los escribe la gente", () => {
    for (const yes of [true, 1, "Sí", "si", "SI", "X", "x", "Verdadero", "1"]) {
      expect(parseBoolean(yes)).toBe(true);
    }
    for (const no of [false, 0, "No", "NO", "falso", "0"]) {
      expect(parseBoolean(no)).toBe(false);
    }
    expect(parseBoolean("tal vez")).toBeNull();
    expect(parseBoolean(2)).toBeNull();
    expect(parseBoolean(null)).toBeNull();
  });
});
