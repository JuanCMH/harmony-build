import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, type Page, type TestInfo } from "@playwright/test";

const required = (name: string) => {
  const value = process.env[name];
  if (!value)
    throw new Error(
      `Falta ${name}. Las credenciales de la cuenta de pruebas no se escriben en el código: defínelas en .env.local (ver 04).`,
    );
  return value;
};

/** La cuenta con la que corre la suite. Sale del entorno a propósito: una
 *  contraseña escrita aquí existiría en cualquier deployment contra el que se
 *  haya corrido alguna vez. */
export const TEST_USER = {
  name: "Harmony Build E2E",
  get email() {
    return required("E2E_EMAIL");
  },
  get password() {
    return required("E2E_PASSWORD");
  },
};

export const TEST_PROJECT = {
  name: "Proyecto de pruebas E2E",
  code: "E2E-001",
};

export const E2E_PREFIX = "e2e-";
const E2E_META_PATH = join(process.cwd(), "e2e/.auth/meta.json");
export const STORAGE_STATE_PATH = "e2e/.auth/user.json";

const isOnAuth = (page: Page) => /\/auth(\?|$)/.test(page.url());

export const getProjectIdFromUrl = (url: string) => {
  const match = url.match(/\/projects\/([a-z0-9]+)/i);
  if (!match) throw new Error(`No hay id de proyecto en la dirección: ${url}`);
  return match[1];
};

export const getStoredProjectId = () => {
  const meta = JSON.parse(readFileSync(E2E_META_PATH, "utf8")) as {
    projectId?: string;
  };
  if (!meta.projectId) throw new Error(`Falta projectId en ${E2E_META_PATH}`);
  return meta.projectId;
};

/**
 * Si la aplicación nos ha echado al login, vuelve a entrar.
 *
 * La suite comparte un único `storageState`, y Convex Auth **rota** el token de
 * refresco: en cuanto un contexto lo usa, el que guarda el fichero deja de
 * valer, y los contextos siguientes aterrizan en `/auth` (`04`, «la sesión
 * compartida se rota sola»). En vez de perseguir la rotación, la suite hace lo
 * que haría una persona: volver a entrar.
 */
export async function reSignInIfNeeded(page: Page): Promise<boolean> {
  if (!isOnAuth(page)) return false;

  await page.locator("#signin-email").fill(TEST_USER.email);
  await page.locator("#signin-password").fill(TEST_USER.password);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await page.waitForURL(/\/projects/, { timeout: 20000 });

  await page.context().storageState({ path: STORAGE_STATE_PATH });
  return true;
}

/** Abre una dirección de la aplicación aguantando un rebote al login. */
export async function gotoApp(page: Page, url: string) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await page.goto(url, { waitUntil: "load" });
    if (!isOnAuth(page)) return;
    await reSignInIfNeeded(page);
    if (!isOnAuth(page)) {
      await page.goto(url, { waitUntil: "load" });
      return;
    }
  }
  expect(page.url(), "la aplicación rebotó al login tres veces").not.toMatch(
    /\/auth(\?|$)/,
  );
}

export async function goToProject(page: Page) {
  const projectId = getStoredProjectId();
  await gotoApp(page, `/projects/${projectId}`);
  await expect(
    page.getByRole("link", { name: "Ajustes", exact: true }),
  ).toBeVisible({ timeout: 20000 });
  return projectId;
}

/** Abre un área de ajustes pulsando enlaces, como lo haría una persona. */
export async function openSettingsArea(
  page: Page,
  area: "General" | "Usuarios" | "Roles",
) {
  await goToProject(page);
  await page.getByRole("link", { name: "Ajustes", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "General", level: 2 }),
  ).toBeVisible();
  if (area === "General") return;

  await page.getByRole("link", { name: area, exact: true }).click();
  await expect(
    page.getByRole("heading", { name: area, level: 2 }),
  ).toBeVisible();
}

/** Un nombre que no choca entre pruebas ni entre reintentos, y que el prefijo
 *  delata como de la suite. */
export const createArtifactName = (testInfo: TestInfo, label: string) =>
  `${E2E_PREFIX}${label}-${testInfo.workerIndex}${testInfo.retry}-${Date.now().toString(36)}`;

export const expectToast = (page: Page, text: string) =>
  expect(page.getByText(text).first()).toBeVisible({ timeout: 15000 });
