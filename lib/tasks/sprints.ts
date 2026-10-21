import type { SprintRow, TaskRow } from "@/lib/types";

/**
 * El sprint «actual» para un día (YYYY-MM-DD): el que está en marcha; si no hay
 * ninguno, el próximo en empezar (la semana antes de arrancar ya se planifica
 * sobre él); y si tampoco, el último que terminó.
 */
export function currentSprint(sprints: SprintRow[], today: string): SprintRow | null {
  const byStart = [...sprints].sort((a, b) => a.starts_on.localeCompare(b.starts_on));
  return (
    byStart.find((s) => s.starts_on <= today && today <= s.ends_on) ??
    byStart.find((s) => s.starts_on > today) ??
    byStart.filter((s) => s.ends_on < today).at(-1) ??
    null
  );
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
