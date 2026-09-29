import { expect, test } from "@playwright/test";
import { JOIN_CODE_LENGTH } from "../convex/lib/join_codes";
import {
  createArtifactName,
  expectToast,
  goToProject,
  openSettingsArea,
  TEST_PROJECT,
} from "./helpers";

test.describe("Proyecto", () => {
  test("el inicio enseña el equipo y la actividad reciente", async ({
    page,
  }) => {
    await goToProject(page);

    await expect(
      page.getByRole("heading", { name: TEST_PROJECT.name, level: 1 }),
    ).toBeVisible();
    await expect(page.getByText("Equipo", { exact: true })).toBeVisible();
    await expect(page.getByText("Actividad reciente")).toBeVisible();
  });

  test("los ajustes generales identifican el proyecto", async ({ page }) => {
    await openSettingsArea(page, "General");

    await expect(page.getByText(TEST_PROJECT.code).first()).toBeVisible();
    await expect(page.getByText("Zona de peligro")).toBeVisible();
    await expect(page.getByRole("button", { name: "Eliminar" })).toBeVisible();
  });

  test("quien es propietario aparece como tal en usuarios", async ({
    page,
  }) => {
    await openSettingsArea(page, "Usuarios");

    await expect(page.getByText("Propietario").first()).toBeVisible();
  });

  test("el código de unión se enseña a quien puede invitar", async ({
    page,
  }) => {
    await openSettingsArea(page, "Usuarios");
    await page.getByRole("button", { name: "Invitar" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText(/Invitar a/)).toBeVisible();
    await expect(
      dialog.getByText(new RegExp(`^[a-z0-9]{${JOIN_CODE_LENGTH}}$`)),
    ).toBeVisible();
  });

  test("un rol se crea, queda en auditoría y se elimina", async ({
    page,
  }, testInfo) => {
    const roleName = createArtifactName(testInfo, "rol");

    await openSettingsArea(page, "Roles");
    await page.getByRole("button", { name: "Crear rol" }).click();

    const createDialog = page.getByRole("dialog");
    await createDialog.getByLabel("Nombre del rol").fill(roleName);
    await createDialog.getByRole("switch", { name: "Ver registros" }).click();
    await expect(createDialog.getByText("1 de 15")).toBeVisible();
    await createDialog.getByRole("button", { name: "Crear", exact: true }).click();
    await expectToast(page, "Rol creado correctamente");

    await page.getByText(roleName).first().click();
    const roleDialog = page.getByRole("dialog");
    await roleDialog.getByRole("button", { name: "Eliminar" }).click();
    await page
      .getByRole("dialog")
      .filter({ hasText: "Eliminar rol" })
      .getByRole("button", { name: "Eliminar", exact: true })
      .click();
    await expectToast(page, "Rol eliminado correctamente");
    await expect(page.getByText(roleName)).toHaveCount(0);

    await page
      .getByRole("link", { name: /Volver a/ })
      .first()
      .click();
    await page.getByRole("link", { name: "Registros", exact: true }).click();
    await expect(
      page.getByText(`Rol creado: ${roleName} (1 permisos)`),
    ).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(`Rol eliminado: ${roleName}`)).toBeVisible();
  });
});
