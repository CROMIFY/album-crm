import { describe, expect, it } from "vitest";
import { safeNextPath, taskPath, taskShareText, taskUrl, whatsappUrl } from "@/lib/share/links";

describe("enlaces de tareas", () => {
  it("apuntan al tablero con ?tarea=", () => {
    expect(taskPath("abc-123")).toBe("/tareas?tarea=abc-123");
    expect(taskUrl("https://crm.cromify.app/", "abc")).toBe("https://crm.cromify.app/tareas?tarea=abc");
  });

  it("WhatsApp lleva el título y el enlace codificados", () => {
    const text = taskShareText("Firmas: 6 clubes & más", "https://crm.cromify.app/tareas?tarea=abc");
    expect(whatsappUrl(text)).toBe(
      "https://wa.me/?text=Firmas%3A%206%20clubes%20%26%20m%C3%A1s%0Ahttps%3A%2F%2Fcrm.cromify.app%2Ftareas%3Ftarea%3Dabc"
    );
  });
});

describe("safeNextPath", () => {
  it("deja pasar rutas internas con su query", () => {
    expect(safeNextPath("/tareas?tarea=abc")).toBe("/tareas?tarea=abc");
  });

  it("no deja salir del CRM", () => {
    for (const bad of [null, "", "https://evil.example", "//evil.example", "/\\evil.example", "javascript:alert(1)", "/login", "/a\nb"]) {
      expect(safeNextPath(bad)).toBe("/");
    }
  });
});
