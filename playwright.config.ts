import { defineConfig, devices } from "@playwright/test";

// Playwright no lee `.env.local`: de ahí salen `E2E_EMAIL` y `E2E_PASSWORD`.
try {
  process.loadEnvFile(".env.local");
} catch {
  // Sin el archivo, las variables tienen que venir del entorno.
}

export default defineConfig({
  testDir: "./e2e",
  timeout: 45_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : 2,
  reporter: [
    ["list"],
    ["html", { open: "never" }],
  ],
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL: "http://localhost:7778",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "on-first-retry",
  },
  projects: [
    // Auth setup — runs first, saves auth state
    { name: "setup", testMatch: /.*\.setup\.ts/, teardown: "cleanup" },
    { name: "cleanup", testMatch: /.*\.teardown\.ts/ },
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/user.json",
      },
      dependencies: ["setup"],
      testIgnore: /.*\.unauth\.spec\.ts/,
    },
    {
      name: "chromium-unauth",
      use: { ...devices["Desktop Chrome"] },
      testMatch: /.*\.unauth\.spec\.ts/,
      dependencies: ["setup"],
    },
  ],
});
