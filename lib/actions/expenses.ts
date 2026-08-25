"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ExpenseBillingCycle, ExpenseStatus } from "@/lib/types";

const EXPENSES_PATH = "/crm/gastos";

function revalidateExpenses() {
  revalidatePath(EXPENSES_PATH);
  revalidatePath("/");
}

export async function createExpense(input: {
  name: string;
  categoryId?: string;
  vendor?: string;
  amount: number;
  billingCycle: ExpenseBillingCycle;
  startsAt: string;
  nextBillingDate?: string;
  notes?: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("expenses").insert({
    name: input.name,
    category_id: input.categoryId || null,
    vendor: input.vendor || null,
    amount: input.amount,
    billing_cycle: input.billingCycle,
    starts_at: input.startsAt,
    next_billing_date: input.billingCycle === "unico" ? null : input.nextBillingDate || null,
    notes: input.notes || null,
    created_by: user?.id ?? null,
  });
  if (error) throw new Error(error.message);

  revalidateExpenses();
}

export async function updateExpense(
  id: string,
  input: {
    name: string;
    categoryId?: string;
    vendor?: string;
    amount: number;
    billingCycle: ExpenseBillingCycle;
    startsAt: string;
    nextBillingDate?: string;
    notes?: string;
  }
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("expenses")
    .update({
      name: input.name,
      category_id: input.categoryId || null,
      vendor: input.vendor || null,
      amount: input.amount,
      billing_cycle: input.billingCycle,
      starts_at: input.startsAt,
      next_billing_date: input.billingCycle === "unico" ? null : input.nextBillingDate || null,
      notes: input.notes || null,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidateExpenses();
}

export async function setExpenseStatus(id: string, status: ExpenseStatus) {
  const supabase = await createClient();
  const { error } = await supabase.from("expenses").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);

  revalidateExpenses();
}

export async function deleteExpense(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("expenses").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidateExpenses();
}

// Avanza la fecha de próxima renovación un ciclo (mensual: +1 mes, anual: +1
// año) — para ir marcando los pagos de una suscripción sin tener que editar
// la fecha a mano cada vez.
export async function renewExpense(id: string) {
  const supabase = await createClient();
  const { data: expense, error: fetchError } = await supabase
    .from("expenses")
    .select("billing_cycle, next_billing_date")
    .eq("id", id)
    .single();
  if (fetchError || !expense) throw new Error(fetchError?.message ?? "Gasto no encontrado");
  if (expense.billing_cycle === "unico" || !expense.next_billing_date) {
    throw new Error("Este gasto no es recurrente.");
  }

  const next = new Date(expense.next_billing_date);
  if (expense.billing_cycle === "mensual") next.setMonth(next.getMonth() + 1);
  else next.setFullYear(next.getFullYear() + 1);

  const { error } = await supabase
    .from("expenses")
    .update({ next_billing_date: next.toISOString().slice(0, 10) })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidateExpenses();
}

export async function createExpenseCategory(name: string, color: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("expense_categories").insert({ name, color });
  if (error) throw new Error(error.message);

  revalidateExpenses();
}

export async function updateExpenseCategory(id: string, input: { name?: string; color?: string }) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("expense_categories")
    .update({
      ...(input.name !== undefined && { name: input.name }),
      ...(input.color !== undefined && { color: input.color }),
    })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidateExpenses();
}

export async function deleteExpenseCategory(id: string) {
  const supabase = await createClient();
  // La FK expenses.category_id tiene "on delete set null": los gastos que
  // usaban esta categoría quedan sin categorizar, no se borran.
  const { error } = await supabase.from("expense_categories").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidateExpenses();
}
