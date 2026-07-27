import { describe, expect, it } from "vitest";
import {
  PROVINCIAS_ESPANA,
  SPONSOR_LEVELS,
  SPONSOR_LEVEL_LABELS,
  SPONSOR_SCOPE_LABELS,
  DEAL_STAGES,
  DEAL_STAGE_LABELS,
  DEAL_STAGE_DESCRIPTIONS,
} from "./types";

describe("PROVINCIAS_ESPANA", () => {
  it("has no duplicates", () => {
    expect(new Set(PROVINCIAS_ESPANA).size).toBe(PROVINCIAS_ESPANA.length);
  });

  it("covers the 50 provinces plus Ceuta and Melilla", () => {
    expect(PROVINCIAS_ESPANA).toHaveLength(52);
  });
});

describe("sponsor label maps", () => {
  it("has a label for every SPONSOR_LEVELS entry", () => {
    for (const level of SPONSOR_LEVELS) {
      expect(SPONSOR_LEVEL_LABELS[level]).toBeTruthy();
    }
  });

  it("covers both scopes", () => {
    expect(Object.keys(SPONSOR_SCOPE_LABELS).sort()).toEqual(["global", "local"]);
  });
});

describe("deal stage maps", () => {
  it("has a label and description for every stage, in the same order", () => {
    for (const stage of DEAL_STAGES) {
      expect(DEAL_STAGE_LABELS[stage]).toBeTruthy();
      expect(DEAL_STAGE_DESCRIPTIONS[stage]).toBeTruthy();
    }
  });
});
