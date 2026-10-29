import { expect, test, type Page } from "@playwright/test";
import { Finger, center, longPressDrag, order, placement, swipe } from "./touch";

// Criterio de la fase 1: en táctil el scroll (vertical u horizontal, rápido o
// lento) nunca mueve una tarjeta; con el dedo solo se arrastra desde el asa
// (pulsación de 250 ms) o con «Mover a…».
const tasksNow = async (page: Page) => ({
  where: await placement(page, "[data-task-id]", "data-task-id", "data-column-id"),
  order: await order(page, "[data-task-id]", "data-task-id"),
});
const dealsNow = async (page: Page) => ({
  where: await placement(page, "[data-deal-id]", "data-deal-id", "data-stage"),
  order: await order(page, "[data-deal-id]", "data-deal-id"),
});
const handle = (page: Page, card: string) => page.locator(`${card} [data-drag-handle]`);

test.describe("Tablero de tareas en móvil táctil", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/e2e/tablero");
    await expect(page.locator('[data-task-id="s1"]')).toBeVisible();
  });

  for (const [speed, ms] of [
    ["rápido", 200],
    ["lento", 2500],
  ] as const) {
    test(`deslizar en vertical (${speed}) sobre las tarjetas hace scroll y no mueve ninguna`, async ({ page }) => {
      const before = await tasksNow(page);
      const list = page.locator('[data-column-name="Sprint"] > [data-column-id]');
      const start = await center(page.locator('[data-task-id="s4"]'));
      // Lento: 150 px en 2,5 s (60 px/s), el caso que antes acababa arrastrando.
      await swipe(page, start, { x: start.x, y: start.y - (ms > 1000 ? 150 : 300) }, ms);

      expect(await list.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
      expect(await tasksNow(page)).toEqual(before);
    });

    test(`deslizar en horizontal (${speed}) entre columnas hace scroll y no mueve ninguna`, async ({ page }) => {
      const before = await tasksNow(page);
      const board = page.getByTestId("task-board-columns");
      const start = await center(page.locator('[data-task-id="s2"]'));
      await swipe(page, start, { x: start.x - (ms > 1000 ? 150 : 250), y: start.y }, ms);

      expect(await board.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);
      expect(await tasksNow(page)).toEqual(before);
    });
  }

  test("deslizar en diagonal no mueve ninguna", async ({ page }) => {
    const before = await tasksNow(page);
    const start = await center(page.locator('[data-task-id="s3"]'));
    await swipe(page, start, { x: start.x - 120, y: start.y - 200 }, 800);
    expect(await tasksNow(page)).toEqual(before);
  });

  test("una pulsación larga fuera del asa no arrastra", async ({ page }) => {
    const before = await tasksNow(page);
    const from = await center(page.locator('[data-task-id="s1"]').getByText("Tarea s1", { exact: true }));
    await longPressDrag(page, from, { x: from.x, y: from.y + 250 }, 600);
    expect(await tasksNow(page)).toEqual(before);
  });

  test("solo el asa tiene touch-action:none; la tarjeta deja hacer scroll", async ({ page }) => {
    const card = page.locator('[data-task-id="s1"]');
    expect(await card.evaluate((el) => getComputedStyle(el).touchAction)).toBe("auto");
    await expect(handle(page, '[data-task-id="s1"]')).toBeVisible();
    expect(await handle(page, '[data-task-id="s1"]').evaluate((el) => getComputedStyle(el).touchAction)).toBe("none");
  });

  test("las columnas encajan al hacer scroll horizontal (scroll-snap)", async ({ page }) => {
    const board = page.getByTestId("task-board-columns");
    expect(await board.evaluate((el) => getComputedStyle(el).scrollSnapType)).toBe("x mandatory");
  });

  test("con el asa, pulsación larga y arrastre mueve la tarjeta a otra columna", async ({ page }) => {
    // «Por pensar» viene plegada (tira estrecha a la izquierda): se suelta encima.
    const strip = page.getByRole("button", { name: "Desplegar la columna Por pensar" });
    const from = await center(handle(page, '[data-task-id="s1"]'));
    const to = await center(strip);
    await longPressDrag(page, from, { x: to.x, y: to.y + 80 });

    await strip.click();
    await expect(page.locator('[data-task-id="s1"]')).toHaveAttribute("data-column-id", "col-pensar");
  });

  test("con el asa se llega a la columna de al lado con el auto-scroll", async ({ page }) => {
    const boardBox = (await page.getByTestId("task-board-columns").boundingBox())!;
    const finger = await Finger.down(page, await center(handle(page, '[data-task-id="s2"]')));
    await finger.hold(450);
    // Al borde derecho: el tablero se desplaza solo hasta que «En curso» queda bajo el dedo.
    await finger.move({ x: boardBox.x + boardBox.width - 8, y: finger.at.y + 40 });
    const enCurso = page.locator('[data-column-name="En curso"]');
    await expect
      .poll(async () => (await enCurso.boundingBox())?.x ?? 9999, { timeout: 8000, intervals: [50] })
      .toBeLessThan(boardBox.x + boardBox.width * 0.5);
    const target = (await enCurso.boundingBox())!;
    await finger.move({ x: Math.max(target.x + 40, boardBox.x + 40), y: finger.at.y }, 10, 25);
    await finger.hold(200);
    await finger.up();
    await expect(page.locator('[data-task-id="s2"]')).toHaveAttribute("data-column-id", "col-curso");
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

  for (const [speed, ms] of [
    ["rápido", 200],
    ["lento", 2500],
  ] as const) {
    test(`deslizar en vertical (${speed}) hace scroll de la página y no mueve ninguna`, async ({ page }) => {
      const before = await dealsNow(page);
      const start = await center(page.locator('[data-deal-id="l3"]'));
      await swipe(page, start, { x: start.x, y: start.y - (ms > 1000 ? 150 : 300) }, ms);
      expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
      expect(await dealsNow(page)).toEqual(before);
    });

    test(`deslizar en horizontal (${speed}) hace scroll entre etapas y no mueve ninguna`, async ({ page }) => {
      const before = await dealsNow(page);
      const board = page.getByTestId("deal-board-columns");
      const start = await center(page.locator('[data-deal-id="l1"]'));
      await swipe(page, start, { x: start.x - (ms > 1000 ? 150 : 250), y: start.y }, ms);
      expect(await board.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);
      expect(await dealsNow(page)).toEqual(before);
    });
  }

  test("con el asa, pulsación larga y arrastre cambia la etapa", async ({ page }) => {
    const from = await center(handle(page, '[data-deal-id="l1"]'));
    const column = await page.locator('div[data-stage="contactado"]:not([data-deal-id])').boundingBox();
    if (!column) throw new Error("Columna Contactado sin caja");
    // El borde visible de «Contactado», fuera de la franja de auto-scroll del borde derecho.
    await longPressDrag(page, from, { x: column.x + 12, y: from.y + 40 });
    await expect(page.locator('[data-deal-id="l1"]')).toHaveAttribute("data-stage", "contactado");
  });

  test("«Mover a…» cambia la etapa", async ({ page }) => {
    await page.getByRole("button", { name: "Mover «Club l2» a…", exact: true }).click();
    await page.getByRole("menuitem", { name: "Pdte Firma" }).click();
    await expect(page.locator('[data-deal-id="l2"]')).toHaveAttribute("data-stage", "pdte_firma");
  });
});
