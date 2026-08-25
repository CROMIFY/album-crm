import { createClient } from "@/lib/supabase/server";
import type { ExpenseWithRelations } from "@/lib/types";

const EXPENSE_SELECT = "*, category:expense_categories(*)";

// Trae todos los gastos sin paginar: para el volumen de una lista de
// suscripciones/gastos de un equipo pequeño, filtrar en el cliente (ver
// components/crm/expenses-view.tsx) es más simple que ida y vuelta al
// servidor, y permite calcular el resumen sobre el conjunto completo aunque
// haya un filtro de categoría/estado activo en la lista.
export async function fetchExpensesData() {
  const supabase = await createClient();

  const [{ data: expenses, error }, { data: categories }] = await Promise.all([
    supabase
      .from("expenses")
      .select(EXPENSE_SELECT)
      .order("next_billing_date", { ascending: true, nullsFirst: false })
      .order("starts_at", { ascending: false }),
    supabase.from("expense_categories").select("*").order("name", { ascending: true }),
  ]);
  if (error) throw new Error(error.message);

  return {
    // Ver nota de casteo en lib/queries/crm.ts.
    expenses: (expenses ?? []) as unknown as ExpenseWithRelations[],
    categories: categories ?? [],
  };
}
