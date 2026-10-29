"use client";

import { useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  DEFAULT_CALENDAR_FILTERS,
  buildCalendarItems,
  filterCalendarItems,
  monthWeeks,
  shiftMonth,
  singleDayItems,
  upcomingItems,
  weekBars,
  type CalendarFilters,
  type CalendarItem,
} from "@/lib/calendar/calendar";
import {
  MILESTONE_NO_TYPE_COLOR,
  MILESTONE_TYPES,
  MILESTONE_TYPE_COLORS,
  MILESTONE_TYPE_LABELS,
  isMilestoneType,
  milestoneColor,
} from "@/lib/calendar/milestones";
import type { ProfileRow, SprintRow, TaskWithRelations } from "@/lib/types";

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MONTH_FORMAT = new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric", timeZone: "UTC" });
const DAY_FORMAT = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", timeZone: "UTC" });
const WEEKDAY_FORMAT = new Intl.DateTimeFormat("es-ES", { weekday: "short", timeZone: "UTC" });

const utc = (day: string) => new Date(`${day}T00:00:00Z`);

function rangeLabel(item: CalendarItem) {
  if (item.start === item.end) return `${WEEKDAY_FORMAT.format(utc(item.start))} ${DAY_FORMAT.format(utc(item.start))}`;
  return `${DAY_FORMAT.format(utc(item.start))} – ${DAY_FORMAT.format(utc(item.end))}`;
}

function itemColor(item: CalendarItem) {
  return item.kind === "milestone" ? milestoneColor(item.milestoneType) : undefined;
}

function itemTooltip(item: CalendarItem) {
  const type =
    item.kind === "sprint"
      ? "Sprint"
      : item.kind === "milestone"
        ? `Hito${item.milestoneType ? ` · ${MILESTONE_TYPE_LABELS[item.milestoneType]}` : ""}`
        : "Tarea";
  const who = item.assignees.map((a) => a.nombre).join(", ");
  return [item.title, `${type} · ${rangeLabel(item)}`, who].filter(Boolean).join("\n");
}

