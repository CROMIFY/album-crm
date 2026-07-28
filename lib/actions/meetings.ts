"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createTask, setTaskDone } from "@/lib/actions/tasks";
import {
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} from "@/lib/google/calendar";
import type { MeetingRow, MeetingStatus } from "@/lib/types";

const MEETINGS_PATH = "/crm/reuniones";

type Supabase = Awaited<ReturnType<typeof createClient>>;

function meetingPath(id: string) {
  return `${MEETINGS_PATH}/${id}`;
}

function revalidateMeeting(id: string, linkedDealId?: string | null) {
  revalidatePath(MEETINGS_PATH);
  revalidatePath(meetingPath(id));
  if (linkedDealId) revalidatePath(`/crm/negocios/${linkedDealId}`);
}

async function currentProfileId(supabase: Supabase) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

async function insertAttendees(
  supabase: Supabase,
  meetingId: string,
  { profileIds = [], contactIds = [] }: { profileIds?: string[]; contactIds?: string[] }
) {
  const rows = [
    ...profileIds.map((profile_id) => ({ meeting_id: meetingId, profile_id, contact_id: null })),
    ...contactIds.map((contact_id) => ({ meeting_id: meetingId, contact_id, profile_id: null })),
  ];
  if (rows.length === 0) return;
  const { error } = await supabase.from("meeting_attendees").insert(rows);
  if (error) throw new Error(error.message);
}

async function attendeeEmails(
  supabase: Supabase,
  { profileIds = [], contactIds = [] }: { profileIds?: string[]; contactIds?: string[] }
) {
  const [{ data: profileRows }, { data: contactRows }] = await Promise.all([
    profileIds.length
      ? supabase.from("profiles").select("email").in("id", profileIds)
      : Promise.resolve({ data: [] }),
    contactIds.length
      ? supabase.from("contacts").select("email").in("id", contactIds)
      : Promise.resolve({ data: [] }),
  ]);
  return [...(profileRows ?? []), ...(contactRows ?? [])]
    .map((r) => r.email)
    .filter((email): email is string => !!email);
}

// Best-effort: si el creador tiene Google Calendar conectado, se crea el
// evento con Meet autogenerado y se guarda el id + enlace en la reunión. Si
// no hay conexión (o el token fue revocado), la reunión se queda como
// "manual" sin romper la creación.
async function syncCalendarEventOnCreate(
  supabase: Supabase,
  meeting: MeetingRow,
  attendeeInput: { profileIds?: string[]; contactIds?: string[] }
) {
  if (!meeting.created_by) return;
  try {
    const emails = await attendeeEmails(supabase, attendeeInput);
    const event = await createCalendarEvent(meeting.created_by, {
      title: meeting.title,
      description: meeting.description,
      startsAt: meeting.starts_at,
      endsAt: meeting.ends_at,
      attendeeEmails: emails,
    });
    if (!event) return;

    await supabase
      .from("meetings")
      .update({ google_calendar_event_id: event.eventId, meet_link: event.meetLink })
      .eq("id", meeting.id);
  } catch (err) {
    console.error("No se pudo crear el evento en Google Calendar:", err);
  }
}

// Best-effort: si el action item nace con asignado + fecha, se crea la tarea
// enlazada en el kanban existente. Un fallo aquí no debe romper el guardado
// del action item.
async function createLinkedTaskIfNeeded(
  supabase: Supabase,
  {
    actionItemId,
    title,
    assigneeId,
    dueDate,
  }: { actionItemId: string; title: string; assigneeId: string | null; dueDate: string | null }
) {
  if (!assigneeId || !dueDate) return;
  try {
    const { data: column } = await supabase
      .from("board_columns")
      .select("id")
      .order("position", { ascending: true })
      .limit(1)
      .single();
    if (!column) return;

    const taskId = await createTask({
      columnId: column.id,
      title,
      assigneeIds: [assigneeId],
      dueDate,
      labelIds: [],
    });

    await supabase
      .from("meeting_action_items")
      .update({ linked_task_id: taskId })
      .eq("id", actionItemId);
  } catch (err) {
    console.error("No se pudo crear la tarea enlazada al action item:", err);
  }
}

