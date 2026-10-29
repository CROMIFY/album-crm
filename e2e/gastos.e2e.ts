import { expect, test } from "@playwright/test";

// Fase 2: resumen de Gastos con datos fijos (ver components/e2e/expenses-harness.tsx,
// «hoy» = 28-oct-2026). Intl.NumberFormat de es-ES separa el € con un espacio duro.
const eur = (amount: string) => new RegExp(`${amount}\\s€`);

test.beforeEach(async ({ page }) => {
  await page.goto("/e2e/gastos");
  await expect(page.getByRole("heading", { name: "Gastos" })).toBeVisible();
});

test("las tarjetas de resumen cuentan todo lo pagado y separan el prorrateo", async ({ page }) => {
  // 11,95 (dominio anual) + 3 × 5 (hosting mensual desde el 10-ago) + 99 + 21,51 (25 USD).
  await expect(page.getByTestId("gastado-total")).toContainText(eur("147,46"));
  await expect(page.getByTestId("coste-anual")).toContainText(eur("71,95"));
  await expect(page.getByTestId("mensual-prorrateado")).toContainText(eur("6,00"));
  await expect(page.getByText("Gasto mensual recurrente")).toHaveCount(0);
});

test("los pagos únicos no tienen «Cancelar»; los recurrentes sí", async ({ page }) => {
  const unicos = page.locator('[data-testid="gasto"][data-ciclo="unico"]');
  await expect(unicos).toHaveCount(2);
  await expect(unicos.getByRole("button", { name: "Cancelar" })).toHaveCount(0);
  await expect(unicos.getByRole("button", { name: /Eliminar/ })).toHaveCount(2);
  await expect(page.locator('[data-testid="gasto"][data-ciclo="mensual"]').getByRole("button", { name: "Cancelar" })).toHaveCount(1);
});

test("próximos cobros por fecha, con aviso en los de menos de 30 días", async ({ page }) => {
  const rows = page.getByTestId("proximo-cobro");
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0)).toContainText("Hosting");
  await expect(rows.nth(0)).toContainText("en 13 días");
  await expect(rows.nth(0)).toHaveAttribute("data-soon", "true");
  await expect(rows.nth(1)).toContainText("Dominio");
  await expect(rows.nth(1)).toHaveAttribute("data-soon", "false");
});

test("por categoría enseña el total gastado", async ({ page }) => {
  const card = page.locator("[data-slot=card]", { hasText: "Por categoría" });
  await expect(card).toContainText(eur("120,51")); // Tiendas: 99 + 21,51
  await expect(card).toContainText(eur("26,95")); // Infraestructura: 11,95 + 15
});
