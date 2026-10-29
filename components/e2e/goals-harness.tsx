"use client";

import { useState } from "react";
import { GoalsView, GoalsSummary } from "@/components/goals/goals-view";
import { CalendarHarness, E2E_PROFILES } from "@/components/e2e/calendar-harness";
import type { GoalWithValue } from "@/lib/queries/goals";
import type { GoalInput } from "@/lib/validation/goals";

// Objetivos de mentira para el banco de Playwright (/e2e). Los de métrica llevan un
// valor fijo en vez del calculado del pipeline. No toca Supabase.
const TODAY = "2026-10-28";
const STAMP = "2026-10-28T00:00:00Z";
const [jaime, lander, pablo] = E2E_PROFILES.map((p) => p.id);

function goal(g: Partial<GoalWithValue> & Pick<GoalWithValue, "id" | "title" | "target_value" | "due_date">): GoalWithValue {
  return {
    current_value: null,
    unit: null,
    starts_on: TODAY,
    owner_ids: [],
    metric: null,
    notes: null,
    created_at: STAMP,
    updated_at: STAMP,
    value: g.current_value ?? null,
    ...g,
  };
}

const GOALS: GoalWithValue[] = [
  goal({ id: "g1", title: "Publicada en las dos tiendas", current_value: 0, value: 0, target_value: 2, unit: "tiendas", due_date: "2026-12-01", owner_ids: [jaime, lander, pablo] }),
  goal({ id: "g2", title: "Testers dados de alta en la prueba cerrada", current_value: 1, value: 1, target_value: 12, unit: "testers", due_date: "2026-10-28", owner_ids: [lander], notes: "Dato a 28-oct." }),
  goal({ id: "g3", title: "Clubes firmados", metric: "clubes_cerrados_desde_inicio", value: 2, target_value: 6, unit: "clubes", due_date: "2026-11-20", owner_ids: [pablo] }),
  goal({ id: "g4", title: "Clubes nuevos en Pdte firma", metric: "clubes_nuevos_pdte_firma", value: 0, target_value: 5, unit: "clubes", due_date: "2026-11-30", owner_ids: [pablo] }),
];

function fromInput(input: GoalInput, id: string): GoalWithValue {
  return goal({
    id,
    title: input.title,
    current_value: input.metric ? null : input.currentValue,
    value: input.metric ? 0 : input.currentValue,
    target_value: input.targetValue,
    unit: input.unit,
    starts_on: input.startsOn,
    due_date: input.dueDate,
    owner_ids: input.ownerIds,
    metric: input.metric,
    notes: input.notes,
  });
}

export function GoalsHarness() {
  const [goals, setGoals] = useState(GOALS);

  async function save(input: GoalInput, id?: string) {
    setGoals((prev) =>
      id ? prev.map((g) => (g.id === id ? fromInput(input, id) : g)) : [...prev, fromInput(input, `nuevo-${prev.length + 1}`)]
    );
  }

  async function remove(id: string) {
    setGoals((prev) => prev.filter((g) => g.id !== id));
  }

  return <GoalsView goals={goals} profiles={E2E_PROFILES} today={TODAY} onSave={save} onDelete={remove} />;
}

export function CalendarWithGoalsHarness() {
  return <CalendarHarness header={<GoalsSummary goals={GOALS} today={TODAY} />} />;
}
