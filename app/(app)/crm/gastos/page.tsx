import { ExpensesView } from "@/components/crm/expenses-view";
import { fetchExpensesData } from "@/lib/queries/expenses";

export default async function GastosPage() {
  const { expenses, categories } = await fetchExpensesData();

  return <ExpensesView expenses={expenses} categories={categories} />;
}
