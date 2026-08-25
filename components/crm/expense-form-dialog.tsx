"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { expenseSchema, type ExpenseInput } from "@/lib/validation/expenses";
import { createExpense, updateExpense } from "@/lib/actions/expenses";
import { EXPENSE_BILLING_CYCLE_LABELS } from "@/lib/types";
import type { ExpenseBillingCycle, ExpenseCategoryRow, ExpenseWithRelations } from "@/lib/types";

export function ExpenseFormDialog({
  categories,
  expense,
}: {
  categories: ExpenseCategoryRow[];
  expense?: ExpenseWithRelations;
}) {
  const isEdit = !!expense;
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [categoryId, setCategoryId] = useState(expense?.category_id ?? "none");
  const [billingCycle, setBillingCycle] = useState<ExpenseBillingCycle>(
    expense?.billing_cycle ?? "mensual"
  );
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ExpenseInput>({
    resolver: zodResolver(expenseSchema),
    defaultValues: expense
      ? {
          name: expense.name,
          vendor: expense.vendor ?? undefined,
          amount: String(expense.amount),
          billing_cycle: expense.billing_cycle,
          starts_at: expense.starts_at,
          next_billing_date: expense.next_billing_date ?? undefined,
          notes: expense.notes ?? undefined,
        }
      : { billing_cycle: "mensual" },
  });

  async function onSubmit(values: ExpenseInput) {
    setLoading(true);
    try {
      const payload = {
        name: values.name,
        categoryId: categoryId === "none" ? undefined : categoryId,
        vendor: values.vendor,
        amount: Number(values.amount),
        billingCycle: billingCycle,
        startsAt: values.starts_at,
        nextBillingDate: values.next_billing_date,
        notes: values.notes,
      };
      if (isEdit) {
        await updateExpense(expense.id, payload);
        toast.success("Gasto actualizado");
      } else {
        await createExpense(payload);
        toast.success("Gasto creado");
        reset();
        setCategoryId("none");
        setBillingCycle("mensual");
      }
      setOpen(false);
    } catch (err) {
      toast.error(isEdit ? "No se pudo actualizar el gasto" : "No se pudo crear el gasto", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button size="sm">
            <Plus />
            Nuevo gasto
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar gasto" : "Nuevo gasto"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Nombre</Label>
            <Input {...register("name")} placeholder="Notion, dominio cromify.com…" />
            {errors.name && <p className="text-destructive text-sm">{errors.name.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label>Categoría</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin categoría</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Proveedor (opcional)</Label>
              <Input {...register("vendor")} placeholder="Vercel Inc." />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label>Importe (€)</Label>
              <Input type="number" step="0.01" {...register("amount")} />
              {errors.amount && <p className="text-destructive text-sm">{errors.amount.message}</p>}
            </div>
            <div className="flex flex-col gap-2">
              <Label>Periodicidad</Label>
              <Select
                value={billingCycle}
                onValueChange={(v) => setBillingCycle(v as ExpenseBillingCycle)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(EXPENSE_BILLING_CYCLE_LABELS) as ExpenseBillingCycle[]).map((c) => (
                    <SelectItem key={c} value={c}>
                      {EXPENSE_BILLING_CYCLE_LABELS[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label>Fecha {billingCycle === "unico" ? "del gasto" : "de inicio"}</Label>
              <Input type="date" {...register("starts_at")} />
              {errors.starts_at && (
                <p className="text-destructive text-sm">{errors.starts_at.message}</p>
              )}
            </div>
            {billingCycle !== "unico" && (
              <div className="flex flex-col gap-2">
                <Label>Próxima renovación</Label>
                <Input type="date" {...register("next_billing_date")} />
                {errors.next_billing_date && (
                  <p className="text-destructive text-sm">{errors.next_billing_date.message}</p>
                )}
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label>Notas (opcional)</Label>
            <Textarea {...register("notes")} rows={2} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? "Guardando…" : isEdit ? "Guardar cambios" : "Crear gasto"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
