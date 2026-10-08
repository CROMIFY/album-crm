import { describe, expect, it } from "vitest";
import {
  EMPTY_FILTERS,
  NONE,
  countActiveFilters,
  filterTasks,
  parseFilters,
  serializeFilters,
  sortTasks,
  todayInMadrid,
  type TaskFilters,
} from "./filters";
import type { LabelRow, ProfileRow, TaskPriority, TaskWithRelations } from "@/lib/types";

const TODAY = "2026-10-08";

function profile(id: string, nombre: string): ProfileRow {
  return { id, nombre, email: `${id}@x.es`, rol: "admin", created_at: "2026-01-01T00:00:00Z" };
}
function label(id: string, name: string): LabelRow {
  return { id, name, color: "#000" };
}

const lander = profile("p-lander", "Lander");
const jaime = profile("p-jaime", "Jaime");
const pablo = profile("p-pablo", "Pablo");
const tecnico = label("l-tec", "Técnico");
const legal = label("l-leg", "Legal");

let counter = 0;
function task(overrides: Partial<TaskWithRelations> = {}): TaskWithRelations {
  counter += 1;
  return {
    id: `t${counter}`,
    column_id: "c1",
    title: `Tarea ${counter}`,
    description: null,
    due_date: null,
    priority: "media",
    position: counter,
    done: false,
    linked_account_id: null,
    linked_deal_id: null,
    created_at: "2026-10-01T10:00:00Z",
    updated_at: "2026-10-01T10:00:00Z",
    labels: [],
    subtasks: [],
    assignees: [],
    ...overrides,
  };
}

function filters(overrides: Partial<TaskFilters>): TaskFilters {
  return { ...EMPTY_FILTERS, ...overrides };
}

const ids = (list: TaskWithRelations[]) => list.map((t) => t.id);

describe("parseFilters / serializeFilters", () => {
  it("ida y vuelta conserva los filtros y el orden", () => {
    const original = filters({
      assignees: ["p-lander", NONE],
      labels: ["l-tec"],
      priorities: ["alta", "baja"],
      due: "rango",
      from: "2026-10-01",
      to: "2026-10-31",
      sort: "priority-desc",
    });
    const parsed = parseFilters(serializeFilters(original));
    expect(parsed).toEqual(original);
  });

  it("sin parámetros devuelve los filtros vacíos", () => {
    expect(parseFilters(new URLSearchParams())).toEqual(EMPTY_FILTERS);
  });

  it("descarta valores inválidos", () => {
    const params = new URLSearchParams(
      "prioridad=alta,urgente&fecha=ayer&orden=al-azar&desde=2026-10-01"
    );
    const parsed = parseFilters(params);
    expect(parsed.priorities).toEqual(["alta"]);
    expect(parsed.due).toBeNull();
    expect(parsed.sort).toBe("manual");
    // desde/hasta solo cuentan junto a fecha=rango
    expect(parsed.from).toBeNull();
  });

  it("ignora fechas mal formadas y elimina duplicados", () => {
    const parsed = parseFilters(new URLSearchParams("fecha=rango&desde=hoy&hasta=2026-10-09&usuario=a,a,b"));
    expect(parsed.from).toBeNull();
    expect(parsed.to).toBe("2026-10-09");
    expect(parsed.assignees).toEqual(["a", "b"]);
  });

  it("serializar respeta parámetros ajenos y borra los propios sin uso", () => {
    const base = new URLSearchParams("otro=1&usuario=viejo&orden=due-asc");
    const params = serializeFilters(EMPTY_FILTERS, base);
    expect(params.toString()).toBe("otro=1");
  });

  it("no escribe desde/hasta si la fecha no es un rango", () => {
    const params = serializeFilters(filters({ due: "hoy", from: "2026-10-01" }));
    expect(params.toString()).toBe("fecha=hoy");
  });
});

describe("countActiveFilters", () => {
  it("cuenta categorías, no valores, e ignora el orden", () => {
    expect(countActiveFilters(EMPTY_FILTERS)).toBe(0);
    expect(countActiveFilters(filters({ sort: "due-asc" }))).toBe(0);
    expect(countActiveFilters(filters({ assignees: ["a", "b"], priorities: ["alta"] }))).toBe(2);
  });

  it("un rango sin extremos no cuenta", () => {
    expect(countActiveFilters(filters({ due: "rango" }))).toBe(0);
    expect(countActiveFilters(filters({ due: "rango", to: "2026-10-31" }))).toBe(1);
  });
});