export async function createMeeting(input: {
  title: string;
  description?: string;
  startsAt: string;
  endsAt: string;
  location?: string;
  linkedAccountId?: string;
  linkedContactId?: string;
  linkedDealId?: string;
  attendeeProfileIds?: string[];
  attendeeContactIds?: string[];
}) {
  const supabase = await createClient();
  const createdBy = await currentProfileId(supabase);

  const { data: meeting, error } = await supabase
    .from("meetings")
    .insert({
      title: input.title,
      description: input.description || null,
      starts_at: input.startsAt,
      ends_at: input.endsAt,
      location: input.location || null,
      linked_account_id: input.linkedAccountId || null,
      linked_contact_id: input.linkedContactId || null,
      linked_deal_id: input.linkedDealId || null,
      created_by: createdBy,
    })
    .select()
    .single();
  if (error || !meeting) throw new Error(error?.message ?? "No se pudo crear la reunión");

  const attendeeInput = {
    profileIds: input.attendeeProfileIds,
    contactIds: input.attendeeContactIds,
  };
  await insertAttendees(supabase, meeting.id, attendeeInput);
  await syncCalendarEventOnCreate(supabase, meeting, attendeeInput);

  revalidateMeeting(meeting.id, meeting.linked_deal_id);
  return meeting.id as string;
}

export async function updateMeeting(
  id: string,
  input: Partial<{
    title: string;
    description: string | null;
    startsAt: string;
    endsAt: string;
    location: string | null;
    linkedAccountId: string | null;
    linkedContactId: string | null;
    linkedDealId: string | null;
  }>
) {
  const supabase = await createClient();
  const { data: meeting, error } = await supabase
    .from("meetings")
    .update({
      ...(input.title !== undefined && { title: input.title }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.startsAt !== undefined && { starts_at: input.startsAt }),
      ...(input.endsAt !== undefined && { ends_at: input.endsAt }),
      ...(input.location !== undefined && { location: input.location }),
      ...(input.linkedAccountId !== undefined && { linked_account_id: input.linkedAccountId }),
      ...(input.linkedContactId !== undefined && { linked_contact_id: input.linkedContactId }),
      ...(input.linkedDealId !== undefined && { linked_deal_id: input.linkedDealId }),
    })
    .eq("id", id)
    .select()
    .single();
  if (error || !meeting) throw new Error(error?.message ?? "No se pudo actualizar la reunión");

  // El evento de Calendar vive en la cuenta de Google del creador: solo se
  // propaga el cambio si quien edita es esa misma persona. Si no, la reunión
  // se actualiza igualmente en el CRM (mismo modelo "cualquier usuario
  // autenticado" del resto de la app), pero sin tocar el Calendar/Meet real
  // de otra persona sin su intervención.
  const actingProfileId = await currentProfileId(supabase);
  if (
    meeting.google_calendar_event_id &&
    meeting.created_by &&
    actingProfileId === meeting.created_by
  ) {
    try {
      await updateCalendarEvent(meeting.created_by, meeting.google_calendar_event_id, {
        ...(input.title !== undefined && { title: input.title }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.startsAt !== undefined && { startsAt: input.startsAt }),
        ...(input.endsAt !== undefined && { endsAt: input.endsAt }),
      });
    } catch (err) {
      console.error("No se pudo actualizar el evento en Google Calendar:", err);
    }
  }

  revalidateMeeting(id, meeting.linked_deal_id);
}

