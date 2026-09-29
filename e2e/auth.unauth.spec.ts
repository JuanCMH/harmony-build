import { expect, test } from "@playwright/test";
import { TEST_USER } from "./helpers";

test.describe("Acceso (sin sesión)", () => {
  test("la pantalla de acceso carga con sus dos pestañas", async ({ page }) => {
    await page.goto("/auth");

    await expect(page.getByRole("tab", { name: "Iniciar sesión" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Registro" })).toBeVisible();
    await expect(page.locator("#signin-email")).toBeVisible();
    await expect(page.locator("#signin-password")).toBeVisible();
    await expect(page).toHaveTitle(/Harmony Build/);
  });

  test("la pestaña de registro enseña su formulario", async ({ page }) => {
    await page.goto("/auth");
    await page.getByRole("tab", { name: "Registro" }).click();

    await expect(page.locator("#signup-name")).toBeVisible();
    await expect(page.locator("#signup-email")).toBeVisible();
    await expect(page.locator("#signup-password")).toBeVisible();
    await expect(page.locator("#signup-confirm-password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Crear cuenta" })).toBeVisible();
  });

  test("unas credenciales que no existen dan un único mensaje", async ({
    page,
  }) => {
    await page.goto("/auth");
    await page.locator("#signin-email").fill("nadie@harmony-build.test");
    await page.locator("#signin-password").fill("NoExiste-2026!");
    await page.getByRole("button", { name: "Iniciar sesión" }).click();

    await expect(page.getByText("Correo o contraseña incorrectos")).toBeVisible({
      timeout: 10000,
    });
  });

  test("entrar con la cuenta de pruebas lleva a su proyecto", async ({
    page,
  }) => {
    await page.goto("/auth");
    await page.locator("#signin-email").fill(TEST_USER.email);
    await page.locator("#signin-password").fill(TEST_USER.password);
    await page.getByRole("button", { name: "Iniciar sesión" }).click();

    await page.waitForURL(/\/projects\/[a-z0-9]+/, { timeout: 20000 });
  });

  for (const path of ["/", "/projects", "/projects/abc/ajustes"]) {
    test(`sin sesión, ${path} manda al acceso`, async ({ page }) => {
      await page.goto(path);

      await expect(page.locator("#signin-email")).toBeVisible({
        timeout: 10000,
      });
      expect(page.url()).toContain("/auth");
    });
  }
});