describe("filterTasks", () => {
  it("sin filtros devuelve todas", () => {
    const tasks = [task(), task()];
    expect(filterTasks(tasks, EMPTY_FILTERS, TODAY)).toEqual(tasks);
  });

  it("por usuario: basta con coincidir con uno de los asignados", () => {
    const a = task({ assignees: [lander] });
    const b = task({ assignees: [jaime, pablo] });
    const c = task({ assignees: [] });
    const tasks = [a, b, c];
    expect(ids(filterTasks(tasks, filters({ assignees: [pablo.id] }), TODAY))).toEqual([b.id]);
    expect(ids(filterTasks(tasks, filters({ assignees: [lander.id, jaime.id] }), TODAY))).toEqual([a.id, b.id]);
  });

  it("por usuario: «sin asignar» solo trae las tareas sin asignados", () => {
    const a = task({ assignees: [lander] });
    const c = task({ assignees: [] });
    expect(ids(filterTasks([a, c], filters({ assignees: [NONE] }), TODAY))).toEqual([c.id]);
    expect(ids(filterTasks([a, c], filters({ assignees: [NONE, lander.id] }), TODAY))).toEqual([a.id, c.id]);
  });

  it("por etiqueta, incluida «sin etiqueta»", () => {
    const a = task({ labels: [tecnico] });
    const b = task({ labels: [tecnico, legal] });
    const c = task({ labels: [] });
    const tasks = [a, b, c];
    expect(ids(filterTasks(tasks, filters({ labels: [legal.id] }), TODAY))).toEqual([b.id]);
    expect(ids(filterTasks(tasks, filters({ labels: [NONE] }), TODAY))).toEqual([c.id]);
  });

  it("por prioridad", () => {
    const alta = task({ priority: "alta" });
    const media = task({ priority: "media" });
    const baja = task({ priority: "baja" });
    expect(ids(filterTasks([alta, media, baja], filters({ priorities: ["alta", "baja"] }), TODAY))).toEqual([
      alta.id,
      baja.id,
    ]);
  });

  it("entre categorías se combinan con Y", () => {
    const match = task({ assignees: [lander], priority: "alta", labels: [tecnico] });
    const otraPrioridad = task({ assignees: [lander], priority: "baja", labels: [tecnico] });
    const otroUsuario = task({ assignees: [jaime], priority: "alta", labels: [tecnico] });
    const result = filterTasks(
      [match, otraPrioridad, otroUsuario],
      filters({ assignees: [lander.id], priorities: ["alta"], labels: [tecnico.id] }),
      TODAY
    );
    expect(ids(result)).toEqual([match.id]);
  });

  describe("por fecha", () => {
    const vencida = task({ due_date: "2026-10-05" });
    const vencidaHecha = task({ due_date: "2026-10-05", done: true });
    const hoy = task({ due_date: TODAY });
    const manana = task({ due_date: "2026-10-09" });
    const dentroDeSiete = task({ due_date: "2026-10-15" });
    const dentroDeOcho = task({ due_date: "2026-10-16" });
    const sinFecha = task({ due_date: null });
    const all = [vencida, vencidaHecha, hoy, manana, dentroDeSiete, dentroDeOcho, sinFecha];

    it("vencidas: antes de hoy y sin completar", () => {
      expect(ids(filterTasks(all, filters({ due: "vencidas" }), TODAY))).toEqual([vencida.id]);
    });

    it("hoy", () => {
      expect(ids(filterTasks(all, filters({ due: "hoy" }), TODAY))).toEqual([hoy.id]);
    });

    it("próximos 7 días: de hoy a hoy+7, ambos incluidos", () => {
      expect(ids(filterTasks(all, filters({ due: "semana" }), TODAY))).toEqual([
        hoy.id,
        manana.id,
        dentroDeSiete.id,
      ]);
    });

    it("sin fecha", () => {
      expect(ids(filterTasks(all, filters({ due: "sin-fecha" }), TODAY))).toEqual([sinFecha.id]);
    });

    it("rango con ambos extremos incluidos, sin contar las tareas sin fecha", () => {
      const result = filterTasks(all, filters({ due: "rango", from: "2026-10-08", to: "2026-10-15" }), TODAY);
      expect(ids(result)).toEqual([hoy.id, manana.id, dentroDeSiete.id]);
    });

    it("rango abierto por un lado", () => {
      expect(ids(filterTasks(all, filters({ due: "rango", from: "2026-10-15" }), TODAY))).toEqual([
        dentroDeSiete.id,
        dentroDeOcho.id,
      ]);
      expect(ids(filterTasks(all, filters({ due: "rango", to: "2026-10-05" }), TODAY))).toEqual([
        vencida.id,
        vencidaHecha.id,
      ]);
    });

    it("el cambio de mes no rompe «próximos 7 días»", () => {
      const finDeMes = task({ due_date: "2026-11-02" });
      expect(ids(filterTasks([finDeMes], filters({ due: "semana" }), "2026-10-30"))).toEqual([finDeMes.id]);
      expect(ids(filterTasks([finDeMes], filters({ due: "semana" }), "2026-10-20"))).toEqual([]);
    });
  });
});

