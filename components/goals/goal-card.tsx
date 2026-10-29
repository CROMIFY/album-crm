"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { GOAL_STATUS_LABELS, goalProgress, goalStatus, type GoalStatus } from "@/lib/goals/goals";
import type { GoalWithValue } from "@/lib/queries/goals";
import type { ProfileRow } from "@/lib/types";

const STATUS_STYLES: Record<GoalStatus, string> = {
  en_camino: "bg-[#047857] text-white",
  en_riesgo: "bg-[#B45309] text-white",
  conseguido: "bg-[#2563EB] text-white",
  vencido: "bg-[#DC2626] text-white",
  sin_dato: "bg-muted text-muted-foreground",
};

const BAR_STYLES: Record<GoalStatus, string> = {
  en_camino: "bg-[#047857]",
  en_riesgo: "bg-[#B45309]",
  conseguido: "bg-[#2563EB]",
  vencido: "bg-[#DC2626]",
  sin_dato: "bg-muted-foreground/40",
};

const DAY = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", timeZone: "UTC" });
const NUM = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 2 });

export function ownerNames(goal: GoalWithValue, profiles: ProfileRow[]) {
  return goal.owner_ids
    .map((id) => profiles.find((p) => p.id === id)?.nombre)
    .filter(Boolean)
    .join(", ");
}

export function GoalProgress({ goal, today, compact }: { goal: GoalWithValue; today: string; compact?: boolean }) {
  const status = goalStatus(goal, goal.value, today);
  const progress = goalProgress(goal.value, goal.target_value) ?? 0;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className={cn("tabular-nums", compact ? "text-sm" : "text-lg font-semibold")}>
          {goal.value == null ? "—" : NUM.format(goal.value)} / {NUM.format(goal.target_value)}
          {goal.unit && <span className="text-muted-foreground ml-1 text-xs font-normal">{goal.unit}</span>}
        </span>
        <Badge className={STATUS_STYLES[status]} data-status={status}>
          {GOAL_STATUS_LABELS[status]}
        </Badge>
      </div>
      <div
        className="bg-muted h-2 overflow-hidden rounded-full"
        role="progressbar"
        aria-label={`Progreso de ${goal.title}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
      >
        <div className={cn("h-full rounded-full", BAR_STYLES[status])} style={{ width: `${progress * 100}%` }} />
      </div>
      <span className="text-muted-foreground text-xs">
        Hasta el {DAY.format(new Date(`${goal.due_date}T00:00:00Z`))}
        {goal.metric && " · calculado del CRM"}
        {goal.value == null && " · sin dato: edítalo a mano"}
      </span>
    </div>
  );
}
