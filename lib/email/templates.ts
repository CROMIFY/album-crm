import type { TaskPriority } from "@/lib/types";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://album-crm.vercel.app";

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  baja: "Baja",
  media: "Media",
  alta: "Alta",
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function baseLayout(preheader: string, body: string) {
  return `
<!doctype html>
<html lang="es">
  <body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <span style="display:none;font-size:1px;color:#f4f4f5;">${escapeHtml(preheader)}</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="padding:20px 28px;background-color:#0a0a0a;">
                <span style="color:#ffffff;font-size:15px;font-weight:600;">AlbumCromos CRM</span>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;color:#18181b;font-size:14px;line-height:1.6;">
                ${body}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function button(href: string, label: string) {
  return `<a href="${href}" style="display:inline-block;margin-top:16px;padding:10px 18px;background-color:#0a0a0a;color:#ffffff;text-decoration:none;border-radius:8px;font-size:13px;font-weight:600;">${escapeHtml(label)}</a>`;
}

export function taskAssignedEmail({
  assigneeName,
  taskTitle,
  columnName,
  priority,
  dueDate,
}: {
  assigneeName: string;
  taskTitle: string;
  columnName: string;
  priority: TaskPriority;
  dueDate: string | null;
}) {
  const subject = `Nueva tarea asignada: ${taskTitle}`;
  const dueLine = dueDate
    ? `<p style="margin:4px 0;"><strong>Vence:</strong> ${new Date(dueDate).toLocaleDateString("es-ES")}</p>`
    : "";

  const html = baseLayout(
    subject,
    `
      <p style="margin:0 0 12px;">Hola ${escapeHtml(assigneeName)},</p>
      <p style="margin:0 0 16px;">Se te ha asignado una nueva tarea:</p>
      <div style="padding:14px 16px;background-color:#f4f4f5;border-radius:8px;">
        <p style="margin:0 0 6px;font-weight:600;">${escapeHtml(taskTitle)}</p>
        <p style="margin:4px 0;"><strong>Columna:</strong> ${escapeHtml(columnName)}</p>
        <p style="margin:4px 0;"><strong>Prioridad:</strong> ${PRIORITY_LABELS[priority]}</p>
        ${dueLine}
      </div>
      ${button(`${APP_URL}/tareas`, "Ver tablero de tareas")}
    `
  );

  return { subject, html };
}

export function meetingScheduledEmail({
  attendeeName,
  meetingTitle,
  startsAt,
  meetLink,
  location,
}: {
  attendeeName: string;
  meetingTitle: string;
  startsAt: string;
  meetLink: string | null;
  location: string | null;
}) {
  const subject = `Invitación: ${meetingTitle}`;
  const when = new Date(startsAt).toLocaleString("es-ES");
  const locationLine = location
    ? `<p style="margin:4px 0;"><strong>Ubicación:</strong> ${escapeHtml(location)}</p>`
    : "";

  const html = baseLayout(
    subject,
    `
      <p style="margin:0 0 12px;">Hola ${escapeHtml(attendeeName)},</p>
      <p style="margin:0 0 16px;">Te han invitado a una reunión:</p>
      <div style="padding:14px 16px;background-color:#f4f4f5;border-radius:8px;">
        <p style="margin:0 0 6px;font-weight:600;">${escapeHtml(meetingTitle)}</p>
        <p style="margin:4px 0;"><strong>Cuándo:</strong> ${when}</p>
        ${locationLine}
      </div>
      ${meetLink ? button(meetLink, "Unirse con Google Meet") : ""}
    `
  );

  return { subject, html };
}

// Recordatorio del día: el cron corre una vez al día (plan Hobby de Vercel no
// permite cron más frecuente), así que en vez de "30 min antes" se avisa por
// la mañana de las reuniones que tocan hoy.
export function meetingTodayEmail({
  attendeeName,
  meetingTitle,
  startsAt,
  meetLink,
}: {
  attendeeName: string;
  meetingTitle: string;
  startsAt: string;
  meetLink: string | null;
}) {
  const subject = `Hoy: "${meetingTitle}"`;
  const when = new Date(startsAt).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });

  const html = baseLayout(
    subject,
    `
      <p style="margin:0 0 12px;">Hola ${escapeHtml(attendeeName)},</p>
      <p style="margin:0 0 16px;">Hoy tienes <strong>${escapeHtml(meetingTitle)}</strong> a las ${when}.</p>
      ${meetLink ? button(meetLink, "Unirse con Google Meet") : ""}
    `
  );

  return { subject, html };
}

export function meetingNotesReminderEmail({
  attendeeName,
  meetingTitle,
  meetingId,
}: {
  attendeeName: string;
  meetingTitle: string;
  meetingId: string;
}) {
  const subject = `Rellena las notas de "${meetingTitle}"`;

  const html = baseLayout(
    subject,
    `
      <p style="margin:0 0 12px;">Hola ${escapeHtml(attendeeName)},</p>
      <p style="margin:0 0 16px;">La reunión <strong>${escapeHtml(meetingTitle)}</strong> ya ha terminado y todavía no tiene notas registradas.</p>
      ${button(`${APP_URL}/crm/reuniones/${meetingId}`, "Añadir notas")}
    `
  );

  return { subject, html };
}

export function taskDueReminderEmail({
  assigneeName,
  taskTitle,
  columnName,
  when,
}: {
  assigneeName: string;
  taskTitle: string;
  columnName: string;
  when: "mañana" | "hoy";
}) {
  const subject = `Recordatorio: "${taskTitle}" vence ${when}`;

  const html = baseLayout(
    subject,
    `
      <p style="margin:0 0 12px;">Hola ${escapeHtml(assigneeName)},</p>
      <p style="margin:0 0 16px;">Tu tarea vence <strong>${when}</strong> y todavía no está marcada como hecha:</p>
      <div style="padding:14px 16px;background-color:#f4f4f5;border-radius:8px;">
        <p style="margin:0 0 6px;font-weight:600;">${escapeHtml(taskTitle)}</p>
        <p style="margin:4px 0;"><strong>Columna:</strong> ${escapeHtml(columnName)}</p>
      </div>
      ${button(`${APP_URL}/tareas`, "Ver tablero de tareas")}
    `
  );

  return { subject, html };
}
