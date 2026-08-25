"use client";

import { useState } from "react";
import { Tag, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  updateExpenseCategory,
  deleteExpenseCategory,
  createExpenseCategory,
} from "@/lib/actions/expenses";
import type { ExpenseCategoryRow } from "@/lib/types";

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

export function ManageExpenseCategoriesDialog({
  categories,
  usageCounts,
}: {
  categories: ExpenseCategoryRow[];
  usageCounts: Map<string, number>;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Tag />
          Categorías
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Gestionar categorías</DialogTitle>
          <DialogDescription>
            Edita el nombre o el color, o elimina las que ya no uses.
          </DialogDescription>
        </DialogHeader>
        <div className="flex max-h-96 flex-col gap-2 overflow-y-auto">
          {categories.length === 0 && (
            <p className="text-muted-foreground text-sm">No hay categorías todavía.</p>
          )}
          {categories.map((category) => (
            <CategoryListItem
              key={category.id}
              category={category}
              usageCount={usageCounts.get(category.id) ?? 0}
            />
          ))}
        </div>
        <NewCategoryForm />
      </DialogContent>
    </Dialog>
  );
}

function CategoryListItem({
  category,
  usageCount,
}: {
  category: ExpenseCategoryRow;
  usageCount: number;
}) {
  const [name, setName] = useState(category.name);
  const [color, setColor] = useState(category.color);
  const [savingName, setSavingName] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function saveName() {
    const trimmed = name.trim();
    if (!trimmed || trimmed === category.name) {
      setName(category.name);
      return;
    }
    setSavingName(true);
    try {
      await updateExpenseCategory(category.id, { name: trimmed });
    } catch (err) {
      toast.error("No se pudo renombrar la categoría", {
        description: err instanceof Error ? err.message : undefined,
      });
      setName(category.name);
    } finally {
      setSavingName(false);
    }
  }

  async function changeColor(newColor: string) {
    const previous = color;
    setColor(newColor);
    setPickerOpen(false);
    try {
      await updateExpenseCategory(category.id, { color: newColor });
    } catch (err) {
      toast.error("No se pudo cambiar el color", {
        description: err instanceof Error ? err.message : undefined,
      });
      setColor(previous);
    }
  }

  async function handleDelete() {
    try {
      await deleteExpenseCategory(category.id);
      toast.success("Categoría eliminada");
    } catch (err) {
      toast.error("No se pudo eliminar la categoría", {
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
        {usageCount === 0 ? "sin usar" : `${usageCount} ${usageCount === 1 ? "gasto" : "gastos"}`}
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
            <AlertDialogTitle>¿Eliminar &quot;{category.name}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              {usageCount > 0
                ? `${usageCount} ${usageCount === 1 ? "gasto quedará" : "gastos quedarán"} sin categoría. Esta acción no se puede deshacer.`
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

function NewCategoryForm() {
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLOR_SWATCHES[0]);
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    if (!name.trim()) return;
    setLoading(true);
    try {
      await createExpenseCategory(name.trim(), color);
      setName("");
      setColor(COLOR_SWATCHES[0]);
    } catch (err) {
      toast.error("No se pudo crear la categoría", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-end gap-2 border-t pt-3">
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label="Elegir color"
            className="ring-foreground/10 size-8 shrink-0 rounded-full ring-1"
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
                onClick={() => setColor(c)}
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
      <div className="flex flex-1 flex-col gap-1">
        <Label className="text-xs">Nueva categoría</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          placeholder="Ej. Legal"
        />
      </div>
      <Button size="sm" onClick={handleCreate} disabled={loading || !name.trim()}>
        <Plus />
        Añadir
      </Button>
    </div>
  );
}