async function setMeetingStatus(id: string, status: MeetingStatus, cancelReason?: string) {
  const supabase = await createClient();
  const { data: meeting, error } = await supabase
    .from("meetings")
    .update({ status, cancel_reason: status === "cancelada" ? cancelReason ?? null : null })
    .eq("id", id)
    .select("id, linked_deal_id, google_calendar_event_id, created_by")
    .single();
  if (error || !meeting) throw new Error(error?.message ?? "No se pudo actualizar la reunión");

  // Ver nota en updateMeeting: solo se borra el evento real de Calendar si
  // quien cancela es el propio creador (dueño de esa cuenta de Google).
  const actingProfileId = await currentProfileId(supabase);
  if (
    status === "cancelada" &&
    meeting.google_calendar_event_id &&
    meeting.created_by &&
    actingProfileId === meeting.created_by
  ) {
    try {
      await deleteCalendarEvent(meeting.created_by, meeting.google_calendar_event_id);
      await supabase
        .from("meetings")
        .update({ google_calendar_event_id: null, meet_link: null })
        .eq("id", id);
    } catch (err) {
      console.error("No se pudo borrar el evento en Google Calendar:", err);
    }
  }

  revalidateMeeting(id, meeting.linked_deal_id);
}

export async function cancelMeeting(id: string, reason: string) {
  await setMeetingStatus(id, "cancelada", reason);
}

export async function markMeetingCompleted(id: string) {
  await setMeetingStatus(id, "completada");
}

export async function markMeetingNoShow(id: string) {
  await setMeetingStatus(id, "no_show");
}

export async function addMeetingNote(meetingId: string, content: string) {
  const supabase = await createClient();
  const authorId = await currentProfileId(supabase);

  const { error } = await supabase
    .from("meeting_notes")
    .insert({ meeting_id: meetingId, author_id: authorId, content });
  if (error) throw new Error(error.message);

  revalidateMeeting(meetingId);
}

export async function updateMeetingNote(noteId: string, content: string) {
  const supabase = await createClient();
  const { data: note, error } = await supabase
    .from("meeting_notes")
    .update({ content })
    .eq("id", noteId)
    .select("meeting_id")
    .single();
  if (error || !note) throw new Error(error?.message ?? "No se pudo actualizar la nota");

  revalidateMeeting(note.meeting_id);
}

export async function addActionItem(
  meetingId: string,
  input: { title: string; assigneeId?: string; dueDate?: string }
) {
  const supabase = await createClient();
  const { count } = await supabase
    .from("meeting_action_items")
    .select("*", { count: "exact", head: true })
    .eq("meeting_id", meetingId);

  const { data: actionItem, error } = await supabase
    .from("meeting_action_items")
    .insert({
      meeting_id: meetingId,
      title: input.title,
      assignee_id: input.assigneeId || null,
      due_date: input.dueDate || null,
      position: count ?? 0,
    })
    .select()
    .single();
  if (error || !actionItem) throw new Error(error?.message ?? "No se pudo crear el action item");

  await createLinkedTaskIfNeeded(supabase, {
    actionItemId: actionItem.id,
    title: actionItem.title,
    assigneeId: actionItem.assignee_id,
    dueDate: actionItem.due_date,
  });

  revalidateMeeting(meetingId);
}

export async function toggleActionItem(id: string, done: boolean) {
  const supabase = await createClient();
  const { data: actionItem, error } = await supabase
    .from("meeting_action_items")
    .update({ done })
    .eq("id", id)
    .select("meeting_id, linked_task_id")
    .single();
  if (error || !actionItem) throw new Error(error?.message ?? "No se pudo actualizar el action item");

  if (actionItem.linked_task_id) {
    try {
      await setTaskDone(actionItem.linked_task_id, done);
    } catch (err) {
      console.error("No se pudo sincronizar la tarea enlazada:", err);
    }
  }

  revalidateMeeting(actionItem.meeting_id);
}

export async function deleteActionItem(id: string) {
  const supabase = await createClient();
  const { data: actionItem, error: fetchError } = await supabase
    .from("meeting_action_items")
    .select("meeting_id")
    .eq("id", id)
    .single();
  if (fetchError || !actionItem) throw new Error(fetchError?.message ?? "Action item no encontrado");

  const { error } = await supabase.from("meeting_action_items").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidateMeeting(actionItem.meeting_id);
}
