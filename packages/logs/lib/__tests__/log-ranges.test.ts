import { describe, expect, it } from "vitest";
import { dayRange, monthRange } from "../log-ranges";

describe("dayRange", () => {
  it("cubre el día natural completo de quien mira", () => {
    const { from, to } = dayRange(new Date(2026, 7, 24, 15, 30));

    expect(new Date(from).getHours()).toBe(0);
    expect(new Date(from).getDate()).toBe(24);
    expect(new Date(to).getDate()).toBe(25);
    expect(to - from).toBe(24 * 60 * 60 * 1000);
  });

  it("incluye lo registrado de noche, que el filtro en UTC empujaba al día siguiente", () => {
    const { from, to } = dayRange(new Date(2026, 7, 24));
    const alMedioDia = new Date(2026, 7, 24, 12, 0).getTime();
    const casiMedianoche = new Date(2026, 7, 24, 23, 59).getTime();
    const alDiaSiguiente = new Date(2026, 7, 25, 0, 1).getTime();

    expect(alMedioDia).toBeGreaterThanOrEqual(from);
    expect(alMedioDia).toBeLessThan(to);
    expect(casiMedianoche).toBeLessThan(to);
    expect(alDiaSiguiente).toBeGreaterThanOrEqual(to);
  });
});

describe("monthRange", () => {
  it("va del día uno al día uno del mes siguiente", () => {
    const { from, to } = monthRange(new Date(2026, 7, 15));

    expect(new Date(from).getDate()).toBe(1);
    expect(new Date(from).getMonth()).toBe(7);
    expect(new Date(to).getDate()).toBe(1);
    expect(new Date(to).getMonth()).toBe(8);
  });

  it("cruza el cambio de año sin salirse", () => {
    const { to } = monthRange(new Date(2026, 11, 5));

    expect(new Date(to).getFullYear()).toBe(2027);
    expect(new Date(to).getMonth()).toBe(0);
  });
});
