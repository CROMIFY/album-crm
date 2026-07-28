import { notFound } from "next/navigation";
import { DealDetail } from "@/components/crm/deal-detail";
import { fetchDealDetail } from "@/lib/queries/crm";
import { getMeetingsByAccount } from "@/lib/queries/meetings";
import { createClient } from "@/lib/supabase/server";
import type { ProfileRow } from "@/lib/types";

export default async function DealDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let data;
  try {
    data = await fetchDealDetail(id);
  } catch {
    notFound();
  }

  if (!data.deal) notFound();

  const supabase = await createClient();
  const [meetings, { data: profiles }] = await Promise.all([
    getMeetingsByAccount(data.deal.account_id),
    supabase.from("profiles").select("*"),
  ]);

  return (
    <DealDetail
      deal={data.deal}
      history={data.history}
      cadence={data.cadence}
      meetings={meetings}
      profiles={(profiles ?? []) as ProfileRow[]}
    />
  );
}