function monthLabel(month: string) {
  const text = MONTH_FORMAT.format(utc(`${month}-01`));
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function typeLabel(type: CalendarFilters["type"]) {
  if (type === "todo") return "Tareas e hitos";
  if (type === "hitos") return "Solo hitos";
  return MILESTONE_TYPE_LABELS[type];
}

function assigneeLabel(assignee: string, profiles: ProfileRow[]) {
  if (assignee === "todos") return "Todos los responsables";
  if (assignee === "nadie") return "Sin responsable";
  return profiles.find((p) => p.id === assignee)?.nombre ?? "Responsable";
}

function parseFilters(params: URLSearchParams): CalendarFilters {
  const type = params.get("tipo");
  return {
    type: type === "hitos" || isMilestoneType(type) ? type : DEFAULT_CALENDAR_FILTERS.type,
    assignee: params.get("responsable") ?? DEFAULT_CALENDAR_FILTERS.assignee,
  };
}

export function CalendarView({
  tasks,
  sprints,
  profiles,
  today,
  header,
}: {
  tasks: TaskWithRelations[];
  sprints: SprintRow[];
  profiles: ProfileRow[];
  /** YYYY-MM-DD en hora de Madrid; lo calcula el servidor. */
  today: string;
  /** Lo que va encima del calendario (el resumen de objetivos). */
  header?: React.ReactNode;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [month, setMonth] = useState(() => {
    const fromUrl = searchParams.get("mes");
    return fromUrl && /^\d{4}-\d{2}$/.test(fromUrl) ? fromUrl : today.slice(0, 7);
  });
  const [filters, setFilters] = useState(() => parseFilters(new URLSearchParams(searchParams.toString())));
  const [mobileView, setMobileView] = useState<"proximos" | "mes">("proximos");

  // Como el tablero: el estado va en la URL con replaceState (sin volver a pedir datos).
  function writeUrl(nextMonth: string, nextFilters: CalendarFilters) {
    const params = new URLSearchParams(searchParams.toString());
    const set = (key: string, value: string, fallback: string) =>
      value === fallback ? params.delete(key) : params.set(key, value);
    set("mes", nextMonth, today.slice(0, 7));
    set("tipo", nextFilters.type, DEFAULT_CALENDAR_FILTERS.type);
    set("responsable", nextFilters.assignee, DEFAULT_CALENDAR_FILTERS.assignee);
    const qs = params.toString();
    window.history.replaceState(null, "", qs ? `${pathname}?${qs}` : pathname);
  }

  function changeMonth(next: string) {
    setMonth(next);
    writeUrl(next, filters);
  }

  function changeFilters(next: CalendarFilters) {
    setFilters(next);
    writeUrl(month, next);
  }

  const allItems = useMemo(() => buildCalendarItems(tasks, sprints), [tasks, sprints]);
  const items = useMemo(() => filterCalendarItems(allItems, filters), [allItems, filters]);
  const weeks = useMemo(() => monthWeeks(month), [month]);
  const upcoming = useMemo(() => upcomingItems(items, today), [items, today]);

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-4 p-4">
      <h1 className="text-lg font-semibold">Calendario</h1>
      {header}

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" aria-label="Mes anterior" onClick={() => changeMonth(shiftMonth(month, -1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-36 text-center text-sm font-medium" data-testid="mes-actual">
            {monthLabel(month)}
          </span>
          <Button variant="ghost" size="icon" aria-label="Mes siguiente" onClick={() => changeMonth(shiftMonth(month, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => changeMonth(today.slice(0, 7))}>
            Hoy
          </Button>
        </div>
        <Select value={filters.type} onValueChange={(v) => changeFilters({ ...filters, type: v as CalendarFilters["type"] })}>
          <SelectTrigger className="w-44" aria-label="Tipo">
            <SelectValue>{typeLabel(filters.type)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todo">Tareas e hitos</SelectItem>
            <SelectItem value="hitos">Solo hitos</SelectItem>
            {MILESTONE_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {MILESTONE_TYPE_LABELS[type]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filters.assignee} onValueChange={(v) => changeFilters({ ...filters, assignee: v })}>
          <SelectTrigger className="w-52" aria-label="Responsable">
            <SelectValue>{assigneeLabel(filters.assignee, profiles)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los responsables</SelectItem>
            <SelectItem value="nadie">Sin responsable</SelectItem>
            {profiles.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Legend />

      <div className="flex gap-1 md:hidden" role="tablist" aria-label="Vista">
        {(["proximos", "mes"] as const).map((view) => (
          <Button
            key={view}
            role="tab"
            aria-selected={mobileView === view}
            variant={mobileView === view ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setMobileView(view)}
          >
            {view === "proximos" ? "Próximos" : "Mes"}
          </Button>
        ))}
      </div>

      <section
        aria-label="Próximos"
        className={cn("flex flex-col gap-2 md:hidden", mobileView !== "proximos" && "hidden")}
      >
        {upcoming.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nada pendiente con fecha.</p>
        ) : (
          upcoming.map((item) => <UpcomingRow key={item.id} item={item} today={today} />)
        )}
      </section>

      <section
        aria-label="Mes"
        className={cn("min-w-0 rounded-lg border", mobileView !== "mes" && "hidden md:block")}
      >
        <div className="bg-muted/40 grid grid-cols-7 border-b">
          {WEEKDAYS.map((d) => (
            <div key={d} className="text-muted-foreground px-1 py-1.5 text-center text-xs font-medium">
              {d}
            </div>
          ))}
        </div>
        {weeks.map((week) => (
          <WeekRow key={week[0]} week={week} items={items} month={month} today={today} />
        ))}
      </section>
    </div>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs" aria-label="Leyenda">
      {MILESTONE_TYPES.map((type) => (
        <span key={type} className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: MILESTONE_TYPE_COLORS[type] }} />
          {MILESTONE_TYPE_LABELS[type]}
        </span>
      ))}
      <span className="flex items-center gap-1">
        <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: MILESTONE_NO_TYPE_COLOR }} />
        Hito sin tipo
      </span>
      <span className="flex items-center gap-1">
        <span className="bg-muted h-2.5 w-2.5 rounded-sm border" />
        Sprint
      </span>
    </div>
  );
}

function WeekRow({
  week,
  items,
  month,
  today,
}: {
  week: string[];
  items: CalendarItem[];
  month: string;
  today: string;
}) {
  const bars = weekBars(items, week);
  const lanes = bars.reduce((max, b) => Math.max(max, b.lane + 1), 0);

  return (
    <div className="relative border-b last:border-b-0" data-week={week[0]}>
      {/* Fondo: una casilla por día (con su número y lo de un solo día). */}
      <div className="grid grid-cols-7">
        {week.map((day) => (
          <div
            key={day}
            data-day={day}
            className={cn("min-h-20 border-l px-0.5 pb-1 first:border-l-0 md:min-h-24", !day.startsWith(month) && "bg-muted/30")}
          >
            <span
              className={cn(
                "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs",
                !day.startsWith(month) && "text-muted-foreground",
                day === today && "bg-primary text-primary-foreground font-semibold"
              )}
            >
              {Number(day.slice(8))}
            </span>
            {/* Hueco para las barras de esta semana, que van por encima. */}
            <div style={{ height: `${lanes * 1.375}rem` }} />
            <div className="flex flex-col gap-0.5">
              {singleDayItems(items, day).map((item) => (
                <DayChip key={item.id} item={item} />
              ))}
            </div>
          </div>
        ))}
      </div>
      {lanes > 0 && (
        <div
          className="pointer-events-none absolute inset-x-0 top-7 grid grid-cols-7 gap-y-0.5"
          style={{ gridTemplateRows: `repeat(${lanes}, 1.25rem)` }}
        >
          {bars.map((bar) => {
            const color = itemColor(bar.item);
            return (
              <div
                key={bar.item.id}
                data-calendar-item={bar.item.id}
                data-kind={bar.item.kind}
                title={itemTooltip(bar.item)}
                className={cn(
                  "pointer-events-auto mx-0.5 truncate px-1.5 text-[11px] leading-5 font-medium",
                  bar.item.kind === "sprint" ? "bg-muted text-muted-foreground border" : "text-white",
                  bar.continuesBefore ? "rounded-l-none" : "rounded-l",
                  bar.continuesAfter ? "rounded-r-none" : "rounded-r"
                )}
                style={{
                  gridColumn: `${bar.from + 1} / ${bar.to + 2}`,
                  gridRow: bar.lane + 1,
                  backgroundColor: color,
                }}
              >
                {bar.item.kind === "milestone" && <Flag className="mr-1 inline h-3 w-3 align-[-2px]" />}
                {bar.item.title}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DayChip({ item }: { item: CalendarItem }) {
  if (item.kind === "milestone") {
    return (
      <div
        data-calendar-item={item.id}
        data-kind={item.kind}
        title={itemTooltip(item)}
        className="truncate rounded px-1 text-[11px] leading-5 font-medium text-white"
        style={{ backgroundColor: itemColor(item) }}
      >
        <Flag className="mr-0.5 inline h-3 w-3 align-[-2px]" />
        {item.title}
      </div>
    );
  }
  return (
    <div
      data-calendar-item={item.id}
      data-kind={item.kind}
      title={itemTooltip(item)}
      className={cn("truncate px-1 text-[11px] leading-5", item.done && "text-muted-foreground line-through")}
    >
      <span className="bg-foreground/50 mr-1 inline-block h-1.5 w-1.5 rounded-full align-middle" />
      {item.title}
    </div>
  );
}

function UpcomingRow({ item, today }: { item: CalendarItem; today: string }) {
  const color = itemColor(item);
  const ongoing = item.start < today;
  return (
    <div
      data-calendar-item={item.id}
      data-kind={item.kind}
      className="flex gap-3 rounded-lg border p-3 text-sm"
    >
      <span
        className={cn("w-1 shrink-0 rounded-full", item.kind === "sprint" && "bg-muted-foreground/40", item.kind === "task" && "bg-foreground/30")}
        style={color ? { backgroundColor: color } : undefined}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="font-medium">
          {item.kind === "milestone" && <Flag className="mr-1 inline h-3.5 w-3.5 align-[-2px]" style={{ color }} />}
          {item.title}
        </span>
        <span className="text-muted-foreground text-xs">
          {rangeLabel(item)}
          {ongoing && " · en curso"}
          {item.kind === "sprint" && " · sprint"}
          {item.kind === "milestone" && ` · ${item.milestoneType ? MILESTONE_TYPE_LABELS[item.milestoneType] : "hito"}`}
          {item.assignees.length > 0 && ` · ${item.assignees.map((a) => a.nombre).join(", ")}`}
        </span>
      </div>
    </div>
  );
}
