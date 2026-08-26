const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
// El DSN de Sentry no es secreto, pero de aqui solo usamos el host: el
// navegador manda los reportes de error a https://<ingest-host>/api/...
const SENTRY_INGEST_HOST = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SENTRY_DSN ?? "").host;
  } catch {
    return "";
  }
})();

/** Puro para poder testear el valor de la cabecera sin pasar por Next/proxy.ts. */
export function buildCsp(nonce: string, isDev: boolean) {
  return `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""};
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: data:;
    font-src 'self';
    connect-src 'self' ${SUPABASE_URL}${SENTRY_INGEST_HOST ? ` https://${SENTRY_INGEST_HOST}` : ""};
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
  `
    .replace(/\s{2,}/g, " ")
    .trim();
}
