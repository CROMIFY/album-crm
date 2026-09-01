"use client";

import { useEffect, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
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
import { convertToEur, EXPENSE_CURRENCIES, EXPENSE_CURRENCY_LABELS } from "@/lib/fx";
import { addBillingCycle, EXPENSE_BILLING_CYCLE_LABELS } from "@/lib/types";
import type { ExpenseBillingCycle, ExpenseCategoryRow, ExpenseWithRelations } from "@/lib/types";

const EUR = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });

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
  const [preview, setPreview] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    control,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<ExpenseInput>({
    resolver: zodResolver(expenseSchema),
    defaultValues: expense
      ? {
          name: expense.name,
          vendor: expense.vendor ?? undefined,
          amount: String(expense.original_amount ?? expense.amount),
          currency: (expense.currency as ExpenseInput["currency"]) ?? "EUR",
          billing_cycle: expense.billing_cycle,
          starts_at: expense.starts_at,
          next_billing_date: expense.next_billing_date ?? undefined,
          notes: expense.notes ?? undefined,
        }
      : { billing_cycle: "mensual", currency: "EUR" },
  });

  const billingCycle = useWatch({ control, name: "billing_cycle" });
  const amount = useWatch({ control, name: "amount" });
  const currency = useWatch({ control, name: "currency" });

  // Vista previa del cambio de divisa a EUR: solo cuando la divisa no es EUR,
  // con debounce para no lanzar una petición en cada pulsación.
  useEffect(() => {
    const handle = setTimeout(() => {
      if (!currency || currency === "EUR" || !amount || Number(amount) <= 0) {
        setPreview(null);
        return;
      }
      convertToEur(Number(amount), currency)
        .then((eur) => setPreview(EUR.format(eur)))
        .catch(() => setPreview(null));
    }, 400);
    return () => clearTimeout(handle);
  }, [amount, currency]);

  function recalcNextBillingDate(startsAt: string, cycle: ExpenseBillingCycle) {
    if (cycle === "unico" || !startsAt) return;
    setValue("next_billing_date", addBillingCycle(startsAt, cycle), { shouldValidate: true });
  }

  async function onSubmit(values: ExpenseInput) {
    setLoading(true);
    try {
      const payload = {
        name: values.name,
        categoryId: categoryId === "none" ? undefined : categoryId,
        vendor: values.vendor,
        amount: Number(values.amount),
        currency: values.currency,
        billingCycle: values.billing_cycle,
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
        setPreview(null);
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
              <Label>Importe</Label>
              <div className="flex gap-2">
                <Input type="number" step="0.01" className="flex-1" {...register("amount")} />
                <Controller
                  control={control}
                  name="currency"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {EXPENSE_CURRENCIES.map((c) => (
                          <SelectItem key={c} value={c}>
                            {EXPENSE_CURRENCY_LABELS[c]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              {errors.amount && <p className="text-destructive text-sm">{errors.amount.message}</p>}
              {preview && <p className="text-muted-foreground text-xs">≈ {preview}</p>}
            </div>
            <div className="flex flex-col gap-2">
              <Label>Periodicidad</Label>
              <Controller
                control={control}
                name="billing_cycle"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(v) => {
                      field.onChange(v);
                      recalcNextBillingDate(getValues("starts_at"), v as ExpenseBillingCycle);
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(EXPENSE_BILLING_CYCLE_LABELS) as ExpenseBillingCycle[]).map(
                        (c) => (
                          <SelectItem key={c} value={c}>
                            {EXPENSE_BILLING_CYCLE_LABELS[c]}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label>Fecha {billingCycle === "unico" ? "del gasto" : "de inicio"}</Label>
              <Input
                type="date"
                {...register("starts_at", {
                  onChange: (e) => recalcNextBillingDate(e.target.value, billingCycle),
                })}
              />
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
