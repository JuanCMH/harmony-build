import { describe, expect, it } from "vitest";
import {
  buildProjectDeletionMessage,
  type ProjectDeletionImpact,
} from "../deletion-impact-message";

const impact = (
  overrides: Partial<ProjectDeletionImpact> = {},
): ProjectDeletionImpact => ({
  members: { count: 0, capped: false },
  roles: { count: 0, capped: false },
  forms: { count: 0, capped: false },
  responses: { count: 0, capped: false },
  ...overrides,
});

describe("buildProjectDeletionMessage", () => {
  it("mientras carga avisa igualmente de todo lo que se va", () => {
    const message = buildProjectDeletionMessage(undefined);
    expect(message).toContain("miembros");
    expect(message).toContain("roles");
    expect(message).toContain("formatos");
    expect(message).toContain("respuestas");
    expect(message).toContain("todos los registros del proyecto");
    expect(message).toContain("no se puede deshacer");
  });

  it("cuenta miembros y roles", () => {
    expect(
      buildProjectDeletionMessage(
        impact({
          members: { count: 3, capped: false },
          roles: { count: 2, capped: false },
        }),
      ),
    ).toBe(
      "Se eliminarán 3 miembros y 2 roles, junto con todos los registros del proyecto. Esta acción no se puede deshacer.",
    );
  });

  /** Un proyecto recién creado: sólo está quien lo creó. */
  it("habla en singular cuando sólo queda el propietario", () => {
    expect(
      buildProjectDeletionMessage(
        impact({ members: { count: 1, capped: false } }),
      ),
    ).toBe(
      "Se eliminará 1 miembro, junto con todos los registros del proyecto. Esta acción no se puede deshacer.",
    );
  });

  it("usa el plural del verbo si hay más de una cosa, aunque cada una sea una", () => {
    expect(
      buildProjectDeletionMessage(
        impact({
          members: { count: 1, capped: false },
          roles: { count: 1, capped: false },
        }),
      ),
    ).toContain("Se eliminarán 1 miembro y 1 rol,");
  });

  it("omite lo que está en cero", () => {
    const message = buildProjectDeletionMessage(
      impact({ members: { count: 4, capped: false } }),
    );
    expect(message).toContain("4 miembros,");
    expect(message).not.toContain("rol");
  });

  it("dice «más de» cuando el conteo tocó el tope", () => {
    expect(
      buildProjectDeletionMessage(
        impact({ members: { count: 500, capped: true } }),
      ),
    ).toContain("más de 500 miembros");
  });

  it("nombra también los formatos y sus respuestas, con comas y una sola «y»", () => {
    expect(
      buildProjectDeletionMessage(
        impact({
          members: { count: 12, capped: false },
          roles: { count: 3, capped: false },
          forms: { count: 24, capped: false },
          responses: { count: 1840, capped: false },
        }),
      ),
    ).toBe(
      "Se eliminarán 12 miembros, 3 roles, 24 formatos y 1.840 respuestas, junto con todos los registros del proyecto. Esta acción no se puede deshacer.",
    );
  });

  it("un formato sin respuestas no inventa respuestas", () => {
    const message = buildProjectDeletionMessage(
      impact({
        members: { count: 1, capped: false },
        forms: { count: 1, capped: false },
      }),
    );
    expect(message).toContain("Se eliminarán 1 miembro y 1 formato,");
    expect(message).not.toContain("respuesta");
  });

  it("habla en singular de una sola respuesta", () => {
    expect(
      buildProjectDeletionMessage(
        impact({
          forms: { count: 2, capped: false },
          responses: { count: 1, capped: false },
        }),
      ),
    ).toContain("2 formatos y 1 respuesta,");
  });

  it("dice «más de» cuando los formatos tocaron el tope", () => {
    expect(
      buildProjectDeletionMessage(
        impact({ forms: { count: 500, capped: true } }),
      ),
    ).toContain("más de 500 formatos");
  });

  it("no inventa cifras si no hay nada que contar", () => {
    expect(buildProjectDeletionMessage(impact())).toBe(
      "Se eliminará el proyecto con todos sus registros. Esta acción no se puede deshacer.",
    );
  });
});
