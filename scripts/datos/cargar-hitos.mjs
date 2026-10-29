// Carga los hitos de hitos-28oct.json en el tablero del CRM.
//
//   Ensayo (solo lee):  CRM_ENV_FILE=… node scripts/datos/cargar-hitos.mjs --plan plan-hitos.json
//   Aplicar el plan:     CRM_ENV_FILE=… node scripts/datos/cargar-hitos.mjs --aplicar plan-hitos.json
//
// El ensayo lee el tablero vivo, busca tarjetas equivalentes (se actualizan en vez
// de duplicarlas), resuelve responsables por nombre y guarda el plan en un JSON.
// --aplicar escribe EXACTAMENTE ese plan, tras comprobar que el tablero no ha
// cambiado desde el ensayo (mismas tarjetas y mismas huellas de las que se tocan).
// Necesita la migración 0018 aplicada (columnas is_milestone, milestone_type, start_date).
import fs from "node:fs";
import crypto from "node:crypto";
import { loadEnv, normalize, rest, similarity } from "./lib.mjs";

const HITOS = JSON.parse(fs.readFileSync(new URL("./hitos-28oct.json", import.meta.url), "utf8")).hitos;
const STAMP = "[28-oct hito]";
// Hasta el fin del sprint 1 (7-nov) van a la columna «Sprint» con el sprint 1; el resto a «Por pensar».
const SPRINT_1_END = "2026-11-07";
const MATCH_THRESHOLD = 0.6;

const args = process.argv.slice(2);
const planFile = args[args.indexOf("--plan") + 1];
const applyFile = args[args.indexOf("--aplicar") + 1];
if (!args.includes("--plan") && !args.includes("--aplicar")) {
  console.error("Uso: --plan <salida.json> | --aplicar <plan.json>");
  process.exit(1);
}

const api = rest(loadEnv());

const fingerprint = (t) =>
  crypto
    .createHash("md5")
    .update(JSON.stringify([t.title, t.description, t.due_date, t.column_id, t.is_milestone, t.milestone_type, t.start_date]))
    .digest("hex");

async function readBoard() {
  const [columns, tasks, profiles, sprints] = await Promise.all([
    api.get("board_columns?select=id,name,position,is_done_column&order=position"),
    api.get(
      "tasks?select=id,title,description,due_date,column_id,position,done,is_milestone,milestone_type,start_date,sprint_id,task_assignees(profile_id)"
    ),
    api.get("profiles?select=id,nombre,email"),
    api.get("sprints?select=id,name,starts_on,ends_on"),
  ]);
  return { columns, tasks, profiles, sprints };
}

function resolveOwners(names, profiles, warnings, title) {
  if (names.includes("Todos")) return profiles.map((p) => p.id);
  const ids = [];
  for (const name of names) {
    const found = profiles.filter((p) => normalize(p.nombre).split(" ")[0] === normalize(name).split(" ")[0]);
    if (found.length === 1) ids.push(found[0].id);
    else warnings.push(`«${title}»: «${name}» ${found.length ? "es ambiguo" : "no es usuario del CRM"}; responsable vacío.`);
  }
  return ids;
}

async function makePlan() {
  const board = await readBoard();
  const byName = (n) => board.columns.find((c) => normalize(c.name) === normalize(n));
  const sprintCol = byName("Sprint");
  const backlogCol = byName("Por pensar");
  const sprint1 = board.sprints.find((s) => s.name === "Sprint 1");
  if (!sprintCol || !backlogCol) throw new Error("No encuentro las columnas «Sprint» y «Por pensar».");

  const warnings = [];
  const used = new Set();
  const steps = HITOS.map((h) => {
    const owners = resolveOwners(h.owners, board.profiles, warnings, h.title);
    const candidates = board.tasks
      .filter((t) => !used.has(t.id))
      .map((t) => ({ t, score: similarity(t.title, h.title) }))
      .filter((c) => c.score >= MATCH_THRESHOLD)
      .sort((a, b) => b.score - a.score);
    const fields = {
      due_date: h.due,
      start_date: h.start ?? null,
      is_milestone: true,
      milestone_type: h.type,
    };
    if (candidates.length > 0) {
      const { t, score } = candidates[0];
      used.add(t.id);
      return {
        action: "actualizar",
        hito: h.title,
        taskId: t.id,
        currentTitle: t.title,
        score: Math.round(score * 100) / 100,
        fingerprint: fingerprint(t),
        before: { due_date: t.due_date, start_date: t.start_date, milestone_type: t.milestone_type },
        patch: {
          ...fields,
          description: `${STAMP} Marcada como hito. Antes: fecha ${t.due_date ?? "sin fecha"}.${h.note ? ` ${h.note}` : ""}\n\n${t.description ?? ""}`.trim(),
        },
        addOwners: owners.filter((id) => !t.task_assignees.some((a) => a.profile_id === id)),
        otherCandidates: candidates.slice(1, 3).map((c) => c.t.title),
      };
    }
    const inSprint = h.due <= SPRINT_1_END;
    return {
      action: "crear",
      hito: h.title,
      row: {
        title: h.title,
        description: `${STAMP}${h.note ? ` ${h.note}` : ""}`,
        column_id: inSprint ? sprintCol.id : backlogCol.id,
        sprint_id: inSprint && sprint1 ? sprint1.id : null,
        priority: "alta",
        ...fields,
      },
      column: inSprint ? sprintCol.name : backlogCol.name,
      owners,
    };
  });

  return {
    createdAt: new Date().toISOString(),
    totalTasks: board.tasks.length,
    warnings,
    steps,
  };
}

