import type { SprintRow, TaskRow, TaskSize } from "@/lib/types";

function byStart(sprints: SprintRow[]): SprintRow[] {
  return [...sprints].sort((a, b) => a.starts_on.localeCompare(b.starts_on));
}

/**
 * El sprint «actual» para un día (YYYY-MM-DD): el abierto que está en marcha;
 * si no hay ninguno, el próximo abierto en empezar (la semana antes de arrancar
 * ya se planifica sobre él); y si tampoco, el último que terminó o se cerró.
 * Cerrar un sprint antes de su fecha de fin hace que «actual» pase al siguiente.
 */
export function currentSprint(sprints: SprintRow[], today: string): SprintRow | null {
  const sorted = byStart(sprints);
  const open = sorted.filter((s) => !s.closed_at);
  return (
    open.find((s) => s.starts_on <= today && today <= s.ends_on) ??
    open.find((s) => s.starts_on > today) ??
    sorted.filter((s) => s.closed_at || s.ends_on < today).at(-1) ??
    null
  );
}

/** El primer sprint abierto que empieza después de este: adonde pasan sus tareas sin terminar. */
export function nextSprint(sprints: SprintRow[], sprint: SprintRow): SprintRow | null {
  return byStart(sprints).find((s) => s.id !== sprint.id && !s.closed_at && s.starts_on > sprint.starts_on) ?? null;
}

// Peso de cada tamaño al sumar un sprint: una M es el doble que una S y una L el triple.
export const SIZE_POINTS: Record<TaskSize, number> = { S: 1, M: 2, L: 3 };
export const TASK_SIZES: TaskSize[] = ["S", "M", "L"];

/** Cuántas tareas hay de cada tamaño en el sprint, cuántas sin tamaño y los puntos. */
export function sprintSizes(
  tasks: Pick<TaskRow, "sprint_id" | "size">[],
  sprintId: string
): { counts: Record<TaskSize, number>; unsized: number; points: number } {
  const counts: Record<TaskSize, number> = { S: 0, M: 0, L: 0 };
  let unsized = 0;
  for (const task of tasks) {
    if (task.sprint_id !== sprintId) continue;
    // Sin la migración 0017 la tarea no trae size.
    if (task.size) counts[task.size] += 1;
    else unsized += 1;
  }
  const points = TASK_SIZES.reduce((sum, size) => sum + counts[size] * SIZE_POINTS[size], 0);
  return { counts, unsized, points };
}

/** Tareas del sprint y cuántas están cerradas. */
export function sprintProgress(
  tasks: Pick<TaskRow, "sprint_id" | "done">[],
  sprintId: string
): { closed: number; total: number } {
  const inSprint = tasks.filter((t) => t.sprint_id === sprintId);
  return { closed: inSprint.filter((t) => t.done).length, total: inSprint.length };
}

const DAY_MONTH = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", timeZone: "UTC" });

/** «27 oct – 7 nov» */
export function formatSprintDates(sprint: Pick<SprintRow, "starts_on" | "ends_on">): string {
  const format = (iso: string) => DAY_MONTH.format(new Date(`${iso}T00:00:00Z`)).replace(".", "");
  return `${format(sprint.starts_on)} – ${format(sprint.ends_on)}`;
}
