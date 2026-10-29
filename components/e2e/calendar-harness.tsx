"use client";

import { CalendarView } from "@/components/calendar/calendar-view";
import hitosData from "@/scripts/datos/hitos-28oct.json";
import type { ProfileRow, SprintRow, TaskWithRelations } from "@/lib/types";

// Calendario con los hitos del 28-oct (mismo JSON que el script de carga), perfiles
// y sprints de mentira, para el banco de Playwright (/e2e). No toca Supabase.
const STAMP = "2026-10-01T00:00:00Z";
export const E2E_PROFILES: ProfileRow[] = ["Jaime", "Lander", "Pablo"].map((nombre) => ({
  id: `p-${nombre.toLowerCase()}`,
  nombre,
  email: "",
  rol: "",
  created_at: STAMP,
}));

const SPRINTS: SprintRow[] = [
  { id: "s1", name: "Sprint 1", starts_on: "2026-10-27", ends_on: "2026-11-07", goal: null, closed_at: null, closed_count: null, carried_count: null, created_at: STAMP },
  { id: "s2", name: "Sprint 2", starts_on: "2026-11-10", ends_on: "2026-11-21", goal: null, closed_at: null, closed_count: null, carried_count: null, created_at: STAMP },
];

type Hito = { start?: string; due: string; title: string; type: string | null; owners: string[] };

function ownersFor(names: string[]): ProfileRow[] {
  if (names.includes("Todos")) return E2E_PROFILES;
  return E2E_PROFILES.filter((p) => names.includes(p.nombre));
}

const TASKS: TaskWithRelations[] = [
  ...(hitosData.hitos as Hito[]).map((h, i) => ({
    id: `hito-${i + 1}`,
    column_id: "col",
    title: h.title,
    description: null,
    due_date: h.due,
    start_date: h.start ?? null,
    is_milestone: true,
    milestone_type: h.type,
    priority: "media" as const,
    position: i,
    done: false,
    done_at: null,
    sprint_id: null,
    size: null,
    linked_account_id: null,
    linked_deal_id: null,
    created_at: STAMP,
    updated_at: STAMP,
    labels: [],
    subtasks: [],
    assignees: ownersFor(h.owners),
  })),
  {
    id: "tarea-normal",
    column_id: "col",
    title: "Tarea normal con fecha",
    description: null,
    due_date: "2026-11-04",
    priority: "media",
    position: 99,
    done: false,
    done_at: null,
    sprint_id: null,
    size: null,
    linked_account_id: null,
    linked_deal_id: null,
    created_at: STAMP,
    updated_at: STAMP,
    labels: [],
    subtasks: [],
    assignees: [E2E_PROFILES[0]],
  },
];

export function CalendarHarness({ header }: { header?: React.ReactNode }) {
  return <CalendarView tasks={TASKS} sprints={SPRINTS} profiles={E2E_PROFILES} today="2026-10-28" header={header} />;
}
