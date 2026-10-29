"use client";

import { useMemo, useOptimistic, useState, useTransition } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { toast } from "sonner";
import { TaskColumn } from "@/components/tasks/task-column";
import { TaskCardOverlay } from "@/components/tasks/task-card";
import { NewColumnButton } from "@/components/tasks/new-column-button";
import { NewTaskDialog } from "@/components/tasks/new-task-dialog";
import { ManageLabelsDialog } from "@/components/tasks/manage-labels-dialog";
import { TaskDetailSheet } from "@/components/tasks/task-detail-sheet";
import { TaskFiltersBar } from "@/components/tasks/task-filters-bar";
import { SprintSummary } from "@/components/tasks/sprint-summary";
import { HeaderPortal } from "@/components/header-portal";
import { reorderTask } from "@/lib/actions/tasks";
import { useBoardSensors, useTouchAwareCollision } from "@/lib/dnd/sensors";
import {
  CURRENT_SPRINT,
  SORT_OPTIONS,
  countActiveFilters,
  filterTasks,
  parseFilters,
  serializeFilters,
  sortTasks,
  type TaskFilters,
} from "@/lib/tasks/filters";
import { isColumnCollapsed, saveColumnPrefs, type ColumnPrefs } from "@/lib/tasks/columns";
import { currentSprint } from "@/lib/tasks/sprints";
import type { AccountRow, BoardColumnRow, LabelRow, ProfileRow, SprintRow, TaskWithRelations } from "@/lib/types";

type MoveAction = { taskId: string; columnId: string; orderedIds: string[] };

