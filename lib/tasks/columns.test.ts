import { describe, expect, it } from "vitest";
import {
  collapsedByDefault,
  isColumnCollapsed,
  parseColumnPrefs,
  serializeColumnPrefs,
} from "./columns";
import type { BoardColumnRow } from "@/lib/types";

function column(name: string, overrides: Partial<BoardColumnRow> = {}): BoardColumnRow {
  return { id: `c-${name}`, name, position: 0, is_done_column: false, created_at: "", ...overrides };
}

describe("collapsedByDefault", () => {
  it("pliega la columna de hecho, se llame como se llame", () => {
    expect(collapsedByDefault(column("Hecho", { is_done_column: true }))).toBe(true);
    expect(collapsedByDefault(column("Terminado", { is_done_column: true }))).toBe(true);
  });

  it("pliega «Por pensar» sin importar mayúsculas ni espacios", () => {
    expect(collapsedByDefault(column("Por pensar"))).toBe(true);
    expect(collapsedByDefault(column("  POR PENSAR "))).toBe(true);
  });

  it("deja desplegadas las demás", () => {
    expect(collapsedByDefault(column("Esta quincena"))).toBe(false);
    expect(collapsedByDefault(column("En curso"))).toBe(false);
  });
});

describe("isColumnCollapsed", () => {
  it("la elección guardada manda sobre el valor por defecto", () => {
    const hecho = column("Hecho", { is_done_column: true });
    const enCurso = column("En curso");
    expect(isColumnCollapsed(hecho, {})).toBe(true);
    expect(isColumnCollapsed(hecho, { [hecho.id]: false })).toBe(false);
    expect(isColumnCollapsed(enCurso, { [enCurso.id]: true })).toBe(true);
  });
});

describe("cookie de columnas", () => {
  it("ida y vuelta", () => {
    const prefs = { "a3e7fd75-aa77-4b6d-a9b0-2ba09811e269": true, "716f2fb3-0019-4547-90ce-daaeb1bba9b1": false };
    const raw = serializeColumnPrefs(prefs);
    expect(raw).toBe("a3e7fd75-aa77-4b6d-a9b0-2ba09811e269:1.716f2fb3-0019-4547-90ce-daaeb1bba9b1:0");
    expect(raw).not.toMatch(/[,;\s]/);
    expect(parseColumnPrefs(raw)).toEqual(prefs);
  });

  it("sin cookie o con basura, no hay elecciones", () => {
    expect(parseColumnPrefs(undefined)).toEqual({});
    expect(parseColumnPrefs("")).toEqual({});
    expect(parseColumnPrefs("x:2.:1.y.z:0")).toEqual({ z: false });
  });
});
