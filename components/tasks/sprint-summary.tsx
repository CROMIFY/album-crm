"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { closeSprint } from "@/lib/actions/tasks";
import {
  SIZE_POINTS,
  TASK_SIZES,
  formatSprintDates,
  nextSprint,
  sprintProgress,
  sprintSizes,
} from "@/lib/tasks/sprints";
import type { SprintRow, TaskWithRelations } from "@/lib/types";

// Valor del Select para «al backlog» (un Select no admite value vacío).
const BACKLOG = "backlog";

const CLOSED_DATE = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", timeZone: "Europe/Madrid" });

// Cabecera del sprint filtrado: fechas, objetivo, cuántas de sus tareas están cerradas
// y su tamaño (contando todas las del sprint, no solo las que dejan ver los demás filtros).
export function SprintSummary({
  sprint,
  sprints,
  tasks,
}: {
  sprint: SprintRow;
  sprints: SprintRow[];
  tasks: TaskWithRelations[];
}) {
  const { closed, total } = sprintProgress(tasks, sprint.id);
  const { counts, unsized, points } = sprintSizes(tasks, sprint.id);
  const sizeParts = TASK_SIZES.filter((size) => counts[size] > 0).map((size) => `${counts[size]} ${size}`);
  if (unsized > 0) sizeParts.push(`${unsized} sin tamaño`);

  return (
    <div className="bg-muted/40 flex shrink-0 flex-col gap-1 rounded-md border px-3 py-2 text-sm">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-semibold">{sprint.name}</span>
        <span className="text-muted-foreground tabular-nums">{formatSprintDates(sprint)}</span>
        {sprint.goal && <span className="min-w-0 flex-1">{sprint.goal}</span>}
        <span className="ml-auto font-medium tabular-nums">
          Cerradas {closed} de {total}
        </span>
        {!sprint.closed_at && (
          <CloseSprintButton sprint={sprint} next={nextSprint(sprints, sprint)} pending={total - closed} />
        )}
      </div>
      <div className="text-muted-foreground flex flex-wrap gap-x-3 text-xs tabular-nums">
        {total > 0 && (
          <span title={`Puntos: ${TASK_SIZES.map((s) => `${s} = ${SIZE_POINTS[s]}`).join(", ")}`}>
            Tamaño: {sizeParts.join(" · ")} · {points} {points === 1 ? "punto" : "puntos"}
          </span>
        )}
        {sprint.closed_at && (
          <span>
            Cerrado el {CLOSED_DATE.format(new Date(sprint.closed_at))}: {sprint.closed_count ?? 0} terminadas,{" "}
            {sprint.carried_count ?? 0} pasaron al siguiente o al backlog
          </span>
        )}
      </div>
    </div>
  );
}

function CloseSprintButton({
  sprint,
  next,
  pending,
}: {
  sprint: SprintRow;
  next: SprintRow | null;
  /** Tareas del sprint sin terminar. */
  pending: number;
}) {
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState(next?.id ?? BACKLOG);
  const [isPending, startTransition] = useTransition();

  function handleClose() {
    startTransition(async () => {
      try {
        const result = await closeSprint(sprint.id, target === BACKLOG ? null : target);
        toast.success(`${sprint.name} cerrado`, {
          description: `${result.closed} terminadas, ${result.carried} movidas.`,
        });
        setOpen(false);
      } catch (err) {
        toast.error("No se pudo cerrar el sprint", {
          description: err instanceof Error ? err.message : undefined,
        });
      }
    });
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        Cerrar sprint
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cerrar {sprint.name}</DialogTitle>
            <DialogDescription>
              Las tareas terminadas se quedan en el sprint.{" "}
              {pending === 0
                ? "No queda ninguna sin terminar."
                : `${pending} ${pending === 1 ? "tarea sin terminar pasa" : "tareas sin terminar pasan"} a donde elijas.`}{" "}
              No se puede deshacer desde aquí.
            </DialogDescription>
          </DialogHeader>
          {pending > 0 && (
            <div className="flex flex-col gap-2">
              <Label className="text-xs">Las sin terminar van a</Label>
              <Select value={target} onValueChange={setTarget}>
                <SelectTrigger className="w-full" aria-label="Adónde van las sin terminar">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {next && <SelectItem value={next.id}>{next.name}</SelectItem>}
                  <SelectItem value={BACKLOG}>Backlog (sin sprint; las de «Sprint» vuelven a «Por pensar»)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button onClick={handleClose} disabled={isPending}>
              {isPending ? "Cerrando…" : "Cerrar sprint"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
