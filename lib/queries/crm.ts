import { createClient } from "@/lib/supabase/server";
import type { AccountType, DealStage, DealWithRelations } from "@/lib/types";

export async function fetchDealsByAccountType(tipo: AccountType) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("deals")
    .select(
      "*, account:accounts!inner(id,tipo,nombre,telefono,email,web,external_club_id,owner_name,provincia,alcance,nivel,created_at), contact:contacts(id,account_id,nombre,telefono,email,created_at)"
    )
    .eq("account.tipo", tipo)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  // Casteo explícito: nuestro Database no modela relaciones/embeds (no hay
  // codegen desde un proyecto Supabase vivo), pero el embed es válido contra
  // las FKs reales de la base de datos.
  return (data ?? []) as unknown as DealWithRelations[];
}

export async function fetchDealDetail(dealId: string) {
  const supabase = await createClient();

  const { data: deal, error: dealError } = await supabase
    .from("deals")
    .select(
      "*, account:accounts(id,tipo,nombre,telefono,email,web,external_club_id,owner_name,provincia,alcance,nivel,created_at), contact:contacts(id,account_id,nombre,telefono,email,created_at)"
    )
    .eq("id", dealId)
    .single();
  if (dealError) throw new Error(dealError.message);

  const [{ data: history }, { data: cadence }] = await Promise.all([
    supabase
      .from("deal_stage_history")
      .select("*")
      .eq("deal_id", dealId)
      .order("changed_at", { ascending: false }),
    supabase
      .from("cadence_steps")
      .select("*")
      .eq("deal_id", dealId)
      .order("position", { ascending: true }),
  ]);

  return {
    deal: deal as unknown as DealWithRelations,
    history: history ?? [],
    cadence: cadence ?? [],
  };
}

function emptyStageCounts(): Record<DealStage, number> {
  return {
    listado: 0,
    contactado: 0,
    pdte_firma: 0,
    cerrado: 0,
    rechazado: 0,
    otro_anio: 0,
  };
}

// Solo el recuento por etapa: lo usa el resumen, que no necesita historial ni
// cadencia (una consulta en vez de tres).
export async function fetchStageCounts(tipo: AccountType) {
  const supabase = await createClient();

  const { data: rawDeals } = await supabase
    .from("deals")
    .select("stage, account:accounts!inner(tipo)")
    .eq("account.tipo", tipo);
  // Ver nota de casteo en fetchDealsByAccountType.
  const deals = (rawDeals ?? []) as unknown as { stage: DealStage }[];

  const stageCounts = emptyStageCounts();
  for (const d of deals) stageCounts[d.stage]++;
  return stageCounts;
}

export async function fetchFunnelDashboard(tipo: AccountType) {
  const supabase = await createClient();

  const { data: rawDeals } = await supabase
    .from("deals")
    .select("id, stage, account:accounts!inner(tipo)")
    .eq("account.tipo", tipo);
  // Ver nota de casteo en fetchDealsByAccountType.
  const deals = (rawDeals ?? []) as unknown as { id: string; stage: DealStage }[];

  const stageCounts = emptyStageCounts();
  for (const d of deals) stageCounts[d.stage]++;

  const dealIds = deals.map((d) => d.id);

  // Historial y cadencia no dependen entre sí: se piden en paralelo.
  const [{ data: history }, { data: cadenceSteps }] = dealIds.length
    ? await Promise.all([
        supabase
          .from("deal_stage_history")
          .select("deal_id, from_stage, to_stage, changed_at")
          .in("deal_id", dealIds)
          .order("changed_at", { ascending: true }),
        supabase.from("cadence_steps").select("deal_id, done").in("deal_id", dealIds),
      ])
    : [{ data: [] }, { data: [] }];

  // Etapa de salida: última etapa (from_stage) antes de entrar en
  // cerrado/rechazado/otro_anio (los tres son salidas del funnel activo).
  const exitStageCounts: Record<string, number> = {};
  for (const row of history ?? []) {
    if (row.to_stage === "cerrado" || row.to_stage === "rechazado" || row.to_stage === "otro_anio") {
      const key = row.from_stage ?? "sin_etapa";
      exitStageCounts[key] = (exitStageCounts[key] ?? 0) + 1;
    }
  }

  const doneByDeal = new Map<string, number>();
  for (const step of cadenceSteps ?? []) {
    if (step.done) doneByDeal.set(step.deal_id, (doneByDeal.get(step.deal_id) ?? 0) + 1);
  }
  const cadenceProgressCounts: Record<number, number> = {};
  for (const deal of deals) {
    if (deal.stage !== "listado") continue;
    const completed = doneByDeal.get(deal.id) ?? 0;
    cadenceProgressCounts[completed] = (cadenceProgressCounts[completed] ?? 0) + 1;
  }

  return { stageCounts, exitStageCounts, cadenceProgressCounts };
}
