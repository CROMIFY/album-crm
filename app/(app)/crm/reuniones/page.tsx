import { createClient } from "@/lib/supabase/server";
import { MeetingsView } from "@/components/crm/meetings-view";
import { getUpcomingMeetings, getPastMeetings } from "@/lib/queries/meetings";
import type { AccountRow, ContactRow, DealRow, MeetingStatus, ProfileRow } from "@/lib/types";

export default async function ReunionesPage({
  searchParams,
}: {
  searchParams: Promise<{ profileId?: string; accountId?: string; status?: string }>;
}) {
  const sp = await searchParams;
  const filters = {
    profileId: sp.profileId || undefined,
    accountId: sp.accountId || undefined,
    status: (sp.status as MeetingStatus | undefined) || undefined,
  };

  const supabase = await createClient();
  const [{ data: profiles }, { data: accounts }, { data: contacts }, { data: deals }, upcoming, past] =
    await Promise.all([
      supabase.from("profiles").select("*"),
      supabase.from("accounts").select("*"),
      supabase.from("contacts").select("*"),
      supabase.from("deals").select("*"),
      getUpcomingMeetings(filters),
      getPastMeetings(filters),
    ]);

  return (
    <MeetingsView
      upcoming={upcoming}
      past={past}
      profiles={(profiles ?? []) as ProfileRow[]}
      accounts={(accounts ?? []) as AccountRow[]}
      contacts={(contacts ?? []) as ContactRow[]}
      deals={(deals ?? []) as DealRow[]}
      filters={filters}
    />
  );
}
