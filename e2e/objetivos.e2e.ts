import { expect, test } from "@playwright/test";

// Fase 4: objetivos con estado calculado y CRUD (banco /e2e/objetivos, «hoy» = 28-oct-2026).
test.beforeEach(async ({ page }) => {
  await page.goto("/e2e/objetivos");
  await expect(page.getByRole("heading", { name: "Objetivos" })).toBeVisible();
});

const card = (page: import("@playwright/test").Page, title: string) =>
  page.getByTestId("objetivo").filter({ has: page.getByText(title, { exact: true }) });

test("cada objetivo enseña valor, meta, barra y estado", async ({ page }) => {
  const testers = card(page, "Testers dados de alta en la prueba cerrada");
  await expect(testers).toContainText("1 / 12");
  // Vence hoy (no queda plazo) y va al 8 %: En riesgo.
  await expect(testers).toHaveAttribute("data-status", "en_riesgo");
  await expect(testers.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "8");

  await expect(card(page, "Publicada en las dos tiendas")).toHaveAttribute("data-status", "en_camino");
  await expect(card(page, "Clubes firmados")).toContainText("calculado del CRM");
});

test("crear, editar y borrar un objetivo", async ({ page }) => {
  await page.getByRole("button", { name: "Nuevo objetivo" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Título").fill("Objetivo de prueba");
  await dialog.getByLabel("Meta").fill("10");
  await dialog.getByLabel("Fecha límite").fill("2026-12-31");
  await dialog.getByRole("button", { name: "Guardar" }).click();

  const nuevo = card(page, "Objetivo de prueba");
  await expect(nuevo).toBeVisible();
  // Sin valor actual no se inventa: «Sin dato».
  await expect(nuevo).toHaveAttribute("data-status", "sin_dato");

  await nuevo.getByRole("button", { name: "Editar Objetivo de prueba" }).click();
  await page.getByRole("dialog").getByLabel("Actual", { exact: true }).fill("10");
  await page.getByRole("dialog").getByRole("button", { name: "Guardar" }).click();
  await expect(nuevo).toHaveAttribute("data-status", "conseguido");

  await nuevo.getByRole("button", { name: "Eliminar Objetivo de prueba" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Eliminar" }).click();
  await expect(nuevo).toHaveCount(0);
});

test("el formulario no deja guardar sin meta", async ({ page }) => {
  await page.getByRole("button", { name: "Nuevo objetivo" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Título").fill("Sin meta");
  await dialog.getByLabel("Fecha límite").fill("2026-12-31");
  await dialog.getByRole("button", { name: "Guardar" }).click();
  await expect(dialog.getByRole("alert")).toBeVisible();
});

test("el calendario lleva arriba el resumen de objetivos", async ({ page }) => {
  await page.goto("/e2e/calendario");
  await expect(page.getByTestId("objetivo-resumen")).toHaveCount(4);
});
