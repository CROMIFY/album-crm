"use client";

import { useMemo, useOptimistic, useState, useTransition } from "react";
import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { toast } from "sonner";
import { TaskColumn } from "@/components/tasks/task-column";
import { NewColumnButton } from "@/components/tasks/new-column-button";
import { NewTaskDialog } from "@/components/tasks/new-task-dialog";
import { TaskDetailSheet } from "@/components/tasks/task-detail-sheet";
import { HeaderPortal } from "@/components/header-portal";
import { updateTaskColumn } from "@/lib/actions/tasks";
import type { AccountRow, BoardColumnRow, LabelRow, ProfileRow, TaskWithRelations } from "@/lib/types";

export function TaskBoard({
  columns,
  tasks,
  labels,
  profiles,
  accounts,
}: {
  columns: BoardColumnRow[];
  tasks: TaskWithRelations[];
  labels: LabelRow[];
  profiles: ProfileRow[];
  accounts: AccountRow[];
}) {
  const [isPending, startTransition] = useTransition();
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [optimisticTasks, moveTask] = useOptimistic(
    tasks,
    (state, { taskId, columnId }: { taskId: string; columnId: string }) =>
      state.map((t) => (t.id === taskId ? { ...t, column_id: columnId } : t))
  );

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const tasksByColumn = useMemo(() => {
    const map = new Map<string, TaskWithRelations[]>();
    for (const column of columns) map.set(column.id, []);
    for (const task of optimisticTasks) {
      map.get(task.column_id)?.push(task);
    }
    return map;
  }, [columns, optimisticTasks]);

  const openTask = optimisticTasks.find((t) => t.id === openTaskId) ?? null;

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const taskId = String(active.id);
    const columnId = String(over.id);
    const current = tasks.find((t) => t.id === taskId);
    if (!current || current.column_id === columnId) return;

    startTransition(async () => {
      moveTask({ taskId, columnId });
      try {
        await updateTaskColumn(taskId, columnId);
      } catch (err) {
        toast.error("No se pudo mover la tarea", {
          description: err instanceof Error ? err.message : undefined,
        });
      }
    });
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-4 p-4">
      <HeaderPortal>
        <NewTaskDialog columns={columns} labels={labels} profiles={profiles} />
      </HeaderPortal>
      <h1 className="text-lg font-semibold">Tareas</h1>
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className={`flex min-w-0 flex-1 gap-3 overflow-x-auto pb-2 ${isPending ? "opacity-80" : ""}`}>
          {columns.map((column) => (
            <TaskColumn
              key={column.id}
              column={column}
              tasks={tasksByColumn.get(column.id) ?? []}
              onOpenTask={(task) => setOpenTaskId(task.id)}
            />
          ))}
          <NewColumnButton />
        </div>
      </DndContext>
      <TaskDetailSheet
        task={openTask}
        labels={labels}
        profiles={profiles}
        accounts={accounts}
        onClose={() => setOpenTaskId(null)}
      />
    </div>
  );
}
