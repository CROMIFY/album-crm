import { createClient } from "@/lib/supabase/server";
import { currentValue, type GoalRow, type MetricDeal, type MetricHistory } from "@/lib/goals/goals";
import type { ProfileRow } from "@/lib/types";

export type GoalWithValue = GoalRow & { value: number | null };

// Objetivos con su valor actual ya resuelto (calculado del pipeline o puesto a mano).
// Sin la migración 0019 la tabla no existe: se devuelve la lista vacía y un aviso.
export async function fetchGoalsData() {
  const supabase = await createClient();
  const [{ data: goals, error }, { data: profiles }, { data: deals }, { data: history }] = await Promise.all([
    supabase.from("goals").select("*").order("due_date", { ascending: true }),
    supabase.from("profiles").select("*").order("nombre", { ascending: true }),
    supabase.from("deals").select("id, stage, account:accounts(tipo)"),
    supabase.from("deal_stage_history").select("deal_id, to_stage, changed_at").in("to_stage", ["pdte_firma", "cerrado"]),
  ]);

  const metricDeals = (deals ?? []) as unknown as MetricDeal[];
  const metricHistory = (history ?? []) as MetricHistory[];
  const withValues: GoalWithValue[] = ((goals ?? []) as GoalRow[]).map((g) => ({
    ...g,
    target_value: Number(g.target_value),
    value: currentValue(g, metricDeals, metricHistory),
  }));

  return {
    goals: withValues,
    profiles: (profiles ?? []) as ProfileRow[],
    missingTable: !!error,
  };
}
