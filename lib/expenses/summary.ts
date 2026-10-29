import type { ExpenseRow } from "@/lib/types";

// Resumen de la pantalla de Gastos. Todo en EUR: `amount` ya es el importe
// convertido al guardar (los pagos en USD/GBP guardan además el original en
// `original_amount`, que aquí no se usa). Fechas YYYY-MM-DD, calculadas en UTC
// para que no se corran un día según la zona horaria del navegador.

type ExpenseLike = Pick<
  ExpenseRow,
  "id" | "amount" | "billing_cycle" | "starts_at" | "next_billing_date" | "status" | "category_id"
>;

/** Días antes de un cobro a partir de los que se avisa. */
export const UPCOMING_WARNING_DAYS = 30;

function parseDay(day: string): { y: number; m: number; d: number } {
  const [y, m, d] = day.slice(0, 10).split("-").map(Number);
  return { y, m, d };
}

/** Suma meses a una fecha sin desbordar: 31-ene + 1 mes = 28/29-feb. */
export function addMonthsClamped(day: string, months: number): string {
  const { y, m, d } = parseDay(day);
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d, lastDay));
  return target.toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string): number {
  const a = parseDay(from);
  const b = parseDay(to);
  return Math.round((Date.UTC(b.y, b.m - 1, b.d) - Date.UTC(a.y, a.m - 1, a.d)) / 86_400_000);
}

/**
 * Fechas de los cobros ya hechos hasta `today` (incluido).
 * - Pago único: su fecha, si ya ha llegado.
 * - Recurrente: desde `starts_at`, uno por ciclo. Si está cancelado, solo los
 *   anteriores a `next_billing_date` (el siguiente que ya no se pagó); no se
 *   guarda la fecha de cancelación, así que es la mejor aproximación.
 */
export function chargeDates(expense: ExpenseLike, today: string): string[] {
  if (expense.starts_at > today) return [];
  if (expense.billing_cycle === "unico") return [expense.starts_at.slice(0, 10)];

  const step = expense.billing_cycle === "mensual" ? 1 : 12;
  const stopBefore = expense.status === "cancelado" ? expense.next_billing_date : null;
  const dates: string[] = [];
  // Tope de seguridad: 50 años de cobros mensuales.
  for (let k = 0; k < 600; k++) {
    const date = addMonthsClamped(expense.starts_at, k * step);
    if (date > today) break;
    if (stopBefore && date >= stopBefore) break;
    dates.push(date);
  }
  return dates;
}

/** Todo lo pagado hasta hoy: puntuales una vez y recurrentes por cada cobro hecho. */
export function totalSpent(expenses: ExpenseLike[], today: string): number {
  return roundCents(expenses.reduce((sum, e) => sum + chargeDates(e, today).length * Number(e.amount), 0));
}

/** Coste de un año de los recurrentes activos: mensuales × 12 + anuales. */
export function annualRecurringCost(expenses: ExpenseLike[]): number {
  return roundCents(
    expenses
      .filter((e) => e.status === "activo" && e.billing_cycle !== "unico")
      .reduce((sum, e) => sum + Number(e.amount) * (e.billing_cycle === "mensual" ? 12 : 1), 0)
  );
}

/** El coste anual repartido en 12 meses (no es lo que se paga cada mes). */
export function monthlyProrated(expenses: ExpenseLike[]): number {
  return roundCents(annualRecurringCost(expenses) / 12);
}

/** Total gastado por categoría (clave `null` = sin categoría), de mayor a menor. */
export function spentByCategory(expenses: ExpenseLike[], today: string): { categoryId: string | null; total: number }[] {
  const map = new Map<string | null, number>();
  for (const e of expenses) {
    const spent = chargeDates(e, today).length * Number(e.amount);
    if (spent === 0) continue;
    map.set(e.category_id, (map.get(e.category_id) ?? 0) + spent);
  }
  return [...map.entries()]
    .map(([categoryId, total]) => ({ categoryId, total: roundCents(total) }))
    .sort((a, b) => b.total - a.total);
}

export type UpcomingCharge<T extends ExpenseLike> = {
  expense: T;
  date: string;
  /** Negativo si la fecha ya pasó y nadie le dio a «Renovar». */
  daysUntil: number;
  soon: boolean;
};

/** Recurrentes activos con próxima fecha, ordenados por fecha. */
export function upcomingCharges<T extends ExpenseLike>(expenses: T[], today: string): UpcomingCharge<T>[] {
  return expenses
    .filter((e) => e.status === "activo" && e.billing_cycle !== "unico" && e.next_billing_date)
    .map((expense) => {
      const date = expense.next_billing_date!.slice(0, 10);
      const daysUntil = daysBetween(today, date);
      return { expense, date, daysUntil, soon: daysUntil < UPCOMING_WARNING_DAYS };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

function roundCents(n: number): number {
  return Math.round(n * 100) / 100;
}
