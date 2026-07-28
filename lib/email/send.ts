import "server-only";
import nodemailer from "nodemailer";

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });
  }
  return transporter;
}

/**
 * Envía un email con Gmail SMTP. Si GMAIL_USER/GMAIL_APP_PASSWORD no están
 * configurados todavía, no falla: avisa por consola y no hace nada, para que
 * el resto de la app (crear tarea, cron de recordatorios) funcione igual
 * mientras se termina de configurar el envío real.
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
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    console.warn(
      `[email] GMAIL_USER/GMAIL_APP_PASSWORD no configurados — no se envía "${subject}" a ${to}`
    );
    return { sent: false as const };
  }

  await getTransporter().sendMail({
    from: `"AlbumCromos CRM" <${user}>`,
    to,
    subject,
    html,
  });
  return { sent: true as const };
}
