import "server-only";

const RESEND_API_URL = "https://api.resend.com/emails";
const FROM_ADDRESS = "AlbumCromos CRM <crm@cromify.app>";

/**
 * Envía un email vía la API HTTP de Resend (dominio cromify.app, ya
 * verificado). Si RESEND_API_KEY no está configurada todavía, no falla:
 * avisa por consola y no hace nada, para que el resto de la app (crear
 * tarea, cron de recordatorios) funcione igual mientras se termina de
 * configurar el envío real.
 */
export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.warn(
      `[email] RESEND_API_KEY no configurada — no se envía "${subject}" a ${to}`
    );
    return { sent: false as const };
  }

  const response = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM_ADDRESS, to, subject, html }),
  });

  if (!response.ok) {
    throw new Error(`Resend respondió ${response.status}: ${await response.text()}`);
  }

  return { sent: true as const };
}
