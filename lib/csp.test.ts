import { afterEach, describe, expect, it, vi } from "vitest";
import { buildCsp } from "./csp";

describe("buildCsp", () => {
  it("includes the given nonce in script-src", () => {
    const header = buildCsp("abc123", false);
    expect(header).toContain("'nonce-abc123'");
  });

  it("keeps script-src free of unsafe-inline (that's the whole point of the nonce)", () => {
    const header = buildCsp("abc123", false);
    const scriptSrc = header.match(/script-src [^;]+/)?.[0];
    expect(scriptSrc).not.toContain("unsafe-inline");
  });

  it("only allows unsafe-eval in development", () => {
    expect(buildCsp("n", true)).toContain("'unsafe-eval'");
    expect(buildCsp("n", false)).not.toContain("unsafe-eval");
  });

  it("blocks framing and restricts base-uri/form-action to self", () => {
    const header = buildCsp("n", false);
    expect(header).toContain("frame-ancestors 'none'");
    expect(header).toContain("base-uri 'self'");
    expect(header).toContain("form-action 'self'");
  });

  describe("with NEXT_PUBLIC_SENTRY_DSN set", () => {
    afterEach(() => {
      vi.unstubAllEnvs();
      vi.resetModules();
    });

    it("allows connect-src to the Sentry ingest host so error reports aren't blocked", async () => {
      vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "https://abc@o123.ingest.de.sentry.io/456");
      vi.resetModules();
      const { buildCsp: buildCspWithSentry } = await import("./csp");

      const header = buildCspWithSentry("n", false);
      expect(header).toContain("connect-src 'self'");
      expect(header).toContain("https://o123.ingest.de.sentry.io");
    });
  });
});
