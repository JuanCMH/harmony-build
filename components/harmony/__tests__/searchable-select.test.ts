import { describe, expect, it } from "vitest";

import { BUSQUEDA_DESDE, coincide, conBuscador, normalizarBusqueda } from "../searchable-select.utils";

describe("searchable-select", () => {
  it("el buscador aparece sólo cuando la lista pasa del umbral", () => {
    expect(conBuscador(BUSQUEDA_DESDE)).toBe(false);
    expect(conBuscador(BUSQUEDA_DESDE + 1)).toBe(true);
  });

  it("busca sin mayúsculas ni tildes", () => {
    expect(normalizarBusqueda("  Póliza Vigente ")).toBe("poliza vigente");
    expect(coincide("Vencimiento de la póliza", "POLIZA")).toBe(true);
    expect(coincide("Días para el fin", "dias")).toBe(true);
  });

  it("cada palabra buscada tiene que estar, en cualquier orden", () => {
    expect(coincide("Tarifa mensual por puesto", "puesto tarifa")).toBe(true);
    expect(coincide("Tarifa mensual por puesto", "puesto anual")).toBe(false);
  });

  it("una búsqueda vacía deja pasar todo", () => {
    expect(coincide("Lo que sea", "   ")).toBe(true);
  });
});
