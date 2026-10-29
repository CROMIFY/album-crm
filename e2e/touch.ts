import type { CDPSession, Locator, Page } from "@playwright/test";

/**
 * Gestos táctiles reales (Input.dispatchTouchEvent de Chromium): pasan por el
 * mismo camino que un dedo, así que el navegador decide si es scroll o no.
 * Playwright solo trae `tap`, no deslizar ni mantener pulsado.
 */
type Point = { x: number; y: number };

export class Finger {
  private constructor(
    private page: Page,
    private session: CDPSession,
    public at: Point
  ) {}

  static async down(page: Page, at: Point): Promise<Finger> {
    const session = await page.context().newCDPSession(page);
    const finger = new Finger(page, session, at);
    await finger.send("touchStart", at);
    return finger;
  }

  private async send(type: "touchStart" | "touchMove" | "touchEnd", p?: Point) {
    await this.session.send("Input.dispatchTouchEvent", {
      type,
      touchPoints: type === "touchEnd" || !p ? [] : [{ x: p.x, y: p.y, id: 1 }],
    });
  }

  /** Mueve el dedo en línea recta en `steps` pasos de `stepMs`. */
  async move(to: Point, steps = 20, stepMs = 25) {
    const from = this.at;
    for (let i = 1; i <= steps; i++) {
      this.at = { x: from.x + ((to.x - from.x) * i) / steps, y: from.y + ((to.y - from.y) * i) / steps };
      await this.send("touchMove", this.at);
      await this.page.waitForTimeout(stepMs);
    }
  }

  async hold(ms: number) {
    await this.page.waitForTimeout(ms);
  }

  async up() {
    await this.send("touchEnd");
    await this.session.detach();
    await this.page.waitForTimeout(500); // inercia del scroll y encaje del scroll-snap
  }
}

/** Deslizar con el dedo: es scroll, nunca debe arrastrar. `durationMs` largo = deslizamiento lento. */
export async function swipe(page: Page, from: Point, to: Point, durationMs = 200) {
  const steps = Math.max(12, Math.round(durationMs / 16));
  const finger = await Finger.down(page, from);
  await finger.move(to, steps, durationMs / steps);
  await finger.up();
}

/** Pulsación larga (holdMs quieto) y arrastre hasta `to`. */
export async function longPressDrag(page: Page, from: Point, to: Point, holdMs = 450) {
  const finger = await Finger.down(page, from);
  await finger.hold(holdMs);
  await finger.move(to);
  await finger.hold(150);
  await finger.up();
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

/** Orden de las tarjetas (para ver que un gesto tampoco reordena dentro de la columna). */
export async function order(page: Page, cardSelector: string, idAttr: string) {
  return page.$$eval(cardSelector, (cards, id) => cards.map((c) => c.getAttribute(id)), idAttr);
}
