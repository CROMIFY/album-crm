import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  // No mandamos IP ni cabeceras de request por defecto (ver RGPD).
  sendDefaultPii: false,
});
