// Carga los objetivos de objetivos-28oct.json en la tabla goals (migración 0019).
//
//   Ensayo (solo lee):  CRM_ENV_FILE=… node scripts/datos/cargar-objetivos.mjs --plan plan-objetivos.json
//   Aplicar el plan:     CRM_ENV_FILE=… node scripts/datos/cargar-objetivos.mjs --aplicar plan-objetivos.json
//
// El ensayo enseña el valor que saldría del pipeline para cada métrica (y la
// alternativa de «Clubes firmados»), resuelve responsables y guarda el plan.
// --aplicar inserta EXACTAMENTE ese plan si no hay ya objetivos con esos títulos.
import fs from "node:fs";
import { loadEnv, normalize, rest } from "./lib.mjs";

const OBJETIVOS = JSON.parse(fs.readFileSync(new URL("./objetivos-28oct.json", import.meta.url), "utf8")).objetivos;
const args = process.argv.slice(2);
const mode = args.includes("--aplicar") ? "aplicar" : args.includes("--plan") ? "plan" : null;
const file = args[args.indexOf(`--${mode}`) + 1];
if (!mode || !file) {
  console.error("Uso: --plan <salida.json> | --aplicar <plan.json>");
  process.exit(1);
}
const api = rest(loadEnv());

const madridDay = (ts) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(ts));

async function pipeline() {
  const [deals, history] = await Promise.all([
    api.get("deals?select=id,stage,account:accounts(tipo,nombre)"),
    api.get("deal_stage_history?select=deal_id,to_stage,changed_at&to_stage=in.(pdte_firma,cerrado)"),
  ]);
  const clubs = deals.filter((d) => d.account?.tipo === "club");
  const ids = new Set(clubs.map((d) => d.id));
  const entered = (stage, since) =>
    new Set(history.filter((h) => h.to_stage === stage && ids.has(h.deal_id) && madridDay(h.changed_at) >= since).map((h) => h.deal_id)).size;
  return {
    clubes_cerrados: () => clubs.filter((d) => d.stage === "cerrado").length,
    clubes_cerrados_desde_inicio: (since) => entered("cerrado", since),
    clubes_nuevos_pdte_firma: (since) => entered("pdte_firma", since),
    enPdteFirma: clubs.filter((d) => d.stage === "pdte_firma").map((d) => d.account.nombre),
  };
}

if (mode === "plan") {
  // Antes de la migración 0019 no existe la tabla goals: el ensayo sigue (no hay objetivos).
  let has0019 = true;
  const goalsOrEmpty = api.get("goals?select=id,title").catch(() => {
    has0019 = false;
    return [];
  });
  const [profiles, existing, p] = await Promise.all([api.get("profiles?select=id,nombre"), goalsOrEmpty, pipeline()]);
  const warnings = has0019 ? [] : ["La migración 0019 no está aplicada: hay que aplicarla antes de --aplicar."];
  const rows = OBJETIVOS.map((o) => {
    let owner_ids = [];
    if (o.owners.includes("Todos")) owner_ids = profiles.map((x) => x.id);
    else
      for (const name of o.owners) {
        const found = profiles.filter((x) => normalize(x.nombre).split(" ")[0] === normalize(name));
        if (found.length === 1) owner_ids.push(found[0].id);
        else warnings.push(`«${o.title}»: «${name}» no es usuario del CRM (o es ambiguo); responsable vacío.`);
      }
    if (existing.some((g) => normalize(g.title) === normalize(o.title))) warnings.push(`Ya existe un objetivo «${o.title}»: no se creará.`);
    return {
      title: o.title,
      current_value: o.metric ? null : o.current,
      target_value: o.target,
      unit: o.unit,
      starts_on: o.starts_on,
      due_date: o.due,
      owner_ids,
      metric: o.metric ?? null,
      notes: o.notes ?? null,
    };
  });
  const plan = { createdAt: new Date().toISOString(), rows, warnings };
  fs.writeFileSync(file, JSON.stringify(plan, null, 2));
  const name = (id) => profiles.find((x) => x.id === id)?.nombre ?? id;
  for (const r of rows) {
    const value = r.metric ? `${p[r.metric](r.starts_on)} (del CRM, ${r.metric})` : r.current_value ?? "sin dato";
    console.log(`\n«${r.title}»: ${value} / ${r.target_value} ${r.unit ?? ""} · ${r.starts_on} → ${r.due_date} · ${r.owner_ids.map(name).join(", ") || "sin responsable"}`);
  }
  console.log(`\nAlternativa para «Clubes firmados»: todos los clubes en Cerrado ahora = ${p.clubes_cerrados()}.`);
  console.log(`Clubes en Pdte Firma ahora (${p.enPdteFirma.length}): ${p.enPdteFirma.join(", ") || "ninguno"}.`);
  if (warnings.length) console.log(`\nAVISOS:\n- ${warnings.join("\n- ")}`);
  console.log(`\nPlan guardado en ${file}. No se ha escrito nada en la base.`);
} else {
  const plan = JSON.parse(fs.readFileSync(file, "utf8"));
  const existing = await api.get("goals?select=id,title");
  const clash = plan.rows.filter((r) => existing.some((g) => normalize(g.title) === normalize(r.title)));
  if (clash.length) throw new Error(`Ya existen: ${clash.map((r) => r.title).join(", ")}. Repite el ensayo.`);
  const created = await api.insert("goals", plan.rows);
  const after = await api.get("goals?select=id,title,target_value,due_date");
  const missing = plan.rows.filter((r) => !after.some((g) => g.title === r.title && Number(g.target_value) === r.target_value && g.due_date === r.due_date));
  console.log(JSON.stringify({ created: created.map((g) => ({ id: g.id, title: g.title })), missing: missing.map((r) => r.title) }, null, 2));
  if (missing.length) process.exit(2);
}
