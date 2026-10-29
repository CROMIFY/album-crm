import { expect, test, type Page } from "@playwright/test";
import { center, longPressDrag, placement, swipe } from "./touch";

// Criterio de la fase 1: en táctil el scroll (vertical u horizontal) nunca mueve
// una tarjeta; solo la pulsación larga + arrastre o «Mover a…».
const tasksNow = (page: Page) => placement(page, "[data-task-id]", "data-task-id", "data-column-id");
const dealsNow = (page: Page) => placement(page, "[data-deal-id]", "data-deal-id", "data-stage");

test.describe("Tablero de tareas en móvil táctil", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/e2e/tablero");
    await expect(page.locator('[data-task-id="s1"]')).toBeVisible();
  });

  test("deslizar en vertical sobre las tarjetas hace scroll y no mueve ninguna", async ({ page }) => {
    const before = await tasksNow(page);
    const list = page.locator('[data-column-name="Sprint"] > [data-column-id]');
    const scrollBefore = await list.evaluate((el) => el.scrollTop);

    const start = await center(page.locator('[data-task-id="s4"]'));
    await swipe(page, start, { x: start.x, y: start.y - 300 });

    expect(await list.evaluate((el) => el.scrollTop)).toBeGreaterThan(scrollBefore);
    expect(await tasksNow(page)).toEqual(before);
  });

  test("deslizar en horizontal entre columnas hace scroll y no mueve ninguna", async ({ page }) => {
    const before = await tasksNow(page);
    const board = page.getByTestId("task-board-columns");
    const scrollBefore = await board.evaluate((el) => el.scrollLeft);

    const start = await center(page.locator('[data-task-id="s2"]'));
    await swipe(page, start, { x: start.x - 250, y: start.y });

    expect(await board.evaluate((el) => el.scrollLeft)).toBeGreaterThan(scrollBefore);
    expect(await tasksNow(page)).toEqual(before);
  });

  test("las columnas encajan al hacer scroll horizontal (scroll-snap)", async ({ page }) => {
    const board = page.getByTestId("task-board-columns");
    expect(await board.evaluate((el) => getComputedStyle(el).scrollSnapType)).toBe("x mandatory");
  });

  test("pulsación larga y arrastre sí mueve la tarjeta de columna", async ({ page }) => {
    // «Por pensar» viene plegada (tira estrecha a la izquierda): se suelta encima.
    const strip = page.getByRole("button", { name: "Desplegar la columna Por pensar" });
    const from = await center(page.locator('[data-task-id="s1"]'));
    const to = await center(strip);
    await longPressDrag(page, from, { x: to.x, y: to.y + 80 });

    await strip.click();
    await expect(page.locator('[data-task-id="s1"]')).toHaveAttribute("data-column-id", "col-pensar");
  });

  test("«Mover a…» mueve la tarjeta a la columna elegida", async ({ page }) => {
    await page.getByRole("button", { name: "Mover «Tarea s2» a…", exact: true }).click();
    await page.getByRole("menuitem", { name: "En curso" }).click();
    await expect(page.locator('[data-task-id="s2"]')).toHaveAttribute("data-column-id", "col-curso");
  });
});

test.describe("Pipeline de negocios en móvil táctil", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/e2e/negocios");
    await expect(page.locator('[data-deal-id="l1"]')).toBeVisible();
  });

  test("deslizar en vertical hace scroll de la página y no mueve ninguna", async ({ page }) => {
    const before = await dealsNow(page);
    const start = await center(page.locator('[data-deal-id="l3"]'));
    await swipe(page, start, { x: start.x, y: start.y - 300 });

    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
    expect(await dealsNow(page)).toEqual(before);
  });

  test("deslizar en horizontal hace scroll entre etapas y no mueve ninguna", async ({ page }) => {
    const before = await dealsNow(page);
    const board = page.getByTestId("deal-board-columns");
    const start = await center(page.locator('[data-deal-id="l1"]'));
    await swipe(page, start, { x: start.x - 250, y: start.y });

    expect(await board.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);
    expect(await dealsNow(page)).toEqual(before);
  });

  test("pulsación larga y arrastre sí cambia la etapa", async ({ page }) => {
    const from = await center(page.locator('[data-deal-id="l1"]'));
    const column = await page.locator('div[data-stage="contactado"]:not([data-deal-id])').boundingBox();
    if (!column) throw new Error("Columna Contactado sin caja");
    // Se suelta en el borde visible de «Contactado», antes de la franja del 20 % del
    // borde derecho donde dnd-kit hace auto-scroll (si no, seguiría avanzando de columna).
    const board = await page.getByTestId("deal-board-columns").boundingBox();
    if (!board) throw new Error("Tablero sin caja");
    const autoScrollEdge = board.x + board.width * 0.8;
    expect(column.x + 8).toBeLessThan(autoScrollEdge);
    await longPressDrag(page, from, { x: column.x + 8, y: from.y + 40 });
    await expect(page.locator('[data-deal-id="l1"]')).toHaveAttribute("data-stage", "contactado");
  });

  test("«Mover a…» cambia la etapa", async ({ page }) => {
    await page.getByRole("button", { name: "Mover «Club l2» a…", exact: true }).click();
    await page.getByRole("menuitem", { name: "Pdte Firma" }).click();
    await expect(page.locator('[data-deal-id="l2"]')).toHaveAttribute("data-stage", "pdte_firma");
  });
});
