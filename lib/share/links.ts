// Enlaces para compartir cosas del CRM (por WhatsApp o donde sea). Quien lo abre
// tiene que tener cuenta en el CRM: sin sesión pasa por /login y vuelve aquí.

/** Parámetro de la URL del tablero que abre la ficha de una tarea. */
export const TASK_LINK_PARAM = "tarea";

/** Parámetro de /login con la página a la que volver después de entrar. */
export const NEXT_PARAM = "next";

export function taskPath(taskId: string): string {
  return `/tareas?${TASK_LINK_PARAM}=${encodeURIComponent(taskId)}`;
}

export function taskUrl(origin: string, taskId: string): string {
  return `${origin.replace(/\/$/, "")}${taskPath(taskId)}`;
}

/** Texto para WhatsApp y el menú de compartir del móvil. */
export function taskShareText(title: string, url: string): string {
  return `${title}\n${url}`;
}

export function whatsappUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

/**
 * Solo rutas internas: «/algo». Nada de «//otro-sitio», «/\otro», «https:…» ni
 * «javascript:», para que el enlace de vuelta del login no sirva para mandar a
 * nadie fuera del CRM.
 */
export function safeNextPath(raw: string | null | undefined): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return "/";
  if (/[\u0000-\u001f]/.test(raw)) return "/";
  if (raw.startsWith("/login")) return "/";
  return raw;
}
