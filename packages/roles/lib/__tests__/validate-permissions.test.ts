import { describe, expect, it } from "vitest";
import { validatePermissions } from "../validate-permissions";

describe("validatePermissions", () => {
  it("deja pasar siempre a propietario y administrador", () => {
    expect(validatePermissions({ role: "owner" })).toBe(true);
    expect(
      validatePermissions({ role: "admin", permissions: ["viewLogs"] }),
    ).toBe(true);
  });

  it("niega a un miembro sin rol personalizado", () => {
    expect(
      validatePermissions({ role: "member", permissions: ["viewLogs"] }),
    ).toBe(false);
  });

  it("niega a un miembro cuando no se pregunta por ninguna llave", () => {
    expect(
      validatePermissions({ role: "member", customRole: { viewLogs: true } }),
    ).toBe(false);
  });

  it("con «any» basta una de las llaves", () => {
    expect(
      validatePermissions({
        role: "member",
        customRole: { inviteUsers: true, expelUsers: false },
        permissions: ["inviteUsers", "expelUsers"],
      }),
    ).toBe(true);
  });

  it("con «all» hacen falta todas", () => {
    expect(
      validatePermissions({
        role: "member",
        customRole: { inviteUsers: true, expelUsers: false },
        permissions: ["inviteUsers", "expelUsers"],
        validationType: "all",
      }),
    ).toBe(false);
  });
});
