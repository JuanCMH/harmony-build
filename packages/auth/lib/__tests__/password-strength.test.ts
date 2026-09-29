import { describe, expect, it } from "vitest";
import {
  isPasswordAcceptable,
  isPasswordStrong,
} from "@/convex/lib/password_policy";
import {
  PASSWORD_STRENGTH_SEGMENTS,
  calculatePasswordStrength,
} from "../password-strength";

describe("isPasswordAcceptable", () => {
  it("rejects anything shorter than eight characters", () => {
    expect(isPasswordAcceptable("Ab1!")).toBe(false);
    expect(isPasswordAcceptable("Abc123!")).toBe(false);
  });

  it("rejects eight characters that only meet two categories", () => {
    expect(isPasswordAcceptable("abcdefg1")).toBe(false);
    expect(isPasswordAcceptable("ABCDEFG1")).toBe(false);
    expect(isPasswordAcceptable("abcdefgh")).toBe(false);
  });

  it("accepts eight characters meeting three of the four categories", () => {
    expect(isPasswordAcceptable("Abcdefg1")).toBe(true);
    expect(isPasswordAcceptable("abcdefg1!")).toBe(true);
    expect(isPasswordAcceptable("ABCDEFG1!")).toBe(true);
  });

  it("accepts a password meeting all four categories", () => {
    expect(isPasswordAcceptable("Abcdefg1!")).toBe(true);
  });
});

describe("isPasswordStrong", () => {
  it("requires all four categories, not just the accepted three", () => {
    expect(isPasswordStrong("Abcdefg1")).toBe(false);
    expect(isPasswordStrong("Abcdefg1!")).toBe(true);
  });

  it("requires the minimum length even with all four categories", () => {
    expect(isPasswordStrong("Ab1!")).toBe(false);
  });
});

describe("calculatePasswordStrength", () => {
  it("never labels a rejected password as acceptable", () => {
    // Regression: the previous scoring labelled this "Aceptable" while the
    // form rejected it, because the label came from the raw score.
    const strength = calculatePasswordStrength("abcdefg1");

    expect(strength.score).toBe(3);
    expect(strength.isAcceptable).toBe(false);
    expect(strength.label).toBe("Débil");
  });

  it("agrees with the policy the server enforces", () => {
    const samples = [
      "",
      "a",
      "abcdefgh",
      "abcdefg1",
      "Abcdefg1",
      "Abcdefg1!",
      "ÑÁÉÍÓÚ12!",
    ];

    for (const sample of samples) {
      expect(calculatePasswordStrength(sample).isAcceptable).toBe(
        isPasswordAcceptable(sample),
      );
    }
  });

  it("reports an empty password as the weakest", () => {
    const strength = calculatePasswordStrength("");

    expect(strength.score).toBe(0);
    expect(strength.level).toBe("weak");
    expect(strength.label).toBe("Muy débil");
  });

  it("fills every segment only for a strong password", () => {
    expect(calculatePasswordStrength("Abcdefg1!").score).toBe(
      PASSWORD_STRENGTH_SEGMENTS,
    );
    expect(calculatePasswordStrength("Abcdefg1!").label).toBe("Fuerte");
  });

  it("never exceeds the number of segments the meter draws", () => {
    expect(
      calculatePasswordStrength("Abcdefg1!@#$%^&*()").score,
    ).toBeLessThanOrEqual(PASSWORD_STRENGTH_SEGMENTS);
  });
});
