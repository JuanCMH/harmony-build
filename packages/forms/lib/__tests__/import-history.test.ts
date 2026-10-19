import { describe, expect, it } from "vitest";

import {
  importCountsText,
  importStatusBadge,
  pendingRows,
  revertMessage,
} from "../import-history";

const counts = (extra: Partial<Parameters<typeof pendingRows>[0]> = {}) => ({
  total: 0,
  created: 0,
  updated: 0,
  skipped: 0,
  rejected: 0,
  ...extra,
});

describe("importCountsText", () => {
  it("dice lo que entró y calla lo que es cero", () => {
    expect(importCountsText(counts({ created: 3386 }), "record")).toBe(
      "3.386 respuestas",
    );
    expect(
      importCountsText(
        counts({ created: 1, updated: 22, skipped: 1, rejected: 2 }),
        "catalog",
      ),
    ).toBe("1 elemento · 22 actualizados · 1 omitido · 2 filas rechazadas");
  });
});

describe("pendingRows", () => {
  it("es lo anunciado que no llegó a enviarse", () => {
    expect(pendingRows(counts({ total: 100, created: 40, rejected: 10 }))).toBe(
      50,
    );
    expect(pendingRows(counts({ total: 5, created: 5 }))).toBe(0);
  });
});

describe("importStatusBadge", () => {
  it("terminada va sin insignia", () => {
    expect(importStatusBadge("done")).toBeNull();
    expect(importStatusBadge("running")).toEqual({
      label: "Sin terminar",
      tone: "yellow",
    });
    expect(importStatusBadge("reverted")).toEqual({
      label: "Deshecha",
      tone: "gray",
    });
  });
});

describe("revertMessage", () => {
  it("cuenta lo que se elimina de un formato", () => {
    expect(revertMessage(counts({ created: 3386 }), "record")).toBe(
      "Se eliminarán las 3.386 respuestas que trajo esta importación, y los resultados dejarán de contarlas. Esta acción no se puede deshacer.",
    );
    expect(revertMessage(counts({ created: 1 }), "record")).toContain(
      "Se eliminarán la respuesta que trajo",
    );
  });

  it("en un listado dice lo que se conserva", () => {
    expect(revertMessage(counts({ created: 23, updated: 4 }), "catalog")).toBe(
      "Se retirarán los 23 elementos que creó esta importación, salvo los que alguna respuesta ya eligió. Los 4 que actualizó conservan sus cambios. Esta acción no se puede deshacer.",
    );
    expect(revertMessage(counts({ created: 1 }), "catalog")).toBe(
      "Se retirarán el elemento que creó esta importación, salvo los que alguna respuesta ya eligió. Esta acción no se puede deshacer.",
    );
  });
});
