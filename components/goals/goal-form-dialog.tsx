"use client";

import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createGoal, updateGoal } from "@/lib/actions/goals";
import { GOAL_METRICS, GOAL_METRIC_LABELS, type GoalMetric } from "@/lib/goals/goals";
import { goalSchema } from "@/lib/validation/goals";
import type { GoalWithValue } from "@/lib/queries/goals";
import type { ProfileRow } from "@/lib/types";

type Draft = {
  title: string;
  currentValue: string;
  targetValue: string;
  unit: string;
  startsOn: string;
  dueDate: string;
  ownerIds: string[];
  metric: string;
  notes: string;
};

const MANUAL = "manual";

function draftFrom(goal: GoalWithValue | undefined, today: string): Draft {
  return {
    title: goal?.title ?? "",
    currentValue: goal?.current_value == null ? "" : String(goal.current_value),
    targetValue: goal ? String(goal.target_value) : "",
    unit: goal?.unit ?? "",
    startsOn: goal?.starts_on ?? today,
    dueDate: goal?.due_date ?? "",
    ownerIds: goal?.owner_ids ?? [],
    metric: goal?.metric ?? MANUAL,
    notes: goal?.notes ?? "",
  };
}

export function GoalFormDialog({
  goal,
  profiles,
  today,
  onSave,
}: {
  goal?: GoalWithValue;
  profiles: ProfileRow[];
  today: string;
  /** Solo para el banco de pruebas (/e2e); en la app se guarda con las acciones. */
  onSave?: (draft: ReturnType<typeof goalSchema.parse>, id?: string) => Promise<void>;
}) {
  const isEdit = !!goal;
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<Draft>(() => draftFrom(goal, today));
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = goalSchema.safeParse({
      title: draft.title,
      currentValue: draft.currentValue.trim() === "" ? null : Number(draft.currentValue.replace(",", ".")),
      targetValue: Number(draft.targetValue.replace(",", ".")),
      unit: draft.unit.trim() || null,
      startsOn: draft.startsOn,
      dueDate: draft.dueDate,
      ownerIds: draft.ownerIds,
      metric: draft.metric === MANUAL ? null : (draft.metric as GoalMetric),
      notes: draft.notes.trim() || null,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Revisa los campos.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      if (onSave) await onSave(parsed.data, goal?.id);
      else if (isEdit) await updateGoal(goal.id, parsed.data);
      else await createGoal(parsed.data);
      toast.success(isEdit ? "Objetivo actualizado" : "Objetivo creado");
      setOpen(false);
      if (!isEdit) setDraft(draftFrom(undefined, today));
    } catch (err) {
      toast.error("No se pudo guardar el objetivo", { description: err instanceof Error ? err.message : undefined });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setDraft(draftFrom(goal, today));
      }}
    >
      <DialogTrigger asChild>
        {isEdit ? (
          <Button variant="ghost" size="icon" className="h-7 w-7" aria-label={`Editar ${goal.title}`}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button size="sm">
            <Plus />
            Nuevo objetivo
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar objetivo" : "Nuevo objetivo"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="goal-title">Título</Label>
            <Input id="goal-title" value={draft.title} onChange={(e) => set("title", e.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Valor actual</Label>
            <Select value={draft.metric} onValueChange={(v) => set("metric", v)}>
              <SelectTrigger className="w-full" aria-label="Cómo se calcula el valor actual">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={MANUAL}>A mano</SelectItem>
                {GOAL_METRICS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {GOAL_METRIC_LABELS[m]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {draft.metric === MANUAL && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="goal-current">Actual</Label>
                <Input
                  id="goal-current"
                  inputMode="decimal"
                  placeholder="Sin dato"
                  value={draft.currentValue}
                  onChange={(e) => set("currentValue", e.target.value)}
                />
              </div>
            )}
            <div className="flex flex-col gap-2">
              <Label htmlFor="goal-target">Meta</Label>
              <Input
                id="goal-target"
                inputMode="decimal"
                value={draft.targetValue}
                onChange={(e) => set("targetValue", e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="goal-unit">Unidad</Label>
              <Input id="goal-unit" value={draft.unit} onChange={(e) => set("unit", e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="goal-start">Desde</Label>
              <Input id="goal-start" type="date" value={draft.startsOn} onChange={(e) => set("startsOn", e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="goal-due">Fecha límite</Label>
              <Input id="goal-due" type="date" value={draft.dueDate} onChange={(e) => set("dueDate", e.target.value)} />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label>Responsables</Label>
            <div className="flex flex-wrap gap-3">
              {profiles.map((p) => (
                <label key={p.id} className="flex items-center gap-1.5 text-sm">
                  <Checkbox
                    checked={draft.ownerIds.includes(p.id)}
                    onCheckedChange={(c) =>
                      set("ownerIds", c ? [...draft.ownerIds, p.id] : draft.ownerIds.filter((id) => id !== p.id))
                    }
                  />
                  {p.nombre}
                </label>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="goal-notes">Notas</Label>
            <Textarea id="goal-notes" rows={2} value={draft.notes} onChange={(e) => set("notes", e.target.value)} />
          </div>
          {error && (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="submit" disabled={saving}>
              {saving ? "Guardando…" : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
