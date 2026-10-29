"use client";

import { useState } from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { GoalFormDialog } from "@/components/goals/goal-form-dialog";
import { GoalProgress, ownerNames } from "@/components/goals/goal-card";
import { deleteGoal } from "@/lib/actions/goals";
import { goalStatus } from "@/lib/goals/goals";
import type { GoalInput } from "@/lib/validation/goals";
import type { GoalWithValue } from "@/lib/queries/goals";
import type { ProfileRow } from "@/lib/types";

type SaveFn = (input: GoalInput, id?: string) => Promise<void>;

export function GoalsView({
  goals,
  profiles,
  today,
  missingTable,
  onSave,
  onDelete,
}: {
  goals: GoalWithValue[];
  profiles: ProfileRow[];
  today: string;
  missingTable?: boolean;
  /** Solo para el banco de pruebas (/e2e). */
  onSave?: SaveFn;
  onDelete?: (id: string) => Promise<void>;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-4 p-4">
      <HeaderPortal>
        <GoalFormDialog profiles={profiles} today={today} onSave={onSave} />
      </HeaderPortal>
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-lg font-semibold">Objetivos</h1>
        {/* El portal de la cabecera no existe en el banco de pruebas: allí el botón va aquí. */}
        {onSave && <GoalFormDialog profiles={profiles} today={today} onSave={onSave} />}
      </div>
      {missingTable && (
        <p className="text-muted-foreground text-sm" role="status">
          Falta aplicar la migración 0019 (tabla de objetivos) en la base.
        </p>
      )}
      {goals.length === 0 && !missingTable ? (
        <p className="text-muted-foreground text-sm">Todavía no hay objetivos.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {goals.map((goal) => (
            <GoalItem key={goal.id} goal={goal} profiles={profiles} today={today} onSave={onSave} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  );
}

function GoalItem({
  goal,
  profiles,
  today,
  onSave,
  onDelete,
}: {
  goal: GoalWithValue;
  profiles: ProfileRow[];
  today: string;
  onSave?: SaveFn;
  onDelete?: (id: string) => Promise<void>;
}) {
  const [confirm, setConfirm] = useState(false);
  const owners = ownerNames(goal, profiles);

  async function handleDelete() {
    try {
      await (onDelete ? onDelete(goal.id) : deleteGoal(goal.id));
      toast.success("Objetivo eliminado");
    } catch (err) {
      toast.error("No se pudo eliminar", { description: err instanceof Error ? err.message : undefined });
    }
  }

  return (
    <Card data-testid="objetivo" data-status={goalStatus(goal, goal.value, today)}>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <CardTitle className="text-sm font-medium">{goal.title}</CardTitle>
          <span className="text-muted-foreground text-xs">{owners || "Sin responsable"}</span>
        </div>
        <div className="flex shrink-0 items-center">
          <GoalFormDialog goal={goal} profiles={profiles} today={today} onSave={onSave} />
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            aria-label={`Eliminar ${goal.title}`}
            onClick={() => setConfirm(true)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <GoalProgress goal={goal} today={today} />
        {goal.notes && <p className="text-muted-foreground text-xs whitespace-pre-line">{goal.notes}</p>}
      </CardContent>
      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar «{goal.title}»?</AlertDialogTitle>
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

/** Bloque resumen de objetivos para encima del calendario. */
export function GoalsSummary({ goals, today }: { goals: GoalWithValue[]; today: string }) {
  if (goals.length === 0) return null;
  return (
    <section aria-label="Objetivos" className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium">Objetivos</h2>
        <Link href="/objetivos" className="text-muted-foreground text-xs hover:underline">
          Ver todos
        </Link>
      </div>
      <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 md:mx-0 md:grid md:grid-cols-2 md:px-0 xl:grid-cols-4">
        {goals.map((goal) => (
          <div
            key={goal.id}
            data-testid="objetivo-resumen"
            className="w-[75vw] max-w-72 shrink-0 snap-start rounded-lg border p-3 md:w-auto md:max-w-none"
          >
            <p className="mb-2 truncate text-sm font-medium" title={goal.title}>
              {goal.title}
            </p>
            <GoalProgress goal={goal} today={today} compact />
          </div>
        ))}
      </div>
    </section>
  );
}
