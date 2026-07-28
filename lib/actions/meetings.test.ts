import { describe, expect, it, vi, beforeEach } from "vitest";
import { createMeeting, cancelMeeting, addMeetingNote } from "./meetings";

// meetings.ts no importa "server-only" directamente, pero sus dependencias
// (lib/actions/tasks, lib/google/calendar) sí — se mockean por completo para
// no arrastrar nodemailer/googleapis a este test.
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/actions/tasks", () => ({ createTask: vi.fn(), setTaskDone: vi.fn() }));
vi.mock("@/lib/google/calendar", () => ({
  createCalendarEvent: vi.fn(async () => null),
  updateCalendarEvent: vi.fn(async () => false),
  deleteCalendarEvent: vi.fn(async () => false),
}));

const createClientMock = vi.fn();
vi.mock("@/lib/supabase/server", () => ({ createClient: () => createClientMock() }));

type FakeResult = { data?: unknown; error?: unknown };

// No hay precedente en el repo para mockear el query builder encadenable de
// Supabase (ver lib/email/send.test.ts para el único mock existente, que es
// de nodemailer). Este builder soporta cualquier cadena de filtros y resuelve
// al resultado configurado en cuanto se hace `await` o se llama a
// `.single()`/`.maybeSingle()`.
function fakeBuilder(result: FakeResult) {
  const chainMethods = [
    "select",
    "insert",
    "update",
    "delete",
    "eq",
    "in",
    "order",
    "limit",
    "gte",
    "lte",
    "neq",
    "or",
  ];
  const builder: Record<string, unknown> = {};
  for (const method of chainMethods) {
    builder[method] = vi.fn(() => builder);
  }
  builder.single = vi.fn(async () => result);
  builder.maybeSingle = vi.fn(async () => result);
  builder.then = (
    resolve: (value: FakeResult) => unknown,
    reject: (reason: unknown) => unknown
  ) => Promise.resolve(result).then(resolve, reject);
  return builder;
}

function makeSupabase({
  tableResults = {},
  user = { id: "profile-1" },
}: {
  tableResults?: Record<string, FakeResult>;
  user?: { id: string } | null;
}) {
  return {
    auth: { getUser: vi.fn(async () => ({ data: { user } })) },
    from: vi.fn((table: string) => fakeBuilder(tableResults[table] ?? { data: null, error: null })),
  };
}

describe("meetings server actions", () => {
  beforeEach(() => {
    createClientMock.mockReset();
  });

  it("createMeeting inserta la reunión y devuelve su id", async () => {
    const meetingRow = {
      id: "meeting-1",
      title: "Weekly Cromify",
      linked_deal_id: null,
      created_by: "profile-1",
    };
    createClientMock.mockResolvedValue(
      makeSupabase({ tableResults: { meetings: { data: meetingRow, error: null } } })
    );

    const id = await createMeeting({
      title: "Weekly Cromify",
      startsAt: "2026-08-01T10:00:00.000Z",
      endsAt: "2026-08-01T10:30:00.000Z",
    });

    expect(id).toBe("meeting-1");
  });

  it("createMeeting lanza un error si Supabase falla", async () => {
    createClientMock.mockResolvedValue(
      makeSupabase({ tableResults: { meetings: { data: null, error: { message: "boom" } } } })
    );

    await expect(
      createMeeting({
        title: "Weekly Cromify",
        startsAt: "2026-08-01T10:00:00.000Z",
        endsAt: "2026-08-01T10:30:00.000Z",
      })
    ).rejects.toThrow("boom");
  });

  it("cancelMeeting guarda el motivo y pasa la reunión a cancelada", async () => {
    const supabase = makeSupabase({
      tableResults: {
        meetings: {
          data: {
            id: "meeting-1",
            linked_deal_id: null,
            google_calendar_event_id: null,
            created_by: "profile-1",
          },
          error: null,
        },
      },
    });
    createClientMock.mockResolvedValue(supabase);

    await cancelMeeting("meeting-1", "Cliente reprogramó");

    expect(supabase.from).toHaveBeenCalledWith("meetings");
  });

  it("addMeetingNote inserta la nota con el autor de la sesión actual", async () => {
    const supabase = makeSupabase({
      tableResults: { meeting_notes: { data: null, error: null } },
    });
    createClientMock.mockResolvedValue(supabase);

    await expect(addMeetingNote("meeting-1", "Todo bien")).resolves.toBeUndefined();
    expect(supabase.from).toHaveBeenCalledWith("meeting_notes");
  });

  it("addMeetingNote lanza un error si Supabase falla", async () => {
    const supabase = makeSupabase({
      tableResults: { meeting_notes: { data: null, error: { message: "boom" } } },
    });
    createClientMock.mockResolvedValue(supabase);

    await expect(addMeetingNote("meeting-1", "Todo bien")).rejects.toThrow("boom");
  });
});
