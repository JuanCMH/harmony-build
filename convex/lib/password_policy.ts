/**
 * Canonical password policy for Harmony Build.
 *
 * Consumed by two runtimes:
 *  - the server, as `validatePasswordRequirements` of the Convex `Password`
 *    provider (`convex/auth.ts`) — this is the enforcing side;
 *  - the client, by the sign-up and reset strength meter
 *    (`packages/auth/lib/password-strength.ts`) — this is only UX.
 *
 * Pure module on purpose: no Convex and no React imports, so both sides can
 * consume it without either bundler pulling in a runtime it does not have.
 */

export const PASSWORD_MIN_LENGTH = 8;

/** How many of the four character categories a password must satisfy. */
export const PASSWORD_REQUIRED_CATEGORIES = 3;

export type PasswordCategory = "lowercase" | "uppercase" | "number" | "symbol";

const CATEGORY_PATTERNS: Record<PasswordCategory, RegExp> = {
  lowercase: /[a-z]/,
  uppercase: /[A-Z]/,
  number: /\d/,
  symbol: /[^A-Za-z0-9]/,
};

export const PASSWORD_CATEGORIES = Object.keys(
  CATEGORY_PATTERNS,
) as PasswordCategory[];

export function hasMinimumPasswordLength(value: string): boolean {
  return value.length >= PASSWORD_MIN_LENGTH;
}

export function getMetPasswordCategories(value: string): PasswordCategory[] {
  return PASSWORD_CATEGORIES.filter((category) =>
    CATEGORY_PATTERNS[category].test(value),
  );
}

/** The rule the server enforces and the interface describes. */
export function isPasswordAcceptable(value: string): boolean {
  return (
    hasMinimumPasswordLength(value) &&
    getMetPasswordCategories(value).length >= PASSWORD_REQUIRED_CATEGORIES
  );
}

/** A password meeting every category, not just the required minimum. */
export function isPasswordStrong(value: string): boolean {
  return (
    hasMinimumPasswordLength(value) &&
    getMetPasswordCategories(value).length === PASSWORD_CATEGORIES.length
  );
}
