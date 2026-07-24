"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  updateTask,
  deleteTask,
  setTaskLabel,
  setTaskDone,
  addSubtask,
  toggleSubtask,
  deleteSubtask,
} from "@/lib/actions/tasks";
import type { AccountRow, LabelRow, ProfileRow, TaskPriority, TaskWithRelations } from "@/lib/types";

export function TaskDetailSheet({
  task,
  labels,
  profiles,
  accounts,
  onClose,
}: {
  task: TaskWithRelations | null;
  labels: LabelRow[];
  profiles: ProfileRow[];
  accounts: AccountRow[];
  onClose: () => void;
}) {
  const [dirty, setDirty] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  function handleOpenChange(open: boolean) {
    if (open) return;
    if (dirty) {
      setConfirmDiscard(true);
      return;
    }
    onClose();
  }

  return (
    <>
      <Sheet open={!!task} onOpenChange={handleOpenChange}>
        <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-md">
          {task && (
            <TaskDetailForm
              key={task.id}
              task={task}
              labels={labels}
              profiles={profiles}
              accounts={accounts}
              onClose={onClose}
              onDirtyChange={setDirty}
            />
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={confirmDiscard} onOpenChange={setConfirmDiscard}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cambios sin guardar</AlertDialogTitle>
            <AlertDialogDescription>
              Tienes cambios sin guardar en esta tarea. Si sales ahora se perderán.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Seguir editando</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmDiscard(false);
                onClose();
              }}
            >
              Descartar cambios
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

type Draft = {
  title: string;
  description: string;
  priority: TaskPriority;
  dueDate: string;
  assigneeId: string;
  linkedAccountId: string;
};

function draftFromTask(task: TaskWithRelations): Draft {
  return {
    title: task.title,
    description: task.description ?? "",
    priority: task.priority,
    dueDate: task.due_date ?? "",
    assigneeId: task.assignee_id ?? "none",
    linkedAccountId: task.linked_account_id ?? "none",
  };
}

function TaskDetailForm({
  task,
  labels,
  profiles,
  accounts,
  onClose,
  onDirtyChange,
}: {
  task: TaskWithRelations;
  labels: LabelRow[];
  profiles: ProfileRow[];
  accounts: AccountRow[];
  onClose: () => void;
  onDirtyChange: (dirty: boolean) => void;
}) {
  // Estado inicializado solo al montar: la key={task.id} del padre remonta
  // este componente cuando cambia de tarea, así que no hace falta sincronizar
  // con un efecto.
  const [draft, setDraft] = useState<Draft>(() => draftFromTask(task));
  const [saved, setSaved] = useState<Draft>(() => draftFromTask(task));
  const [saving, setSaving] = useState(false);
  const [newSubtask, setNewSubtask] = useState("");

  const isDirty = JSON.stringify(draft) !== JSON.stringify(saved);

  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await updateTask(task.id, {
        title: draft.title,
        description: draft.description || null,
        priority: draft.priority,
        dueDate: draft.dueDate || null,
        assigneeId: draft.assigneeId === "none" ? null : draft.assigneeId,
        linkedAccountId: draft.linkedAccountId === "none" ? null : draft.linkedAccountId,
      });
      setSaved(draft);
      toast.success("Cambios guardados");
    } catch (err) {
      toast.error("No se pudo guardar", { description: err instanceof Error ? err.message : undefined });
    } finally {
      setSaving(false);
    }
  }

  async function handleDoneChange(checked: boolean) {
    try {
      await setTaskDone(task.id, checked);
    } catch (err) {
      toast.error("No se pudo completar la tarea", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  }

  async function handleDelete() {
    try {
      await deleteTask(task.id);
      onClose();
    } catch (err) {
      toast.error("No se pudo eliminar", { description: err instanceof Error ? err.message : undefined });
    }
  }

  async function handleAddSubtask() {
    if (!newSubtask.trim()) return;
    try {
      await addSubtask(task.id, newSubtask);
      setNewSubtask("");
    } catch (err) {
      toast.error("No se pudo añadir", { description: err instanceof Error ? err.message : undefined });
    }
  }

  const activeLabelIds = new Set(task.labels.map((l) => l.id));
  const pendingSubtasks = task.subtasks.filter((s) => !s.done).length;

  return (
    <>
      <SheetHeader>
        <SheetTitle className="flex items-center gap-2">
          <Checkbox
            checked={task.done}
            onCheckedChange={(c) => handleDoneChange(c === true)}
            title={
              pendingSubtasks > 0
                ? `Completa las ${pendingSubtasks} subtareas pendientes primero`
                : undefined
            }
          />
          <Input
            value={draft.title}
            onChange={(e) => set("title", e.target.value)}
            className="border-none px-0 text-base font-semibold shadow-none focus-visible:ring-0"
          />
        </SheetTitle>
      </SheetHeader>

      <div className="flex flex-col gap-5 px-4 pb-4">
        <div className="flex flex-col gap-2">
          <Label className="text-xs">Descripción</Label>
          <Textarea
            value={draft.description}
            onChange={(e) => set("description", e.target.value)}
            rows={3}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-2">
            <Label className="text-xs">Prioridad</Label>
            <Select value={draft.priority} onValueChange={(v) => set("priority", v as TaskPriority)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="baja">Baja</SelectItem>
                <SelectItem value="media">Media</SelectItem>
                <SelectItem value="alta">Alta</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label className="text-xs">Fecha límite</Label>
            <Input type="date" value={draft.dueDate} onChange={(e) => set("dueDate", e.target.value)} />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label className="text-xs">Asignado</Label>
          <Select value={draft.assigneeId} onValueChange={(v) => set("assigneeId", v)}>
            <SelectTrigger className="w-full">
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

        <div className="flex flex-col gap-2">
          <Label className="text-xs">Vincular a cuenta (opcional)</Label>
          <Select value={draft.linkedAccountId} onValueChange={(v) => set("linkedAccountId", v)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Ninguna</SelectItem>
              {accounts.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button onClick={handleSave} disabled={!isDirty || saving} className="self-start">
          {saving ? "Guardando…" : "Guardar cambios"}
        </Button>

        <div className="flex flex-col gap-2 border-t pt-4">
          <Label className="text-xs">Etiquetas</Label>
          <div className="flex flex-wrap gap-2">
            {labels.map((label) => {
              const active = activeLabelIds.has(label.id);
              return (
                <button
                  key={label.id}
                  onClick={() => setTaskLabel(task.id, label.id, !active)}
                  className="rounded px-2 py-1 text-xs font-semibold text-white transition-opacity"
                  style={{ backgroundColor: label.color, opacity: active ? 1 : 0.35 }}
                >
                  {label.name}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label className="text-xs">Checklist</Label>
          <ul className="flex flex-col gap-1.5">
            {task.subtasks.map((s) => (
              <li key={s.id} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={s.done}
                  onCheckedChange={(checked) => toggleSubtask(s.id, checked === true)}
                />
                <span className={s.done ? "text-muted-foreground line-through" : ""}>
                  {s.title}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="ml-auto h-6 w-6"
                  onClick={() => deleteSubtask(s.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <Input
              value={newSubtask}
              onChange={(e) => setNewSubtask(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddSubtask()}
              placeholder="Nueva subtarea"
            />
            <Button size="sm" onClick={handleAddSubtask}>
              Añadir
            </Button>
          </div>
        </div>
      </div>

      <SheetFooter>
        <Button variant="destructive" onClick={handleDelete}>
          <Trash2 />
          Eliminar tarea
        </Button>
      </SheetFooter>
    </>
  );
}
