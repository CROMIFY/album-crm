import type { TaskPriority, TaskWithRelations } from "@/lib/types";

// Valor especial dentro de los filtros de usuario y etiqueta: "sin usuario" /
// "sin etiqueta".
export const NONE = "none";

export type DueFilter = "vencidas" | "hoy" | "semana" | "sin-fecha" | "rango";

export const DUE_FILTER_LABELS: Record<Exclude<DueFilter, "rango">, string> = {
  vencidas: "Vencidas (sin completar)",
  hoy: "Vencen hoy",
  semana: "Próximos 7 días",
  "sin-fecha": "Sin fecha",
};

export const SORT_OPTIONS = [
  { value: "manual", label: "Orden manual" },
  { value: "due-asc", label: "Fecha límite: más próxima" },
  { value: "due-desc", label: "Fecha límite: más lejana" },
  { value: "priority-desc", label: "Prioridad: alta primero" },
  { value: "priority-asc", label: "Prioridad: baja primero" },
  { value: "assignee-asc", label: "Usuario: A → Z" },
  { value: "assignee-desc", label: "Usuario: Z → A" },
  { value: "label-asc", label: "Etiqueta: A → Z" },
  { value: "label-desc", label: "Etiqueta: Z → A" },
  { value: "created-desc", label: "Creación: más reciente" },
  { value: "created-asc", label: "Creación: más antigua" },
] as const;

export type SortOption = (typeof SORT_OPTIONS)[number]["value"];

export type TaskFilters = {
  assignees: string[];
  labels: string[];
  priorities: TaskPriority[];
  due: DueFilter | null;
  // Solo cuentan con due === "rango"; formato YYYY-MM-DD, ambos extremos incluidos.
  from: string | null;
  to: string | null;
  sort: SortOption;
};

export const EMPTY_FILTERS: TaskFilters = {
  assignees: [],
  labels: [],
  priorities: [],
  due: null,
  from: null,
  to: null,
  sort: "manual",
};

const PRIORITIES: TaskPriority[] = ["alta", "media", "baja"];
const DUE_VALUES: DueFilter[] = ["vencidas", "hoy", "semana", "sin-fecha", "rango"];
const SORT_VALUES = SORT_OPTIONS.map((o) => o.value) as readonly string[];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// Nombres de los parámetros de la URL (la vista filtrada se puede compartir).
const PARAM = {
  assignees: "usuario",
  labels: "etiqueta",
  priorities: "prioridad",
  due: "fecha",
  from: "desde",
  to: "hasta",
  sort: "orden",
} as const;

function readList(params: { get(name: string): string | null }, name: string): string[] {
  const raw = params.get(name);
  if (!raw) return [];
  return Array.from(new Set(raw.split(",").filter(Boolean)));
}

function readDate(params: { get(name: string): string | null }, name: string): string | null {
  const raw = params.get(name);
  return raw && ISO_DATE.test(raw) ? raw : null;
}

export function parseFilters(params: { get(name: string): string | null }): TaskFilters {
  const due = params.get(PARAM.due) as DueFilter | null;
  const sort = params.get(PARAM.sort);
  const validDue = due && DUE_VALUES.includes(due) ? due : null;
  return {
    assignees: readList(params, PARAM.assignees),
    labels: readList(params, PARAM.labels),
    priorities: readList(params, PARAM.priorities).filter((p): p is TaskPriority =>
      PRIORITIES.includes(p as TaskPriority)
    ),
    due: validDue,
    from: validDue === "rango" ? readDate(params, PARAM.from) : null,
    to: validDue === "rango" ? readDate(params, PARAM.to) : null,
    sort: sort && SORT_VALUES.includes(sort) ? (sort as SortOption) : "manual",
  };
}

/** Escribe los filtros sobre una copia de `base`, respetando los demás parámetros. */
export function serializeFilters(filters: TaskFilters, base?: URLSearchParams): URLSearchParams {
  const params = new URLSearchParams(base);
  for (const name of Object.values(PARAM)) params.delete(name);
  if (filters.assignees.length) params.set(PARAM.assignees, filters.assignees.join(","));
  if (filters.labels.length) params.set(PARAM.labels, filters.labels.join(","));
  if (filters.priorities.length) params.set(PARAM.priorities, filters.priorities.join(","));
  if (filters.due) {
    params.set(PARAM.due, filters.due);
    if (filters.due === "rango") {
      if (filters.from) params.set(PARAM.from, filters.from);
      if (filters.to) params.set(PARAM.to, filters.to);
    }
  }
  if (filters.sort !== "manual") params.set(PARAM.sort, filters.sort);
  return params;
}

function dueIsActive(filters: TaskFilters): boolean {
  if (!filters.due) return false;
  // Un rango sin ningún extremo no filtra nada.
  return filters.due !== "rango" || Boolean(filters.from || filters.to);
}

