export const EXPENSE_CURRENCIES = ["EUR", "USD", "GBP"] as const;
export type ExpenseCurrency = (typeof EXPENSE_CURRENCIES)[number];

export const EXPENSE_CURRENCY_LABELS: Record<ExpenseCurrency, string> = {
  EUR: "EUR (€)",
  USD: "USD ($)",
  GBP: "GBP (£)",
};

// Convierte un importe a EUR con el tipo de cambio del día (Frankfurter, BCE).
// Si ya está en EUR no hace ninguna llamada de red.
export async function convertToEur(amount: number, currency: ExpenseCurrency): Promise<number> {
  if (currency === "EUR") return amount;

  const res = await fetch(
    `https://api.frankfurter.dev/v1/latest?base=${currency}&symbols=EUR`,
    { cache: "no-store" }
  );
  if (!res.ok) throw new Error("No se pudo obtener el tipo de cambio.");

  const data = (await res.json()) as { rates: Record<string, number> };
  const rate = data.rates.EUR;
  if (!rate) throw new Error("Tipo de cambio no disponible para esta divisa.");

  return Math.round(amount * rate * 100) / 100;
}
