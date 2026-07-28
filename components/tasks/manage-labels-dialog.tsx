"use client";

import { useState } from "react";
import { Tag, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { updateLabel, deleteLabel } from "@/lib/actions/tasks";
import type { LabelRow } from "@/lib/types";

const COLOR_SWATCHES = [
  "#EF4444",
  "#F97316",
  "#F59E0B",
  "#84CC16",
  "#22C55E",
  "#14B8A6",
  "#3B82F6",
  "#6366F1",
  "#A855F7",
  "#EC4899",
  "#64748B",
];

export function ManageLabelsDialog({
  labels,
  usageCounts,
}: {
  labels: LabelRow[];
  usageCounts: Map<string, number>;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Tag />
          Etiquetas
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Gestionar etiquetas</DialogTitle>
          <DialogDescription>
            Edita el nombre o el color, o elimina las que ya no uses.
          </DialogDescription>
        </DialogHeader>
        <div className="flex max-h-96 flex-col gap-2 overflow-y-auto">
          {labels.length === 0 && (
            <p className="text-muted-foreground text-sm">No hay etiquetas todavía.</p>
          )}
          {labels.map((label) => (
            <LabelListItem key={label.id} label={label} usageCount={usageCounts.get(label.id) ?? 0} />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function LabelListItem({ label, usageCount }: { label: LabelRow; usageCount: number }) {
  const [name, setName] = useState(label.name);
  const [color, setColor] = useState(label.color);
  const [savingName, setSavingName] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function saveName() {
    const trimmed = name.trim();
    if (!trimmed || trimmed === label.name) {
      setName(label.name);
      return;
    }
    setSavingName(true);
    try {
      await updateLabel(label.id, { name: trimmed });
    } catch (err) {
      toast.error("No se pudo renombrar la etiqueta", {
        description: err instanceof Error ? err.message : undefined,
      });
      setName(label.name);
    } finally {
      setSavingName(false);
    }
  }

  async function changeColor(newColor: string) {
    const previous = color;
    setColor(newColor);
    setPickerOpen(false);
    try {
      await updateLabel(label.id, { color: newColor });
    } catch (err) {
      toast.error("No se pudo cambiar el color", {
        description: err instanceof Error ? err.message : undefined,
      });
      setColor(previous);
    }
  }

  async function handleDelete() {
    try {
      await deleteLabel(label.id);
      toast.success("Etiqueta eliminada");
    } catch (err) {
      toast.error("No se pudo eliminar la etiqueta", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border p-2">
      <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label="Cambiar color"
            className="ring-foreground/10 size-6 shrink-0 rounded-full ring-1"
            style={{ backgroundColor: color }}
          />
        </PopoverTrigger>
        <PopoverContent align="start" className="w-56">
          <div className="flex flex-wrap gap-1.5">
            {COLOR_SWATCHES.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={c}
                onClick={() => changeColor(c)}
                className="size-6 rounded-full transition-transform"
                style={{
                  backgroundColor: c,
                  outline: color === c ? "2px solid var(--foreground)" : "none",
                  outlineOffset: 2,
                }}
              />
            ))}
          </div>
        </PopoverContent>
      </Popover>

      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={saveName}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        disabled={savingName}
        className="h-8"
      />

      <span className="text-muted-foreground shrink-0 text-xs whitespace-nowrap">
        {usageCount === 0 ? "sin usar" : `${usageCount} ${usageCount === 1 ? "tarea" : "tareas"}`}
      </span>

      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0"
        onClick={() => setConfirmDelete(true)}
      >
        <Trash2 className="size-3.5" />
      </Button>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar &quot;{label.name}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              {usageCount > 0
                ? `Se quitará de ${usageCount} ${usageCount === 1 ? "tarea" : "tareas"}. Esta acción no se puede deshacer.`
                : "Esta acción no se puede deshacer."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
