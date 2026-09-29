import { describe, expect, it } from "vitest";
import { pickDefaultProject } from "../default-project";

const project = (name: string, active: boolean) => ({ name, active });

describe("pickDefaultProject", () => {
  it("no elige nada si no hay proyectos", () => {
    expect(pickDefaultProject([])).toBeUndefined();
  });

  it("elige el primero activo aunque vaya detrás de uno archivado", () => {
    expect(
      pickDefaultProject([
        project("Archivado", false),
        project("Torre norte", true),
        project("Torre sur", true),
      ])?.name,
    ).toBe("Torre norte");
  });

  it("cae al primero cuando todos están archivados", () => {
    expect(
      pickDefaultProject([project("Uno", false), project("Dos", false)])?.name,
    ).toBe("Uno");
  });
});
