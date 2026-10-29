import { daysBetween } from "@/lib/expenses/summary";
import type { AccountType, DealStage, DealStageHistoryRow } from "@/lib/types";

// Objetivos (tabla goals, migración 0019): estado calculado y valores sacados del CRM.

export const GOAL_METRICS = ["clubes_cerrados", "clubes_cerrados_desde_inicio", "clubes_nuevos_pdte_firma"] as const;
export type GoalMetric = (typeof GOAL_METRICS)[number];

export const GOAL_METRIC_LABELS: Record<GoalMetric, string> = {
  clubes_cerrados: "Clubes en «Cerrado» ahora (pipeline)",
  clubes_cerrados_desde_inicio: "Clubes que pasan a «Cerrado» desde el inicio del objetivo",
  clubes_nuevos_pdte_firma: "Clubes que pasan a «Pdte Firma» desde el inicio del objetivo",
};

export type GoalRow = {
  id: string;
  title: string;
  current_value: number | null;
  target_value: number;
  unit: string | null;
  starts_on: string;
  due_date: string;
  owner_ids: string[];
  metric: GoalMetric | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type GoalStatus = "en_camino" | "en_riesgo" | "conseguido" | "vencido" | "sin_dato";

export const GOAL_STATUS_LABELS: Record<GoalStatus, string> = {
  en_camino: "En camino",
  en_riesgo: "En riesgo",
  conseguido: "Conseguido",
  vencido: "Vencido",
  sin_dato: "Sin dato",
};

/** Riesgo: queda menos de este trozo del plazo… */
export const RISK_TIME_LEFT = 0.25;
/** …y el progreso va por debajo de esto. */
export const RISK_PROGRESS = 0.75;

/** 0–1, o null si no hay valor actual. */
export function goalProgress(current: number | null, target: number): number | null {
  if (current == null) return null;
  return Math.max(0, Math.min(1, current / target));
}

/** Parte del plazo que queda (1 = empieza hoy, 0 = vence hoy o ya venció). */
export function timeLeftFraction(startsOn: string, dueDate: string, today: string): number {
  const total = daysBetween(startsOn, dueDate);
  const left = daysBetween(today, dueDate);
  if (left <= 0 || total <= 0) return 0;
  return Math.min(1, left / total);
}

/**
 * - Conseguido: llega a la meta (aunque sea tarde).
 * - Vencido: pasó la fecha límite sin llegar.
 * - En riesgo: queda < 25 % del plazo y va por debajo del 75 % de la meta.
 * - En camino: el resto.
 * - Sin dato: no hay valor actual (no se inventa).
 */
export function goalStatus(
  goal: Pick<GoalRow, "target_value" | "starts_on" | "due_date">,
  current: number | null,
  today: string
): GoalStatus {
  if (current == null) return "sin_dato";
  if (current >= goal.target_value) return "conseguido";
  if (today > goal.due_date) return "vencido";
  const progress = goalProgress(current, goal.target_value) ?? 0;
  if (timeLeftFraction(goal.starts_on, goal.due_date, today) < RISK_TIME_LEFT && progress < RISK_PROGRESS) {
    return "en_riesgo";
  }
  return "en_camino";
}

export type MetricDeal = { id: string; stage: DealStage; account: { tipo: AccountType } | null };
export type MetricHistory = Pick<DealStageHistoryRow, "deal_id" | "to_stage" | "changed_at">;

/** Valor actual de una métrica calculada a partir del pipeline. */
export function metricValue(
  metric: GoalMetric,
  goal: Pick<GoalRow, "starts_on">,
  deals: MetricDeal[],
  history: MetricHistory[]
): number {
  const clubDeals = deals.filter((d) => d.account?.tipo === "club");
  if (metric === "clubes_cerrados") return clubDeals.filter((d) => d.stage === "cerrado").length;
  // Clubes que entran en la etapa en el plazo del objetivo (una vez por club, aunque
  // luego sigan avanzando). Fecha en hora de Madrid para que el día cuadre.
  const stage: DealStage = metric === "clubes_nuevos_pdte_firma" ? "pdte_firma" : "cerrado";
  const clubIds = new Set(clubDeals.map((d) => d.id));
  const entered = new Set(
    history
      .filter((h) => h.to_stage === stage && clubIds.has(h.deal_id) && madridDay(h.changed_at) >= goal.starts_on)
      .map((h) => h.deal_id)
  );
  return entered.size;
}

function madridDay(timestamp: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(timestamp));
}

/** Valor actual: el calculado si el objetivo tiene métrica; si no, el que se puso a mano. */
export function currentValue(
  goal: Pick<GoalRow, "metric" | "current_value" | "starts_on">,
  deals: MetricDeal[],
  history: MetricHistory[]
): number | null {
  if (goal.metric) return metricValue(goal.metric, goal, deals, history);
  return goal.current_value == null ? null : Number(goal.current_value);
}
