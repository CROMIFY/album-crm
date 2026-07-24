import { Building2, Handshake, Trophy, AlarmClock } from "lucide-react";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { FunnelSummary } from "@/components/dashboard/funnel-summary";
import { UpcomingTasksCard } from "@/components/dashboard/upcoming-tasks-card";
import { RecentActivityCard } from "@/components/dashboard/recent-activity-card";
import { fetchDashboardData } from "@/lib/queries/dashboard";

export default async function Home() {
  const { kpis, clubStageCounts, sponsorStageCounts, upcomingTasks, activity } =
    await fetchDashboardData();

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div>
        <h1 className="text-lg font-semibold">Resumen</h1>
        <p className="text-muted-foreground text-sm">
          Estado del pipeline de ventas, tareas del equipo y actividad reciente.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={<Building2 className="h-4 w-4" />}
          label="Negocios activos — Clubes"
          value={kpis.activeClubs}
          sublabel="en el pipeline de clubes"
        />
        <KpiCard
          icon={<Handshake className="h-4 w-4" />}
          label="Negocios activos — Patrocinios"
          value={kpis.activeSponsors}
          sublabel="en el pipeline de patrocinios"
        />
        <KpiCard
          icon={<Trophy className="h-4 w-4" />}
          label="Ganados este mes"
          value={kpis.wonThisMonth}
          sublabel="clubes y patrocinios"
        />
        <KpiCard
          icon={<AlarmClock className="h-4 w-4" />}
          label="Tareas vencidas"
          value={kpis.overdueTasks}
          sublabel="requieren atención hoy"
          accent="warning"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <FunnelSummary
          title="Funnel de Clubes"
          description="Clubes deportivos"
          stageCounts={clubStageCounts}
          colorVar="var(--chart-1)"
        />
        <FunnelSummary
          title="Funnel de Patrocinios"
          description="Patrocinadores"
          stageCounts={sponsorStageCounts}
          colorVar="var(--chart-3)"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <UpcomingTasksCard tasks={upcomingTasks} />
        <RecentActivityCard activity={activity} />
      </div>
    </div>
  );
}
