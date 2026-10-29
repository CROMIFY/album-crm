import { addMonthsClamped, daysBetween } from "@/lib/expenses/summary";
import { isMilestoneType, type MilestoneType } from "@/lib/calendar/milestones";
import type { ProfileRow, SprintRow, TaskWithRelations } from "@/lib/types";

// Calendario de tareas con fecha, hitos y sprints. Fechas YYYY-MM-DD; toda la
// aritmética en UTC para que el día no cambie con la zona horaria.

export type CalendarItem = {
  id: string;
  kind: "task" | "milestone" | "sprint";
  title: string;
  /** Primer y último día (iguales si es de un día). */
  start: string;
  end: string;
  milestoneType: MilestoneType | null;
  assignees: Pick<ProfileRow, "id" | "nombre">[];
  done: boolean;
};

export type CalendarFilters = {
  /** "todo", "hitos" (todos los hitos) o un tipo de hito concreto. */
  type: "todo" | "hitos" | MilestoneType;
  /** "todos", "nadie" (sin responsable) o el id de un perfil. */
  assignee: string;
};

export const DEFAULT_CALENDAR_FILTERS: CalendarFilters = { type: "todo", assignee: "todos" };

export function buildCalendarItems(tasks: TaskWithRelations[], sprints: SprintRow[]): CalendarItem[] {
  const items: CalendarItem[] = [];
  for (const task of tasks) {
    if (!task.due_date) continue;
    const end = task.due_date.slice(0, 10);
    const start = task.is_milestone && task.start_date && task.start_date <= end ? task.start_date.slice(0, 10) : end;
    items.push({
      id: task.id,
      kind: task.is_milestone ? "milestone" : "task",
      title: task.title,
      start,
      end,
      milestoneType: task.is_milestone && isMilestoneType(task.milestone_type) ? task.milestone_type : null,
      assignees: task.assignees.map(({ id, nombre }) => ({ id, nombre })),
      done: task.done,
    });
  }
  for (const sprint of sprints) {
    items.push({
      id: `sprint-${sprint.id}`,
      kind: "sprint",
      title: sprint.name,
      start: sprint.starts_on,
      end: sprint.ends_on,
      milestoneType: null,
      assignees: [],
      done: sprint.closed_at != null,
    });
  }
  return items.sort((a, b) => a.start.localeCompare(b.start) || a.end.localeCompare(b.end));
}

/** Los sprints se ven siempre (son el marco); los filtros afectan a tareas e hitos. */
export function filterCalendarItems(items: CalendarItem[], filters: CalendarFilters): CalendarItem[] {
  return items.filter((item) => {
    if (item.kind === "sprint") return true;
    if (filters.type === "hitos" && item.kind !== "milestone") return false;
    if (filters.type !== "todo" && filters.type !== "hitos" && item.milestoneType !== filters.type) return false;
    if (filters.assignee === "nadie" && item.assignees.length > 0) return false;
    if (
      filters.assignee !== "todos" &&
      filters.assignee !== "nadie" &&
      !item.assignees.some((a) => a.id === filters.assignee)
    ) {
      return false;
    }
    return true;
  });
}

export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/** 0 = lunes … 6 = domingo. */
export function weekdayMondayFirst(day: string): number {
  const [y, m, d] = day.split("-").map(Number);
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
}

/** Semanas (de lunes a domingo) que cubren el mes `month` (YYYY-MM). */
export function monthWeeks(month: string): string[][] {
  const first = `${month}-01`;
  const last = addDays(addMonthsClamped(first, 1), -1);
  let cursor = addDays(first, -weekdayMondayFirst(first));
  const weeks: string[][] = [];
  while (cursor <= last) {
    weeks.push(Array.from({ length: 7 }, (_, i) => addDays(cursor, i)));
    cursor = addDays(cursor, 7);
  }
  return weeks;
}

export function shiftMonth(month: string, delta: number): string {
  return addMonthsClamped(`${month}-01`, delta).slice(0, 7);
}

export type WeekBar = {
  item: CalendarItem;
  /** Columnas (0-6) que ocupa en esta semana. */
  from: number;
  to: number;
  /** Fila dentro de la semana para que dos barras no se pisen. */
  lane: number;
  /** El hito sigue antes / después de esta semana. */
  continuesBefore: boolean;
  continuesAfter: boolean;
};

/** Barras de una semana para lo que dura más de un día, repartidas en filas. */
export function weekBars(items: CalendarItem[], week: string[]): WeekBar[] {
  const weekStart = week[0];
  const weekEnd = week[6];
  const bars: WeekBar[] = [];
  const laneEnds: number[] = [];
  for (const item of items) {
    if (item.start === item.end) continue;
    if (item.end < weekStart || item.start > weekEnd) continue;
    const from = item.start < weekStart ? 0 : daysBetween(weekStart, item.start);
    const to = item.end > weekEnd ? 6 : daysBetween(weekStart, item.end);
    let lane = laneEnds.findIndex((endCol) => endCol < from);
    if (lane === -1) lane = laneEnds.length;
    laneEnds[lane] = to;
    bars.push({
      item,
      from,
      to,
      lane,
      continuesBefore: item.start < weekStart,
      continuesAfter: item.end > weekEnd,
    });
  }
  return bars;
}

/** Lo de un solo día que cae en `day`. */
export function singleDayItems(items: CalendarItem[], day: string): CalendarItem[] {
  return items.filter((item) => item.start === item.end && item.start === day);
}

/**
 * «Próximos» (lista del móvil): lo que no ha terminado, de hoy en adelante, por
 * fecha de inicio; lo que está en curso (empezó y no ha acabado) va primero.
 */
export function upcomingItems(items: CalendarItem[], today: string, limit = 40): CalendarItem[] {
  return items
    .filter((item) => item.end >= today && !(item.kind === "task" && item.done))
    .sort((a, b) => {
      const aKey = a.start < today ? today : a.start;
      const bKey = b.start < today ? today : b.start;
      const aOngoing = a.start < today ? 0 : 1;
      const bOngoing = b.start < today ? 0 : 1;
      return aKey.localeCompare(bKey) || aOngoing - bOngoing || a.end.localeCompare(b.end);
    })
    .slice(0, limit);
}
