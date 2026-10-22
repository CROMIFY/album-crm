import { describe, expect, it } from "vitest";
import { currentSprint, formatSprintDates, nextSprint, sprintProgress, sprintSizes } from "./sprints";
import type { SprintRow } from "@/lib/types";

function sprint(id: string, starts_on: string, ends_on: string): SprintRow {
  return {
    id,
    name: id,
    starts_on,
    ends_on,
    goal: null,
    closed_at: null,
    closed_count: null,
    carried_count: null,
    created_at: "2026-10-21T00:00:00Z",
  };
}

const S1 = sprint("s1", "2026-10-27", "2026-11-07");
const S2 = sprint("s2", "2026-11-10", "2026-11-21");

describe("currentSprint", () => {
  it("elige el sprint en marcha, con los dos extremos incluidos", () => {
    expect(currentSprint([S2, S1], "2026-10-27")?.id).toBe("s1");
    expect(currentSprint([S2, S1], "2026-11-07")?.id).toBe("s1");
    expect(currentSprint([S2, S1], "2026-11-15")?.id).toBe("s2");
  });

  it("antes de empezar, o entre dos sprints, elige el próximo", () => {
    expect(currentSprint([S1, S2], "2026-10-21")?.id).toBe("s1");
    expect(currentSprint([S1, S2], "2026-11-08")?.id).toBe("s2");
  });

  it("cuando ya terminaron todos, elige el último", () => {
    expect(currentSprint([S1, S2], "2026-12-01")?.id).toBe("s2");
  });

  it("sin sprints no hay actual", () => {
    expect(currentSprint([], "2026-10-21")).toBeNull();
  });

  it("un sprint cerrado antes de tiempo deja de ser el actual", () => {
    const s1Cerrado = { ...S1, closed_at: "2026-11-05T10:00:00Z" };
    expect(currentSprint([s1Cerrado, S2], "2026-11-05")?.id).toBe("s2");
  });

  it("con todo cerrado, el actual es el último", () => {
    const cerrados = [S1, S2].map((s) => ({ ...s, closed_at: "2026-11-21T10:00:00Z" }));
    expect(currentSprint(cerrados, "2026-11-15")?.id).toBe("s2");
  });
});

describe("nextSprint", () => {
  it("es el primer sprint abierto que empieza después", () => {
    const s3 = sprint("s3", "2026-11-24", "2026-12-05");
    expect(nextSprint([s3, S2, S1], S1)?.id).toBe("s2");
    expect(nextSprint([s3, { ...S2, closed_at: "2026-11-21T10:00:00Z" }, S1], S1)?.id).toBe("s3");
    expect(nextSprint([S1, S2], S2)).toBeNull();
  });
});

describe("sprintSizes", () => {
  it("cuenta por tamaño, aparte las sin tamaño, y suma S=1, M=2, L=3", () => {
    const tasks = [
      { sprint_id: "s1", size: "S" as const },
      { sprint_id: "s1", size: "M" as const },
      { sprint_id: "s1", size: "L" as const },
      { sprint_id: "s1", size: "L" as const },
      { sprint_id: "s1", size: null },
      { sprint_id: "s2", size: "L" as const },
    ];
    expect(sprintSizes(tasks, "s1")).toEqual({ counts: { S: 1, M: 1, L: 2 }, unsized: 1, points: 9 });
  });
});

describe("sprintProgress", () => {
  it("cuenta solo las tareas del sprint", () => {
    const tasks = [
      { sprint_id: "s1", done: true },
      { sprint_id: "s1", done: false },
      { sprint_id: "s2", done: true },
      { sprint_id: null, done: true },
    ];
    expect(sprintProgress(tasks, "s1")).toEqual({ closed: 1, total: 2 });
  });
});

describe("formatSprintDates", () => {
  it("da día y mes corto", () => {
    expect(formatSprintDates(S1)).toBe("27 oct – 7 nov");
  });
});
