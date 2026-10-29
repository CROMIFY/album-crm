import { describe, expect, it } from "vitest";
import {
  buildCalendarItems,
  filterCalendarItems,
  monthWeeks,
  shiftMonth,
  singleDayItems,
  upcomingItems,
  weekBars,
  type CalendarItem,
} from "@/lib/calendar/calendar";
import type { SprintRow, TaskWithRelations } from "@/lib/types";

const lander = { id: "lander", nombre: "Lander", email: "", rol: "", created_at: "" };
const pablo = { id: "pablo", nombre: "Pablo", email: "", rol: "", created_at: "" };

function task(overrides: Partial<TaskWithRelations>): TaskWithRelations {
  return {
    id: "t",
    column_id: "c",
    title: "Tarea",
    description: null,
    due_date: null,
    priority: "media",
    position: 0,
    done: false,
    done_at: null,
    sprint_id: null,
    size: null,
    linked_account_id: null,
    linked_deal_id: null,
    created_at: "",
    updated_at: "",
    labels: [],
    subtasks: [],
    assignees: [],
    ...overrides,
  };
}

const sprint: SprintRow = {
  id: "s1",
  name: "Sprint 1",
  starts_on: "2026-10-27",
  ends_on: "2026-11-07",
  goal: null,
  closed_at: null,
  closed_count: null,
  carried_count: null,
  created_at: "",
};

const tasks = [
  task({ id: "sin-fecha" }),
  task({ id: "normal", due_date: "2026-11-02", assignees: [lander] }),
  task({
    id: "auditoria",
    due_date: "2026-11-13",
    start_date: "2026-11-09",
    is_milestone: true,
    milestone_type: "seguridad",
    assignees: [lander],
  }),
  task({ id: "firmas", due_date: "2026-11-20", is_milestone: true, milestone_type: "comercial", assignees: [pablo] }),
  task({ id: "colchon", due_date: "2026-11-30", start_date: "2026-11-21", is_milestone: true, milestone_type: null }),
];

const items = buildCalendarItems(tasks, [sprint]);
const byId = (list: CalendarItem[]) => list.map((i) => i.id);

describe("buildCalendarItems", () => {
  it("solo entra lo que tiene fecha, más los sprints; los hitos de varios días van de inicio a fin", () => {
    expect(byId(items)).toEqual(["sprint-s1", "normal", "auditoria", "firmas", "colchon"]);
    expect(items.find((i) => i.id === "auditoria")).toMatchObject({
      kind: "milestone",
      start: "2026-11-09",
      end: "2026-11-13",
      milestoneType: "seguridad",
    });
    expect(items.find((i) => i.id === "colchon")).toMatchObject({ kind: "milestone", milestoneType: null });
  });

  it("una tarea normal con start_date sigue siendo de un día", () => {
    const [item] = buildCalendarItems([task({ id: "x", due_date: "2026-11-02", start_date: "2026-11-01" })], []);
    expect(item).toMatchObject({ kind: "task", start: "2026-11-02", end: "2026-11-02" });
  });
});

describe("filterCalendarItems", () => {
  it("por tipo de hito, sin perder los sprints", () => {
    expect(byId(filterCalendarItems(items, { type: "seguridad", assignee: "todos" }))).toEqual([
      "sprint-s1",
      "auditoria",
    ]);
    expect(byId(filterCalendarItems(items, { type: "hitos", assignee: "todos" }))).toEqual([
      "sprint-s1",
      "auditoria",
      "firmas",
      "colchon",
    ]);
  });

  it("por responsable y sin responsable", () => {
    expect(byId(filterCalendarItems(items, { type: "todo", assignee: "pablo" }))).toEqual(["sprint-s1", "firmas"]);
    expect(byId(filterCalendarItems(items, { type: "todo", assignee: "nadie" }))).toEqual(["sprint-s1", "colchon"]);
  });
});

describe("rejilla del mes", () => {
  it("noviembre de 2026 empieza en la semana del lunes 26-oct y tiene 6 semanas", () => {
    const weeks = monthWeeks("2026-11");
    expect(weeks[0][0]).toBe("2026-10-26");
    expect(weeks).toHaveLength(6);
    expect(weeks[5][6]).toBe("2026-12-06");
  });

  it("cambia de mes por los bordes del año", () => {
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
  });

  it("un hito de 9 a 13 de nov es una barra de lunes a viernes", () => {
    const week = monthWeeks("2026-11")[2]; // 9-15 nov
    const bars = weekBars(items, week);
    expect(bars.find((b) => b.item.id === "auditoria")).toMatchObject({
      from: 0,
      to: 4,
      continuesBefore: false,
      continuesAfter: false,
    });
  });

  it("una barra que cruza semanas se parte y lo indica", () => {
    const weeks = monthWeeks("2026-11");
    const sprintWeek1 = weekBars(items, weeks[0]).find((b) => b.item.id === "sprint-s1");
    const sprintWeek2 = weekBars(items, weeks[1]).find((b) => b.item.id === "sprint-s1");
    expect(sprintWeek1).toMatchObject({ from: 1, to: 6, continuesAfter: true });
    expect(sprintWeek2).toMatchObject({ from: 0, to: 5, continuesBefore: true, continuesAfter: false });
  });

  it("dos barras que se solapan van en filas distintas", () => {
    const overlapping = buildCalendarItems(
      [
        task({ id: "a", due_date: "2026-11-12", start_date: "2026-11-09", is_milestone: true }),
        task({ id: "b", due_date: "2026-11-13", start_date: "2026-11-11", is_milestone: true }),
        task({ id: "c", due_date: "2026-11-15", start_date: "2026-11-14", is_milestone: true }),
      ],
      []
    );
    const bars = weekBars(overlapping, monthWeeks("2026-11")[2]);
    expect(bars.map((b) => [b.item.id, b.lane])).toEqual([
      ["a", 0],
      ["b", 1],
      ["c", 0],
    ]);
  });

  it("lo de un día cae en su casilla", () => {
    expect(byId(singleDayItems(items, "2026-11-20"))).toEqual(["firmas"]);
  });
});

describe("upcomingItems", () => {
  it("de hoy en adelante, lo que está en curso primero, sin tareas hechas", () => {
    const withDone = [...items, ...buildCalendarItems([task({ id: "hecha", due_date: "2026-11-03", done: true })], [])];
    expect(byId(upcomingItems(withDone, "2026-10-28"))).toEqual([
      "sprint-s1",
      "normal",
      "auditoria",
      "firmas",
      "colchon",
    ]);
    expect(byId(upcomingItems(withDone, "2026-11-10"))).toEqual(["auditoria", "firmas", "colchon"]);
    // Empate de fecha: lo que ya estaba en curso va antes que lo que empieza hoy.
    const empieza = buildCalendarItems([task({ id: "hoy", due_date: "2026-10-28" })], []);
    expect(byId(upcomingItems([...empieza, ...items], "2026-10-28")).slice(0, 2)).toEqual(["sprint-s1", "hoy"]);
  });
});
