import { todayInMadrid } from "@/lib/tasks/filters";

function addDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/**
 * Días que avisa el recordatorio diario: hoy y mañana en hora de Madrid. Las
 * vencidas no entran: avisarlas cada día como «vence hoy» hacía que el correo
 * de las 07:00 no sirviera (73 avisos el 21-oct-2026).
 */
export function reminderWindow(now: Date = new Date()): { today: string; tomorrow: string } {
  const today = todayInMadrid(now);
  return { today, tomorrow: addDays(today, 1) };
}

/** «hoy» o «mañana» para una fecha dentro de la ventana; null si cae fuera. */
export function reminderWhen(dueDate: string, days: { today: string; tomorrow: string }): "hoy" | "mañana" | null {
  const date = dueDate.slice(0, 10);
  if (date === days.today) return "hoy";
  if (date === days.tomorrow) return "mañana";
  return null;
}
