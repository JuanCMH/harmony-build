import { describe, expect, it } from "vitest";

import { fitRows } from "../fit-rows";

describe("las filas que caben en una tarjeta", () => {
  it("si caben todas, van todas y no hace falta «y N más»", () => {
    expect(
      fitRows({ space: 200, total: 5, rowHeight: 40, moreHeight: 28 }),
    ).toBe(5);
  });

  it("si no, las que quepan dejando sitio a «y N más»", () => {
    // 200 − 28 = 172: caben cuatro de 40, no cinco.
    expect(
      fitRows({ space: 200, total: 6, rowHeight: 40, moreHeight: 28 }),
    ).toBe(4);
  });

  it("nunca menos de cero", () => {
    expect(
      fitRows({ space: 10, total: 3, rowHeight: 40, moreHeight: 28 }),
    ).toBe(0);
  });

  it("con más de las que llegaron, la línea va aunque quepan todas", () => {
    expect(
      fitRows({
        space: 400,
        total: 3,
        rowHeight: 40,
        moreHeight: 28,
        more: true,
      }),
    ).toBe(3);
    expect(
      fitRows({
        space: 100,
        total: 3,
        rowHeight: 40,
        moreHeight: 28,
        more: true,
      }),
    ).toBe(1);
  });
});
