import { expect, test } from "@playwright/test";
import { reSignInIfNeeded } from "./helpers";

test.describe("Acceso (con sesión)", () => {
  test("con sesión, /auth lleva al proyecto", async ({ page }) => {
    await page.goto("/auth");
    await reSignInIfNeeded(page);

    await page.waitForURL(/\/projects\/[a-z0-9]+/, { timeout: 15000 });
    expect(page.url()).toMatch(/\/projects\/[a-z0-9]+/);
  });
});
