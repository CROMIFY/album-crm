// Utilidades de los scripts de datos del CRM (Node 20+, sin dependencias).
// La clave se lee del archivo que diga CRM_ENV_FILE (NEXT_PUBLIC_SUPABASE_URL y
// SUPABASE_SERVICE_ROLE_KEY) y nunca se imprime.
import fs from "node:fs";

export function loadEnv() {
  const file = process.env.CRM_ENV_FILE;
  if (!file) throw new Error("Falta CRM_ENV_FILE (ruta al .env con la service role del CRM).");
  const env = Object.fromEntries(
    fs
      .readFileSync(file, "utf8")
      .split(/\r?\n/)
      .filter((l) => l.includes("=") && !l.trimStart().startsWith("#"))
      .map((l) => {
        const i = l.indexOf("=");
        return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, "")];
      })
  );
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("El .env no tiene NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.");
  return { url, key };
}

export function rest({ url, key }) {
  async function call(method, path, body, prefer) {
    const res = await fetch(`${url}/rest/v1/${path}`, {
      method,
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        ...(prefer && { Prefer: prefer }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`${method} ${path.split("?")[0]} → ${res.status} ${text}`);
    return text ? JSON.parse(text) : null;
  }
  return {
    get: (path) => call("GET", path),
    insert: (table, rows) => call("POST", table, rows, "return=representation"),
    update: (table, filter, patch) => call("PATCH", `${table}?${filter}`, patch, "return=representation"),
  };
}

/** Minúsculas, sin acentos ni signos: para comparar títulos. */
export function normalize(text) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const STOP = new Set("a al de del el en la las los lo y o con por para que se su sus un una 1 2 3".split(" "));

export function tokens(text) {
  return new Set(normalize(text).split(" ").filter((w) => w.length > 2 && !STOP.has(w)));
}

/** Parecido entre títulos (0–1): palabras en común sobre las del más corto. */
export function similarity(a, b) {
  const ta = tokens(a);
  const tb = tokens(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let common = 0;
  for (const w of ta) if (tb.has(w)) common++;
  return common / Math.min(ta.size, tb.size);
}
