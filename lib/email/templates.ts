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

/** Wraps content in the shared Cromify branded HTML shell — same style used across every repo's emails. */
function baseLayout({
  preheader,
  eyebrow,
  title,
  body,
}: {
  preheader: string;
  eyebrow: string;
  title: string;
  body: string;
}) {
  return `
<!doctype html>
<html lang="es">
  <body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <span style="display:none;font-size:1px;color:#f3f4f6;">${escapeHtml(preheader)}</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
            <tr>
              <td style="background-color:#1a6b47;padding:24px 32px;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding-right:12px;vertical-align:middle;">
                      <img src="https://cromify.app/brand/logo-64.png" width="36" height="36" alt="Cromify" style="border-radius:9px;display:block;">
                    </td>
                    <td style="vertical-align:middle;">
                      <span style="font-size:19px;font-weight:900;color:#ffffff;letter-spacing:-0.02em;">Cromify</span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 32px 0;">
                <span style="display:inline-block;background-color:#e8f5ee;color:#1a6b47;font-size:11px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;padding:6px 14px;border-radius:999px;">${escapeHtml(eyebrow)}</span>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px 4px;">
                <h1 style="margin:0;font-size:22px;font-weight:900;color:#111827;letter-spacing:-0.01em;">${escapeHtml(title)}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:12px 32px 32px;color:#4b5563;font-size:14px;line-height:1.6;">
                ${body}
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px;background-color:#f9fafb;border-top:1px solid #eef0f2;">
                <p style="margin:0;font-size:12px;color:#6b7280;">Cromify CRM · <a href="${APP_URL}" style="color:#1a6b47;font-weight:700;text-decoration:none;">album-crm.vercel.app</a></p>
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
  return `<a href="${href}" style="display:inline-block;margin-top:20px;padding:12px 22px;background-color:#1a6b47;color:#ffffff;text-decoration:none;border-radius:12px;font-size:13px;font-weight:800;">${escapeHtml(label)}</a>`;
}

function detailBox(rows: string) {
  return `<div style="background-color:#f3f4f6;border-radius:14px;padding:16px 18px;">${rows}</div>`;
}

function detailLine(label: string, value: string) {
  return `<p style="margin:4px 0;font-size:14px;color:#4b5563;"><strong style="color:#111827;">${escapeHtml(label)}:</strong> ${value}</p>`;
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
    ? detailLine("Vence", new Date(dueDate).toLocaleDateString("es-ES"))
    : "";

  const html = baseLayout({
    preheader: subject,
    eyebrow: "Tareas",
    title: "Nueva tarea asignada",
    body: `
      <p style="margin:0 0 16px;">Hola ${escapeHtml(assigneeName)}, se te ha asignado una nueva tarea:</p>
      ${detailBox(`
        <p style="margin:0 0 8px;font-weight:800;color:#111827;font-size:15px;">${escapeHtml(taskTitle)}</p>
        ${detailLine("Columna", escapeHtml(columnName))}
        ${detailLine("Prioridad", PRIORITY_LABELS[priority])}
        ${dueLine}
      `)}
      ${button(`${APP_URL}/tareas`, "Ver tablero de tareas")}
    `,
  });

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
  const locationLine = location ? detailLine("Ubicación", escapeHtml(location)) : "";

  const html = baseLayout({
    preheader: subject,
    eyebrow: "Reuniones",
    title: "Te han invitado a una reunión",
    body: `
      <p style="margin:0 0 16px;">Hola ${escapeHtml(attendeeName)}, te han invitado a:</p>
      ${detailBox(`
        <p style="margin:0 0 8px;font-weight:800;color:#111827;font-size:15px;">${escapeHtml(meetingTitle)}</p>
        ${detailLine("Cuándo", when)}
        ${locationLine}
      `)}
      ${meetLink ? button(meetLink, "Unirse con Google Meet") : ""}
    `,
  });

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

  const html = baseLayout({
    preheader: subject,
    eyebrow: "Reuniones",
    title: "Reunión hoy",
    body: `
      <p style="margin:0;">Hola ${escapeHtml(attendeeName)}, hoy tienes <strong style="color:#111827;">${escapeHtml(meetingTitle)}</strong> a las ${when}.</p>
      ${meetLink ? button(meetLink, "Unirse con Google Meet") : ""}
    `,
  });

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

  const html = baseLayout({
    preheader: subject,
    eyebrow: "Reuniones",
    title: "Faltan notas de la reunión",
    body: `
      <p style="margin:0;">Hola ${escapeHtml(attendeeName)}, la reunión <strong style="color:#111827;">${escapeHtml(meetingTitle)}</strong> ya ha terminado y todavía no tiene notas registradas.</p>
      ${button(`${APP_URL}/crm/reuniones/${meetingId}`, "Añadir notas")}
    `,
  });

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

  const html = baseLayout({
    preheader: subject,
    eyebrow: "Tareas",
    title: `Tarea vence ${when}`,
    body: `
      <p style="margin:0 0 16px;">Hola ${escapeHtml(assigneeName)}, tu tarea vence <strong style="color:#111827;">${when}</strong> y todavía no está marcada como hecha:</p>
      ${detailBox(`
        <p style="margin:0 0 8px;font-weight:800;color:#111827;font-size:15px;">${escapeHtml(taskTitle)}</p>
        ${detailLine("Columna", escapeHtml(columnName))}
      `)}
      ${button(`${APP_URL}/tareas`, "Ver tablero de tareas")}
    `,
  });

  return { subject, html };
}
