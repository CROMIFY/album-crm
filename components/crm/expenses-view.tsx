"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { RotateCw, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { HeaderPortal } from "@/components/header-portal";
import { ExpenseFormDialog } from "@/components/crm/expense-form-dialog";
import { ManageExpenseCategoriesDialog } from "@/components/crm/manage-expense-categories-dialog";
import { setExpenseStatus, deleteExpense, renewExpense } from "@/lib/actions/expenses";
import { EXPENSE_BILLING_CYCLE_LABELS, monthlyRecurringTotal } from "@/lib/types";
import type { ExpenseCategoryRow, ExpenseStatus, ExpenseWithRelations } from "@/lib/types";

const EUR = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });

export function ExpensesView({
  expenses,
  categories,
}: {
  expenses: ExpenseWithRelations[];
  categories: ExpenseCategoryRow[];
}) {
  const [categoryFilter, setCategoryFilter] = useState("none");
  const [statusFilter, setStatusFilter] = useState<ExpenseStatus | "todos">("activo");

  const monthlyTotal = useMemo(() => monthlyRecurringTotal(expenses), [expenses]);

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of expenses) {
      if (e.status !== "activo" || e.billing_cycle === "unico") continue;
      const key = e.category_id ?? "none";
      const monthly = e.billing_cycle === "anual" ? e.amount / 12 : e.amount;
      map.set(key, (map.get(key) ?? 0) + monthly);
    }
    return map;
  }, [expenses]);

  const filtered = expenses.filter((e) => {
    if (categoryFilter !== "none" && e.category_id !== categoryFilter) return false;
    if (statusFilter !== "todos" && e.status !== statusFilter) return false;
    return true;
  });

  const recurring = filtered
    .filter((e) => e.billing_cycle !== "unico")
    .sort((a, b) => (a.next_billing_date ?? "").localeCompare(b.next_billing_date ?? ""));
  const oneTime = filtered
    .filter((e) => e.billing_cycle === "unico")
    .sort((a, b) => b.starts_at.localeCompare(a.starts_at));

  const usageCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of expenses) {
      if (e.category_id) map.set(e.category_id, (map.get(e.category_id) ?? 0) + 1);
    }
    return map;
  }, [expenses]);

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-4 p-4">
      <HeaderPortal>
        <ManageExpenseCategoriesDialog categories={categories} usageCounts={usageCounts} />
        <ExpenseFormDialog categories={categories} />
      </HeaderPortal>
      <h1 className="text-lg font-semibold">Gastos</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Gasto mensual recurrente</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold tabular-nums">
            {EUR.format(monthlyTotal)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Por categoría</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {byCategory.size === 0 ? (
              <p className="text-muted-foreground text-sm">Sin suscripciones activas.</p>
            ) : (
              [...byCategory.entries()]
                .sort(([, a], [, b]) => b - a)
                .map(([categoryId, total]) => {
                  const category = categories.find((c) => c.id === categoryId);
                  return (
                    <div key={categoryId} className="flex items-center justify-between text-sm">
                      <Badge
                        variant="secondary"
                        style={category ? { backgroundColor: `${category.color}26` } : undefined}
                      >
                        {category?.name ?? "Sin categoría"}
                      </Badge>
                      <span className="tabular-nums">{EUR.format(total)}</span>
                    </div>
                  );
                })
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-3">
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Todas las categorías" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Todas las categorías</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="activo">Activos</SelectItem>
            <SelectItem value="cancelado">Cancelados</SelectItem>
            <SelectItem value="todos">Todos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-muted-foreground text-xs font-medium">Recurrentes</h2>
        {recurring.length === 0 ? (
          <p className="text-muted-foreground text-sm">Sin suscripciones.</p>
        ) : (
          recurring.map((expense) => (
            <ExpenseRow key={expense.id} expense={expense} categories={categories} />
          ))
        )}
      </div>

      <div className="flex flex-col gap-2 border-t pt-3">
        <h2 className="text-muted-foreground text-xs font-medium">Puntuales</h2>
        {oneTime.length === 0 ? (
          <p className="text-muted-foreground text-sm">Sin gastos puntuales.</p>
        ) : (
          oneTime.map((expense) => (
            <ExpenseRow key={expense.id} expense={expense} categories={categories} />
          ))
        )}
      </div>
    </div>
  );
}

function ExpenseRow({
  expense,
  categories,
}: {
  expense: ExpenseWithRelations;
  categories: ExpenseCategoryRow[];
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function handleToggleStatus() {
    try {
      await setExpenseStatus(expense.id, expense.status === "activo" ? "cancelado" : "activo");
    } catch (err) {
      toast.error("No se pudo actualizar el gasto", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  }

  async function handleRenew() {
    try {
      await renewExpense(expense.id);
    } catch (err) {
      toast.error("No se pudo renovar", { description: err instanceof Error ? err.message : undefined });
    }
  }

  async function handleDelete() {
    try {
      await deleteExpense(expense.id);
      toast.success("Gasto eliminado");
    } catch (err) {
      toast.error("No se pudo eliminar", { description: err instanceof Error ? err.message : undefined });
    }
  }

  return (
    <Card className={expense.status === "cancelado" ? "opacity-60" : undefined}>
      <CardContent className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">{expense.name}</span>
            {expense.category && (
              <Badge variant="secondary" style={{ backgroundColor: `${expense.category.color}26` }}>
                {expense.category.name}
              </Badge>
            )}
            {expense.status === "cancelado" && <Badge variant="outline">Cancelado</Badge>}
          </div>
          <p className="text-muted-foreground text-xs">
            {expense.vendor && `${expense.vendor} · `}
            {EXPENSE_BILLING_CYCLE_LABELS[expense.billing_cycle]}
            {expense.next_billing_date &&
              ` · próxima: ${new Date(expense.next_billing_date).toLocaleDateString("es-ES")}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-semibold tabular-nums">{EUR.format(expense.amount)}</span>
          {expense.billing_cycle !== "unico" && expense.status === "activo" && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleRenew} title="Renovar">
              <RotateCw className="h-3.5 w-3.5" />
            </Button>
          )}
          <ExpenseFormDialog categories={categories} expense={expense} />
          <Button variant="outline" size="sm" onClick={handleToggleStatus}>
            {expense.status === "activo" ? "Cancelar" : "Reactivar"}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar &quot;{expense.name}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
