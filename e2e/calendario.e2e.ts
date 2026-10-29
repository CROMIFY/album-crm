import { expect, test } from "@playwright/test";

// Fase 3: calendario con hitos (scripts/datos/hitos-28oct.json), «hoy» = 28-oct-2026.
test.beforeEach(async ({ page }) => {
  await page.goto("/e2e/calendario");
  await expect(page.getByRole("heading", { name: "Calendario" })).toBeVisible();
});

test("en móvil abre en «Próximos», por fecha y con lo que está en curso primero", async ({ page }) => {
  const list = page.getByRole("region", { name: "Próximos" });
  await expect(list).toBeVisible();
  const rows = list.locator("[data-calendar-item]");
  await expect(rows.first()).toContainText("Sprint 1");
  await expect(rows.first()).toContainText("en curso");
  await expect(rows.nth(1)).toContainText("«Allow new users to sign up»");
  await expect(list).toContainText("Publicada en Google Play y App Store");
});

test("la vista de mes pinta los hitos de varios días como barra", async ({ page }) => {
  await page.getByRole("tab", { name: "Mes" }).click();
  await page.getByRole("button", { name: "Mes siguiente" }).click();
  await expect(page.getByTestId("mes-actual")).toHaveText(/noviembre de 2026/i);

  const month = page.getByRole("region", { name: "Mes" });
  const bar = month.locator('[data-calendar-item="hito-11"]'); // 9–13 nov
  await expect(bar).toHaveCount(1);
  const mon = await page.locator('[data-day="2026-11-09"]').boundingBox();
  const fri = await page.locator('[data-day="2026-11-13"]').boundingBox();
  const box = await bar.boundingBox();
  if (!mon || !fri || !box) throw new Error("Sin cajas");
  expect(box.x).toBeLessThan(mon.x + 4);
  expect(box.x + box.width).toBeGreaterThan(fri.x + fri.width - 6);
  expect(box.x + box.width).toBeLessThan(fri.x + fri.width + 2);

  // 21–30 nov (sábado a lunes) cruza tres semanas: sáb-dom, la semana entera y el lunes 30.
  await expect(month.locator('[data-calendar-item="hito-17"]')).toHaveCount(3);
});

test("filtra por tipo y por responsable", async ({ page }) => {
  const list = page.getByRole("region", { name: "Próximos" });

  await page.getByRole("combobox", { name: "Tipo" }).click();
  await page.getByRole("option", { name: "Comercial" }).click();
  await expect(list.locator('[data-kind="milestone"]')).toHaveCount(2);
  await expect(list.locator('[data-kind="task"]')).toHaveCount(0);
  await expect(page).toHaveURL(/tipo=comercial/);

  await page.getByRole("combobox", { name: "Tipo" }).click();
  await page.getByRole("option", { name: "Tareas e hitos" }).click();
  await page.getByRole("combobox", { name: "Responsable" }).click();
  await page.getByRole("option", { name: "Pablo" }).click();
  // Pablo: contrato/legal (con Jaime), 2 comerciales, y las 2 de «Todos».
  await expect(list.locator('[data-kind="milestone"]')).toHaveCount(5);
});
