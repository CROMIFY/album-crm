"use client";

import { ExpensesView } from "@/components/crm/expenses-view";
import type { ExpenseCategoryRow, ExpenseWithRelations } from "@/lib/types";

// Gastos de mentira para el banco de Playwright (/e2e). No salen de aquí.
const STAMP = "2026-01-01T00:00:00Z";
const tiendas: ExpenseCategoryRow = { id: "cat-tiendas", name: "Tiendas", color: "#3B82F6" };
const infra: ExpenseCategoryRow = { id: "cat-infra", name: "Infraestructura", color: "#344563" };

function expense(e: Partial<ExpenseWithRelations> & Pick<ExpenseWithRelations, "id" | "name">): ExpenseWithRelations {
  return {
    category_id: null,
    category: null,
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
    created_at: STAMP,
    updated_at: STAMP,
    ...e,
  };
}

const EXPENSES: ExpenseWithRelations[] = [
  expense({
    id: "dominio",
    name: "Dominio",
    category_id: infra.id,
    category: infra,
    amount: 11.95,
    billing_cycle: "anual",
    starts_at: "2026-09-15",
    next_billing_date: "2027-09-15",
  }),
  expense({
    id: "hosting",
    name: "Hosting",
    category_id: infra.id,
    category: infra,
    amount: 5,
    billing_cycle: "mensual",
    starts_at: "2026-08-10",
    next_billing_date: "2026-11-10",
  }),
  expense({ id: "unico-eur", name: "Pago único EUR", category_id: tiendas.id, category: tiendas, amount: 99, starts_at: "2026-10-01" }),
  expense({
    id: "unico-usd",
    name: "Pago único USD",
    category_id: tiendas.id,
    category: tiendas,
    amount: 21.51,
    currency: "USD",
    original_amount: 25,
    starts_at: "2026-09-20",
  }),
];

export function ExpensesHarness() {
  return <ExpensesView expenses={EXPENSES} categories={[tiendas, infra]} today="2026-10-28" />;
}
