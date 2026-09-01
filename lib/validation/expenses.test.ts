import { describe, expect, it } from "vitest";
import { expenseSchema } from "./expenses";

describe("expenseSchema", () => {
  const base = {
    name: "Notion",
    amount: "10",
    currency: "EUR" as const,
    billing_cycle: "mensual" as const,
    starts_at: "2026-01-01",
    next_billing_date: "2026-09-05",
  };

  it("accepts a valid recurring expense", () => {
    expect(expenseSchema.safeParse(base).success).toBe(true);
  });

  it("accepts a valid one-off expense without next_billing_date", () => {
    const result = expenseSchema.safeParse({
      name: "Dominio cromify.com",
      amount: "12",
      currency: "EUR",
      billing_cycle: "unico",
      starts_at: "2026-01-03",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty name", () => {
    expect(expenseSchema.safeParse({ ...base, name: "" }).success).toBe(false);
  });

  it("rejects a non-positive amount", () => {
    expect(expenseSchema.safeParse({ ...base, amount: "0" }).success).toBe(false);
    expect(expenseSchema.safeParse({ ...base, amount: "-5" }).success).toBe(false);
  });

  it("rejects a recurring expense without next_billing_date", () => {
    const result = expenseSchema.safeParse({
      name: "Notion",
      amount: "10",
      currency: "EUR",
      billing_cycle: "mensual",
      starts_at: "2026-01-01",
    });
    expect(result.success).toBe(false);
  });
});
