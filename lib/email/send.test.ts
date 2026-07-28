import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

// send.ts imports "server-only", which throws outside Next's server bundling
// condition (i.e. under plain Vitest) — neutralize it just for this test.
vi.mock("server-only", () => ({}));

const sendMail = vi.fn();
vi.mock("nodemailer", () => ({
  default: {
    createTransport: () => ({ sendMail }),
  },
}));

describe("sendEmail", () => {
  const originalUser = process.env.GMAIL_USER;
  const originalPass = process.env.GMAIL_APP_PASSWORD;

  beforeEach(() => {
    sendMail.mockReset();
    vi.resetModules();
  });

  afterEach(() => {
    process.env.GMAIL_USER = originalUser;
    process.env.GMAIL_APP_PASSWORD = originalPass;
  });

  it("no-ops without throwing when credentials are not configured", async () => {
    delete process.env.GMAIL_USER;
    delete process.env.GMAIL_APP_PASSWORD;
    const { sendEmail } = await import("./send");

    const result = await sendEmail({ to: "a@b.com", subject: "Hola", html: "<p>hola</p>" });

    expect(result).toEqual({ sent: false });
    expect(sendMail).not.toHaveBeenCalled();
  });

  it("sends through nodemailer when credentials are configured", async () => {
    process.env.GMAIL_USER = "cromifyes@gmail.com";
    process.env.GMAIL_APP_PASSWORD = "fake-app-password";
    const { sendEmail } = await import("./send");

    const result = await sendEmail({ to: "a@b.com", subject: "Hola", html: "<p>hola</p>" });

    expect(result).toEqual({ sent: true });
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "a@b.com", subject: "Hola", html: "<p>hola</p>" })
    );
  });
});
