"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { addActionItem, toggleActionItem, deleteActionItem } from "@/lib/actions/meetings";
import type { MeetingActionItemRow, ProfileRow } from "@/lib/types";

export function MeetingActionItems({
  meetingId,
  items,
  profiles,
}: {
  meetingId: string;
  items: MeetingActionItemRow[];
  profiles: ProfileRow[];
}) {
  const [title, setTitle] = useState("");
  const [assigneeId, setAssigneeId] = useState<string>("none");
  const [dueDate, setDueDate] = useState("");
  const [loading, setLoading] = useState(false);

  const profileById = new Map(profiles.map((p) => [p.id, p]));

  async function handleAdd() {
    if (!title.trim()) return;
    setLoading(true);
    try {
      await addActionItem(meetingId, {
        title,
        assigneeId: assigneeId === "none" ? undefined : assigneeId,
        dueDate: dueDate || undefined,
      });
      setTitle("");
      setAssigneeId("none");
      setDueDate("");
    } catch (err) {
      toast.error("No se pudo añadir el paso", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleToggle(id: string, done: boolean) {
    try {
      await toggleActionItem(id, done);
    } catch (err) {
      toast.error("No se pudo actualizar", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteActionItem(id);
    } catch (err) {
      toast.error("No se pudo eliminar", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {items.length === 0 && <p className="text-muted-foreground text-sm">Sin acciones todavía.</p>}
      <ul className="flex flex-col gap-1.5">
        {items.map((item) => {
          const assignee = item.assignee_id ? profileById.get(item.assignee_id) : null;
          return (
            <li key={item.id} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={item.done}
                onCheckedChange={(checked) => handleToggle(item.id, checked === true)}
              />
              <span className={item.done ? "text-muted-foreground line-through" : ""}>
                {item.title}
              </span>
              {assignee && (
                <span className="text-muted-foreground text-xs">{assignee.nombre}</span>
              )}
              {item.due_date && (
                <span className="text-muted-foreground text-xs tabular-nums">
                  {new Date(item.due_date).toLocaleDateString("es-ES")}
                </span>
              )}
              {item.linked_task_id && (
                <span className="text-muted-foreground text-xs">· en tareas</span>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="ml-auto h-6 w-6"
                onClick={() => handleDelete(item.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap items-end gap-2 border-t pt-3">
        <div className="flex flex-1 min-w-40 flex-col gap-1">
          <Label className="text-xs">Nueva acción</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="Enviar propuesta actualizada"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs">Asignado</Label>
          <Select value={assigneeId} onValueChange={setAssigneeId}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sin asignar</SelectItem>
              {profiles.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs">Fecha límite</Label>
          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>
        <Button onClick={handleAdd} disabled={loading} size="sm">
          Añadir
        </Button>
      </div>
    </div>
  );
}
