import { mkdirSync, writeFileSync } from "node:fs";
import { expect, test as setup } from "@playwright/test";
import {
  getProjectIdFromUrl,
  STORAGE_STATE_PATH,
  TEST_PROJECT,
  TEST_USER,
} from "./helpers";

const WELCOME = /Bienvenido a Harmony Build/;
const PROJECT_URL = /\/projects\/[a-z0-9]+/;

setup("crea la cuenta de pruebas y entra", async ({ page }) => {
  await page.goto("/auth");
  await expect(page.getByRole("tab", { name: "Registro" })).toBeVisible({
    timeout: 15000,
  });

  // Primero el registro; si la cuenta ya existe, se entra con ella.
  await page.getByRole("tab", { name: "Registro" }).click();
  await page.locator("#signup-name").fill(TEST_USER.name);
  await page.locator("#signup-email").fill(TEST_USER.email);
  await page.locator("#signup-password").fill(TEST_USER.password);
  await page.locator("#signup-confirm-password").fill(TEST_USER.password);
  await page.getByRole("button", { name: "Crear cuenta" }).click();

  const welcome = page.getByRole("heading", { name: WELCOME });

  const signupResult = await Promise.race([
    welcome.waitFor({ timeout: 20000 }).then(() => "welcome" as const),
    page
      .waitForURL(PROJECT_URL, { timeout: 20000 })
      .then(() => "has-project" as const),
    page
      .getByText("Algo salió mal")
      .waitFor({ timeout: 20000 })
      .then(() => "signup-failed" as const),
  ]);

  if (signupResult === "signup-failed") {
    await page.getByRole("tab", { name: "Iniciar sesión" }).click();
    await page.locator("#signin-email").fill(TEST_USER.email);
    await page.locator("#signin-password").fill(TEST_USER.password);
    await page.getByRole("button", { name: "Iniciar sesión" }).click();

    await Promise.race([
      welcome.waitFor({ timeout: 20000 }),
      page.waitForURL(PROJECT_URL, { timeout: 20000 }),
    ]);
  }

  // Con la bienvenida a la vista, la cuenta no tiene proyectos: se crea uno.
  if (await welcome.isVisible().catch(() => false)) {
    await page.getByRole("button", { name: /Crear un proyecto/ }).click();

    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Nombre").fill(TEST_PROJECT.name);
    await dialog.getByLabel(/Código/).fill(TEST_PROJECT.code);
    await dialog.getByRole("button", { name: "Crear proyecto" }).click();

    await expect(page.getByText("Proyecto creado correctamente")).toBeVisible({
      timeout: 15000,
    });
    await page.waitForURL(PROJECT_URL, { timeout: 15000 });
  }

  expect(page.url()).toMatch(PROJECT_URL);

  mkdirSync("e2e/.auth", { recursive: true });
  writeFileSync(
    "e2e/.auth/meta.json",
    JSON.stringify({ projectId: getProjectIdFromUrl(page.url()) }, null, 2),
  );
  await page.context().storageState({ path: STORAGE_STATE_PATH });
});
