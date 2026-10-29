import { test } from "@playwright/test";

// Capturas para el PR: `CAPTURAS=1 npx playwright test e2e/capturas --project=movil-tactil`.
// Se saltan en la pasada normal de tests. Salen a test-results/capturas (ignorado por git).
test.skip(!process.env.CAPTURAS, "Solo con CAPTURAS=1");

const OUT = "test-results/capturas";

// El indicador del modo dev de Next (la «N» flotante) no es parte de la app.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const hide = () => {
      const style = document.createElement("style");
      style.textContent = "nextjs-portal { display: none !important; }";
      document.head.appendChild(style);
    };
    if (document.head) hide();
    else document.addEventListener("DOMContentLoaded", hide);
  });
});

test("tablero", async ({ page }) => {
  await page.goto("/e2e/tablero");
  await page.locator('[data-task-id="s1"]').waitFor();
  await page.screenshot({ path: `${OUT}/tablero.png` });
  await page.getByRole("button", { name: "Mover «Tarea s1» a…", exact: true }).click();
  await page.getByRole("menuitem", { name: "Hecho" }).waitFor();
  await page.screenshot({ path: `${OUT}/tablero-mover-a.png` });
});

test("calendario", async ({ page }) => {
  await page.goto("/e2e/calendario");
  await page.getByRole("region", { name: "Próximos" }).waitFor();
  await page.screenshot({ path: `${OUT}/calendario-proximos.png`, fullPage: true });
  await page.getByRole("tab", { name: "Mes" }).click();
  await page.getByRole("button", { name: "Mes siguiente" }).click();
  await page.screenshot({ path: `${OUT}/calendario-mes.png`, fullPage: true });
});

test("objetivos", async ({ page }) => {
  await page.goto("/e2e/objetivos");
  await page.getByRole("heading", { name: "Objetivos" }).waitFor();
  await page.screenshot({ path: `${OUT}/objetivos.png`, fullPage: true });
});

test("gastos", async ({ page }) => {
  await page.goto("/e2e/gastos");
  await page.getByRole("heading", { name: "Gastos" }).waitFor();
  await page.screenshot({ path: `${OUT}/gastos.png`, fullPage: true });
});

test("calendario escritorio", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/e2e/calendario?mes=2026-11");
  await page.getByRole("region", { name: "Mes" }).waitFor();
  await page.screenshot({ path: `${OUT}/calendario-escritorio.png`, fullPage: true });
});

test("compartir tarea", async ({ page }) => {
  await page.goto("/e2e/tablero?tarea=s3");
  await page.getByRole("button", { name: "Compartir tarea" }).click();
  await page.getByRole("menuitem", { name: "Copiar enlace" }).waitFor();
  await page.screenshot({ path: `${OUT}/compartir-tarea.png` });
});
