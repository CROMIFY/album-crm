import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useSyncExternalStore } from "react";
import { TaskBoard } from "./task-board";
import type { BoardColumnRow, LabelRow, ProfileRow, TaskWithRelations } from "@/lib/types";

// Next enlaza history.replaceState con useSearchParams; aquí se imita con un
// almacén mínimo para comprobar que el tablero lee y escribe la URL.
const listeners = new Set<() => void>();
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
vi.mock("next/navigation", () => ({
  usePathname: () => "/tareas",
  useSearchParams: () => {
    const search = useSyncExternalStore(subscribe, () => window.location.search);
    return new URLSearchParams(search);
  },
}));

vi.mock("@/lib/actions/tasks", () => ({
  reorderTask: vi.fn(),
  setTaskDone: vi.fn(),
  renameColumn: vi.fn(),
  deleteColumn: vi.fn(),
  setColumnIsDone: vi.fn(),
  createTask: vi.fn(),
  createColumn: vi.fn(),
  createLabel: vi.fn(),
  updateLabel: vi.fn(),
  deleteLabel: vi.fn(),
  updateTask: vi.fn(),
  deleteTask: vi.fn(),
  setTaskLabel: vi.fn(),
  addSubtask: vi.fn(),
  toggleSubtask: vi.fn(),
  deleteSubtask: vi.fn(),
}));

const TODAY = "2026-10-08";

const lander: ProfileRow = { id: "p-lander", nombre: "Lander", email: "l@x.es", rol: "admin", created_at: "" };
const jaime: ProfileRow = { id: "p-jaime", nombre: "Jaime", email: "j@x.es", rol: "admin", created_at: "" };
const profiles = [lander, jaime];

const tecnico: LabelRow = { id: "l-tec", name: "Técnico", color: "#3366ff" };
const legal: LabelRow = { id: "l-leg", name: "Legal", color: "#cc3366" };
const labels = [tecnico, legal];

const columns: BoardColumnRow[] = [
  { id: "c-todo", name: "Por hacer", position: 0, is_done_column: false, created_at: "" },
  { id: "c-doing", name: "En curso", position: 1, is_done_column: false, created_at: "" },
];

