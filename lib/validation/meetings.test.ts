import { describe, expect, it } from "vitest";
import { meetingSchema, cancelMeetingSchema, meetingNoteSchema, actionItemSchema } from "./meetings";

describe("meetingSchema", () => {
  const base = {
    title: "Weekly Cromify",
    starts_at: "2026-08-01T10:00",
    ends_at: "2026-08-01T10:30",
  };

  it("accepts a valid meeting with only the required fields", () => {
    expect(meetingSchema.safeParse(base).success).toBe(true);
  });

  it("rejects an empty title", () => {
    const result = meetingSchema.safeParse({ ...base, title: "" });
    expect(result.success).toBe(false);
  });

  it("rejects when ends_at is before starts_at", () => {
    const result = meetingSchema.safeParse({
      ...base,
      starts_at: "2026-08-01T10:30",
      ends_at: "2026-08-01T10:00",
    });
    expect(result.success).toBe(false);
  });

  it("rejects when ends_at equals starts_at", () => {
    const result = meetingSchema.safeParse({ ...base, ends_at: base.starts_at });
    expect(result.success).toBe(false);
  });

  it("rejects a non-uuid linked_account_id", () => {
    const result = meetingSchema.safeParse({ ...base, linked_account_id: "not-a-uuid" });
    expect(result.success).toBe(false);
  });
});

describe("cancelMeetingSchema", () => {
  it("requires a non-empty reason", () => {
    expect(cancelMeetingSchema.safeParse({ reason: "" }).success).toBe(false);
    expect(cancelMeetingSchema.safeParse({ reason: "El cliente reprogramó" }).success).toBe(true);
  });
});

describe("meetingNoteSchema", () => {
  it("requires non-empty content", () => {
    expect(meetingNoteSchema.safeParse({ content: "" }).success).toBe(false);
    expect(meetingNoteSchema.safeParse({ content: "Todo bien" }).success).toBe(true);
  });
});

describe("actionItemSchema", () => {
  it("only requires a title", () => {
    expect(actionItemSchema.safeParse({ title: "Enviar propuesta" }).success).toBe(true);
  });

  it("rejects an empty title", () => {
    expect(actionItemSchema.safeParse({ title: "" }).success).toBe(false);
  });

  it("rejects a non-uuid assignee_id", () => {
    const result = actionItemSchema.safeParse({ title: "Enviar propuesta", assignee_id: "nope" });
    expect(result.success).toBe(false);
  });
});
