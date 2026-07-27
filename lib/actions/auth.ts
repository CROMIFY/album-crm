"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loginSchema, type LoginInput } from "@/lib/validation/auth";
import { SECURE_COOKIE_OPTIONS } from "@/lib/supabase/cookie-options";
import {
  SESSION_MAX_AGE_MINUTES,
  SESSION_IDLE_TIMEOUT_MINUTES,
  SESSION_STARTED_COOKIE,
  LAST_ACTIVITY_COOKIE,
} from "@/lib/supabase/session-policy";

export async function signIn(values: LoginInput) {
  const parsed = loginSchema.safeParse(values);
  if (!parsed.success) {
    return { error: "Datos de acceso no válidos." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  // Mensaje genérico: no revelar si el email existe o si fue la contraseña.
  if (error) {
    return { error: "Email o contraseña incorrectos." };
  }

  const now = String(Date.now());
  const cookieStore = await cookies();
  cookieStore.set(SESSION_STARTED_COOKIE, now, {
    ...SECURE_COOKIE_OPTIONS,
    maxAge: SESSION_MAX_AGE_MINUTES * 60,
    path: "/",
  });
  cookieStore.set(LAST_ACTIVITY_COOKIE, now, {
    ...SECURE_COOKIE_OPTIONS,
    maxAge: SESSION_IDLE_TIMEOUT_MINUTES * 60,
    path: "/",
  });

  return { error: null };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_STARTED_COOKIE);
  cookieStore.delete(LAST_ACTIVITY_COOKIE);
  redirect("/login");
}