export function TaskBoard({
  columns,
  tasks,
  labels,
  profiles,
  accounts,
  sprints = [],
  today,
  currentUserId,
  columnPrefs: initialColumnPrefs,
  reorder = reorderTask,
}: {
  columns: BoardColumnRow[];
  tasks: TaskWithRelations[];
  labels: LabelRow[];
  profiles: ProfileRow[];
  accounts: AccountRow[];
  /** Vacío mientras no esté aplicada la migración de sprints. */
  sprints?: SprintRow[];
  /** YYYY-MM-DD en hora de Madrid; lo calcula el servidor para que coincida al hidratar. */
  today: string;
  /** Perfil de quien mira el tablero (para «Mis tareas»). */
  currentUserId: string | null;
  /** Columnas plegadas o desplegadas a mano en este navegador (cookie leída en el servidor). */
  columnPrefs: ColumnPrefs;
  /** Guarda el movimiento; se sustituye solo en el banco de pruebas de Playwright (/e2e). */
  reorder?: typeof reorderTask;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [columnPrefs, setColumnPrefs] = useState(initialColumnPrefs);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [optimisticTasks, moveTask] = useOptimistic(
    tasks,
    (state, { taskId, columnId, orderedIds }: MoveAction) => {
      const positionById = new Map(orderedIds.map((id, position) => [id, position]));
      return state.map((t) => {
        if (t.id === taskId) return { ...t, column_id: columnId, position: positionById.get(t.id) ?? t.position };
        if (positionById.has(t.id)) return { ...t, position: positionById.get(t.id)! };
        return t;
      });
    }
  );

  const sensors = useBoardSensors();
  const { collisionDetection, rememberActivator } = useTouchAwareCollision();

  // Los filtros viven en la URL (la vista se puede compartir y sobrevive a recargar).
  // replaceState en vez de router.replace: no hace falta volver a pedir el tablero al servidor.
  const filters = useMemo(() => parseFilters(searchParams), [searchParams]);
  const current = useMemo(() => currentSprint(sprints, today), [sprints, today]);
  const shownSprint =
    filters.sprint === CURRENT_SPRINT ? current : (sprints.find((s) => s.id === filters.sprint) ?? null);

  function handleFiltersChange(next: TaskFilters) {
    const qs = serializeFilters(next, new URLSearchParams(searchParams.toString())).toString();
    window.history.replaceState(null, "", qs ? `${pathname}?${qs}` : pathname);
  }

  // Plegar o desplegar a mano queda guardado en una cookie de este navegador.
  function toggleColumn(column: BoardColumnRow) {
    const next = { ...columnPrefs, [column.id]: !isColumnCollapsed(column, columnPrefs) };
    setColumnPrefs(next);
    saveColumnPrefs(next);
  }

  // Todas las tareas de cada columna en orden manual: es lo que se guarda al arrastrar,
  // aunque haya filtros u otro orden en pantalla.
  const tasksByColumn = useMemo(() => {
    const map = new Map<string, TaskWithRelations[]>();
    for (const column of columns) map.set(column.id, []);
    for (const task of optimisticTasks) {
      map.get(task.column_id)?.push(task);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.position - b.position);
    }
    return map;
  }, [columns, optimisticTasks]);

  // Lo que se pinta: la lista completa de cada columna, filtrada y ordenada.
  const visibleByColumn = useMemo(() => {
    const map = new Map<string, TaskWithRelations[]>();
    for (const [columnId, list] of tasksByColumn) {
      map.set(columnId, sortTasks(filterTasks(list, filters, today, current?.id ?? null), filters.sort));
    }
    return map;
  }, [tasksByColumn, filters, today, current]);

  const activeFilterCount = countActiveFilters(filters);
  const totalCount = optimisticTasks.length;
  const visibleCount = useMemo(
    () => Array.from(visibleByColumn.values()).reduce((sum, list) => sum + list.length, 0),
    [visibleByColumn]
  );

  const openTask = optimisticTasks.find((t) => t.id === openTaskId) ?? null;
  const activeTask = activeId ? (optimisticTasks.find((t) => t.id === activeId) ?? null) : null;

  const labelUsageCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const task of optimisticTasks) {
      for (const label of task.labels) {
        map.set(label.id, (map.get(label.id) ?? 0) + 1);
      }
    }
    return map;
  }, [optimisticTasks]);

  function handleDragStart(event: DragStartEvent) {
    rememberActivator(event);
    setActiveId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const taskId = String(active.id);
    const current = optimisticTasks.find((t) => t.id === taskId);
    if (!current) return;

    const overIsTask = over.data.current?.type === "task";
    const columnId = overIsTask ? (over.data.current?.columnId as string) : String(over.id);

    const sourceColumnTasks = tasksByColumn.get(current.column_id) ?? [];
    const targetColumnTasks = tasksByColumn.get(columnId) ?? [];

    let orderedIds: string[];
    if (current.column_id === columnId) {
      const oldIndex = sourceColumnTasks.findIndex((t) => t.id === taskId);
      const newIndex = overIsTask
        ? sourceColumnTasks.findIndex((t) => t.id === String(over.id))
        : sourceColumnTasks.length - 1;
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;
      if (filters.sort !== "manual") {
        const sortLabel = SORT_OPTIONS.find((o) => o.value === filters.sort)?.label;
        toast.info("No se puede reordenar con un orden activo", {
          description: `Ahora se ordena por «${sortLabel}». Cambia a «Orden manual» para colocar las tarjetas a mano.`,
        });
        return;
      }
      orderedIds = arrayMove(sourceColumnTasks, oldIndex, newIndex).map((t) => t.id);
    } else {
      const withoutMoved = targetColumnTasks.filter((t) => t.id !== taskId);
      const insertIndex = overIsTask
        ? withoutMoved.findIndex((t) => t.id === String(over.id))
        : withoutMoved.length;
      const index = insertIndex === -1 ? withoutMoved.length : insertIndex;
      orderedIds = [
        ...withoutMoved.slice(0, index).map((t) => t.id),
        taskId,
        ...withoutMoved.slice(index).map((t) => t.id),
      ];
    }

    persistMove({ taskId, columnId, orderedIds });
  }

  function persistMove(move: MoveAction) {
    startTransition(async () => {
      moveTask(move);
      try {
        await reorder(move.taskId, move.columnId, move.orderedIds);
      } catch (err) {
        toast.error("No se pudo mover la tarea", {
          description: err instanceof Error ? err.message : undefined,
        });
      }
    });
  }

  // «Mover a…» del móvil: al final de la columna elegida.
  function handleMoveTo(task: TaskWithRelations, columnId: string) {
    if (task.column_id === columnId) return;
    const target = (tasksByColumn.get(columnId) ?? []).filter((t) => t.id !== task.id);
    persistMove({ taskId: task.id, columnId, orderedIds: [...target.map((t) => t.id), task.id] });
  }

  const moveTargets = useMemo(() => columns.map((c) => ({ id: c.id, label: c.name })), [columns]);

  return (
    <div className="flex h-[calc(100dvh_-_3.5rem)] min-w-0 flex-col gap-4 overflow-hidden p-4">
      <HeaderPortal>
        <ManageLabelsDialog labels={labels} usageCounts={labelUsageCounts} />
        <NewTaskDialog columns={columns} labels={labels} profiles={profiles} />
      </HeaderPortal>
      <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2">
        <h1 className="text-lg font-semibold">Tareas</h1>
        <TaskFiltersBar
          filters={filters}
          onChange={handleFiltersChange}
          profiles={profiles}
          labels={labels}
          sprints={sprints}
          currentSprint={current}
          currentUserId={currentUserId}
          visibleCount={visibleCount}
          totalCount={totalCount}
        />
      </div>
      {shownSprint && <SprintSummary sprint={shownSprint} sprints={sprints} tasks={optimisticTasks} />}
      <DndContext
        id="task-board"
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        {/* En móvil cada columna ocupa casi toda la pantalla y el scroll horizontal encaja en ellas. */}
        <div
          data-testid="task-board-columns"
          className={`flex min-h-0 min-w-0 flex-1 snap-x snap-mandatory gap-3 overflow-x-auto pb-2 md:snap-none ${isPending ? "opacity-80" : ""}`}
        >
          {columns.map((column) => (
            <TaskColumn
              key={column.id}
              column={column}
              tasks={visibleByColumn.get(column.id) ?? []}
              totalCount={tasksByColumn.get(column.id)?.length ?? 0}
              filtered={activeFilterCount > 0}
              collapsed={isColumnCollapsed(column, columnPrefs)}
              onToggleCollapsed={() => toggleColumn(column)}
              onOpenTask={(task) => setOpenTaskId(task.id)}
              moveTargets={moveTargets}
              onMoveTask={handleMoveTo}
            />
          ))}
          <NewColumnButton />
        </div>
        <DragOverlay>{activeTask ? <TaskCardOverlay task={activeTask} /> : null}</DragOverlay>
      </DndContext>
      <TaskDetailSheet
        task={openTask}
        labels={labels}
        profiles={profiles}
        accounts={accounts}
        sprints={sprints}
        onClose={() => setOpenTaskId(null)}
      />
    </div>
  );
}

