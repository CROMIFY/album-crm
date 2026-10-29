// Tipos de hito (columna tasks.milestone_type, migración 0018) y su color en el calendario.

export const MILESTONE_TYPES = [
  "despliegue",
  "tests",
  "pruebas",
  "tiendas",
  "seguridad",
  "legal",
  "comercial",
  "lanzamiento",
] as const;

export type MilestoneType = (typeof MILESTONE_TYPES)[number];

export const MILESTONE_TYPE_LABELS: Record<MilestoneType, string> = {
  despliegue: "Despliegue",
  tests: "Tests",
  pruebas: "Pruebas (testers)",
  tiendas: "Tiendas",
  seguridad: "Seguridad",
  legal: "Legal",
  comercial: "Comercial",
  lanzamiento: "Lanzamiento",
};

// Tonos con texto blanco legible en tema claro y oscuro.
export const MILESTONE_TYPE_COLORS: Record<MilestoneType, string> = {
  despliegue: "#2563EB",
  tests: "#0E7490",
  pruebas: "#7C3AED",
  tiendas: "#BE185D",
  seguridad: "#DC2626",
  legal: "#B45309",
  comercial: "#047857",
  lanzamiento: "#EA580C",
};

/** Hito sin tipo (p. ej. un colchón para imprevistos). */
export const MILESTONE_NO_TYPE_COLOR = "#64748B";

export function isMilestoneType(value: unknown): value is MilestoneType {
  return typeof value === "string" && (MILESTONE_TYPES as readonly string[]).includes(value);
}

export function milestoneColor(type: string | null | undefined): string {
  return isMilestoneType(type) ? MILESTONE_TYPE_COLORS[type] : MILESTONE_NO_TYPE_COLOR;
}
