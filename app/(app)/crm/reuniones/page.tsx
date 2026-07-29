import { endOfMonth, endOfWeek, parse, startOfMonth, startOfWeek } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { MeetingsView } from "@/components/crm/meetings-view";
import { getUpcomingMeetings, getPastMeetings, getMeetingsInRange } from "@/lib/queries/meetings";
import type { AccountRow, ContactRow, DealRow, MeetingStatus, ProfileRow } from "@/lib/types";

export default async function ReunionesPage({
  searchParams,
}: {
  searchParams: Promise<{ profileId?: string; accountId?: string; status?: string; month?: string }>;
}) {
  const sp = await searchParams;
  const filters = {
    profileId: sp.profileId || undefined,
    accountId: sp.accountId || undefined,
    status: (sp.status as MeetingStatus | undefined) || undefined,
  };

  const currentMonth = sp.month ? parse(sp.month, "yyyy-MM", new Date()) : new Date();
  const gridStart = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 });

  const supabase = await createClient();
  const [
    { data: profiles },
    { data: accounts },
    { data: contacts },
    { data: deals },
    upcoming,
    past,
    calendarMeetings,
  ] = await Promise.all([
    supabase.from("profiles").select("*"),
    supabase.from("accounts").select("*"),
    supabase.from("contacts").select("*"),
    supabase.from("deals").select("*"),
    getUpcomingMeetings(filters),
    getPastMeetings(filters),
    getMeetingsInRange({ from: gridStart.toISOString(), to: gridEnd.toISOString(), ...filters }),
  ]);

  return (
    <MeetingsView
      upcoming={upcoming}
      past={past}
      calendarMeetings={calendarMeetings}
      currentMonth={currentMonth.toISOString()}
      profiles={(profiles ?? []) as ProfileRow[]}
      accounts={(accounts ?? []) as AccountRow[]}
      contacts={(contacts ?? []) as ContactRow[]}
      deals={(deals ?? []) as DealRow[]}
      filters={filters}
    />
  );
}
