import { createClient } from "@/lib/supabase/server";
import { fetchFunnelDashboard } from "@/lib/queries/crm";
import type { DealStage } from "@/lib/types";

function activeCount(stageCounts: Record<DealStage, number>) {
  return Object.entries(stageCounts).reduce(
    (sum, [stage, count]) => (stage === "ganado" || stage === "perdido" ? sum : sum + count),
    0
  );
}

export async function fetchDashboardData() {
  const supabase = await createClient();
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const today = now.toISOString().slice(0, 10);

  const [clubDashboard, sponsorDashboard, { count: wonThisMonth }, { count: overdueTasks }, tasksRes, activityRes] =
    await Promise.all([
      fetchFunnelDashboard("club"),
      fetchFunnelDashboard("patrocinador"),
      supabase
        .from("deal_stage_history")
        .select("*", { count: "exact", head: true })
        .eq("to_stage", "ganado")
        .gte("changed_at", startOfMonth),
      supabase
        .from("tasks")
        .select("*", { count: "exact", head: true })
        .eq("done", false)
        .lt("due_date", today),
      supabase
        .from("tasks")
        .select("id, title, due_date, priority, assignee:profiles(nombre)")
        .eq("done", false)
        .not("due_date", "is", null)
        .order("due_date", { ascending: true })
        .limit(5),
      supabase
        .from("deal_stage_history")
        .select("id, from_stage, to_stage, changed_at, deal:deals(account:accounts(nombre, tipo))")
        .order("changed_at", { ascending: false })
        .limit(6),
    ]);

  type UpcomingTask = {
    id: string;
    title: string;
    due_date: string;
    priority: "baja" | "media" | "alta";
    assignee: { nombre: string } | null;
  };

  type ActivityRow = {
    id: string;
    from_stage: DealStage | null;
    to_stage: DealStage;
    changed_at: string;
    deal: { account: { nombre: string; tipo: "club" | "patrocinador" } | null } | null;
  };

  return {
    kpis: {
      activeClubs: activeCount(clubDashboard.stageCounts),
      activeSponsors: activeCount(sponsorDashboard.stageCounts),
      wonThisMonth: wonThisMonth ?? 0,
      overdueTasks: overdueTasks ?? 0,
    },
    clubStageCounts: clubDashboard.stageCounts,
    sponsorStageCounts: sponsorDashboard.stageCounts,
    upcomingTasks: (tasksRes.data ?? []) as unknown as UpcomingTask[],
    activity: (activityRes.data ?? []) as unknown as ActivityRow[],
  };
}
