import type { AccountRow, BoardColumnRow, DealStage, DealWithRelations, TaskWithRelations } from "@/lib/types";

// Datos de mentira para el banco de pruebas de Playwright (/e2e). No salen de aquí.
const STAMP = "2026-10-01T00:00:00Z";

export const E2E_COLUMNS: BoardColumnRow[] = [
  { id: "col-pensar", name: "Por pensar", position: 0, is_done_column: false, created_at: STAMP },
  { id: "col-sprint", name: "Sprint", position: 1, is_done_column: false, created_at: STAMP },
  { id: "col-curso", name: "En curso", position: 2, is_done_column: false, created_at: STAMP },
  { id: "col-hecho", name: "Hecho", position: 3, is_done_column: true, created_at: STAMP },
];

function task(id: string, columnId: string, position: number): TaskWithRelations {
  return {
    id,
    column_id: columnId,
    title: `Tarea ${id}`,
    description: null,
    due_date: null,
    priority: "media",
    position,
    done: false,
    done_at: null,
    sprint_id: null,
    size: null,
    linked_account_id: null,
    linked_deal_id: null,
    created_at: STAMP,
    updated_at: STAMP,
    labels: [],
    assignees: [],
    subtasks: [],
  };
}

// Bastantes en «Sprint» para que la columna tenga scroll vertical en un móvil.
export const E2E_TASKS: TaskWithRelations[] = [
  ...Array.from({ length: 4 }, (_, i) => task(`p${i + 1}`, "col-pensar", i)),
  ...Array.from({ length: 12 }, (_, i) => task(`s${i + 1}`, "col-sprint", i)),
  ...Array.from({ length: 2 }, (_, i) => task(`c${i + 1}`, "col-curso", i)),
  ...Array.from({ length: 2 }, (_, i) => task(`h${i + 1}`, "col-hecho", i)),
];

function deal(id: string, stage: DealStage): DealWithRelations {
  const account: AccountRow = {
    id: `acc-${id}`,
    tipo: "club",
    nombre: `Club ${id}`,
    telefono: null,
    email: null,
    web: null,
    external_club_id: null,
    owner_name: null,
    provincia: null,
    alcance: null,
    nivel: null,
    created_at: STAMP,
  };
  return {
    id,
    account_id: account.id,
    contact_id: null,
    stage,
    stage_entered_at: STAMP,
    lost_reason: null,
    amount: null,
    created_at: STAMP,
    updated_at: STAMP,
    account,
    contact: null,
  };
}

export const E2E_DEALS: DealWithRelations[] = [
  ...Array.from({ length: 16 }, (_, i) => deal(`l${i + 1}`, "listado")),
  ...Array.from({ length: 3 }, (_, i) => deal(`k${i + 1}`, "contactado")),
  deal("f1", "pdte_firma"),
];
