import { describe, expect, it } from "vitest";
import { escapeHtml, isPreviewBot, taskIdFromUrl } from "./link-preview";

const ID = "e318a94a-e372-48fd-b56b-38d42886b6b2";

describe("link-preview", () => {
  it("reconoce bots de vista previa", () => {
    expect(isPreviewBot("WhatsApp/2.23.20.0 A")).toBe(true);
    expect(isPreviewBot("Mozilla/5.0 (Windows NT 10.0) Chrome/120")).toBe(false);
    expect(isPreviewBot(null)).toBe(false);
  });

  it("solo acepta /tareas?tarea=<uuid>", () => {
    expect(taskIdFromUrl("/tareas", new URLSearchParams({ tarea: ID }))).toBe(ID);
    expect(taskIdFromUrl("/tareas", new URLSearchParams({ tarea: "x" }))).toBeNull();
    expect(taskIdFromUrl("/crm", new URLSearchParams({ tarea: ID }))).toBeNull();
  });

  it("escapa HTML", () => {
    expect(escapeHtml('<a href="x">&')).toBe("&lt;a href=&quot;x&quot;&gt;&amp;");
  });
});
