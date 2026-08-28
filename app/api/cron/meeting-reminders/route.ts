import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/send";
import { meetingTodayEmail, meetingNotesReminderEmail } from "@/lib/email/templates";

type Recipient = { nombre: string; email: string | null };

// Cron diario (ver vercel.json — el plan Hobby de Vercel no permite cron más
// frecuente que 1/día, así que un recordatorio "30 min antes" no es viable:
// en su lugar se avisa por la mañana de las reuniones de hoy). También avisa
// de reuniones ya terminadas que aún no tienen notas — empujando a
// rellenarlas. Deja constancia en notification_log (con status/channel
// reales) para no repetir el aviso el mismo día.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Cron no configurado" }, { status: 503 });
  }
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date();
  const startOfDay = `${now.toISOString().slice(0, 10)}T00:00:00.000Z`;
  const endOfDay = new Date(now);
  endOfDay.setUTCHours(23, 59, 59, 999);

  const { data: alreadyLogged } = await supabase
    .from("notification_log")
    .select("event_type, payload")
    .in("event_type", ["meeting_reminder_today", "meeting_missing_notes"])
    .gte("created_at", startOfDay);
  const alreadyNotifiedKeys = new Set(
    (alreadyLogged ?? []).map(
      (row) => `${row.event_type}:${(row.payload as { meeting_id?: string }).meeting_id}`
    )
  );

  let notified = 0;
  let emailsSent = 0;

  // 1) Reuniones programadas para hoy.
  const { data: upcoming, error: upcomingError } = await supabase
    .from("meetings")
    .select("id, title, starts_at, meet_link")
    .eq("status", "programada")
    .gte("starts_at", now.toISOString())
    .lte("starts_at", endOfDay.toISOString());
  if (upcomingError) return NextResponse.json({ error: upcomingError.message }, { status: 500 });

  const pendingUpcoming = (upcoming ?? []).filter(
    (m) => !alreadyNotifiedKeys.has(`meeting_reminder_today:${m.id}`)
  );

  for (const meeting of pendingUpcoming) {
    const { data: attendees } = await supabase
      .from("meeting_attendees")
      .select("profile:profiles(nombre,email), contact:contacts(nombre,email)")
      .eq("meeting_id", meeting.id);

    const recipients = ((attendees ?? []) as unknown as { profile: Recipient | null; contact: Recipient | null }[])
      .map((a) => a.profile ?? a.contact)
      .filter((r): r is Recipient & { email: string } => !!r?.email);

    let anySent = false;
    for (const recipient of recipients) {
      try {
        const { subject, html } = meetingTodayEmail({
          attendeeName: recipient.nombre,
          meetingTitle: meeting.title,
          startsAt: meeting.starts_at,
          meetLink: meeting.meet_link,
        });
        const result = await sendEmail({ to: recipient.email, subject, html });
        if (result.sent) {
          anySent = true;
          emailsSent++;
        }
      } catch (err) {
        console.error(`No se pudo enviar el recordatorio de la reunión ${meeting.id}:`, err);
      }
    }

    await supabase.from("notification_log").insert({
      event_type: "meeting_reminder_today",
      channel: "email",
      status: anySent ? "sent" : "failed",
      payload: { meeting_id: meeting.id, title: meeting.title },
    });
    notified++;
  }

  // 2) Reuniones ya terminadas sin notas registradas.
  const { data: pastMeetings, error: pastError } = await supabase
    .from("meetings")
    .select("id, title, ends_at, created_by")
    .lt("ends_at", now.toISOString())
    .in("status", ["programada", "completada"]);
  if (pastError) return NextResponse.json({ error: pastError.message }, { status: 500 });

  const candidates = (pastMeetings ?? []).filter(
    (m) => !alreadyNotifiedKeys.has(`meeting_missing_notes:${m.id}`)
  );

  const meetingIdsToCheck = candidates.map((m) => m.id);
  const { data: notesRows } = meetingIdsToCheck.length
    ? await supabase.from("meeting_notes").select("meeting_id").in("meeting_id", meetingIdsToCheck)
    : { data: [] as { meeting_id: string }[] };
  const meetingIdsWithNotes = new Set((notesRows ?? []).map((n) => n.meeting_id));

  const missingNotes = candidates.filter((m) => !meetingIdsWithNotes.has(m.id));
  const creatorIds = [
    ...new Set(missingNotes.map((m) => m.created_by).filter((id): id is string => !!id)),
  ];
  const { data: creators } = creatorIds.length
    ? await supabase.from("profiles").select("id, nombre, email").in("id", creatorIds)
    : { data: [] as { id: string; nombre: string; email: string }[] };
  const creatorById = new Map((creators ?? []).map((c) => [c.id, c]));

  for (const meeting of missingNotes) {
    const creator = meeting.created_by ? creatorById.get(meeting.created_by) : null;
    let sent = false;
    if (creator) {
      try {
        const { subject, html } = meetingNotesReminderEmail({
          attendeeName: creator.nombre,
          meetingTitle: meeting.title,
          meetingId: meeting.id,
        });
        const result = await sendEmail({ to: creator.email, subject, html });
        sent = result.sent;
        if (sent) emailsSent++;
      } catch (err) {
        console.error(`No se pudo enviar el aviso de notas faltantes ${meeting.id}:`, err);
      }
    }

    await supabase.from("notification_log").insert({
      event_type: "meeting_missing_notes",
      channel: "email",
      status: sent ? "sent" : "failed",
      payload: { meeting_id: meeting.id, title: meeting.title },
    });
    notified++;
  }

  return NextResponse.json({ ok: true, notified, emailsSent });
}