let position = 0;
function task(title: string, overrides: Partial<TaskWithRelations> = {}): TaskWithRelations {
  position += 1;
  return {
    id: `t-${title}`,
    column_id: "c-todo",
    title,
    description: null,
    due_date: null,
    priority: "media",
    position,
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

function buildTasks(): TaskWithRelations[] {
  position = 0;
  return [
    task("Subir el AAB", { assignees: [lander], labels: [tecnico], priority: "alta", due_date: "2026-10-12" }),
    task("Revisar contrato", { assignees: [jaime], labels: [legal], priority: "media", due_date: "2026-10-05" }),
    task("Probar compras", { assignees: [jaime], labels: [tecnico], priority: "baja" }),
    task("Idea suelta", { priority: "alta", due_date: "2026-10-20" }),
    task("Pulir el login", { column_id: "c-doing", assignees: [lander], labels: [tecnico], priority: "alta" }),
  ];
}

function renderBoard() {
  return render(
    <TaskBoard
      columns={columns}
      tasks={buildTasks()}
      labels={labels}
      profiles={profiles}
      accounts={[]}
      today={TODAY}
    />
  );
}

// Igual que Next: cualquier replaceState (también el del propio tablero) avisa a useSearchParams.
const nativeReplaceState = window.history.replaceState.bind(window.history);
window.history.replaceState = (...args: Parameters<History["replaceState"]>) => {
  nativeReplaceState(...args);
  act(() => listeners.forEach((l) => l()));
};

function setUrl(search: string) {
  window.history.replaceState(null, "", `/tareas${search}`);
}

/** Títulos de las tarjetas visibles en una columna, de arriba abajo. */
function titlesIn(columnName: string): string[] {
  // Por texto y no por rol: con un menú abierto, Radix oculta el resto de la página a la accesibilidad.
  const header = screen.getByText(columnName, { selector: "button" });
  const column = header.closest("div.w-72") as HTMLElement;
  return Array.from(column.querySelectorAll("[data-slot=card] span.text-sm")).map((el) => el.textContent ?? "");
}

beforeAll(() => {
  // Radix (Select, Popover, DropdownMenu) pide estas APIs, que jsdom no trae.
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.setPointerCapture = () => {};
  Element.prototype.releasePointerCapture = () => {};
  Element.prototype.scrollIntoView = () => {};
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

beforeEach(() => {
  setUrl("");
});

describe("TaskBoard: filtros y orden", () => {
  it("sin filtros enseña todas las tareas en orden manual", () => {
    renderBoard();
    expect(titlesIn("Por hacer")).toEqual(["Subir el AAB", "Revisar contrato", "Probar compras", "Idea suelta"]);
    expect(titlesIn("En curso")).toEqual(["Pulir el login"]);
    expect(screen.queryByText(/Mostrando/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Restablecer/ })).not.toBeInTheDocument();
  });

  it("filtra por usuario, actualiza los contadores y escribe la URL", async () => {
    const user = userEvent.setup();
    renderBoard();

    await user.click(screen.getByRole("button", { name: /Usuario/ }));
    await user.click(await screen.findByRole("menuitemcheckbox", { name: "Jaime" }));

    expect(titlesIn("Por hacer")).toEqual(["Revisar contrato", "Probar compras"]);
    expect(titlesIn("En curso")).toEqual([]);
    expect(screen.getByText("Mostrando 2 de 5 tareas")).toBeInTheDocument();
    expect(window.location.search).toBe(`?usuario=${jaime.id}`);
    // El contador de la columna pasa a «visibles/total».
    expect(screen.getByText("2/4")).toBeInTheDocument();
    expect(screen.getByText("0/1")).toBeInTheDocument();
  });

  it("«Sin asignar» trae solo las tareas sin usuario", async () => {
    const user = userEvent.setup();
    renderBoard();

    await user.click(screen.getByRole("button", { name: /Usuario/ }));
    await user.click(await screen.findByRole("menuitemcheckbox", { name: "Sin asignar" }));

    expect(titlesIn("Por hacer")).toEqual(["Idea suelta"]);
  });

  it("combina etiqueta y prioridad con Y", async () => {
    const user = userEvent.setup();
    renderBoard();

    await user.click(screen.getByRole("button", { name: /Etiquetas/ }));
    await user.click(await screen.findByRole("menuitemcheckbox", { name: "Técnico" }));
    await user.keyboard("{Escape}");
    expect(titlesIn("Por hacer")).toEqual(["Subir el AAB", "Probar compras"]);

    await user.click(screen.getByRole("button", { name: /Prioridad/ }));
    await user.click(await screen.findByRole("menuitemcheckbox", { name: "Alta" }));
    await user.keyboard("{Escape}");

    expect(titlesIn("Por hacer")).toEqual(["Subir el AAB"]);
    expect(titlesIn("En curso")).toEqual(["Pulir el login"]);
    expect(screen.getByText("Mostrando 2 de 5 tareas")).toBeInTheDocument();
  });

  it("filtra por fecha: vencidas", async () => {
    const user = userEvent.setup();
    renderBoard();

    await user.click(screen.getByRole("button", { name: /Fecha/ }));
    await user.click(await screen.findByRole("button", { name: "Vencidas (sin completar)" }));

    expect(titlesIn("Por hacer")).toEqual(["Revisar contrato"]);
    expect(window.location.search).toBe("?fecha=vencidas");
  });

  it("filtra por rango de fechas al escribir en los campos", async () => {
    const user = userEvent.setup();
    renderBoard();

    await user.click(screen.getByRole("button", { name: /Fecha/ }));
    const from = await screen.findByLabelText("Desde");
    await user.type(from, "2026-10-10");

    expect(titlesIn("Por hacer")).toEqual(["Subir el AAB", "Idea suelta"]);
    expect(window.location.search).toBe("?fecha=rango&desde=2026-10-10");
  });

  it("ordena dentro de cada columna sin tocar el orden guardado", async () => {
    const user = userEvent.setup();
    renderBoard();

    await user.click(screen.getByRole("combobox", { name: "Ordenar tareas" }));
    await user.click(await screen.findByRole("option", { name: "Prioridad: alta primero" }));
    expect(titlesIn("Por hacer")).toEqual(["Subir el AAB", "Idea suelta", "Revisar contrato", "Probar compras"]);

    await user.click(screen.getByRole("combobox", { name: "Ordenar tareas" }));
    await user.click(await screen.findByRole("option", { name: "Fecha límite: más próxima" }));
    // Las tareas sin fecha van al final.
    expect(titlesIn("Por hacer")).toEqual(["Revisar contrato", "Subir el AAB", "Idea suelta", "Probar compras"]);
    expect(window.location.search).toBe("?orden=due-asc");

    await user.click(screen.getByRole("combobox", { name: "Ordenar tareas" }));
    await user.click(await screen.findByRole("option", { name: "Usuario: A → Z" }));
    expect(titlesIn("Por hacer")).toEqual(["Revisar contrato", "Probar compras", "Subir el AAB", "Idea suelta"]);
  });

  it("lee filtros y orden de la URL al cargar", () => {
    setUrl(`?etiqueta=${tecnico.id}&prioridad=alta,baja&orden=priority-asc`);
    renderBoard();

    expect(titlesIn("Por hacer")).toEqual(["Probar compras", "Subir el AAB"]);
    expect(screen.getByText("Mostrando 3 de 5 tareas")).toBeInTheDocument();
  });

  it("«Restablecer» quita filtros y orden y limpia la URL", async () => {
    const user = userEvent.setup();
    setUrl(`?usuario=${jaime.id}&orden=due-desc`);
    renderBoard();
    expect(titlesIn("Por hacer")).toEqual(["Revisar contrato", "Probar compras"]);

    await user.click(screen.getByRole("button", { name: /Restablecer/ }));

    expect(titlesIn("Por hacer")).toEqual(["Subir el AAB", "Revisar contrato", "Probar compras", "Idea suelta"]);
    expect(window.location.search).toBe("");
    expect(screen.queryByText(/Mostrando/)).not.toBeInTheDocument();
  });

  it("no pierde otros parámetros de la URL", async () => {
    const user = userEvent.setup();
    setUrl("?otro=1");
    renderBoard();

    await user.click(screen.getByRole("button", { name: /Prioridad/ }));
    await user.click(await screen.findByRole("menuitemcheckbox", { name: "Baja" }));

    expect(window.location.search).toBe("?otro=1&prioridad=baja");
  });

  it("el botón de columna sigue siendo el nombre aunque haya filtros", () => {
    setUrl(`?usuario=${lander.id}`);
    renderBoard();
    const header = screen.getByText("Por hacer", { selector: "button" }).closest("div.w-72") as HTMLElement;
    expect(within(header).getByText("1/4")).toBeInTheDocument();
  });
});
