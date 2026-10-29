import { defineConfig, devices } from "@playwright/test";

// Pruebas de navegador contra el banco /e2e (datos de mentira, sin Supabase ni sesión).
// Arranca su propio `next dev` con E2E_HARNESS=1 en un puerto aparte.
const PORT = Number(process.env.E2E_PORT ?? 3107);

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.e2e.ts",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "movil-tactil",
      use: {
        ...devices["Pixel 7"],
        viewport: { width: 390, height: 844 },
        hasTouch: true,
        isMobile: true,
      },
      testIgnore: "**/*.escritorio.e2e.ts",
    },
    {
      name: "escritorio",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
      testMatch: "**/*.escritorio.e2e.ts",
    },
  ],
  webServer: {
    command: `npx next dev -p ${PORT}`,
    url: `http://localhost:${PORT}/e2e/tablero`,
    env: { E2E_HARNESS: "1" },
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
