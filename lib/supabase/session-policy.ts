// Duración máxima de una sesión y tiempo de inactividad antes de forzar el
// cierre, configurables por entorno sin tocar código.
export const SESSION_MAX_AGE_MINUTES = Number(process.env.SESSION_MAX_AGE_MINUTES ?? 480);
export const SESSION_IDLE_TIMEOUT_MINUTES = Number(process.env.SESSION_IDLE_TIMEOUT_MINUTES ?? 30);

export const SESSION_STARTED_COOKIE = "crm_session_started_at";
export const LAST_ACTIVITY_COOKIE = "crm_last_activity_at";

export type SessionEvaluation =
  | { expired: false }
  | { expired: true; reason: "session" | "idle" };

/**
 * Puro a propósito (sin cookies/Date.now() dentro): así se puede testear con
 * timestamps fijos. `startedAt`/`lastActivity` vienen de las cookies
 * crm_session_started_at / crm_last_activity_at; `null` cuando faltan (p.ej.
 * sesiones creadas antes de añadir esta política) y no cuentan como expiradas.
 */
export function evaluateSession({
  now,
  startedAt,
  lastActivity,
  maxAgeMinutes = SESSION_MAX_AGE_MINUTES,
  idleTimeoutMinutes = SESSION_IDLE_TIMEOUT_MINUTES,
}: {
  now: number;
  startedAt: number | null;
  lastActivity: number | null;
  maxAgeMinutes?: number;
  idleTimeoutMinutes?: number;
}): SessionEvaluation {
  const sessionTooOld =
    startedAt != null && Number.isFinite(startedAt) && now - startedAt > maxAgeMinutes * 60_000;
  if (sessionTooOld) return { expired: true, reason: "session" };

  const idleTooLong =
    lastActivity != null &&
    Number.isFinite(lastActivity) &&
    now - lastActivity > idleTimeoutMinutes * 60_000;
  if (idleTooLong) return { expired: true, reason: "idle" };

  return { expired: false };
}
