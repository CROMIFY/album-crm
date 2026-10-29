/**
 * Banco de pruebas de Playwright (rutas /e2e/*): pinta los tableros con datos
 * de mentira, sin sesión ni Supabase. Solo existe con E2E_HARNESS=1 y nunca en
 * Vercel, así que en producción esas rutas dan 404 y siguen pidiendo login.
 */
export function e2eHarnessEnabled(): boolean {
  return process.env.E2E_HARNESS === "1" && !process.env.VERCEL;
}

export function isE2eHarnessPath(pathname: string): boolean {
  return pathname === "/e2e" || pathname.startsWith("/e2e/");
}
