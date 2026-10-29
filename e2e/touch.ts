import type { CDPSession, Locator, Page } from "@playwright/test";

/**
 * Gestos táctiles reales (Input.dispatchTouchEvent de Chromium): pasan por el
 * mismo camino que un dedo, así que el navegador decide si es scroll o no.
 * Playwright solo trae `tap`, no deslizar ni mantener pulsado.
 */
type Point = { x: number; y: number };

async function send(session: CDPSession, type: "touchStart" | "touchMove" | "touchEnd", p?: Point) {
  await session.send("Input.dispatchTouchEvent", {
    type,
    touchPoints: type === "touchEnd" || !p ? [] : [{ x: p.x, y: p.y, id: 1 }],
  });
}

async function moveSteps(page: Page, session: CDPSession, from: Point, to: Point, steps: number, stepMs: number) {
  for (let i = 1; i <= steps; i++) {
    await send(session, "touchMove", {
      x: from.x + ((to.x - from.x) * i) / steps,
      y: from.y + ((to.y - from.y) * i) / steps,
    });
    await page.waitForTimeout(stepMs);
  }
}

/** Deslizar con el dedo sin pararse: es scroll, nunca debe arrastrar. */
export async function swipe(page: Page, from: Point, to: Point) {
  const session = await page.context().newCDPSession(page);
  await send(session, "touchStart", from);
  await moveSteps(page, session, from, to, 12, 16);
  await send(session, "touchEnd");
  await session.detach();
  await page.waitForTimeout(600); // inercia del scroll y encaje del scroll-snap
}

/** Pulsación larga (holdMs quieto) y arrastre hasta `to`. */
export async function longPressDrag(page: Page, from: Point, to: Point, holdMs = 450) {
  const session = await page.context().newCDPSession(page);
  await send(session, "touchStart", from);
  await page.waitForTimeout(holdMs);
  await moveSteps(page, session, from, to, 20, 25);
  await page.waitForTimeout(150);
  await send(session, "touchEnd");
  await session.detach();
  await page.waitForTimeout(400);
}

export async function center(locator: Locator): Promise<Point> {
  const box = await locator.boundingBox();
  if (!box) throw new Error("Elemento sin caja (no visible)");
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** Columna (data-column-id / data-stage) en la que está cada tarjeta ahora mismo. */
export async function placement(page: Page, cardSelector: string, idAttr: string, columnAttr: string) {
  return page.$$eval(
    cardSelector,
    (cards, [id, col]) => Object.fromEntries(cards.map((c) => [c.getAttribute(id), c.getAttribute(col)])),
    [idAttr, columnAttr] as const
  );
}
