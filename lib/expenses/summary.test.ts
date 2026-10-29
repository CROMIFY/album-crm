import { describe, expect, it } from "vitest";
import {
  addMonthsClamped,
  annualRecurringCost,
  chargeDates,
  monthlyProrated,
  spentByCategory,
  totalSpent,
  upcomingCharges,
} from "@/lib/expenses/summary";
import type { ExpenseRow } from "@/lib/types";

function expense(overrides: Partial<ExpenseRow>): ExpenseRow {
  return {
    id: overrides.id ?? "x",
    name: "Gasto",
    category_id: null,
    vendor: null,
    amount: 10,
    currency: "EUR",
    original_amount: null,
    billing_cycle: "unico",
    starts_at: "2026-01-01",
    next_billing_date: null,
    status: "activo",
    notes: null,
    created_by: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

const TODAY = "2026-10-28";

// Parecido a lo que había en el CRM: un anual de 11,95 € y dos pagos únicos
// (99 € y 25 USD guardados como 21,51 €).
const dominio = expense({
  id: "dominio",
  category_id: "infra",
  amount: 11.95,
  billing_cycle: "anual",
  starts_at: "2026-09-15",
  next_billing_date: "2027-09-15",
});
const apple = expense({ id: "apple", category_id: "tiendas", amount: 99, starts_at: "2026-10-01" });
const google = expense({
  id: "google",
  category_id: "tiendas",
  amount: 21.51,
  currency: "USD",
  original_amount: 25,
  starts_at: "2026-09-20",
});

describe("coste anual y mensual prorrateado", () => {
  it("el anual cuenta una vez, el mensual doce y los únicos nada", () => {
    const mensual = expense({ id: "m", amount: 5, billing_cycle: "mensual", next_billing_date: "2026-11-01" });
    expect(annualRecurringCost([dominio, apple, google, mensual])).toBe(71.95);
    expect(monthlyProrated([dominio, apple, google, mensual])).toBe(6);
  });

  it("el prorrateo de un anual de 11,95 € es 1,00 € (no es un cobro mensual)", () => {
    expect(monthlyProrated([dominio])).toBe(1);
  });

  it("los recurrentes cancelados no cuentan en el coste anual", () => {
    expect(annualRecurringCost([{ ...dominio, status: "cancelado" }])).toBe(0);
  });
});

describe("total gastado", () => {
  it("suma los puntuales y cada cobro hecho de los recurrentes", () => {
    expect(totalSpent([dominio, apple, google], TODAY)).toBe(132.46);
  });

  it("un pago en USD suma su importe convertido a EUR, no el original", () => {
    expect(totalSpent([google], TODAY)).toBe(21.51);
  });

  it("un mensual desde el 1-ene lleva 10 cobros a 28-oct", () => {
    const mensual = expense({ amount: 5, billing_cycle: "mensual", starts_at: "2026-01-01", next_billing_date: "2026-11-01" });
    expect(chargeDates(mensual, TODAY)).toHaveLength(10);
    expect(totalSpent([mensual], TODAY)).toBe(50);
  });

  it("un anual cobra el día que empieza y otra vez al cumplir el año", () => {
    const anual = expense({ amount: 99, billing_cycle: "anual", starts_at: "2025-10-28", next_billing_date: "2026-10-28" });
    expect(chargeDates(anual, "2026-10-27")).toEqual(["2025-10-28"]);
    expect(chargeDates(anual, TODAY)).toEqual(["2025-10-28", "2026-10-28"]);
  });

  it("lo que aún no ha llegado no cuenta", () => {
    expect(totalSpent([expense({ amount: 40, starts_at: "2026-11-15" })], TODAY)).toBe(0);
  });

  it("un recurrente cancelado deja de sumar en su próxima fecha", () => {
    const cancelado = expense({
      amount: 5,
      billing_cycle: "mensual",
      starts_at: "2026-01-10",
      next_billing_date: "2026-04-10",
      status: "cancelado",
    });
    expect(chargeDates(cancelado, TODAY)).toEqual(["2026-01-10", "2026-02-10", "2026-03-10"]);
  });

  it("los cobros del 31 caen el último día de los meses cortos", () => {
    expect(addMonthsClamped("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonthsClamped("2028-01-31", 1)).toBe("2028-02-29");
    expect(addMonthsClamped("2026-01-31", 2)).toBe("2026-03-31");
  });
});

describe("por categoría", () => {
  it("es el total gastado de cada categoría, de mayor a menor", () => {
    expect(spentByCategory([dominio, apple, google], TODAY)).toEqual([
      { categoryId: "tiendas", total: 120.51 },
      { categoryId: "infra", total: 11.95 },
    ]);
  });
});

describe("próximos cobros", () => {
  it("lista los recurrentes activos por fecha y avisa de los de menos de 30 días", () => {
    const pronto = expense({ id: "pronto", billing_cycle: "mensual", next_billing_date: "2026-11-05" });
    const vencido = expense({ id: "vencido", billing_cycle: "mensual", next_billing_date: "2026-10-20" });
    const cancelado = expense({ id: "cancelado", billing_cycle: "mensual", next_billing_date: "2026-11-01", status: "cancelado" });
    const list = upcomingCharges([dominio, apple, pronto, vencido, cancelado], TODAY);
    expect(list.map((c) => [c.expense.id, c.daysUntil, c.soon])).toEqual([
      ["vencido", -8, true],
      ["pronto", 8, true],
      ["dominio", 322, false],
    ]);
  });
});
