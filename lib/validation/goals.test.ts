import { describe, expect, it } from "vitest";
import { goalSchema } from "@/lib/validation/goals";

const valid = {
  title: "Clubes firmados",
  currentValue: null,
  targetValue: 6,
  unit: "clubes",
  startsOn: "2026-10-28",
  dueDate: "2026-11-20",
  ownerIds: [],
  metric: "clubes_cerrados" as const,
  notes: null,
};

describe("goalSchema", () => {
  it("acepta un objetivo sin valor actual", () => {
    expect(goalSchema.safeParse(valid).success).toBe(true);
  });

  it("rechaza meta 0, título vacío y fecha límite antes del inicio", () => {
    expect(goalSchema.safeParse({ ...valid, targetValue: 0 }).success).toBe(false);
    expect(goalSchema.safeParse({ ...valid, title: "  " }).success).toBe(false);
    expect(goalSchema.safeParse({ ...valid, dueDate: "2026-10-01" }).success).toBe(false);
  });
});
