import { describe, expect, it } from "vitest";
import { isCaptureView } from "../capture-view";
import { emptyPermissions } from "../permissions";

const onlyFill = { ...emptyPermissions(), fillForms: true };

describe("isCaptureView", () => {
  it("la tiene un rol que sólo diligencia", () => {
    expect(isCaptureView({ role: "member", customRole: onlyFill })).toBe(true);
  });

  it("no la tiene quien además gestiona algo", () => {
    for (const key of ["viewResponses", "editCatalogs", "viewLogs"] as const) {
      expect(
        isCaptureView({
          role: "member",
          customRole: { ...onlyFill, [key]: true },
        }),
      ).toBe(false);
    }
  });

  it("no la tiene un rol sin la llave de diligenciar", () => {
    expect(
      isCaptureView({ role: "member", customRole: emptyPermissions() }),
    ).toBe(false);
  });

  it("no la tiene un miembro sin rol", () => {
    expect(isCaptureView({ role: "member", customRole: null })).toBe(false);
  });

  it("propietario y administrador tienen siempre la completa", () => {
    expect(isCaptureView({ role: "owner", customRole: onlyFill })).toBe(false);
    expect(isCaptureView({ role: "admin", customRole: onlyFill })).toBe(false);
  });
});
