"use client";

import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { TaskCard } from "@/components/tasks/task-card";
import { QuickAddTask } from "@/components/tasks/quick-add-task";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { renameColumn, deleteColumn, setColumnIsDone } from "@/lib/actions/tasks";
import type { BoardColumnRow, TaskWithRelations } from "@/lib/types";

export function TaskColumn({
  column,
  tasks,
  onOpenTask,
}: {
  column: BoardColumnRow;
  tasks: TaskWithRelations[];
  onOpenTask: (task: TaskWithRelations) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(column.name);

  async function handleRename() {
    setEditing(false);
    if (!name.trim() || name === column.name) {
      setName(column.name);
      return;
    }
    try {
      await renameColumn(column.id, name);
    } catch (err) {
      toast.error("No se pudo renombrar", { description: err instanceof Error ? err.message : undefined });
      setName(column.name);
    }
  }

  async function handleToggleDone(checked: boolean) {
    try {
      await setColumnIsDone(column.id, checked);
    } catch (err) {
      toast.error("No se pudo actualizar la columna", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  }

  async function handleDelete() {
    try {
      await deleteColumn(column.id);
    } catch (err) {
      toast.error("No se pudo eliminar la columna", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  }

  return (
    <div className="flex w-72 shrink-0 flex-col gap-2">
      <div className="flex items-center justify-between px-1">
        {editing ? (
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => e.key === "Enter" && handleRename()}
            className="h-7 text-sm"
          />
        ) : (
          <button
            className="text-sm font-medium hover:underline"
            onClick={() => setEditing(true)}
          >
            {column.name}
          </button>
        )}
        <div className="flex items-center gap-1">
          <span className="text-muted-foreground text-xs tabular-nums">{tasks.length}</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setEditing(true)}>Renombrar</DropdownMenuItem>
              <DropdownMenuCheckboxItem
                checked={column.is_done_column}
                onCheckedChange={handleToggleDone}
              >
                Marcar como columna &quot;Hecho&quot;
              </DropdownMenuCheckboxItem>
              <DropdownMenuItem variant="destructive" onClick={handleDelete}>
                Eliminar columna
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-24 flex-1 flex-col gap-2 rounded-lg border bg-muted/30 p-2 transition-colors",
          isOver && "bg-accent border-accent-foreground/20"
        )}
      >
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onOpen={onOpenTask} />
          ))}
        </SortableContext>
        <QuickAddTask columnId={column.id} />
      </div>
    </div>
  );
}
