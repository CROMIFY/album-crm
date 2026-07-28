import { describe, expect, it } from "vitest";
import { taskAssignedEmail, taskDueReminderEmail } from "./templates";

describe("taskAssignedEmail", () => {
  it("includes the task title in the subject and body", () => {
    const { subject, html } = taskAssignedEmail({
      assigneeName: "Jaime",
      taskTitle: "Revisar despliegue",
      columnName: "Backlog",
      priority: "alta",
      dueDate: "2026-08-01",
    });
    expect(subject).toContain("Revisar despliegue");
    expect(html).toContain("Revisar despliegue");
    expect(html).toContain("Jaime");
    expect(html).toContain("Alta");
  });

  it("omits the due date line when there is none", () => {
    const { html } = taskAssignedEmail({
      assigneeName: "Jaime",
      taskTitle: "Sin fecha",
      columnName: "Backlog",
      priority: "media",
      dueDate: null,
    });
    expect(html).not.toContain("Vence:");
  });

  it("escapes HTML in the task title so it can't inject markup into the email", () => {
    const { html } = taskAssignedEmail({
      assigneeName: "Jaime",
      taskTitle: '<img src=x onerror=alert(1)>',
      columnName: "Backlog",
      priority: "media",
      dueDate: null,
    });
    expect(html).not.toContain("<img src=x onerror=alert(1)>");
    expect(html).toContain("&lt;img");
  });
});

describe("taskDueReminderEmail", () => {
  it("says 'mañana' or 'hoy' depending on when the task is due", () => {
    const tomorrow = taskDueReminderEmail({
      assigneeName: "Pablo",
      taskTitle: "Llamar al club",
      columnName: "En curso",
      when: "mañana",
    });
    expect(tomorrow.subject).toContain("mañana");

    const today = taskDueReminderEmail({
      assigneeName: "Pablo",
      taskTitle: "Llamar al club",
      columnName: "En curso",
      when: "hoy",
    });
    expect(today.subject).toContain("hoy");
  });
});
