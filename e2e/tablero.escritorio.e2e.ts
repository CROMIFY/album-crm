import { expect, test } from "@playwright/test";
import { center } from "./touch";

// En escritorio, con ratón, el arrastre sigue como antes (empieza tras ~8 px) y no se ve «Mover a…».
test("con ratón se arrastra una tarjeta a otra columna", async ({ page }) => {
  await page.goto("/e2e/tablero");
  const from = await center(page.locator('[data-task-id="s1"]'));
  const to = await center(page.locator('[data-column-name="En curso"] > [data-column-id]'));
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x + 10, from.y, { steps: 2 });
  await page.mouse.move(to.x, to.y, { steps: 15 });
  await page.mouse.up();
  await expect(page.locator('[data-task-id="s1"]')).toHaveAttribute("data-column-id", "col-curso");
});

test("con ratón, mover menos de 8 px no arrastra", async ({ page }) => {
  await page.goto("/e2e/negocios");
  const from = await center(page.locator('[data-deal-id="k1"]'));
  await page.mouse.move(from.x + 40, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x + 45, from.y, { steps: 3 });
  await page.mouse.up();
  await expect(page.locator('[data-deal-id="k1"]')).toHaveAttribute("data-stage", "contactado");
  await expect(page.getByRole("button", { name: "Mover «Club k1» a…", exact: true })).toBeHidden();
});

test("con ratón se arrastra un negocio a otra etapa y no se ve el asa táctil", async ({ page }) => {
  await page.goto("/e2e/negocios");
  await expect(page.locator('[data-deal-id="l1"] [data-drag-handle]')).toBeHidden();
  const from = await center(page.locator('[data-deal-id="l1"]'));
  const to = await center(page.locator('div[data-stage="pdte_firma"]:not([data-deal-id])'));
  await page.mouse.move(from.x + 40, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x + 52, from.y, { steps: 2 });
  await page.mouse.move(to.x, to.y, { steps: 15 });
  await page.mouse.up();
  await expect(page.locator('[data-deal-id="l1"]')).toHaveAttribute("data-stage", "pdte_firma");
});
