"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  DEFAULT_CADENCE_TEMPLATE,
  type AccountType,
  type DealStage,
  type SponsorScope,
  type SponsorLevel,
} from "@/lib/types";

function funnelPath(tipo: AccountType) {
  return tipo === "club" ? "/crm/clubes" : "/crm/patrocinios";
}

async function seedDefaultCadenceIfEmpty(
  supabase: Awaited<ReturnType<typeof createClient>>,
  dealId: string
) {
  const { count } = await supabase
    .from("cadence_steps")
    .select("*", { count: "exact", head: true })
    .eq("deal_id", dealId);
  if ((count ?? 0) > 0) return;

  await supabase.from("cadence_steps").insert(
    DEFAULT_CADENCE_TEMPLATE.map((step, position) => ({
      deal_id: dealId,
      label: step.label,
      action: step.action,
      position,
    }))
  );
}

export async function createDeal(input: {
  tipo: AccountType;
  accountName: string;
  accountPhone?: string;
  accountEmail?: string;
  accountWeb?: string;
  provincia?: string;
  alcance?: SponsorScope;
  nivel?: SponsorLevel;
  contactName: string;
  contactPhone?: string;
  contactEmail?: string;
  amount?: number;
}) {
  const supabase = await createClient();

  const { data: account, error: accountError } = await supabase
    .from("accounts")
    .insert({
      tipo: input.tipo,
      nombre: input.accountName,
      telefono: input.accountPhone || null,
      email: input.accountEmail || null,
      web: input.accountWeb || null,
      provincia: input.provincia || null,
      alcance: input.tipo === "patrocinador" ? input.alcance ?? null : null,
      nivel: input.tipo === "patrocinador" ? input.nivel ?? null : null,
    })
    .select()
    .single();
  if (accountError || !account) throw new Error(accountError?.message ?? "No se pudo crear la cuenta");

  const { data: contact, error: contactError } = await supabase
    .from("contacts")
    .insert({
      account_id: account.id,
      nombre: input.contactName,
      telefono: input.contactPhone || null,
      email: input.contactEmail || null,
    })
    .select()
    .single();
  if (contactError || !contact) throw new Error(contactError?.message ?? "No se pudo crear el contacto");

  const { error: dealError } = await supabase.from("deals").insert({
    account_id: account.id,
    contact_id: contact.id,
    amount: input.amount ?? null,
  });
  if (dealError) throw new Error(dealError.message);

  revalidatePath(funnelPath(input.tipo));
}

export async function updateAccount(
  accountId: string,
  dealId: string,
  tipo: AccountType,
  input: {
    nombre: string;
    telefono?: string;
    email?: string;
    web?: string;
    provincia?: string;
    alcance?: SponsorScope;
    nivel?: SponsorLevel;
  }
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("accounts")
    .update({
      nombre: input.nombre,
      telefono: input.telefono || null,
      email: input.email || null,
      web: input.web || null,
      provincia: input.provincia || null,
      alcance: tipo === "patrocinador" ? input.alcance ?? null : null,
      nivel: tipo === "patrocinador" ? input.nivel ?? null : null,
    })
    .eq("id", accountId);
  if (error) throw new Error(error.message);

  revalidatePath(funnelPath(tipo));
  revalidatePath(`/crm/negocios/${dealId}`);
}

export async function updateDealStage(dealId: string, tipo: AccountType, stage: DealStage) {
  const supabase = await createClient();
  const { error } = await supabase.from("deals").update({ stage }).eq("id", dealId);
  if (error) throw new Error(error.message);

  if (stage === "cadencia") {
    await seedDefaultCadenceIfEmpty(supabase, dealId);
  }

  revalidatePath(funnelPath(tipo));
  revalidatePath(`/crm/negocios/${dealId}`);
}

export async function updateDealOutcome(
  dealId: string,
  tipo: AccountType,
  stage: "ganado" | "perdido" | "aplazado",
  lostReason?: string
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("deals")
    .update({ stage, lost_reason: stage !== "ganado" ? lostReason ?? null : null })
    .eq("id", dealId);
  if (error) throw new Error(error.message);
  revalidatePath(funnelPath(tipo));
  revalidatePath(`/crm/negocios/${dealId}`);
}

export async function addCadenceStep(dealId: string, label: string, action: string) {
  const supabase = await createClient();
  const { count } = await supabase
    .from("cadence_steps")
    .select("*", { count: "exact", head: true })
    .eq("deal_id", dealId);
  const { error } = await supabase
    .from("cadence_steps")
    .insert({ deal_id: dealId, label, action, position: count ?? 0 });
  if (error) throw new Error(error.message);
  revalidatePath(`/crm/negocios/${dealId}`);
}

export async function toggleCadenceStep(id: string, dealId: string, done: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("cadence_steps")
    .update({ done, done_at: done ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/crm/negocios/${dealId}`);
}

export async function deleteCadenceStep(id: string, dealId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("cadence_steps").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/crm/negocios/${dealId}`);
}
