import { describe, expect, it } from "vitest";

import { sectionId } from "../settings-section";

describe("sectionId", () => {
  it("quita los acentos, que es el caso normal en español", () => {
    expect(sectionId("Organización")).toBe("seccion-organizacion");
    expect(sectionId("Categorías")).toBe("seccion-categorias");
    expect(sectionId("Tipos de inactividad")).toBe(
      "seccion-tipos-de-inactividad",
    );
  });

  it("convierte la eñe en n, como cualquier slug en español", () => {
    // Documentado a propósito: «Años» da `anos`, indistinguible de «Anos».
    // Los títulos de sección son un puñado fijo y ninguno colisiona.
    expect(sectionId("Años")).toBe("seccion-anos");
  });

  it("colapsa la puntuación y no deja guiones sueltos en los extremos", () => {
    expect(sectionId("Etiquetas de turno")).toBe("seccion-etiquetas-de-turno");
    expect(sectionId("¿Correos?")).toBe("seccion-correos");
    expect(sectionId("  Roles  ")).toBe("seccion-roles");
  });

  it("es estable: el mismo título da siempre el mismo ancla", () => {
    expect(sectionId("Bloqueos")).toBe(sectionId("Bloqueos"));
  });
});
