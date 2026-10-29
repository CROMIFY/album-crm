import { describe, expect, it } from "vitest";
import { currentValue, goalProgress, goalStatus, metricValue, timeLeftFraction, type MetricDeal } from "@/lib/goals/goals";

const goal = { target_value: 12, starts_on: "2026-10-01", due_date: "2026-10-31" };

describe("goalStatus", () => {
  it("llegar a la meta es Conseguido, aunque sea tarde", () => {
    expect(goalStatus(goal, 12, "2026-10-10")).toBe("conseguido");
    expect(goalStatus(goal, 13, "2026-11-10")).toBe("conseguido");
  });

  it("pasada la fecha sin llegar es Vencido (el mismo día aún no)", () => {
    expect(goalStatus(goal, 5, "2026-11-01")).toBe("vencido");
    expect(goalStatus(goal, 5, "2026-10-31")).toBe("en_riesgo");
  });

  it("En riesgo: menos del 25 % del plazo y menos del 75 % de la meta", () => {
    // Plazo de 30 días: el 25 % son 7,5 días. A 24-oct quedan 7 (23 %).
    expect(goalStatus(goal, 8, "2026-10-24")).toBe("en_riesgo"); // 67 %
    expect(goalStatus(goal, 9, "2026-10-24")).toBe("en_camino"); // 75 % justo: no
    expect(goalStatus(goal, 1, "2026-10-23")).toBe("en_camino"); // quedan 8 días (27 %)
  });

  it("sin valor actual no se inventa estado", () => {
    expect(goalStatus(goal, null, "2026-10-10")).toBe("sin_dato");
  });

  it("un objetivo que empieza y vence el mismo día está en riesgo ese día si no llega", () => {
    const sameDay = { target_value: 12, starts_on: "2026-10-28", due_date: "2026-10-28" };
    expect(goalStatus(sameDay, 1, "2026-10-28")).toBe("en_riesgo");
    expect(goalStatus(sameDay, 1, "2026-10-29")).toBe("vencido");
  });
});

describe("progreso y plazo", () => {
  it("el progreso se corta entre 0 y 1", () => {
    expect(goalProgress(1, 12)).toBeCloseTo(0.0833, 3);
    expect(goalProgress(20, 12)).toBe(1);
    expect(goalProgress(null, 12)).toBeNull();
  });

  it("la parte del plazo que queda", () => {
    expect(timeLeftFraction("2026-10-01", "2026-10-31", "2026-10-01")).toBe(1);
    expect(timeLeftFraction("2026-10-01", "2026-10-31", "2026-10-16")).toBe(0.5);
    expect(timeLeftFraction("2026-10-01", "2026-10-31", "2026-11-05")).toBe(0);
  });
});

describe("métricas del CRM", () => {
  const deals: MetricDeal[] = [
    { id: "a", stage: "cerrado", account: { tipo: "club" } },
    { id: "b", stage: "cerrado", account: { tipo: "club" } },
    { id: "c", stage: "pdte_firma", account: { tipo: "club" } },
    { id: "d", stage: "cerrado", account: { tipo: "patrocinador" } },
    { id: "e", stage: "cerrado", account: { tipo: "club" } },
  ];
  const history = [
    { deal_id: "c", to_stage: "pdte_firma" as const, changed_at: "2026-10-29T09:00:00Z" },
    { deal_id: "e", to_stage: "pdte_firma" as const, changed_at: "2026-11-02T09:00:00Z" },
    { deal_id: "e", to_stage: "cerrado" as const, changed_at: "2026-11-05T09:00:00Z" },
    { deal_id: "a", to_stage: "pdte_firma" as const, changed_at: "2026-10-10T09:00:00Z" },
    { deal_id: "d", to_stage: "pdte_firma" as const, changed_at: "2026-11-01T09:00:00Z" },
    // 23:30 UTC del 27-oct ya es 28-oct en Madrid.
    { deal_id: "b", to_stage: "pdte_firma" as const, changed_at: "2026-10-27T23:30:00Z" },
  ];

  it("clubes cerrados: solo clubes, no patrocinadores", () => {
    expect(metricValue("clubes_cerrados", { starts_on: "2026-10-28" }, deals, history)).toBe(3);
  });

  it("clubes nuevos en Pdte Firma: los que entran desde el inicio, aunque ya estén cerrados", () => {
    expect(metricValue("clubes_nuevos_pdte_firma", { starts_on: "2026-10-28" }, deals, history)).toBe(3);
  });

  it("clubes que pasan a Cerrado desde el inicio: no cuenta los que ya estaban firmados", () => {
    expect(metricValue("clubes_cerrados_desde_inicio", { starts_on: "2026-10-28" }, deals, history)).toBe(1);
  });

  it("sin métrica manda el valor puesto a mano (o nada)", () => {
    expect(currentValue({ metric: null, current_value: 1, starts_on: "2026-10-28" }, deals, history)).toBe(1);
    expect(currentValue({ metric: null, current_value: null, starts_on: "2026-10-28" }, deals, history)).toBeNull();
  });
});
