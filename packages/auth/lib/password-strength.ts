import {
  PASSWORD_CATEGORIES,
  getMetPasswordCategories,
  hasMinimumPasswordLength,
  isPasswordAcceptable,
  isPasswordStrong,
} from "@/convex/lib/password_policy";

/** Segments drawn by the meter: the length requirement plus one per category. */
export const PASSWORD_STRENGTH_SEGMENTS = PASSWORD_CATEGORIES.length + 1;

export type PasswordStrengthLevel = "weak" | "acceptable" | "strong";

export type PasswordStrength = {
  /** Filled segments, from 0 to `PASSWORD_STRENGTH_SEGMENTS`. */
  score: number;
  level: PasswordStrengthLevel;
  label: string;
  barClass: string;
  /** Whether the password satisfies the policy the server enforces. */
  isAcceptable: boolean;
};

const LEVEL_BAR_CLASS: Record<PasswordStrengthLevel, string> = {
  weak: "bg-destructive",
  acceptable: "bg-h-yellow",
  strong: "bg-h-indigo",
};

export function calculatePasswordStrength(value: string): PasswordStrength {
  const score =
    (hasMinimumPasswordLength(value) ? 1 : 0) +
    getMetPasswordCategories(value).length;

  const level: PasswordStrengthLevel = isPasswordStrong(value)
    ? "strong"
    : isPasswordAcceptable(value)
      ? "acceptable"
      : "weak";

  // The label is derived from the policy, never from the raw score: a password
  // the server would reject must never read as "Aceptable".
  const label =
    level === "strong"
      ? "Fuerte"
      : level === "acceptable"
        ? "Aceptable"
        : score <= 1
          ? "Muy débil"
          : "Débil";

  return {
    score,
    level,
    label,
    barClass: LEVEL_BAR_CLASS[level],
    isAcceptable: level !== "weak",
  };
}
