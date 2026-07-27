import { describe, expect, it } from "vitest";
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
});