describe("sortTasks", () => {
  it("manual: por position", () => {
    const a = task({ position: 2 });
    const b = task({ position: 0 });
    const c = task({ position: 1 });
    expect(ids(sortTasks([a, b, c], "manual"))).toEqual([b.id, c.id, a.id]);
  });

  it("no modifica el array original", () => {
    const tasks = [task({ position: 1 }), task({ position: 0 })];
    const copy = [...tasks];
    sortTasks(tasks, "manual");
    expect(tasks).toEqual(copy);
  });

  it("fecha límite: las tareas sin fecha van siempre al final", () => {
    const sin = task({ due_date: null, position: 0 });
    const tarde = task({ due_date: "2026-12-01", position: 1 });
    const pronto = task({ due_date: "2026-10-10", position: 2 });
    expect(ids(sortTasks([sin, tarde, pronto], "due-asc"))).toEqual([pronto.id, tarde.id, sin.id]);
    expect(ids(sortTasks([sin, tarde, pronto], "due-desc"))).toEqual([tarde.id, pronto.id, sin.id]);
  });

  it("prioridad: alta primero o baja primero", () => {
    const baja = task({ priority: "baja", position: 0 });
    const alta = task({ priority: "alta", position: 1 });
    const media = task({ priority: "media", position: 2 });
    expect(ids(sortTasks([baja, alta, media], "priority-desc"))).toEqual([alta.id, media.id, baja.id]);
    expect(ids(sortTasks([baja, alta, media], "priority-asc"))).toEqual([baja.id, media.id, alta.id]);
  });

  it("usuario: alfabético por el primer nombre, sin usuario al final", () => {
    const sin = task({ position: 0 });
    const pabloYAna = task({ assignees: [pablo, profile("p-ana", "Ana")], position: 1 });
    const jaimeSolo = task({ assignees: [jaime], position: 2 });
    expect(ids(sortTasks([sin, jaimeSolo, pabloYAna], "assignee-asc"))).toEqual([
      pabloYAna.id,
      jaimeSolo.id,
      sin.id,
    ]);
    expect(ids(sortTasks([sin, jaimeSolo, pabloYAna], "assignee-desc"))).toEqual([
      jaimeSolo.id,
      pabloYAna.id,
      sin.id,
    ]);
  });

  it("etiqueta: alfabético por la primera etiqueta, ignorando tildes y mayúsculas", () => {
    const sin = task({ position: 0 });
    const tec = task({ labels: [tecnico], position: 1 });
    const leg = task({ labels: [legal], position: 2 });
    expect(ids(sortTasks([sin, tec, leg], "label-asc"))).toEqual([leg.id, tec.id, sin.id]);
    expect(ids(sortTasks([sin, tec, leg], "label-desc"))).toEqual([tec.id, leg.id, sin.id]);
  });

  it("creación: más reciente o más antigua primero", () => {
    const vieja = task({ created_at: "2026-09-01T08:00:00Z", position: 0 });
    const nueva = task({ created_at: "2026-10-07T08:00:00Z", position: 1 });
    expect(ids(sortTasks([vieja, nueva], "created-desc"))).toEqual([nueva.id, vieja.id]);
    expect(ids(sortTasks([vieja, nueva], "created-asc"))).toEqual([vieja.id, nueva.id]);
  });

  it("a igualdad de clave se respeta el orden manual", () => {
    const priorities: TaskPriority[] = ["alta", "alta", "alta"];
    const [a, b, c] = priorities.map((priority, i) => task({ priority, position: 2 - i }));
    expect(ids(sortTasks([a, b, c], "priority-desc"))).toEqual([c.id, b.id, a.id]);
  });
});

describe("todayInMadrid", () => {
  it("usa la fecha de Madrid, no la UTC", () => {
    // 23:30 UTC del 7-oct ya es 8-oct en Madrid (UTC+2 en octubre)
    expect(todayInMadrid(new Date("2026-10-07T23:30:00Z"))).toBe("2026-10-08");
    expect(todayInMadrid(new Date("2026-10-08T10:00:00Z"))).toBe("2026-10-08");
  });
});