function printPlan(plan, board) {
  const name = (id) => board.profiles.find((p) => p.id === id)?.nombre ?? id;
  console.log(`Tablero: ${plan.totalTasks} tarjetas.`);
  for (const s of plan.steps) {
    if (s.action === "actualizar") {
      console.log(`\nACTUALIZAR (parecido ${s.score}) «${s.currentTitle}»\n  ← hito «${s.hito}»`);
      console.log(`  fecha ${s.before.due_date ?? "—"} → ${s.patch.start_date ? `${s.patch.start_date}…` : ""}${s.patch.due_date}, tipo ${s.patch.milestone_type ?? "sin tipo"}`);
      if (s.addOwners.length) console.log(`  + responsables: ${s.addOwners.map(name).join(", ")}`);
      if (s.otherCandidates.length) console.log(`  otras parecidas: ${s.otherCandidates.join(" | ")}`);
    } else {
      console.log(`\nCREAR «${s.row.title}»`);
      console.log(`  ${s.row.start_date ? `${s.row.start_date}…` : ""}${s.row.due_date} · ${s.row.milestone_type ?? "sin tipo"} · ${s.column} · ${s.owners.map(name).join(", ") || "sin responsable"}`);
    }
  }
  if (plan.warnings.length) console.log(`\nAVISOS:\n- ${plan.warnings.join("\n- ")}`);
}

if (args.includes("--plan")) {
  const plan = await makePlan();
  fs.writeFileSync(planFile, JSON.stringify(plan, null, 2));
  printPlan(plan, await readBoard());
  console.log(`\nPlan guardado en ${planFile}. No se ha escrito nada en la base.`);
} else {
  const plan = JSON.parse(fs.readFileSync(applyFile, "utf8"));
  const board = await readBoard();
  // Guardas: nada ha cambiado desde el ensayo.
  if (board.tasks.length !== plan.totalTasks) {
    throw new Error(`El tablero tiene ${board.tasks.length} tarjetas y el plan se hizo con ${plan.totalTasks}. Repite el ensayo.`);
  }
  for (const s of plan.steps.filter((x) => x.action === "actualizar")) {
    const t = board.tasks.find((x) => x.id === s.taskId);
    if (!t || fingerprint(t) !== s.fingerprint) throw new Error(`«${s.currentTitle}» ha cambiado desde el ensayo. Repite el ensayo.`);
  }
  for (const s of plan.steps.filter((x) => x.action === "crear")) {
    if (board.tasks.some((t) => normalize(t.title) === normalize(s.row.title))) {
      throw new Error(`Ya existe una tarjeta «${s.row.title}». Repite el ensayo.`);
    }
  }

  const done = [];
  for (const s of plan.steps) {
    if (s.action === "actualizar") {
      await api.update("tasks", `id=eq.${s.taskId}`, s.patch);
      if (s.addOwners.length) {
        await api.insert("task_assignees", s.addOwners.map((profile_id) => ({ task_id: s.taskId, profile_id })));
      }
      done.push({ action: "actualizada", id: s.taskId, title: s.currentTitle });
    } else {
      const count = board.tasks.filter((t) => t.column_id === s.row.column_id).length;
      const [created] = await api.insert("tasks", [{ ...s.row, position: count }]);
      board.tasks.push(created);
      if (s.owners.length) {
        await api.insert("task_assignees", s.owners.map((profile_id) => ({ task_id: created.id, profile_id })));
      }
      done.push({ action: "creada", id: created.id, title: created.title });
    }
  }

  // Verificación: cada hito está en la base con sus campos.
  const after = await readBoard();
  const problems = [];
  for (const [i, s] of plan.steps.entries()) {
    const t = after.tasks.find((x) => x.id === done[i].id);
    const want = s.action === "actualizar" ? s.patch : s.row;
    if (!t || t.due_date !== want.due_date || t.milestone_type !== want.milestone_type || !t.is_milestone || (t.start_date ?? null) !== want.start_date) {
      problems.push(done[i].title);
    }
  }
  console.log(JSON.stringify({ done, totalAfter: after.tasks.length, problems }, null, 2));
  if (problems.length) process.exit(2);
}
