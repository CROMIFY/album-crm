import type { BoardColumnRow } from "@/lib/types";

// Columnas plegadas del tablero. Lo que cada persona pliega o despliega a mano
// se guarda en una cookie (por navegador); el servidor la lee para pintar el
// tablero ya plegado, sin parpadeo al hidratar.
export const COLUMN_PREFS_COOKIE = "tareas_columnas";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

// Además de la columna de hecho, estas salen plegadas si nadie ha elegido otra
// cosa: son las que más tarjetas acumulan y menos se miran a diario. Por nombre
// y no por posición: si se renombran, simplemente dejan de plegarse solas.
const COLLAPSED_BY_DEFAULT_NAMES = new Set(["por pensar"]);

/** Elección a mano por columna: true = plegada, false = desplegada. */
export type ColumnPrefs = Record<string, boolean>;

export function collapsedByDefault(column: BoardColumnRow): boolean {
  return column.is_done_column || COLLAPSED_BY_DEFAULT_NAMES.has(column.name.trim().toLocaleLowerCase("es"));
}

export function isColumnCollapsed(column: BoardColumnRow, prefs: ColumnPrefs): boolean {
  return prefs[column.id] ?? collapsedByDefault(column);
}

// Formato de la cookie: "<id>:1.<id>:0" (1 = plegada). Sin comas ni espacios,
// que no son válidos en el valor de una cookie; los ids son uuid.
export function parseColumnPrefs(raw: string | undefined): ColumnPrefs {
  const prefs: ColumnPrefs = {};
  if (!raw) return prefs;
  for (const entry of raw.split(".")) {
    const [id, value] = entry.split(":");
    if (id && (value === "1" || value === "0")) prefs[id] = value === "1";
  }
  return prefs;
}

export function serializeColumnPrefs(prefs: ColumnPrefs): string {
  return Object.entries(prefs)
    .map(([id, collapsed]) => `${id}:${collapsed ? 1 : 0}`)
    .join(".");
}

export function saveColumnPrefs(prefs: ColumnPrefs) {
  document.cookie = `${COLUMN_PREFS_COOKIE}=${serializeColumnPrefs(prefs)}; path=/tareas; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
}
