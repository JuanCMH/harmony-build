import { describe, expect, it } from "vitest";

import { detectDelimiter, parseCsv } from "../import-csv";

describe("detectDelimiter", () => {
  it("elige el que más aparece en la primera línea, fuera de comillas", () => {
    expect(detectDelimiter("Placa,Tipo,SOAT\n")).toBe(",");
    expect(detectDelimiter("Placa;Tipo;SOAT\n1,5;2;3")).toBe(";");
    expect(detectDelimiter("Placa\tTipo\n")).toBe("\t");
    expect(detectDelimiter('"a,b,c,d";Tipo;SOAT')).toBe(";");
    expect(detectDelimiter("Placa")).toBe(",");
  });
});

describe("parseCsv", () => {
  it("lee filas y celdas, con o sin salto final", () => {
    expect(parseCsv("Placa,Tipo\nSLP835,Furgón\n")).toEqual([
      ["Placa", "Tipo"],
      ["SLP835", "Furgón"],
    ]);
    expect(parseCsv("Placa,Tipo\r\nSLP835,Furgón")).toEqual([
      ["Placa", "Tipo"],
      ["SLP835", "Furgón"],
    ]);
  });

  it("respeta comillas, comillas dobles y saltos dentro de una celda", () => {
    expect(
      parseCsv(
        'Ítem,Observación\n"Luces, altas","Dijo ""no enciende""\ny se fue"',
      ),
    ).toEqual([
      ["Ítem", "Observación"],
      ["Luces, altas", 'Dijo "no enciende"\ny se fue'],
    ]);
  });

  it("quita la marca de orden de bytes y usa el separador del archivo", () => {
    expect(parseCsv("﻿Placa;Km\nSLP835;12,5")).toEqual([
      ["Placa", "Km"],
      ["SLP835", "12,5"],
    ]);
  });

  it("conserva las filas vacías y las celdas vacías", () => {
    expect(parseCsv("a,b\n\n,2\n")).toEqual([["a", "b"], [""], ["", "2"]]);
    expect(parseCsv("")).toEqual([]);
  });
});
