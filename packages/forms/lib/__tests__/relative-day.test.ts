import { describe, expect, it } from "vitest";
import {
  clockText,
  daysBetween,
  lastFilledText,
  relativeDayText,
} from "../relative-day";

/** Un instante dicho en hora de Colombia (UTC−5). */
const colombia = (
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
) => Date.UTC(year, month - 1, day, hour + 5, minute);

const NOW = colombia(2026, 9, 29, 10, 0);

describe("los días entre dos fechas", () => {
  it("cuenta días de calendario, también entre meses", () => {
    expect(daysBetween("2026-09-29", "2026-09-29")).toBe(0);
    expect(daysBetween("2026-08-30", "2026-09-29")).toBe(30);
    expect(daysBetween("2026-09-30", "2026-09-29")).toBe(-1);
  });

  it("lo que no es una fecha no se cuenta", () => {
    expect(daysBetween("ayer", "2026-09-29")).toBeNull();
  });
});

describe("la hora", () => {
  it("se dice en 24 horas y sin cero delante", () => {
    expect(clockText(colombia(2026, 9, 29, 6, 40))).toBe("6:40");
    expect(clockText(colombia(2026, 9, 29, 18, 5))).toBe("18:05");
    expect(clockText(colombia(2026, 9, 29, 0, 0))).toBe("0:00");
  });
});

describe("cuándo fue", () => {
  it("hoy y ayer dicen la hora", () => {
    expect(
      relativeDayText("2026-09-29", NOW, colombia(2026, 9, 29, 6, 40)),
    ).toBe("hoy a las 6:40");
    expect(
      relativeDayText("2026-09-28", NOW, colombia(2026, 9, 28, 17, 15)),
    ).toBe("ayer a las 17:15");
  });

  it("sin el instante, hoy y ayer van sin hora", () => {
    expect(relativeDayText("2026-09-29", NOW)).toBe("hoy");
    expect(relativeDayText("2026-09-28", NOW)).toBe("ayer");
  });

  it("de dos días a un mes, cuenta los días", () => {
    expect(relativeDayText("2026-09-27", NOW)).toBe("hace 2 días");
    expect(relativeDayText("2026-09-26", NOW)).toBe("hace 3 días");
    expect(relativeDayText("2026-08-31", NOW)).toBe("hace 29 días");
  });

  it("pasado un mes dice la fecha", () => {
    expect(relativeDayText("2026-08-30", NOW)).toBe("el 30/08/2026");
    expect(relativeDayText("2025-12-01", NOW)).toBe("el 01/12/2025");
  });

  it("el día cambia a medianoche de Colombia, no de UTC", () => {
    // Las 20:00 del 28 en Colombia ya son el 29 en UTC.
    const lateNight = colombia(2026, 9, 28, 20, 0);
    expect(relativeDayText("2026-09-28", lateNight)).toBe("hoy");
    expect(relativeDayText("2026-09-27", lateNight)).toBe("ayer");
  });

  it("una fecha posterior a hoy se lee como hoy", () => {
    expect(relativeDayText("2026-09-30", NOW)).toBe("hoy");
  });
});

describe("la última vez que se diligenció un formato", () => {
  it("dice cuándo", () => {
    expect(
      lastFilledText(
        { date: "2026-09-29", at: colombia(2026, 9, 29, 6, 40) },
        NOW,
      ),
    ).toBe("Última vez: hoy a las 6:40");
    expect(
      lastFilledText(
        { date: "2026-09-26", at: colombia(2026, 9, 26, 7, 0) },
        NOW,
      ),
    ).toBe("Última vez: hace 3 días");
  });

  it("dice que nunca, si nunca", () => {
    expect(lastFilledText({ date: null, at: null }, NOW)).toBe(
      "Todavía no lo has diligenciado",
    );
  });

  it("sin fecha de negocio, la saca del instante", () => {
    expect(
      lastFilledText({ date: null, at: colombia(2026, 9, 28, 23, 30) }, NOW),
    ).toBe("Última vez: ayer a las 23:30");
  });
});
