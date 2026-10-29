import { expect, test } from "@playwright/test";

// Fase 5: compartir una tarea por enlace (banco /e2e/tablero; en la app es /tareas).
test("?tarea=<id> abre la ficha de esa tarea, y al cerrarla se quita de la URL", async ({ page }) => {
  await page.goto("/e2e/tablero?tarea=s3");
  const sheet = page.getByRole("dialog");
  await expect(sheet.getByRole("textbox").first()).toHaveValue("Tarea s3");
  await page.keyboard.press("Escape");
  await expect(sheet).toBeHidden();
  await expect(page).not.toHaveURL(/tarea=/);
});

test("abrir una tarea pone su enlace en la URL", async ({ page }) => {
  await page.goto("/e2e/tablero");
  await page.getByRole("button", { name: /Tarea s5/ }).first().click();
  await expect(page).toHaveURL(/\?tarea=s5$/);
});

test("un enlace a una tarea que no existe avisa", async ({ page }) => {
  await page.goto("/e2e/tablero?tarea=no-existe");
  await expect(page.getByText("No se encuentra la tarea del enlace")).toBeVisible();
});

test("«Copiar enlace» copia el enlace a /tareas?tarea=<id>", async ({ page, context, baseURL }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/e2e/tablero?tarea=s3");
  await page.getByRole("button", { name: "Compartir tarea" }).click();
  await page.getByRole("menuitem", { name: "Copiar enlace" }).click();
  await expect(page.getByText("Enlace copiado")).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(`${baseURL}/tareas?tarea=s3`);
});

test("«Enviar por WhatsApp» abre wa.me con el título y el enlace", async ({ page, baseURL }) => {
  await page.goto("/e2e/tablero?tarea=s3");
  await page.getByRole("button", { name: "Compartir tarea" }).click();
  const link = page.getByRole("menuitem", { name: "Enviar por WhatsApp" });
  await expect(link).toHaveAttribute("target", "_blank");
  const href = await link.getAttribute("href");
  expect(href).toBe(`https://wa.me/?text=${encodeURIComponent(`Tarea s3\n${baseURL}/tareas?tarea=s3`)}`);
});
