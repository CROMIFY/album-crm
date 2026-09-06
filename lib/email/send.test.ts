import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

// send.ts imports "server-only", which throws outside Next's server bundling
// condition (i.e. under plain Vitest) — neutralize it just for this test.
vi.mock("server-only", () => ({}));

describe("sendEmail", () => {
  const originalKey = process.env.RESEND_API_KEY;
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    vi.resetModules();
  });

  afterEach(() => {
    process.env.RESEND_API_KEY = originalKey;
    vi.unstubAllGlobals();
  });

  it("no-ops without throwing when RESEND_API_KEY is not configured", async () => {
    delete process.env.RESEND_API_KEY;
    const { sendEmail } = await import("./send");

    const result = await sendEmail({ to: "a@b.com", subject: "Hola", html: "<p>hola</p>" });

    expect(result).toEqual({ sent: false });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends through the Resend API when RESEND_API_KEY is configured", async () => {
    process.env.RESEND_API_KEY = "fake-api-key";
    fetchMock.mockResolvedValue({ ok: true, text: async () => "" });
    const { sendEmail } = await import("./send");

    const result = await sendEmail({ to: "a@b.com", subject: "Hola", html: "<p>hola</p>" });

    expect(result).toEqual({ sent: true });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer fake-api-key" }),
        body: JSON.stringify({
          from: "AlbumCromos CRM <crm@cromify.app>",
          to: "a@b.com",
          subject: "Hola",
          html: "<p>hola</p>",
        }),
      })
    );
  });

  it("throws when Resend responds with an error", async () => {
    process.env.RESEND_API_KEY = "fake-api-key";
    fetchMock.mockResolvedValue({ ok: false, status: 422, text: async () => "invalid from" });
    const { sendEmail } = await import("./send");

    await expect(
      sendEmail({ to: "a@b.com", subject: "Hola", html: "<p>hola</p>" })
    ).rejects.toThrow("422");
  });
});
