import { describe, expect, it } from "vitest";
import { formStatusBadge, hasUnpublishedChanges } from "../status";

describe("el estado de un formato", () => {
  it("un publicado dice su versión", () => {
    expect(
      formStatusBadge({ status: "published", publishedVersionNumber: 3 }),
    ).toEqual({ label: "Publicado · v3", tone: "green" });
  });

  it("borrador y archivado van en gris", () => {
    expect(
      formStatusBadge({ status: "draft", publishedVersionNumber: null }).tone,
    ).toBe("gray");
    expect(
      formStatusBadge({ status: "archived", publishedVersionNumber: 2 }),
    ).toEqual({ label: "Archivado", tone: "gray" });
  });

  it("sólo un publicado tiene cambios sin publicar", () => {
    expect(
      hasUnpublishedChanges({ status: "published", hasDraftChanges: true }),
    ).toBe(true);
    expect(
      hasUnpublishedChanges({ status: "draft", hasDraftChanges: true }),
    ).toBe(false);
  });
});
