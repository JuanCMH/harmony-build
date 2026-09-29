import { describe, expect, it } from "vitest";

import {
  buildTimeValue,
  getNextMinuteSelection,
  getNextTypedHourSelection,
  parseTimeValue,
  resolveCommittedMinute,
} from "../time-picker.utils";

describe("time picker helpers", () => {
  it("parses valid quarter-hour values", () => {
    expect(parseTimeValue("21:45")).toEqual({ hour: "21", minute: "45" });
  });

  it("rejects invalid time values", () => {
    expect(parseTimeValue("21:22")).toEqual({ hour: null, minute: null });
    expect(parseTimeValue("X")).toEqual({ hour: null, minute: null });
  });

  it("keeps the selected minute or falls back to 00", () => {
    expect(resolveCommittedMinute("30", "15")).toBe("30");
    expect(resolveCommittedMinute(null, "15")).toBe("15");
    expect(resolveCommittedMinute(null, null)).toBe("00");
  });

  it("builds a full value from the selected parts", () => {
    expect(buildTimeValue("09", "15")).toBe("09:15");
  });

  it("supports the two-digit hour typing flow", () => {
    expect(getNextTypedHourSelection("", "2")).toEqual({
      buffer: "2",
      hour: "02",
    });
    expect(getNextTypedHourSelection("2", "1")).toEqual({
      buffer: "",
      hour: "21",
    });
  });

  it("recovers gracefully from invalid two-digit combinations", () => {
    expect(getNextTypedHourSelection("2", "9")).toEqual({
      buffer: "9",
      hour: "09",
    });
  });

  it("cycles minutes with arrow directions", () => {
    expect(getNextMinuteSelection("15", "down")).toBe("30");
    expect(getNextMinuteSelection("15", "up")).toBe("00");
    expect(getNextMinuteSelection("45", "down")).toBe("00");
    expect(getNextMinuteSelection(null, "up")).toBe("45");
  });
});
