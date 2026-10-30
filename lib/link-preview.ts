const PREVIEW_BOTS =
  /whatsapp|telegrambot|slackbot|twitterbot|facebookexternalhit|linkedinbot|discordbot|skypeuripreview|googlebot|bingbot|applebot|signal/i;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isPreviewBot(userAgent: string | null): boolean {
  return !!userAgent && PREVIEW_BOTS.test(userAgent);
}

/** Id de tarea si la URL es `/tareas?tarea=<uuid>`; null en cualquier otro caso. */
export function taskIdFromUrl(pathname: string, searchParams: URLSearchParams): string | null {
  if (pathname !== "/tareas") return null;
  const id = searchParams.get("tarea");
  return id && UUID.test(id) ? id : null;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
