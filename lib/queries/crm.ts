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

export async function fetchFunnelDashboard(tipo: AccountType) {
  const supabase = await createClient();

  const { data: rawDeals } = await supabase
    .from("deals")
    .select("id, stage, account:accounts!inner(tipo)")
    .eq("account.tipo", tipo);
  // Ver nota de casteo en fetchDealsByAccountType.
  const deals = (rawDeals ?? []) as unknown as { id: string; stage: DealStage }[];

  const stageCounts: Record<DealStage, number> = {
    busqueda: 0,
    cualificar: 0,
    cadencia: 0,
    contacto: 0,
    agendada: 0,
    demo: 0,
    negociacion: 0,
    ganado: 0,
    perdido: 0,
  };
  for (const d of deals ?? []) {
    stageCounts[d.stage as DealStage]++;
  }

  const dealIds = (deals ?? []).map((d) => d.id);

  const { data: history } = dealIds.length
    ? await supabase
        .from("deal_stage_history")
        .select("deal_id, from_stage, to_stage, changed_at")
        .in("deal_id", dealIds)
        .order("changed_at", { ascending: true })
    : { data: [] };

  // Etapa de salida: última etapa (from_stage) antes de entrar en ganado/perdido.
  const exitStageCounts: Record<string, number> = {};
  for (const row of history ?? []) {
    if (row.to_stage === "ganado" || row.to_stage === "perdido") {
      const key = row.from_stage ?? "sin_etapa";
      exitStageCounts[key] = (exitStageCounts[key] ?? 0) + 1;
    }
  }

  const { data: cadenceSteps } = dealIds.length
    ? await supabase.from("cadence_steps").select("deal_id, done").in("deal_id", dealIds)
    : { data: [] };

  const doneByDeal = new Map<string, number>();
  for (const step of cadenceSteps ?? []) {
    if (step.done) doneByDeal.set(step.deal_id, (doneByDeal.get(step.deal_id) ?? 0) + 1);
  }
  const cadenceProgressCounts: Record<number, number> = {};
  for (const deal of deals ?? []) {
    if (deal.stage !== "cadencia") continue;
    const completed = doneByDeal.get(deal.id) ?? 0;
    cadenceProgressCounts[completed] = (cadenceProgressCounts[completed] ?? 0) + 1;
  }

  return { stageCounts, exitStageCounts, cadenceProgressCounts };
}
