import { createClient } from "@/lib/supabase/server";
import type { MeetingStatus, MeetingWithRelations } from "@/lib/types";

type Supabase = Awaited<ReturnType<typeof createClient>>;

// Embebe cuenta/contacto/deal enlazados, asistentes (con su perfil o contacto
// externo), notas y action items. Ver nota de casteo en lib/queries/crm.ts:
// nuestro Database no modela relaciones/embeds, pero el embed es válido
// contra las FKs reales de la base de datos.
const MEETING_SELECT = `
  *,
  account:accounts(*),
  contact:contacts(*),
  deal:deals(*),
  attendees:meeting_attendees(*, profile:profiles(*), contact:contacts(*)),
  notes:meeting_notes(*),
  actionItems:meeting_action_items(*)
`;

function normalizeMeeting(raw: unknown): MeetingWithRelations {
  const meeting = raw as MeetingWithRelations;
  return {
    ...meeting,
    notes: [...meeting.notes].sort((a, b) => b.created_at.localeCompare(a.created_at)),
    actionItems: [...meeting.actionItems].sort((a, b) => a.position - b.position),
  };
}

async function meetingIdsForProfile(supabase: Supabase, profileId: string) {
  const { data, error } = await supabase
    .from("meeting_attendees")
    .select("meeting_id")
    .eq("profile_id", profileId);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => row.meeting_id);
}

type MeetingFilters = {
  profileId?: string;
  accountId?: string;
  status?: MeetingStatus;
};

async function applyProfileFilter(
  supabase: Supabase,
  query: ReturnType<Supabase["from"]>,
  profileId: string
) {
  const attendeeMeetingIds = await meetingIdsForProfile(supabase, profileId);
  const orParts = [`created_by.eq.${profileId}`];
  if (attendeeMeetingIds.length > 0) {
    orParts.push(`id.in.(${attendeeMeetingIds.join(",")})`);
  }
  return query.or(orParts.join(","));
}

export async function getUpcomingMeetings(filters: MeetingFilters = {}) {
  const supabase = await createClient();
  let query = supabase
    .from("meetings")
    .select(MEETING_SELECT)
    .gte("starts_at", new Date().toISOString())
    .neq("status", "cancelada")
    .order("starts_at", { ascending: true });

  if (filters.accountId) query = query.eq("linked_account_id", filters.accountId);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.profileId) query = await applyProfileFilter(supabase, query, filters.profileId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map(normalizeMeeting);
}

export async function getPastMeetings(
  filters: MeetingFilters & { from?: string; to?: string } = {}
) {
  const supabase = await createClient();
  let query = supabase
    .from("meetings")
    .select(MEETING_SELECT)
    .lt("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: false });

  if (filters.accountId) query = query.eq("linked_account_id", filters.accountId);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.from) query = query.gte("starts_at", filters.from);
  if (filters.to) query = query.lte("starts_at", filters.to);
  if (filters.profileId) query = await applyProfileFilter(supabase, query, filters.profileId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map(normalizeMeeting);
}

export async function getMeetingsInRange(
  range: { from: string; to: string } & MeetingFilters
) {
  const supabase = await createClient();
  let query = supabase
    .from("meetings")
    .select(MEETING_SELECT)
    .gte("starts_at", range.from)
    .lte("starts_at", range.to)
    .order("starts_at", { ascending: true });

  if (range.accountId) query = query.eq("linked_account_id", range.accountId);
  if (range.status) query = query.eq("status", range.status);
  if (range.profileId) query = await applyProfileFilter(supabase, query, range.profileId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map(normalizeMeeting);
}

export async function getMeetingsByAccount(accountId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("meetings")
    .select(MEETING_SELECT)
    .eq("linked_account_id", accountId)
    .order("starts_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map(normalizeMeeting);
}

export async function getMeetingById(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("meetings")
    .select(MEETING_SELECT)
    .eq("id", id)
    .single();

  if (error) throw new Error(error.message);
  return normalizeMeeting(data);
}
