import { describe, expect, it } from "vitest";
import { doneAfterMove } from "./move";

describe("doneAfterMove", () => {
  it("completa la tarea al entrar en una columna de hecho", () => {
    expect(doneAfterMove({ fromDoneColumn: false, toDoneColumn: true, hasPendingSubtasks: false })).toBe(true);
  });

  it("no la completa si le quedan subtareas pendientes", () => {
    expect(doneAfterMove({ fromDoneColumn: false, toDoneColumn: true, hasPendingSubtasks: true })).toBeUndefined();
  });

  it("la reabre al sacarla de una columna de hecho", () => {
    expect(doneAfterMove({ fromDoneColumn: true, toDoneColumn: false, hasPendingSubtasks: false })).toBe(false);
  });

  it("no toca done entre columnas normales (respeta el check manual)", () => {
    expect(doneAfterMove({ fromDoneColumn: false, toDoneColumn: false, hasPendingSubtasks: false })).toBeUndefined();
  });
});
