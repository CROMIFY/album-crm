import { ExpensesView } from "@/components/crm/expenses-view";
import { fetchExpensesData } from "@/lib/queries/expenses";
import { todayInMadrid } from "@/lib/tasks/filters";

export default async function GastosPage() {
  const { expenses, categories } = await fetchExpensesData();

  return <ExpensesView expenses={expenses} categories={categories} today={todayInMadrid()} />;
}
