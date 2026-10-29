"use client";

import { useState } from "react";
import { TaskBoard } from "@/components/tasks/task-board";
import { KanbanBoard } from "@/components/crm/kanban-board";
import { E2E_COLUMNS, E2E_DEALS, E2E_TASKS } from "@/components/e2e/fixtures";
import type { DealStage } from "@/lib/types";

// Tableros reales con datos en memoria: el movimiento se guarda en el estado, no en Supabase.

export function TaskBoardHarness() {
  const [tasks, setTasks] = useState(E2E_TASKS);

  async function reorder(taskId: string, columnId: string, orderedIds: string[]) {
    const positionById = new Map(orderedIds.map((id, position) => [id, position]));
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) return { ...t, column_id: columnId, position: positionById.get(t.id) ?? t.position };
        if (positionById.has(t.id)) return { ...t, position: positionById.get(t.id)! };
        return t;
      })
    );
  }

  return (
    <TaskBoard
      columns={E2E_COLUMNS}
      tasks={tasks}
      labels={[]}
      profiles={[]}
      accounts={[]}
      today="2026-10-28"
      currentUserId={null}
      columnPrefs={{}}
      reorder={reorder}
    />
  );
}

export function DealBoardHarness() {
  const [deals, setDeals] = useState(E2E_DEALS);

  async function changeStage(dealId: string, _tipo: unknown, stage: DealStage) {
    setDeals((prev) => prev.map((d) => (d.id === dealId ? { ...d, stage } : d)));
  }

  return (
    <div className="p-4">
      <KanbanBoard tipo="club" deals={deals} changeStage={changeStage} />
    </div>
  );
}
