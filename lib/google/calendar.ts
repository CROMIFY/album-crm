import "server-only";
import { google } from "googleapis";
import { createAdminClient } from "@/lib/supabase/admin";

const GOOGLE_SCOPES = ["https://www.googleapis.com/auth/calendar.events"];

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "https://album-crm.vercel.app";
}

function oauthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${appUrl()}/api/auth/google/callback`
  );
}

export function getGoogleAuthUrl(profileId: string) {
  return oauthClient().generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: GOOGLE_SCOPES,
    state: profileId,
  });
}

export async function exchangeCodeForTokens(code: string) {
  const { tokens } = await oauthClient().getToken(code);
  return tokens;
}

export async function saveTokensForProfile(
  profileId: string,
  tokens: {
    access_token?: string | null;
    refresh_token?: string | null;
    scope?: string | null;
    expiry_date?: number | null;
  }
) {
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("google_calendar_tokens")
    .select("refresh_token")
    .eq("profile_id", profileId)
    .maybeSingle();

  // Google solo devuelve refresh_token la primera vez que se concede consent
  // (con prompt=consent); en un re-consentimiento posterior hay que conservar
  // el que ya teníamos guardado.
  const refreshToken = tokens.refresh_token ?? existing?.refresh_token;
  if (!refreshToken) {
    throw new Error(
      "Google no ha devuelto refresh_token. Revoca el acceso en https://myaccount.google.com/permissions y vuelve a conectar."
    );
  }

  const { error } = await admin.from("google_calendar_tokens").upsert({
    profile_id: profileId,
    access_token: tokens.access_token ?? "",
    refresh_token: refreshToken,
    scope: tokens.scope ?? GOOGLE_SCOPES.join(" "),
    token_expiry: new Date(tokens.expiry_date ?? Date.now() + 3_600_000).toISOString(),
  });
  if (error) throw new Error(error.message);
}

// Devuelve null si el usuario nunca conectó Google, o si el refresh token fue
// revocado — en ambos casos el llamador debe tratar la reunión como "manual"
// y la UI debe ofrecer reconectar.
async function getAuthorizedClientForProfile(profileId: string) {
  const admin = createAdminClient();
  const { data: tokenRow } = await admin
    .from("google_calendar_tokens")
    .select("*")
    .eq("profile_id", profileId)
    .maybeSingle();
  if (!tokenRow) return null;

  const client = oauthClient();
  client.setCredentials({
    access_token: tokenRow.access_token,
    refresh_token: tokenRow.refresh_token,
    expiry_date: new Date(tokenRow.token_expiry).getTime(),
  });

  const expiresSoon = new Date(tokenRow.token_expiry).getTime() < Date.now() + 60_000;
  if (expiresSoon) {
    try {
      const { credentials } = await client.refreshAccessToken();
      client.setCredentials(credentials);
      await saveTokensForProfile(profileId, credentials);
    } catch {
      return null;
    }
  }

  return client;
}

export async function isGoogleCalendarConnected(profileId: string) {
  return (await getAuthorizedClientForProfile(profileId)) !== null;
}

type CalendarEventInput = {
  title: string;
  description: string | null;
  startsAt: string;
  endsAt: string;
  attendeeEmails: string[];
};

export async function createCalendarEvent(profileId: string, input: CalendarEventInput) {
  const auth = await getAuthorizedClientForProfile(profileId);
  if (!auth) return null;

  const calendar = google.calendar({ version: "v3", auth });
  const { data } = await calendar.events.insert({
    calendarId: "primary",
    conferenceDataVersion: 1,
    sendUpdates: "all",
    requestBody: {
      summary: input.title,
      description: input.description ?? undefined,
      start: { dateTime: input.startsAt },
      end: { dateTime: input.endsAt },
      attendees: input.attendeeEmails.map((email) => ({ email })),
      conferenceData: {
        createRequest: {
          requestId: crypto.randomUUID(),
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      },
    },
  });

  return { eventId: data.id ?? null, meetLink: data.hangoutLink ?? null };
}

export async function updateCalendarEvent(
  profileId: string,
  eventId: string,
  input: Partial<CalendarEventInput>
) {
  const auth = await getAuthorizedClientForProfile(profileId);
  if (!auth) return false;

  const calendar = google.calendar({ version: "v3", auth });
  await calendar.events.patch({
    calendarId: "primary",
    eventId,
    sendUpdates: "all",
    requestBody: {
      ...(input.title !== undefined && { summary: input.title }),
      ...(input.description !== undefined && { description: input.description ?? undefined }),
      ...(input.startsAt !== undefined && { start: { dateTime: input.startsAt } }),
      ...(input.endsAt !== undefined && { end: { dateTime: input.endsAt } }),
      ...(input.attendeeEmails !== undefined && {
        attendees: input.attendeeEmails.map((email) => ({ email })),
      }),
    },
  });
  return true;
}

export async function deleteCalendarEvent(profileId: string, eventId: string) {
  const auth = await getAuthorizedClientForProfile(profileId);
  if (!auth) return false;

  const calendar = google.calendar({ version: "v3", auth });
  await calendar.events.delete({ calendarId: "primary", eventId, sendUpdates: "all" });
  return true;
}
