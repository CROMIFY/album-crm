"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, RotateCw, Trash2 } from "lucide-react";
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
import {
  annualRecurringCost,
  monthlyProrated,
  spentByCategory,
  totalSpent,
  upcomingCharges,
} from "@/lib/expenses/summary";
import { EXPENSE_BILLING_CYCLE_LABELS } from "@/lib/types";
import type { ExpenseCategoryRow, ExpenseStatus, ExpenseWithRelations } from "@/lib/types";

const EUR = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });

function formatDay(day: string) {
  return new Date(`${day.slice(0, 10)}T00:00:00Z`).toLocaleDateString("es-ES", { timeZone: "UTC" });
}

function whenLabel(daysUntil: number) {
  if (daysUntil < 0) return `vencido hace ${-daysUntil} ${daysUntil === -1 ? "día" : "días"}`;
  if (daysUntil === 0) return "hoy";
  if (daysUntil === 1) return "mañana";
  return `en ${daysUntil} días`;
}

export function ExpensesView({
  expenses,
  categories,
  today,
}: {
  expenses: ExpenseWithRelations[];
  categories: ExpenseCategoryRow[];
  /** YYYY-MM-DD en hora de Madrid; lo calcula el servidor. */
  today: string;
}) {
  const [categoryFilter, setCategoryFilter] = useState("none");
  const [statusFilter, setStatusFilter] = useState<ExpenseStatus | "todos">("activo");

  // El resumen va sobre todos los gastos, sin los filtros de la lista.
  const spent = useMemo(() => totalSpent(expenses, today), [expenses, today]);
  const annual = useMemo(() => annualRecurringCost(expenses), [expenses]);
  const prorated = useMemo(() => monthlyProrated(expenses), [expenses]);
  const byCategory = useMemo(() => spentByCategory(expenses, today), [expenses, today]);
  const upcoming = useMemo(() => upcomingCharges(expenses, today), [expenses, today]);

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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard
          testId="gastado-total"
          title="Gastado en total"
          value={spent}
          hint="Todo lo pagado hasta hoy: puntuales y cada cobro hecho de los recurrentes."
        />
        <SummaryCard
          testId="coste-anual"
          title="Coste anual recurrente"
          value={annual}
          hint="Un año de las suscripciones activas: mensuales × 12 + anuales."
        />
        <SummaryCard
          testId="mensual-prorrateado"
          title="Mensual prorrateado"
          value={prorated}
          hint="El coste anual repartido en 12 meses; no es lo que se cobra cada mes."
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Por categoría</CardTitle>
            <p className="text-muted-foreground text-xs">Total gastado hasta hoy.</p>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {byCategory.length === 0 ? (
              <p className="text-muted-foreground text-sm">Todavía no hay nada pagado.</p>
            ) : (
              byCategory.map(({ categoryId, total }) => {
                const category = categories.find((c) => c.id === categoryId);
                return (
                  <div key={categoryId ?? "none"} className="flex items-center justify-between text-sm">
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
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Próximos cobros</CardTitle>
            <p className="text-muted-foreground text-xs">
              Suscripciones activas por fecha. Se avisa de las de menos de 30 días.
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {upcoming.length === 0 ? (
              <p className="text-muted-foreground text-sm">Sin cobros previstos.</p>
            ) : (
              upcoming.map(({ expense, date, daysUntil, soon }) => (
                <div
                  key={expense.id}
                  data-testid="proximo-cobro"
                  data-soon={soon}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span className="flex min-w-0 items-center gap-1.5">
                    {soon && (
                      <AlertTriangle
                        className="h-3.5 w-3.5 shrink-0 text-[var(--chart-4)]"
                        aria-label="Cobro en menos de 30 días"
                      />
                    )}
                    <span className="truncate">{expense.name}</span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end">
                    <span className="tabular-nums">{EUR.format(expense.amount)}</span>
                    <span className={soon ? "text-xs font-medium" : "text-muted-foreground text-xs"}>
                      {formatDay(date)} · {whenLabel(daysUntil)}
                    </span>
                  </span>
                </div>
              ))
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

function SummaryCard({
  testId,
  title,
  value,
  hint,
}: {
  testId: string;
  title: string;
  value: number;
  hint: string;
}) {
  return (
    <Card data-testid={testId}>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        <span className="text-3xl font-semibold tabular-nums">{EUR.format(value)}</span>
        <span className="text-muted-foreground text-xs">{hint}</span>
      </CardContent>
    </Card>
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
    <Card
      data-testid="gasto"
      data-ciclo={expense.billing_cycle}
      className={expense.status === "cancelado" ? "opacity-60" : undefined}
    >
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
            {expense.billing_cycle === "unico" && ` · ${formatDay(expense.starts_at)}`}
            {expense.next_billing_date && ` · próxima: ${formatDay(expense.next_billing_date)}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex flex-col items-end">
            <span className="font-semibold tabular-nums">{EUR.format(expense.amount)}</span>
            {expense.currency !== "EUR" && expense.original_amount != null && (
              <span className="text-muted-foreground text-xs tabular-nums">
                {expense.original_amount.toFixed(2)} {expense.currency}
              </span>
            )}
          </span>
          {expense.billing_cycle !== "unico" && expense.status === "activo" && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleRenew} title="Renovar">
              <RotateCw className="h-3.5 w-3.5" />
            </Button>
          )}
          <ExpenseFormDialog categories={categories} expense={expense} />
          {/* Un pago único ya está hecho: no se cancela (se edita o se borra). */}
          {expense.billing_cycle !== "unico" && (
            <Button variant="outline" size="sm" onClick={handleToggleStatus}>
              {expense.status === "activo" ? "Cancelar" : "Reactivar"}
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setConfirmDelete(true)}
            aria-label={`Eliminar ${expense.name}`}
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
