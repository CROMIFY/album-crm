import type { CookieOptions } from "@supabase/ssr";

// @supabase/ssr defaults to httpOnly: false so client-side JS can read the
// session cookie. We don't need that here (only server code touches auth
// cookies), and httpOnly blocks token theft via XSS, so we force it on.
export const SECURE_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
};
