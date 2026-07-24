"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { SubtaskProgressRing } from "@/components/tasks/subtask-progress-ring";
import { setTaskDone } from "@/lib/actions/tasks";
import { cn } from "@/lib/utils";
import type { TaskWithRelations } from "@/lib/types";

const PRIORITY_STYLES: Record<string, string> = {
  baja: "bg-muted text-muted-foreground",
  media: "bg-[color-mix(in_oklch,var(--chart-2)_25%,transparent)] text-foreground",
  alta: "bg-[color-mix(in_oklch,var(--chart-4)_30%,transparent)] text-foreground",
};

export function TaskCard({
  task,
  onOpen,
}: {
  task: TaskWithRelations;
  onOpen: (task: TaskWithRelations) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
  });

  const style = transform
    ? { transform: CSS.Translate.toString(transform), zIndex: isDragging ? 10 : undefined }
    : undefined;

  const doneSubtasks = task.subtasks?.filter((s) => s.done).length ?? 0;
  const totalSubtasks = task.subtasks?.length ?? 0;
  const initials = task.assignee?.nombre
    ?.split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  async function handleDoneChange(checked: boolean) {
    try {
      await setTaskDone(task.id, checked);
    } catch (err) {
      toast.error("No se pudo completar la tarea", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  }

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={() => onOpen(task)}
      className="cursor-grab touch-none gap-2 py-3 active:cursor-grabbing"
    >
      <CardContent className="flex flex-col gap-2 px-3">
        {task.labels.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {task.labels.map((label) => (
              <span
                key={label.id}
                className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-white"
                style={{ backgroundColor: label.color }}
              >
                {label.name}
              </span>
            ))}
          </div>
        )}
        <div className="flex items-start gap-2">
          <div onClick={(e) => e.stopPropagation()} className="pt-0.5">
            <Checkbox checked={task.done} onCheckedChange={(c) => handleDoneChange(c === true)} />
          </div>
          <span className={cn("text-sm font-medium", task.done && "text-muted-foreground line-through")}>
            {task.title}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "rounded px-1.5 py-0.5 text-[10px] font-medium capitalize",
                PRIORITY_STYLES[task.priority]
              )}
            >
              {task.priority}
            </span>
            <SubtaskProgressRing done={doneSubtasks} total={totalSubtasks} />
            {task.due_date && (
              <span className="text-muted-foreground text-xs">
                {new Date(task.due_date).toLocaleDateString("es-ES", {
                  day: "2-digit",
                  month: "short",
                })}
              </span>
            )}
          </div>
          {task.assignee && (
            <Avatar className="h-5 w-5">
              <AvatarFallback className="text-[9px]">{initials}</AvatarFallback>
            </Avatar>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
