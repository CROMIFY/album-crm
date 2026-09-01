import { describe, expect, it } from "vitest";
import { formatBuildDuration } from "@/lib/deploys/format";

describe("formatBuildDuration", () => {
  it("devuelve un guion cuando no ha empezado", () => {
    expect(formatBuildDuration(null, null)).toBe("—");
  });

  it("calcula la duración en segundos cuando dura menos de un minuto", () => {
    expect(formatBuildDuration("2026-01-01T00:00:00.000Z", "2026-01-01T00:00:42.000Z")).toBe("42s");
  });

  it("calcula la duración en minutos y segundos", () => {
    expect(formatBuildDuration("2026-01-01T00:00:00.000Z", "2026-01-01T00:03:12.000Z")).toBe("3m 12s");
  });

  it("usa el momento actual como fin cuando el build sigue en curso", () => {
    const startedAt = new Date(Date.now() - 5000).toISOString();
    expect(formatBuildDuration(startedAt, null)).toBe("5s");
  });
});
