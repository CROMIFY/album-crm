import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { exchangeCodeForTokens, saveTokensForProfile } from "@/lib/google/calendar";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const oauthError = request.nextUrl.searchParams.get("error");

  const redirectTo = new URL("/", request.url);

  if (oauthError || !code || !state) {
    redirectTo.searchParams.set("google_calendar", "error");
    return NextResponse.redirect(redirectTo);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // state debe coincidir con el usuario que tiene sesión iniciada ahora mismo
  // — evita que un code ajeno se pueda vincular a otra cuenta.
  if (!user || user.id !== state) {
    redirectTo.searchParams.set("google_calendar", "error");
    return NextResponse.redirect(redirectTo);
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    await saveTokensForProfile(user.id, tokens);
    redirectTo.searchParams.set("google_calendar", "connected");
  } catch (err) {
    console.error("No se pudo guardar el token de Google Calendar:", err);
    redirectTo.searchParams.set("google_calendar", "error");
  }

  return NextResponse.redirect(redirectTo);
}
