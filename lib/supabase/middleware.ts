import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SECURE_COOKIE_OPTIONS } from "@/lib/supabase/cookie-options";
import {
  SESSION_MAX_AGE_MINUTES,
  SESSION_IDLE_TIMEOUT_MINUTES,
  SESSION_STARTED_COOKIE,
  LAST_ACTIVITY_COOKIE,
  evaluateSession,
  bypassesUserSession,
} from "@/lib/supabase/session-policy";

const PUBLIC_PATHS = ["/login"];

function loginRedirect(request: NextRequest, carryCookiesFrom: NextResponse, expiredReason?: "session" | "idle") {
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  if (expiredReason) {
    url.searchParams.set("expired", expiredReason);
  }

  const redirectResponse = NextResponse.redirect(url);
  carryCookiesFrom.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
  redirectResponse.cookies.delete(SESSION_STARTED_COOKIE);
  redirectResponse.cookies.delete(LAST_ACTIVITY_COOKIE);
  return redirectResponse;
}

export async function updateSession(request: NextRequest) {
  if (bypassesUserSession(request.nextUrl.pathname)) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, { ...options, ...SECURE_COOKIE_OPTIONS })
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isPublicPath = PUBLIC_PATHS.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  if (!user && !isPublicPath) {
    return loginRedirect(request, response);
  }

  if (user && isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  if (user && !isPublicPath) {
    const now = Date.now();
    const startedAtRaw = Number(request.cookies.get(SESSION_STARTED_COOKIE)?.value);
    const lastActivityRaw = Number(request.cookies.get(LAST_ACTIVITY_COOKIE)?.value);
    const startedAt = Number.isFinite(startedAtRaw) ? startedAtRaw : null;
    const lastActivity = Number.isFinite(lastActivityRaw) ? lastActivityRaw : null;

    const evaluation = evaluateSession({ now, startedAt, lastActivity });

    if (evaluation.expired) {
      await supabase.auth.signOut();
      return loginRedirect(request, response, evaluation.reason);
    }

    response.cookies.set(LAST_ACTIVITY_COOKIE, String(now), {
      ...SECURE_COOKIE_OPTIONS,
      maxAge: SESSION_IDLE_TIMEOUT_MINUTES * 60,
      path: "/",
    });
    if (startedAt === null) {
      response.cookies.set(SESSION_STARTED_COOKIE, String(now), {
        ...SECURE_COOKIE_OPTIONS,
        maxAge: SESSION_MAX_AGE_MINUTES * 60,
        path: "/",
      });
    }
  }

  return response;
}
