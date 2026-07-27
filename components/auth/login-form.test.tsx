import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoginForm } from "./login-form";

const replace = vi.fn();
const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, refresh }),
}));

const signIn = vi.fn();
vi.mock("@/lib/actions/auth", () => ({
  signIn: (...args: unknown[]) => signIn(...args),
}));

describe("LoginForm", () => {
  beforeEach(() => {
    signIn.mockReset();
    replace.mockReset();
    refresh.mockReset();
  });

  it("shows a validation error and never calls the server action for an invalid email", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText("Email"), "not-an-email");
    await user.type(screen.getByLabelText("Contraseña"), "whatever");
    await user.click(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByText(/email válido/i)).toBeInTheDocument();
    expect(signIn).not.toHaveBeenCalled();
  });

  it("submits valid credentials and redirects on success", async () => {
    signIn.mockResolvedValue({ error: null });
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText("Email"), "user@example.com");
    await user.type(screen.getByLabelText("Contraseña"), "hunter2");
    await user.click(screen.getByRole("button", { name: "Entrar" }));

    await waitFor(() => {
      expect(signIn).toHaveBeenCalledWith({ email: "user@example.com", password: "hunter2" });
    });
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
  });

  it("shows the returned error and does not redirect on failed login", async () => {
    signIn.mockResolvedValue({ error: "Email o contraseña incorrectos." });
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText("Email"), "user@example.com");
    await user.type(screen.getByLabelText("Contraseña"), "wrong");
    await user.click(screen.getByRole("button", { name: "Entrar" }));

    await waitFor(() => expect(signIn).toHaveBeenCalled());
    expect(replace).not.toHaveBeenCalled();
  });
});
