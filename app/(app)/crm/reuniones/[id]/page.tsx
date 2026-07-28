import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MeetingDetail } from "@/components/crm/meeting-detail";
import { getMeetingById } from "@/lib/queries/meetings";
import type { ProfileRow } from "@/lib/types";

export default async function MeetingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let meeting;
  try {
    meeting = await getMeetingById(id);
  } catch {
    notFound();
  }
  if (!meeting) notFound();

  const supabase = await createClient();
  const { data: profiles } = await supabase.from("profiles").select("*");

  return <MeetingDetail meeting={meeting} profiles={(profiles ?? []) as ProfileRow[]} />;
}
