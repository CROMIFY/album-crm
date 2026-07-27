import { describe, expect, it } from "vitest";
import { evaluateSession } from "./session-policy";

const HOUR = 60 * 60_000;
const MINUTE = 60_000;

describe("evaluateSession", () => {
  const opts = { maxAgeMinutes: 480, idleTimeoutMinutes: 30 };

  it("is not expired for a fresh session", () => {
    const now = Date.now();
    expect(
      evaluateSession({ now, startedAt: now, lastActivity: now, ...opts })
    ).toEqual({ expired: false });
  });

  it("expires once the absolute session age is exceeded", () => {
    const now = Date.now();
    const startedAt = now - 481 * MINUTE;
    expect(
      evaluateSession({ now, startedAt, lastActivity: now, ...opts })
    ).toEqual({ expired: true, reason: "session" });
  });

  it("does not expire right at the boundary of the max age", () => {
    const now = Date.now();
    const startedAt = now - 479 * MINUTE;
    expect(
      evaluateSession({ now, startedAt, lastActivity: now, ...opts }).expired
    ).toBe(false);
  });

  it("expires after too much inactivity even if the session itself is young", () => {
    const now = Date.now();
    const startedAt = now - 5 * MINUTE;
    const lastActivity = now - 31 * MINUTE;
    expect(
      evaluateSession({ now, startedAt, lastActivity, ...opts })
    ).toEqual({ expired: true, reason: "idle" });
  });

  it("reports the session reason when both the max age and idle timeout are exceeded", () => {
    const now = Date.now();
    const startedAt = now - 10 * HOUR;
    const lastActivity = now - 10 * HOUR;
    expect(
      evaluateSession({ now, startedAt, lastActivity, ...opts })
    ).toEqual({ expired: true, reason: "session" });
  });

  it("treats missing timestamps (sessions predating this policy) as not expired", () => {
    const now = Date.now();
    expect(
      evaluateSession({ now, startedAt: null, lastActivity: null, ...opts })
    ).toEqual({ expired: false });
  });
});
