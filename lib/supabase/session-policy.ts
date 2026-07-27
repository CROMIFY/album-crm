import "server-only";

// Duración máxima de una sesión y tiempo de inactividad antes de forzar el
// cierre, configurables por entorno sin tocar código.
export const SESSION_MAX_AGE_MINUTES = Number(process.env.SESSION_MAX_AGE_MINUTES ?? 480);
export const SESSION_IDLE_TIMEOUT_MINUTES = Number(process.env.SESSION_IDLE_TIMEOUT_MINUTES ?? 30);

export const SESSION_STARTED_COOKIE = "crm_session_started_at";
export const LAST_ACTIVITY_COOKIE = "crm_last_activity_at";