/** Cuántos filtros hay puestos (el orden no cuenta). */
export function countActiveFilters(filters: TaskFilters): number {
  return (
    (filters.assignees.length ? 1 : 0) +
    (filters.labels.length ? 1 : 0) +
    (filters.priorities.length ? 1 : 0) +
    (dueIsActive(filters) ? 1 : 0)
  );
}

/** "Hoy" como YYYY-MM-DD en la zona horaria del equipo, igual en servidor y en cliente. */
export function todayInMadrid(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function addDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

function matchesDue(task: TaskWithRelations, filters: TaskFilters, today: string): boolean {
  const date = task.due_date?.slice(0, 10) ?? null;
  switch (filters.due) {
    case "vencidas":
      return date !== null && date < today && !task.done;
    case "hoy":
      return date === today;
    case "semana":
      return date !== null && date >= today && date <= addDays(today, 7);
    case "sin-fecha":
      return date === null;
    case "rango":
      if (!filters.from && !filters.to) return true;
      if (date === null) return false;
      if (filters.from && date < filters.from) return false;
      if (filters.to && date > filters.to) return false;
      return true;
    default:
      return true;
  }
}

/** Entre categorías se exige cumplir todas (Y); dentro de una categoría basta con una (O). */
export function filterTasks(
  tasks: TaskWithRelations[],
  filters: TaskFilters,
  today: string
): TaskWithRelations[] {
  if (countActiveFilters(filters) === 0) return tasks;
  const assignees = new Set(filters.assignees);
  const labels = new Set(filters.labels);
  const priorities = new Set<TaskPriority>(filters.priorities);

  return tasks.filter((task) => {
    if (assignees.size) {
      const unassigned = task.assignees.length === 0;
      const match =
        (unassigned && assignees.has(NONE)) || task.assignees.some((a) => assignees.has(a.id));
      if (!match) return false;
    }
    if (labels.size) {
      const unlabeled = task.labels.length === 0;
      const match = (unlabeled && labels.has(NONE)) || task.labels.some((l) => labels.has(l.id));
      if (!match) return false;
    }
    if (priorities.size && !priorities.has(task.priority)) return false;
    if (dueIsActive(filters) && !matchesDue(task, filters, today)) return false;
    return true;
  });
}

const PRIORITY_RANK: Record<TaskPriority, number> = { alta: 0, media: 1, baja: 2 };

function compareText(a: string, b: string): number {
  return a.localeCompare(b, "es", { sensitivity: "base" });
}

/** Primer nombre en orden alfabético, o null si no hay ninguno. */
function firstAlphabetical(names: string[]): string | null {
  if (names.length === 0) return null;
  return names.reduce((min, n) => (compareText(n, min) < 0 ? n : min));
}

/**
 * Compara dos claves con el sentido pedido; las tareas sin clave (sin fecha,
 * sin usuario, sin etiqueta) van siempre al final, sea cual sea el sentido.
 */
function compareKeys<T>(
  a: T | null,
  b: T | null,
  direction: 1 | -1,
  compare: (x: T, y: T) => number
): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return compare(a, b) * direction;
}

/** Ordena una copia de `tasks`; a igualdad de clave se respeta el orden manual (`position`). */
export function sortTasks(tasks: TaskWithRelations[], sort: SortOption): TaskWithRelations[] {
  const byPosition = (a: TaskWithRelations, b: TaskWithRelations) => a.position - b.position;
  const sorted = [...tasks];
  if (sort === "manual") return sorted.sort(byPosition);

  const [field, dir] = sort.split("-") as [string, "asc" | "desc"];
  const direction = dir === "asc" ? 1 : -1;

  const compareField = (a: TaskWithRelations, b: TaskWithRelations): number => {
    switch (field) {
      case "due":
        return compareKeys(a.due_date, b.due_date, direction, (x, y) => (x < y ? -1 : x > y ? 1 : 0));
      case "priority":
        // "priority-desc" = alta primero, así que el rango (alta = 0) va invertido.
        return (PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]) * -direction;
      case "assignee":
        return compareKeys(
          firstAlphabetical(a.assignees.map((p) => p.nombre)),
          firstAlphabetical(b.assignees.map((p) => p.nombre)),
          direction,
          compareText
        );
      case "label":
        return compareKeys(
          firstAlphabetical(a.labels.map((l) => l.name)),
          firstAlphabetical(b.labels.map((l) => l.name)),
          direction,
          compareText
        );
      case "created":
        return (Date.parse(a.created_at) - Date.parse(b.created_at)) * direction;
      default:
        return 0;
    }
  };

  return sorted.sort((a, b) => compareField(a, b) || byPosition(a, b));
}
