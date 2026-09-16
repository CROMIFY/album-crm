import { describe, expect, it, vi, beforeEach } from "vitest";
import { updateTask } from "./tasks";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

type SendEmailArgs = { to: string; subject: string; html: string };
const sendEmailMock = vi.fn(async (args: SendEmailArgs) => {
  void args;
  return { sent: true as const };
});
vi.mock("@/lib/email/send", () => ({
  sendEmail: (args: SendEmailArgs) => sendEmailMock(args),
}));

const createClientMock = vi.fn();
vi.mock("@/lib/supabase/server", () => ({ createClient: () => createClientMock() }));

type FakeResult = { data?: unknown; error?: unknown };

// Mismo builder encadenable que lib/actions/meetings.test.ts: cada `.from(table)`
// devuelve un builder nuevo que siempre resuelve al resultado fijado para esa
// tabla, sin distinguir entre select/insert/delete.
function fakeBuilder(result: FakeResult) {
  const chainMethods = ["select", "insert", "update", "delete", "eq", "in", "order", "limit"];
  const builder: Record<string, unknown> = {};
  for (const method of chainMethods) {
    builder[method] = vi.fn(() => builder);
  }
  builder.single = vi.fn(async () => result);
  builder.then = (
    resolve: (value: FakeResult) => unknown,
    reject: (reason: unknown) => unknown
  ) => Promise.resolve(result).then(resolve, reject);
  return builder;
}

function makeSupabase(tableResults: Record<string, FakeResult>) {
  return {
    from: vi.fn((table: string) => fakeBuilder(tableResults[table] ?? { data: null, error: null })),
  };
}

const EXISTING_TASK = {
  column_id: "col-1",
  title: "Task X",
  description: "desc",
  priority: "media" as const,
  due_date: "2026-09-01",
};

describe("updateTask — emails", () => {
  beforeEach(() => {
    createClientMock.mockReset();
    sendEmailMock.mockClear();
  });

  it("avisa a los ya asignados cuando cambia la fecha límite, sin tocar los asignados", async () => {
    createClientMock.mockResolvedValue(
      makeSupabase({
        tasks: { data: EXISTING_TASK, error: null },
        task_assignees: { data: [{ profile_id: "p1" }], error: null },
        profiles: { data: [{ nombre: "Ana", email: "ana@test.com" }], error: null },
        board_columns: { data: { name: "Backlog" }, error: null },
      })
    );

    await updateTask("task-1", { dueDate: "2026-09-10" });

    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    expect(sendEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({ to: "ana@test.com", subject: expect.stringContaining("Tarea actualizada") })
    );
  });

  it("no envía ningún email si el cambio no es relevante (p.ej. solo linkedAccountId)", async () => {
    createClientMock.mockResolvedValue(
      makeSupabase({
        tasks: { data: EXISTING_TASK, error: null },
        task_assignees: { data: [{ profile_id: "p1" }], error: null },
      })
    );

    await updateTask("task-1", { linkedAccountId: "acc-1" });

    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("avisa solo a los recién añadidos con el email de 'tarea asignada', no con el de 'actualizada'", async () => {
    createClientMock.mockResolvedValue(
      makeSupabase({
        tasks: { data: EXISTING_TASK, error: null },
        task_assignees: { data: [{ profile_id: "p1" }], error: null },
        profiles: { data: [{ nombre: "Beta", email: "beta@test.com" }], error: null },
        board_columns: { data: { name: "Backlog" }, error: null },
      })
    );

    await updateTask("task-1", { assigneeIds: ["p1", "p2"] });

    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    expect(sendEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({ to: "beta@test.com", subject: expect.stringContaining("Nueva tarea asignada") })
    );
  });
});
